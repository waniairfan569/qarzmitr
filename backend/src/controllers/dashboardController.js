const { db } = require('../db/database');
const { buildCustomerBalances } = require('../services/customers');
const { PERIODS, summariseByPeriod } = require('../services/periods');
const { buildReminders } = require('../services/reminders');
const { buildReadiness } = require('../services/readiness');

const VALID_TRANSACTION_TYPES = new Set([
  'sale',
  'expense',
  'credit_given',
  'repayment'
]);

function userExists(userId) {
  return Boolean(db.prepare('SELECT id FROM users WHERE id = ?').get(userId));
}

function fetchTransactions(userId) {
  return db.prepare(`
    SELECT id, ledger_id, user_id, type, amount, customer_name, transaction_date, note, created_at
    FROM transactions
    WHERE user_id = ?
    ORDER BY transaction_date DESC, created_at DESC, id DESC
  `).all(userId);
}

/**
 * Filters by type and by date range. An undated row has no place on a
 * particular day, so once a date filter is applied undated rows drop out
 * rather than appearing under whatever range happens to be selected.
 */
function fetchFilteredTransactions(userId, { type, from, to }) {
  const clauses = ['user_id = ?'];
  const values = [userId];

  if (type) {
    clauses.push('type = ?');
    values.push(type);
  }
  if (from) {
    clauses.push('transaction_date IS NOT NULL AND transaction_date >= ?');
    values.push(from);
  }
  if (to) {
    clauses.push('transaction_date IS NOT NULL AND transaction_date <= ?');
    values.push(to);
  }

  return db.prepare(`
    SELECT id, ledger_id, user_id, type, amount, customer_name, transaction_date, note, created_at
    FROM transactions
    WHERE ${clauses.join(' AND ')}
    ORDER BY transaction_date DESC, created_at DESC, id DESC
  `).all(...values);
}

function summariseRange(transactions) {
  const totals = { sale: 0, expense: 0, credit_given: 0, repayment: 0 };

  for (const transaction of transactions) {
    const amount = Number(transaction.amount);
    if (Number.isFinite(amount) && amount > 0 && totals[transaction.type] !== undefined) {
      totals[transaction.type] += amount;
    }
  }

  return {
    ...totals,
    count: transactions.length,
    // Same signing as the score and the history, so a shopkeeper never sees two
    // different answers for the same days.
    net: totals.sale + totals.repayment - totals.expense - totals.credit_given
  };
}

function fetchScoreHistory(userId) {
  return db.prepare(`
    SELECT
      id,
      user_id,
      score,
      explanation_text,
      cash_flow_consistency,
      repayment_ratio,
      revenue_trend,
      computed_at
    FROM scores
    WHERE user_id = ?
    -- datetime() so a row written as an ISO string and one written by SQLite's
    -- CURRENT_TIMESTAMP still order by real time rather than by raw text.
    ORDER BY datetime(computed_at) ASC, computed_at ASC, id ASC
  `).all(userId);
}

function getDashboard(req, res, next) {
  try {
    if (!userExists(req.userId)) {
      return res.status(401).json({ message: 'User account no longer exists.' });
    }

    const transactions = fetchTransactions(req.userId);
    const scoreHistory = fetchScoreHistory(req.userId);
    const latestScore = scoreHistory.length > 0
      ? scoreHistory[scoreHistory.length - 1]
      : null;

    return res.json({
      transactions,
      latestScore,
      scoreHistory
    });
  } catch (error) {
    return next(error);
  }
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

function getTransactions(req, res, next) {
  const { type, from, to } = req.query || {};

  if (type !== undefined && (typeof type !== 'string' || !VALID_TRANSACTION_TYPES.has(type))) {
    return res.status(400).json({
      message: 'Invalid transaction type. Expected sale, expense, credit_given, or repayment.'
    });
  }
  for (const [name, value] of [['from', from], ['to', to]]) {
    if (value !== undefined && (typeof value !== 'string' || !ISO_DATE.test(value))) {
      return res.status(400).json({ message: `Invalid ${name} date. Expected YYYY-MM-DD.` });
    }
  }
  // Answering a backwards range with an empty list would look like "no trade"
  // rather than "you asked for nothing".
  if (from && to && from > to) {
    return res.status(400).json({ message: 'The from date must not be after the to date.' });
  }

  try {
    if (!userExists(req.userId)) {
      return res.status(401).json({ message: 'User account no longer exists.' });
    }

    const transactions = fetchFilteredTransactions(req.userId, { type, from, to });

    return res.json({ transactions, totals: summariseRange(transactions) });
  } catch (error) {
    return next(error);
  }
}

function getCustomers(req, res, next) {
  try {
    if (!userExists(req.userId)) {
      return res.status(401).json({ message: 'User account no longer exists.' });
    }

    return res.json(buildCustomerBalances(fetchTransactions(req.userId)));
  } catch (error) {
    return next(error);
  }
}

function getSummary(req, res, next) {
  const period = (req.query && req.query.period) || 'month';

  if (!PERIODS.has(period)) {
    return res.status(400).json({
      message: 'Invalid period. Expected day, week, month or year.'
    });
  }

  try {
    if (!userExists(req.userId)) {
      return res.status(401).json({ message: 'User account no longer exists.' });
    }

    return res.json(summariseByPeriod(fetchTransactions(req.userId), period));
  } catch (error) {
    return next(error);
  }
}

function getReadiness(req, res, next) {
  try {
    if (!userExists(req.userId)) {
      return res.status(401).json({ message: 'User account no longer exists.' });
    }

    const latest = db.prepare(`
      SELECT score, cash_flow_consistency, repayment_ratio, revenue_trend, computed_at
      FROM scores
      WHERE user_id = ?
      ORDER BY datetime(computed_at) DESC, computed_at DESC, id DESC
      LIMIT 1
    `).get(req.userId);

    return res.json(buildReadiness(latest, fetchTransactions(req.userId)));
  } catch (error) {
    return next(error);
  }
}

function getReminders(req, res, next) {
  try {
    const user = db.prepare('SELECT shop_name FROM users WHERE id = ?').get(req.userId);
    if (!user) {
      return res.status(401).json({ message: 'User account no longer exists.' });
    }

    const { customers } = buildCustomerBalances(fetchTransactions(req.userId));
    return res.json({ reminders: buildReminders(customers, user.shop_name) });
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  getCustomers,
  getReadiness,
  getReminders,
  getSummary,
  getDashboard,
  getTransactions
};