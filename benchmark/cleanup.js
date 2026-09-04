/**
 * Deletes the throwaway accounts the benchmark creates, so repeated runs do not
 * accumulate users or leave stray ledgers behind.
 *
 *   node benchmark/cleanup.js
 */

const path = require('path');
const Database = require(path.join(__dirname, '..', 'backend', 'node_modules', 'better-sqlite3'));

const DB_PATH = path.join(__dirname, '..', 'backend', 'data', 'qarzmitr.sqlite');
const db = new Database(DB_PATH);
db.pragma('foreign_keys = ON');

const accounts = db.prepare("SELECT id, email FROM users WHERE email LIKE 'benchmark-%@example.com'").all();

if (accounts.length === 0) {
  console.log('No benchmark accounts to remove.');
} else {
  const remove = db.transaction((users) => {
    for (const user of users) {
      db.prepare('DELETE FROM transactions WHERE user_id = ?').run(user.id);
      db.prepare('DELETE FROM scores WHERE user_id = ?').run(user.id);
      db.prepare('DELETE FROM password_reset_tokens WHERE user_id = ?').run(user.id);
      db.prepare('DELETE FROM ledgers WHERE user_id = ?').run(user.id);
      db.prepare('DELETE FROM users WHERE id = ?').run(user.id);
    }
  });
  remove(accounts);
  console.log(`Removed ${accounts.length} benchmark account(s).`);
}

const demo = db.prepare("SELECT id FROM users WHERE email = 'demo@qarzmitr.com'").get();
if (demo) {
  const count = db.prepare('SELECT COUNT(*) c FROM transactions WHERE user_id = ?').get(demo.id).c;
  const score = db.prepare('SELECT score FROM scores WHERE user_id = ? ORDER BY computed_at DESC LIMIT 1').get(demo.id);
  console.log(`Demo record intact: ${count} transactions, latest score ${score ? score.score : 'none'}.`);
}

db.close();
