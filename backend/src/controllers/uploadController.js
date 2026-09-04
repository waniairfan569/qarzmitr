const { randomUUID } = require('crypto');
const multer = require('multer');
const { db } = require('../db/database');
const { OcrServiceError, extractLedgerText } = require('../services/ocr');
const { StorageError, storeLedgerImage } = require('../services/storage');

const MAX_IMAGE_SIZE_BYTES = 10 * 1024 * 1024;
const multipartUpload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: MAX_IMAGE_SIZE_BYTES,
    files: 1
  }
});

function uploadImage(req, res, next) {
  return multipartUpload.single('image')(req, res, (error) => {
    if (!error) {
      return next();
    }

    if (error instanceof multer.MulterError && error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ message: 'Image must be 10 MB or smaller.' });
    }

    return res.status(400).json({
      message: 'Invalid multipart upload. Send one image in the "image" field.'
    });
  });
}

function detectImageMimeType(buffer) {
  if (
    buffer.length >= 3
    && buffer[0] === 0xff
    && buffer[1] === 0xd8
    && buffer[2] === 0xff
  ) {
    return 'image/jpeg';
  }

  if (
    buffer.length >= 8
    && buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))
  ) {
    return 'image/png';
  }

  if (
    buffer.length >= 12
    && buffer.subarray(0, 4).toString('ascii') === 'RIFF'
    && buffer.subarray(8, 12).toString('ascii') === 'WEBP'
  ) {
    return 'image/webp';
  }

  return null;
}

function publicLedger(ledger) {
  return {
    id: ledger.id,
    user_id: ledger.user_id,
    image_url: ledger.image_url,
    raw_ocr_text: ledger.raw_ocr_text,
    uploaded_at: ledger.uploaded_at
  };
}

async function uploadLedger(req, res, next) {
  if (!req.file) {
    return res.status(400).json({
      message: 'An image file is required in the "image" field.'
    });
  }

  const mimeType = detectImageMimeType(req.file.buffer);
  if (!mimeType) {
    return res.status(400).json({
      message: 'Only JPEG, PNG, and WebP images are supported.'
    });
  }

  try {
    const user = db.prepare('SELECT id FROM users WHERE id = ?').get(req.userId);
    if (!user) {
      return res.status(401).json({ message: 'User account no longer exists.' });
    }

    const ledgerId = randomUUID();
    let storedImage;
    try {
      storedImage = await storeLedgerImage({
        buffer: req.file.buffer,
        mimeType,
        objectId: ledgerId,
        userId: req.userId
      });
    } catch (error) {
      if (error instanceof StorageError) {
        console.error('Ledger image storage failed:', error.cause || error);
        return res.status(500).json({ message: 'Unable to store the ledger image.' });
      }
      throw error;
    }

    let ocrResult;
    try {
      ocrResult = await extractLedgerText({
        buffer: req.file.buffer,
        mimeType
      });
    } catch (error) {
      if (error instanceof OcrServiceError) {
        console.error('Ledger OCR failed:', error.cause || error);
        return res.status(502).json({ message: 'OCR service is temporarily unavailable.' });
      }
      throw error;
    }

    db.prepare(`
      INSERT INTO ledgers (id, user_id, image_url, raw_ocr_text)
      VALUES (?, ?, ?, ?)
    `).run(ledgerId, req.userId, storedImage.imageUrl, ocrResult.text);

    const ledger = db.prepare(`
      SELECT id, user_id, image_url, raw_ocr_text, uploaded_at
      FROM ledgers
      WHERE id = ?
    `).get(ledgerId);

    const message = ocrResult.status === 'skipped'
      ? 'Ledger uploaded successfully. OCR was skipped because DASHSCOPE_API_KEY is not configured.'
      : 'Ledger uploaded and OCR completed successfully.';

    return res.status(201).json({
      message,
      ledger: publicLedger(ledger),
      storage_mode: storedImage.mode,
      ocr: {
        status: ocrResult.status,
        reason: ocrResult.reason
      }
    });
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  uploadImage,
  uploadLedger
};