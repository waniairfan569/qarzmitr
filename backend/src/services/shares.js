const { createHash, randomBytes, randomUUID } = require('crypto');
const { db } = require('../db/database');

const SHARE_TTL_DAYS = 7;
const DAY_MS = 24 * 60 * 60 * 1000;

function hashShareToken(token) {
  return createHash('sha256').update(token).digest('hex');
}

function shareStatus(row, now = Date.now()) {
  if (row.revoked_at) return 'revoked';
  if (Date.parse(row.expires_at) <= now) return 'expired';
  return 'active';
}

function publicShare(row) {
  return {
    id: row.id,
    lender_id: row.lender_id,
    created_at: row.created_at,
    expires_at: row.expires_at,
    status: shareStatus(row),
    view_count: row.view_count,
    last_viewed_at: row.last_viewed_at
  };
}

/** Returns the raw token exactly once; only its hash is kept. */
function createShare(userId, lenderId) {
  const token = randomBytes(24).toString('base64url');
  const id = randomUUID();
  const createdAt = new Date().toISOString();
  const expiresAt = new Date(Date.now() + (SHARE_TTL_DAYS * DAY_MS)).toISOString();

  db.prepare(`
    INSERT INTO statement_shares (id, user_id, lender_id, token_hash, expires_at, created_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(id, userId, lenderId, hashShareToken(token), expiresAt, createdAt);

  return { token, share: publicShare(db.prepare('SELECT * FROM statement_shares WHERE id = ?').get(id)) };
}

function listShares(userId) {
  return db.prepare(`
    SELECT * FROM statement_shares WHERE user_id = ? ORDER BY created_at DESC
  `).all(userId).map(publicShare);
}

function revokeShare(userId, shareId) {
  const result = db.prepare(`
    UPDATE statement_shares SET revoked_at = ?
    WHERE id = ? AND user_id = ? AND revoked_at IS NULL
  `).run(new Date().toISOString(), shareId, userId);
  return result.changes > 0;
}

/** Finds a live share for a token and records that it was opened. */
function openShare(token) {
  if (typeof token !== 'string' || token.length < 16 || token.length > 128) return null;

  const row = db.prepare('SELECT * FROM statement_shares WHERE token_hash = ?').get(hashShareToken(token));
  if (!row || shareStatus(row) !== 'active') return null;

  db.prepare(`
    UPDATE statement_shares SET view_count = view_count + 1, last_viewed_at = ? WHERE id = ?
  `).run(new Date().toISOString(), row.id);
  return row;
}

/**
 * What a lender sees: the same evidence as the lender view, minus anything
 * about other people. Customer names become "Customer 1, 2…" so the count of
 * customers survives, and notes, photos, email and phone are left out.
 */
function buildSharedStatement(userId) {
  const user = db.prepare('SELECT name, shop_name FROM users WHERE id = ?').get(userId);
  const scoreHistory = db.prepare(`
    SELECT id, score, cash_flow_consistency, repayment_ratio, revenue_trend, computed_at
    FROM scores
    WHERE user_id = ?
    ORDER BY datetime(computed_at) ASC, computed_at ASC, id ASC
  `).all(userId);
  const rows = db.prepare(`
    SELECT type, amount, customer_name, transaction_date, ledger_id, source
    FROM transactions
    WHERE user_id = ?
    ORDER BY transaction_date DESC
  `).all(userId);

  const aliases = new Map();
  const transactions = rows.map((row) => {
    let customer = null;
    if (row.customer_name) {
      const key = row.customer_name.trim().toLowerCase();
      if (!aliases.has(key)) aliases.set(key, `Customer ${aliases.size + 1}`);
      customer = aliases.get(key);
    }
    return { ...row, customer_name: customer };
  });

  return {
    owner: { name: user?.name || '', shop_name: user?.shop_name || '' },
    latestScore: scoreHistory.length ? scoreHistory[scoreHistory.length - 1] : null,
    scoreHistory,
    transactions
  };
}

module.exports = {
  SHARE_TTL_DAYS,
  buildSharedStatement,
  createShare,
  hashShareToken,
  listShares,
  openShare,
  revokeShare,
  shareStatus
};
