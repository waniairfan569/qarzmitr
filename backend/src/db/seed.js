const { randomUUID } = require('crypto');
const bcrypt = require('bcrypt');
const { db, databasePath, initializeDatabase } = require('./database');
const { computeScoreMetrics } = require('../services/scoring');

const DEMO_USER = {
  name: 'Ayesha Bibi',
  shopName: 'Ayesha General Store',
  email: 'demo@qarzmitr.com',
  password: 'Demo1234!'
};
const BCRYPT_ROUNDS = 12;
const DAY_MS = 24 * 60 * 60 * 1000;

const TRANSACTION_TEMPLATES = [
  { dayOffset: -20, type: 'sale', amount: 3800, customerName: 'Walk-in customers', note: 'Daily grocery sales' },
  { dayOffset: -19, type: 'expense', amount: 1450, customerName: 'Rehman Wholesalers', note: 'Milk and tea stock' },
  { dayOffset: -18, type: 'sale', amount: 4050, customerName: 'Walk-in customers', note: 'Daily grocery sales' },
  { dayOffset: -18, type: 'credit_given', amount: 1800, customerName: 'Nasreen Bibi', note: 'Monthly ration on credit' },
  { dayOffset: -17, type: 'sale', amount: 4200, customerName: 'Walk-in customers', note: 'Daily grocery sales' },
  { dayOffset: -16, type: 'expense', amount: 980, customerName: 'City Beverages', note: 'Cold drinks restock' },
  { dayOffset: -15, type: 'sale', amount: 4350, customerName: 'Walk-in customers', note: 'Daily grocery sales' },
  { dayOffset: -15, type: 'repayment', amount: 1100, customerName: 'Nasreen Bibi', note: 'Partial credit repayment' },
  { dayOffset: -14, type: 'expense', amount: 1200, customerName: 'Khan Flour Depot', note: 'Flour bags purchased' },
  { dayOffset: -13, type: 'sale', amount: 4600, customerName: 'Walk-in customers', note: 'Daily grocery sales' },
  { dayOffset: -13, type: 'credit_given', amount: 2200, customerName: 'Imran Ali', note: 'Household supplies on credit' },
  { dayOffset: -12, type: 'sale', amount: 4700, customerName: 'Walk-in customers', note: 'Daily grocery sales' },
  { dayOffset: -11, type: 'expense', amount: 1350, customerName: 'Noor Distributors', note: 'Cooking oil restock' },
  { dayOffset: -10, type: 'sale', amount: 4900, customerName: 'Walk-in customers', note: 'Daily grocery sales' },
  { dayOffset: -10, type: 'repayment', amount: 1300, customerName: 'Imran Ali', note: 'Partial credit repayment' },
  { dayOffset: -9, type: 'credit_given', amount: 1600, customerName: 'Shazia Parveen', note: 'School snacks on credit' },
  { dayOffset: -8, type: 'sale', amount: 5100, customerName: 'Walk-in customers', note: 'Daily grocery sales' },
  { dayOffset: -8, type: 'expense', amount: 1050, customerName: 'Fresh Foods Supply', note: 'Biscuits and snacks restock' },
  { dayOffset: -7, type: 'sale', amount: 5250, customerName: 'Walk-in customers', note: 'Daily grocery sales' },
  { dayOffset: -6, type: 'repayment', amount: 900, customerName: 'Shazia Parveen', note: 'Partial credit repayment' },
  { dayOffset: -5, type: 'sale', amount: 5500, customerName: 'Walk-in customers', note: 'Daily grocery sales' },
  { dayOffset: -4, type: 'expense', amount: 1550, customerName: 'Rehman Wholesalers', note: 'Rice and lentils restock' },
  { dayOffset: -4, type: 'credit_given', amount: 2400, customerName: 'Bilal Ahmed', note: 'Family groceries on credit' },
  { dayOffset: -3, type: 'sale', amount: 5750, customerName: 'Walk-in customers', note: 'Daily grocery sales' },
  { dayOffset: -1, type: 'sale', amount: 6000, customerName: 'Walk-in customers', note: 'Daily grocery sales' },
  { dayOffset: -1, type: 'expense', amount: 1250, customerName: 'City Beverages', note: 'Drinks and water restock' },
  { dayOffset: -1, type: 'repayment', amount: 2200, customerName: 'Bilal Ahmed', note: 'Credit balance repayment' },
  { dayOffset: 0, type: 'sale', amount: 6250, customerName: 'Walk-in customers', note: 'Daily grocery sales' }
];

const SNAPSHOT_OFFSETS = [-15, -10, -5, 0];

function utcDay(dayOffset) {
  const now = new Date();
  return new Date(Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate() + dayOffset
  ));
}

function dateForOffset(dayOffset) {
  return utcDay(dayOffset).toISOString().slice(0, 10);
}

function timestampForOffset(dayOffset, hour = 12) {
  const date = utcDay(dayOffset);
  date.setUTCHours(hour, 0, 0, 0);
  return date.toISOString();
}

function buildTransactions() {
  return TRANSACTION_TEMPLATES.map((transaction) => ({
    ...transaction,
    id: randomUUID(),
    transaction_date: dateForOffset(transaction.dayOffset),
    created_at: timestampForOffset(transaction.dayOffset)
  }));
}

function buildLatestExplanation(metrics) {
  return `آپ کا قرض متر اسکور ${metrics.score}/100 ہے، جو آپ کے کاروبار کی اچھی مالی حالت دکھاتا ہے۔ آپ کی آمدنی میں مثبت اضافہ ہے اور نقد بہاؤ کی باقاعدگی ${metrics.cashFlowConsistency}/100 ہے۔ ادھار کی وصولی کا تناسب ${metrics.repaymentRatio}/100 ہے، اس لیے بقایا رقم کی بروقت وصولی پر مزید توجہ دیں۔ اسی رفتار کو برقرار رکھنے اور اخراجات کا باقاعدہ اندراج کرنے سے آپ کا اسکور مزید بہتر ہو سکتا ہے۔`;
}

function seedDatabase(passwordHash) {
  const userId = randomUUID();
  const ledgerId = randomUUID();
  const transactions = buildTransactions();
  const snapshots = SNAPSHOT_OFFSETS.map((dayOffset) => {
    const snapshotDate = dateForOffset(dayOffset);
    const includedTransactions = transactions.filter(
      (transaction) => transaction.transaction_date <= snapshotDate
    );

    return {
      dayOffset,
      metrics: computeScoreMetrics(includedTransactions)
    };
  });

  const replaceDemoData = db.transaction(() => {
    const existingUser = db.prepare('SELECT id FROM users WHERE email = ?').get(DEMO_USER.email);

    if (existingUser) {
      db.prepare(`
        DELETE FROM transactions
        WHERE user_id = ?
          OR ledger_id IN (SELECT id FROM ledgers WHERE user_id = ?)
      `).run(existingUser.id, existingUser.id);
      db.prepare('DELETE FROM scores WHERE user_id = ?').run(existingUser.id);
      db.prepare('DELETE FROM ledgers WHERE user_id = ?').run(existingUser.id);
      db.prepare('DELETE FROM users WHERE id = ?').run(existingUser.id);
    }

    db.prepare(`
      INSERT INTO users (id, name, email, password_hash, shop_name, created_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(
      userId,
      DEMO_USER.name,
      DEMO_USER.email,
      passwordHash,
      DEMO_USER.shopName,
      timestampForOffset(-21, 9)
    );

    db.prepare(`
      INSERT INTO ledgers (id, user_id, image_url, raw_ocr_text, uploaded_at)
      VALUES (?, ?, ?, ?, ?)
    `).run(
      ledgerId,
      userId,
      '/uploads/demo-ledger.png',
      `13 اگست — Opening page\nچینی اور چائے cash sale 3,800\nNasreen Bibi راشن ادھار 1,800\nMilk cartons expense 1,450\nBilal نے پچھلا ادھار 2,200 واپس کیا`,
      timestampForOffset(-20, 8)
    );

    const insertTransaction = db.prepare(`
      INSERT INTO transactions (
        id, ledger_id, user_id, type, amount, customer_name,
        transaction_date, note, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    for (const transaction of transactions) {
      insertTransaction.run(
        transaction.id,
        ledgerId,
        userId,
        transaction.type,
        transaction.amount,
        transaction.customerName,
        transaction.transaction_date,
        transaction.note,
        transaction.created_at
      );
    }

    const insertScore = db.prepare(`
      INSERT INTO scores (
        id, user_id, score, explanation_text, cash_flow_consistency,
        repayment_ratio, revenue_trend, computed_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    snapshots.forEach((snapshot, index) => {
      const isLatest = index === snapshots.length - 1;
      const explanationText = isLatest
        ? buildLatestExplanation(snapshot.metrics)
        : `اس وقت دستیاب لین دین کی بنیاد پر عبوری اسکور ${snapshot.metrics.score}/100 ہے۔`;

      insertScore.run(
        randomUUID(),
        userId,
        snapshot.metrics.score,
        explanationText,
        snapshot.metrics.cashFlowConsistency,
        snapshot.metrics.repaymentRatio,
        snapshot.metrics.revenueTrend,
        isLatest ? new Date().toISOString() : timestampForOffset(snapshot.dayOffset, 18)
      );
    });
  });

  replaceDemoData();
  return { transactions, snapshots };
}

async function main() {
  try {
    initializeDatabase();
    const passwordHash = await bcrypt.hash(DEMO_USER.password, BCRYPT_ROUNDS);
    const { transactions, snapshots } = seedDatabase(passwordHash);
    const counts = transactions.reduce((result, transaction) => {
      result[transaction.type] += 1;
      return result;
    }, { sale: 0, expense: 0, credit_given: 0, repayment: 0 });
    const latest = snapshots[snapshots.length - 1].metrics;

    console.log(`Demo database seeded at ${databasePath}`);
    console.log('Demo login credentials:');
    console.log(`  Email: ${DEMO_USER.email}`);
    console.log(`  Password: ${DEMO_USER.password}`);
    console.log(`Transactions inserted: ${transactions.length} (sales: ${counts.sale}, expenses: ${counts.expense}, credit given: ${counts.credit_given}, repayments: ${counts.repayment})`);
    console.log(`Score snapshots inserted: ${snapshots.length}`);
    console.log(`Latest score: ${latest.score}/100 (cash flow: ${latest.cashFlowConsistency}, repayment: ${latest.repaymentRatio}, revenue trend: ${latest.revenueTrend})`);
  } catch (error) {
    console.error('Demo seed failed:', error);
    process.exitCode = 1;
  } finally {
    if (db.open) {
      db.close();
    }
  }
}

main();
