process.env.DATABASE_URL = ':memory:';
process.env.JWT_SECRET = 'test-secret-for-the-auth-suite';

const assert = require('node:assert/strict');
const { describe, it, beforeEach } = require('node:test');
const { randomUUID } = require('crypto');
const jwt = require('jsonwebtoken');

const { db, initializeDatabase } = require('../src/db/database');

initializeDatabase();

const { hashResetToken, validatePassword } = require('../src/controllers/authController');
const { findOrCreateUser } = require('../src/controllers/googleController');
const { OAUTH_ONLY_PASSWORD, issueToken, publicUser } = require('../src/services/session');

function insertUser({ email, passwordHash = 'hashed', googleId = null, tokenVersion = 0 }) {
  const id = randomUUID();
  db.prepare(`
    INSERT INTO users (id, name, email, password_hash, shop_name, google_id, token_version)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(id, 'Test User', email, passwordHash, 'Test Shop', googleId, tokenVersion);
  return db.prepare('SELECT * FROM users WHERE id = ?').get(id);
}

beforeEach(() => {
  db.exec('DELETE FROM password_reset_tokens; DELETE FROM users;');
});

describe('validatePassword', () => {
  it('requires at least 8 characters', () => {
    assert.match(validatePassword('short'), /at least 8/);
    assert.equal(validatePassword('longenough'), null);
  });

  it('rejects passwords past the 72-byte bcrypt limit', () => {
    assert.equal(validatePassword('a'.repeat(72)), null);
    assert.match(validatePassword('a'.repeat(73)), /72 bytes/);
    // Multi-byte characters count as bytes, not characters.
    assert.match(validatePassword('ا'.repeat(37)), /72 bytes/);
  });

  it('rejects non-strings', () => {
    for (const value of [null, undefined, 12345678, {}]) {
      assert.match(validatePassword(value), /at least 8/);
    }
  });
});

describe('hashResetToken', () => {
  it('is deterministic so a link can be looked up by its hash', () => {
    assert.equal(hashResetToken('abc'), hashResetToken('abc'));
  });

  it('never stores the token itself', () => {
    const token = 'a-plaintext-reset-token';
    const hash = hashResetToken(token);
    assert.notEqual(hash, token);
    assert.equal(hash.length, 64);
    assert.notEqual(hashResetToken('abc'), hashResetToken('abd'));
  });
});

describe('issueToken', () => {
  it('carries the account id and its current token version', () => {
    const user = { id: 'user-1', token_version: 3 };
    const payload = jwt.verify(issueToken(user), process.env.JWT_SECRET);
    assert.equal(payload.sub, 'user-1');
    assert.equal(payload.tv, 3);
  });

  it('defaults the version to 0 for a freshly created account', () => {
    const payload = jwt.verify(issueToken({ id: 'user-2' }), process.env.JWT_SECRET);
    assert.equal(payload.tv, 0);
  });
});

describe('publicUser', () => {
  it('never exposes the password hash or token version', () => {
    const user = insertUser({ email: 'shopkeeper@example.com' });
    const shaped = publicUser(user);
    assert.equal(shaped.password_hash, undefined);
    assert.equal(shaped.token_version, undefined);
    assert.equal(shaped.email, 'shopkeeper@example.com');
  });

  it('reports how the account signs in', () => {
    const local = publicUser(insertUser({ email: 'local@example.com' }));
    assert.equal(local.auth_provider, 'password');
    assert.equal(local.has_password, true);

    const google = publicUser(insertUser({
      email: 'google@example.com',
      passwordHash: OAUTH_ONLY_PASSWORD,
      googleId: 'google-123'
    }));
    assert.equal(google.auth_provider, 'google');
    assert.equal(google.has_password, false);
  });
});

describe('findOrCreateUser (Google sign-in)', () => {
  const profile = { googleId: 'google-abc', email: 'new@example.com', name: 'Aisha Khan' };

  it('creates an account the first time someone signs in with Google', () => {
    const user = findOrCreateUser(profile);
    assert.equal(user.email, 'new@example.com');
    assert.equal(user.google_id, 'google-abc');
    assert.equal(user.name, 'Aisha Khan');
    // No usable password, so the email/password path cannot be used for it.
    assert.equal(user.password_hash, OAUTH_ONLY_PASSWORD);
  });

  it('returns the same account on a second sign-in rather than duplicating', () => {
    const first = findOrCreateUser(profile);
    const second = findOrCreateUser(profile);
    assert.equal(first.id, second.id);
    assert.equal(db.prepare('SELECT COUNT(*) c FROM users').get().c, 1);
  });

  it('links Google to an existing password account with the same email', () => {
    const existing = insertUser({ email: 'existing@example.com', passwordHash: 'a-real-bcrypt-hash' });
    const linked = findOrCreateUser({ ...profile, email: 'existing@example.com' });

    assert.equal(linked.id, existing.id, 'should claim the existing account, not create a second');
    assert.equal(linked.google_id, 'google-abc');
    // The original password still works — linking adds a way in, it does not remove one.
    assert.equal(linked.password_hash, 'a-real-bcrypt-hash');
    assert.equal(db.prepare('SELECT COUNT(*) c FROM users').get().c, 1);
  });

  it('falls back to the email local-part when Google sends no name', () => {
    const user = findOrCreateUser({ googleId: 'google-xyz', email: 'nameless@example.com', name: null });
    assert.equal(user.name, 'nameless');
  });

  it('keeps separate Google accounts separate', () => {
    findOrCreateUser(profile);
    findOrCreateUser({ googleId: 'google-def', email: 'other@example.com', name: 'Other' });
    assert.equal(db.prepare('SELECT COUNT(*) c FROM users').get().c, 2);
  });
});

describe('reset token storage', () => {
  it('enforces one row per token hash', () => {
    const user = insertUser({ email: 'reset@example.com' });
    const insert = db.prepare(`
      INSERT INTO password_reset_tokens (id, user_id, token_hash, expires_at)
      VALUES (?, ?, ?, ?)
    `);
    const hash = hashResetToken('shared-token');
    insert.run(randomUUID(), user.id, hash, new Date().toISOString());

    assert.throws(
      () => insert.run(randomUUID(), user.id, hash, new Date().toISOString()),
      /UNIQUE/
    );
  });
});
