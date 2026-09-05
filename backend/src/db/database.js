const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');
const dotenv = require('dotenv');

dotenv.config({ path: path.resolve(__dirname, '../../.env'), quiet: true });

const backendRoot = path.resolve(__dirname, '../..');
const configuredPath = process.env.DATABASE_URL || './data/qarzmitr.sqlite';
const databasePath = configuredPath === ':memory:'
  ? configuredPath
  : path.resolve(backendRoot, configuredPath);

if (databasePath !== ':memory:') {
  fs.mkdirSync(path.dirname(databasePath), { recursive: true });
}

const db = new Database(databasePath);
db.pragma('foreign_keys = ON');
if (databasePath !== ':memory:') {
  db.pragma('journal_mode = WAL');
}

function initializeDatabase() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      shop_name TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS ledgers (
      id TEXT PRIMARY KEY,
      user_id TEXT,
      image_url TEXT NOT NULL,
      raw_ocr_text TEXT,
      uploaded_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS transactions (
      id TEXT PRIMARY KEY,
      ledger_id TEXT,
      user_id TEXT,
      type TEXT CHECK (type IN ('sale', 'expense', 'credit_given', 'repayment')),
      amount NUMERIC NOT NULL,
      customer_name TEXT,
      transaction_date TEXT,
      note TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (ledger_id) REFERENCES ledgers(id),
      FOREIGN KEY (user_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS scores (
      id TEXT PRIMARY KEY,
      user_id TEXT,
      score INTEGER NOT NULL CHECK (score BETWEEN 0 AND 100),
      explanation_text TEXT,
      cash_flow_consistency NUMERIC,
      repayment_ratio NUMERIC,
      revenue_trend NUMERIC,
      computed_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS phone_otps (
      id TEXT PRIMARY KEY,
      phone TEXT NOT NULL,
      code_hash TEXT NOT NULL,
      expires_at TEXT NOT NULL,
      used_at TEXT,
      attempts INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS password_reset_tokens (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      token_hash TEXT NOT NULL UNIQUE,
      expires_at TEXT NOT NULL,
      used_at TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id)
    );

    CREATE INDEX IF NOT EXISTS idx_ledgers_user_id ON ledgers(user_id);
    CREATE INDEX IF NOT EXISTS idx_transactions_ledger_id ON transactions(ledger_id);
    CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON transactions(user_id);
    CREATE INDEX IF NOT EXISTS idx_scores_user_id ON scores(user_id);
    CREATE INDEX IF NOT EXISTS idx_reset_tokens_user_id ON password_reset_tokens(user_id);
  `);

  addColumnIfMissing('transactions', 'note', 'TEXT');
  // Set once a shopkeeper has confirmed or corrected a flagged row, so it stops
  // appearing in the review queue.
  addColumnIfMissing('transactions', 'reviewed_at', 'TEXT');
  // Google sign-in links an account to a Google subject id; local-only accounts leave it null.
  addColumnIfMissing('users', 'google_id', 'TEXT');
  // Bumped on password reset so tokens issued before the reset stop verifying.
  addColumnIfMissing('users', 'token_version', 'INTEGER NOT NULL DEFAULT 0');
  // Stored in full international form so one person cannot end up with two
  // accounts by writing 0300… once and +92300… the next time.
  addColumnIfMissing('users', 'phone', 'TEXT');

  db.exec(`
    CREATE UNIQUE INDEX IF NOT EXISTS idx_users_google_id
      ON users(google_id) WHERE google_id IS NOT NULL;
    CREATE UNIQUE INDEX IF NOT EXISTS idx_users_phone
      ON users(phone) WHERE phone IS NOT NULL;
    CREATE INDEX IF NOT EXISTS idx_phone_otps_phone ON phone_otps(phone);
  `);
}

function addColumnIfMissing(table, column, definition) {
  const columns = db.pragma(`table_info(${table})`);
  if (columns.some((existing) => existing.name === column)) {
    return;
  }

  db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
}

module.exports = {
  db,
  databasePath,
  initializeDatabase
};