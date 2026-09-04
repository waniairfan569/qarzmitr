const fs = require('fs/promises');
const path = require('path');
const OSS = require('ali-oss');
const { env } = require('../config/env');

const backendRoot = path.resolve(__dirname, '../..');
const uploadsDirectory = path.join(backendRoot, 'uploads');

const extensionByMimeType = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp'
};

class StorageError extends Error {
  constructor(message, cause) {
    super(message, { cause });
    this.name = 'StorageError';
  }
}

function hasOssCredentials() {
  return Boolean(
    env.ossAccessKeyId
    && env.ossAccessKeySecret
    && env.ossBucketName
    && env.ossRegion
  );
}

async function storeLocally({ buffer, mimeType, objectId, userId }) {
  const extension = extensionByMimeType[mimeType];
  const filename = `${userId}-${objectId}.${extension}`;

  await fs.mkdir(uploadsDirectory, { recursive: true });
  await fs.writeFile(path.join(uploadsDirectory, filename), buffer, { flag: 'wx' });

  return `/uploads/${filename}`;
}

async function storeInOss({ buffer, mimeType, objectId, userId }) {
  const client = new OSS({
    accessKeyId: env.ossAccessKeyId,
    accessKeySecret: env.ossAccessKeySecret,
    bucket: env.ossBucketName,
    region: env.ossRegion,
    secure: true
  });
  const extension = extensionByMimeType[mimeType];
  const objectName = `ledgers/${userId}/${objectId}.${extension}`;
  const result = await client.put(objectName, buffer, {
    headers: { 'Content-Type': mimeType }
  });

  return result.url || client.generateObjectUrl(objectName);
}

async function storeLedgerImage(image) {
  try {
    if (hasOssCredentials()) {
      console.info('Ledger image storage mode: Alibaba Cloud OSS');
      return {
        imageUrl: await storeInOss(image),
        mode: 'oss'
      };
    }

    console.info('Ledger image storage mode: local disk');
    return {
      imageUrl: await storeLocally(image),
      mode: 'local'
    };
  } catch (error) {
    throw new StorageError('Unable to store the ledger image.', error);
  }
}

module.exports = {
  StorageError,
  storeLedgerImage
};