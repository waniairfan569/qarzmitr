const { createHash, randomBytes, randomUUID } = require('crypto');
const bcrypt = require('bcrypt');
const { db } = require('../db/database');
const { env } = require('../config/env');
const { sendPasswordResetEmail } = require('../services/mailer');
const { OAUTH_ONLY_PASSWORD, issueToken, publicUser } = require('../services/session');

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const BCRYPT_ROUNDS = 12;
const RESET_TOKEN_BYTES = 32;

// Reset tokens are stored hashed, so a leaked database still cannot be used to
// take over accounts. The plaintext half only ever exists in the emailed link.
function hashResetToken(token) {
  return createHash('sha256').update(token).digest('hex');
}

function validatePassword(password) {
  if (typeof password !== 'string' || password.length < 8) {
    return 'Password must be at least 8 characters.';
  }
  if (Buffer.byteLength(password, 'utf8') > 72) {
    return 'Password must be 72 bytes or fewer.';
  }
  return null;
}

function validateSignup(body) {
  if (!body || typeof body !== 'object') {
    return 'A JSON request body is required.';
  }

  const { name, email, password, shop_name: shopName } = body;

  if (typeof name !== 'string' || !name.trim()) {
    return 'Name is required.';
  }
  if (name.trim().length > 100) {
    return 'Name must be 100 characters or fewer.';
  }
  if (typeof email !== 'string' || !EMAIL_PATTERN.test(email.trim())) {
    return 'A valid email address is required.';
  }
  if (email.trim().length > 150) {
    return 'Email must be 150 characters or fewer.';
  }
  const passwordError = validatePassword(password);
  if (passwordError) {
    return passwordError;
  }
  if (shopName !== undefined && shopName !== null && typeof shopName !== 'string') {
    return 'Shop name must be a string.';
  }
  if (typeof shopName === 'string' && shopName.trim().length > 150) {
    return 'Shop name must be 150 characters or fewer.';
  }

  return null;
}

async function signup(req, res, next) {
  const validationError = validateSignup(req.body);
  if (validationError) {
    return res.status(400).json({ message: validationError });
  }

  const name = req.body.name.trim();
  const email = req.body.email.trim().toLowerCase();
  const shopName = typeof req.body.shop_name === 'string'
    ? req.body.shop_name.trim() || null
    : null;

  try {
    const existingUser = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
    if (existingUser) {
      return res.status(409).json({ message: 'An account with this email already exists.' });
    }

    const userId = randomUUID();
    const passwordHash = await bcrypt.hash(req.body.password, BCRYPT_ROUNDS);

    db.prepare(`
      INSERT INTO users (id, name, email, password_hash, shop_name)
      VALUES (?, ?, ?, ?, ?)
    `).run(userId, name, email, passwordHash, shopName);

    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);

    return res.status(201).json({
      message: 'Account created successfully.',
      token: issueToken(user),
      user: publicUser(user)
    });
  } catch (error) {
    if (error.code === 'SQLITE_CONSTRAINT_UNIQUE') {
      return res.status(409).json({ message: 'An account with this email already exists.' });
    }
    return next(error);
  }
}

async function login(req, res, next) {
  const { email, password } = req.body || {};

  if (
    typeof email !== 'string'
    || email.trim().length > 150
    || !EMAIL_PATTERN.test(email.trim())
  ) {
    return res.status(400).json({ message: 'A valid email address is required.' });
  }
  if (
    typeof password !== 'string'
    || !password
    || Buffer.byteLength(password, 'utf8') > 72
  ) {
    return res.status(400).json({ message: 'A valid password is required.' });
  }

  try {
    const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email.trim().toLowerCase());

    if (user && user.password_hash === OAUTH_ONLY_PASSWORD) {
      return res.status(409).json({
        message: 'This account was created with Google. Continue with Google to sign in.',
        auth_provider: 'google'
      });
    }

    const passwordMatches = user && await bcrypt.compare(password, user.password_hash);
    if (!passwordMatches) {
      return res.status(401).json({ message: 'Invalid email or password.' });
    }

    return res.json({
      message: 'Login successful.',
      token: issueToken(user),
      user: publicUser(user)
    });
  } catch (error) {
    return next(error);
  }
}

function me(req, res, next) {
  try {
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.userId);

    if (!user) {
      return res.status(401).json({ message: 'User account no longer exists.' });
    }

    return res.json({ user: publicUser(user) });
  } catch (error) {
    return next(error);
  }
}

// Always answers the same way whether or not the address is registered — a
// different response for unknown emails would turn this into an account lookup.
const GENERIC_RESET_RESPONSE = {
  message: 'If an account exists for that email, a password reset link is on its way.'
};

async function forgotPassword(req, res, next) {
  const { email } = req.body || {};

  if (typeof email !== 'string' || !EMAIL_PATTERN.test(email.trim()) || email.trim().length > 150) {
    return res.status(400).json({ message: 'A valid email address is required.' });
  }

  try {
    const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email.trim().toLowerCase());

    if (!user || user.password_hash === OAUTH_ONLY_PASSWORD) {
      return res.json(GENERIC_RESET_RESPONSE);
    }

    // Any earlier link for this account stops working the moment a new one is issued.
    db.prepare(`
      UPDATE password_reset_tokens
      SET used_at = CURRENT_TIMESTAMP
      WHERE user_id = ? AND used_at IS NULL
    `).run(user.id);

    const token = randomBytes(RESET_TOKEN_BYTES).toString('base64url');
    const expiresAt = new Date(Date.now() + (env.passwordResetTtlMinutes * 60 * 1000)).toISOString();

    db.prepare(`
      INSERT INTO password_reset_tokens (id, user_id, token_hash, expires_at)
      VALUES (?, ?, ?, ?)
    `).run(randomUUID(), user.id, hashResetToken(token), expiresAt);

    await sendPasswordResetEmail({ email: user.email, token });

    return res.json(GENERIC_RESET_RESPONSE);
  } catch (error) {
    return next(error);
  }
}

async function resetPassword(req, res, next) {
  const { token, password } = req.body || {};

  if (typeof token !== 'string' || !token.trim()) {
    return res.status(400).json({ message: 'A reset token is required.' });
  }

  const passwordError = validatePassword(password);
  if (passwordError) {
    return res.status(400).json({ message: passwordError });
  }

  try {
    const record = db.prepare(`
      SELECT id, user_id, expires_at, used_at
      FROM password_reset_tokens
      WHERE token_hash = ?
    `).get(hashResetToken(token.trim()));

    if (!record || record.used_at || Date.parse(record.expires_at) <= Date.now()) {
      return res.status(400).json({
        message: 'This reset link is invalid or has expired. Request a new one.'
      });
    }

    const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);

    // Bumping token_version signs out every existing session, so a reset also
    // removes anyone who was already holding a token for this account.
    db.transaction(() => {
      db.prepare(`
        UPDATE users
        SET password_hash = ?, token_version = token_version + 1
        WHERE id = ?
      `).run(passwordHash, record.user_id);
      db.prepare('UPDATE password_reset_tokens SET used_at = CURRENT_TIMESTAMP WHERE id = ?')
        .run(record.id);
    })();

    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(record.user_id);

    return res.json({
      message: 'Password updated. You are now signed in.',
      token: issueToken(user),
      user: publicUser(user)
    });
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  forgotPassword,
  hashResetToken,
  login,
  me,
  resetPassword,
  signup,
  validatePassword
};