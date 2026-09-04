process.env.DATABASE_URL = ':memory:';

const assert = require('node:assert/strict');
const { describe, it, beforeEach } = require('node:test');
const { randomUUID } = require('crypto');

const { db, initializeDatabase } = require('../src/db/database');

initializeDatabase();

const USER_ID = 'timestamp-user';

function insertScore(score, computedAt) {
  db.prepare(`
    INSERT INTO scores (id, user_id, score, computed_at)
    VALUES (?, ?, ?, ?)
  `).run(randomUUID(), USER_ID, score, computedAt);
}

function latestScore() {
  return db.prepare(`
    SELECT score FROM scores
    WHERE user_id = ?
    ORDER BY datetime(computed_at) DESC, computed_at DESC, id DESC
    LIMIT 1
  `).get(USER_ID);
}

beforeEach(() => {
  db.exec('DELETE FROM scores');
  db.prepare(`
    INSERT OR IGNORE INTO users (id, name, email, password_hash)
    VALUES (?, 'Timestamp', 'timestamps@example.com', 'hash')
  `).run(USER_ID);
});

describe('score ordering across timestamp formats', () => {
  // SQLite's CURRENT_TIMESTAMP writes "2026-09-04 15:04:31" while an ISO string
  // is "2026-09-04T14:24:54.148Z". Sorted as text a space beats a "T", so the
  // older ISO row used to win and the dashboard showed a stale score.
  it('picks the genuinely newest score when the two formats are mixed', () => {
    insertScore(69, '2026-09-04T14:24:54.148Z');
    insertScore(85, '2026-09-04 15:04:31');

    assert.equal(latestScore().score, 85, 'the 15:04 score is newer than the 14:24 one');
  });

  it('still orders correctly when every row uses the same format', () => {
    insertScore(60, '2026-08-20 18:00:00');
    insertScore(69, '2026-09-01 10:00:00');
    insertScore(85, '2026-09-04 15:04:31');

    assert.equal(latestScore().score, 85);
  });

  it('orders a full history by real time regardless of format', () => {
    insertScore(60, '2026-08-20T18:00:00.000Z');
    insertScore(63, '2026-08-30 18:00:00');
    insertScore(69, '2026-09-04T14:24:54.148Z');
    insertScore(85, '2026-09-04 15:04:31');

    const history = db.prepare(`
      SELECT score FROM scores
      WHERE user_id = ?
      ORDER BY datetime(computed_at) ASC, computed_at ASC, id ASC
    `).all(USER_ID).map((row) => row.score);

    assert.deepEqual(history, [60, 63, 69, 85], 'the newest score must land last');
  });
});

describe('the seed writes the same format the app does', () => {
  it('formats a timestamp the way CURRENT_TIMESTAMP does', () => {
    const formatted = new Date('2026-09-04T15:04:31.482Z').toISOString().slice(0, 19).replace('T', ' ');
    assert.equal(formatted, '2026-09-04 15:04:31');
    assert.match(formatted, /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/);
  });
});
