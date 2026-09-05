const { randomUUID } = require('crypto');
const { db } = require('../db/database');
const { sendOtp } = require('../services/sms');
const {
  MAX_ATTEMPTS,
  expiryFrom,
  generateCode,
  hashCode,
  isExpired,
  normalizePhone
} = require('../services/phoneAuth');
const { OAUTH_ONLY_PASSWORD, issueToken, publicUser } = require('../services/session');

// Answers the same way whether or not the number is registered, so this cannot
// be used to find out who has an account.
const SENT = { message: 'If that number can receive SMS, a code is on its way.' };

function requestCode(req, res, next) {
  const phone = normalizePhone(req.body?.phone);

  if (!phone) {
    return res.status(400).json({
      message: 'Enter a Pakistani mobile number, for example 0300 1234567.'
    });
  }

  try {
    // Issuing a new code retires any earlier one, so only the newest works.
    db.prepare('UPDATE phone_otps SET used_at = CURRENT_TIMESTAMP WHERE phone = ? AND used_at IS NULL').run(phone);

    const code = generateCode();
    db.prepare(`
      INSERT INTO phone_otps (id, phone, code_hash, expires_at)
      VALUES (?, ?, ?, ?)
    `).run(randomUUID(), phone, hashCode(phone, code), expiryFrom());

    sendOtp({ phone, code });

    return res.json(SENT);
  } catch (error) {
    return next(error);
  }
}

function verifyCode(req, res, next) {
  const phone = normalizePhone(req.body?.phone);
  const code = String(req.body?.code || '').trim();

  if (!phone) {
    return res.status(400).json({ message: 'Enter a Pakistani mobile number.' });
  }
  if (!/^\d{6}$/.test(code)) {
    return res.status(400).json({ message: 'Enter the six-digit code from the SMS.' });
  }

  try {
    const record = db.prepare(`
      SELECT id, code_hash, expires_at, used_at, attempts
      FROM phone_otps
      WHERE phone = ?
      ORDER BY datetime(created_at) DESC, rowid DESC
      LIMIT 1
    `).get(phone);

    const invalid = { message: 'That code is wrong or has expired. Ask for a new one.' };

    if (!record || record.used_at || isExpired(record.expires_at)) {
      return res.status(400).json(invalid);
    }
    if (record.attempts >= MAX_ATTEMPTS) {
      // Retired rather than left guessable: six digits falls quickly to a
      // machine, and the expiry alone would not stop one.
      db.prepare('UPDATE phone_otps SET used_at = CURRENT_TIMESTAMP WHERE id = ?').run(record.id);
      return res.status(429).json({ message: 'Too many wrong codes. Ask for a new one.' });
    }
    if (record.code_hash !== hashCode(phone, code)) {
      db.prepare('UPDATE phone_otps SET attempts = attempts + 1 WHERE id = ?').run(record.id);
      return res.status(400).json(invalid);
    }

    const name = typeof req.body?.name === 'string' ? req.body.name.trim().slice(0, 100) : '';
    const shopName = typeof req.body?.shop_name === 'string' ? req.body.shop_name.trim().slice(0, 150) : '';

    const user = db.transaction(() => {
      db.prepare('UPDATE phone_otps SET used_at = CURRENT_TIMESTAMP WHERE id = ?').run(record.id);

      const existing = db.prepare('SELECT * FROM users WHERE phone = ?').get(phone);
      if (existing) {
        // Let a returning shopkeeper fill in details they skipped first time,
        // but never overwrite something they already set.
        if (name && !existing.name) {
          db.prepare('UPDATE users SET name = ? WHERE id = ?').run(name, existing.id);
        }
        if (shopName && !existing.shop_name) {
          db.prepare('UPDATE users SET shop_name = ? WHERE id = ?').run(shopName, existing.id);
        }
        return db.prepare('SELECT * FROM users WHERE id = ?').get(existing.id);
      }

      const userId = randomUUID();
      db.prepare(`
        INSERT INTO users (id, name, email, password_hash, shop_name, phone)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(
        userId,
        name || `Shopkeeper ${phone.slice(-4)}`,
        // The email column is unique and required, and this account has no
        // email. A reserved internal address keeps the constraint honest
        // without pretending the shopkeeper gave us one.
        `${phone}@phone.qarzmitr.local`,
        OAUTH_ONLY_PASSWORD,
        shopName || null,
        phone
      );
      return db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
    })();

    return res.json({
      message: 'Signed in.',
      token: issueToken(user),
      user: publicUser(user)
    });
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  requestCode,
  verifyCode
};
