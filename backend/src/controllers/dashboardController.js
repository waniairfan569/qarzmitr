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

function fetchTransactionsByType(userId, type) {
  return db.prepare(`
    SELECT id, ledger_id, user_id, type, amount, customer_name, transaction_date, note, created_at
    FROM transactions
    WHERE user_id = ? AND type = ?
    ORDER BY transaction_date DESC, created_at DESC, id DESC
  `).all(userId, type);
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

function getTransactions(req, res, next) {
  const { type } = req.query || {};

  if (type !== undefined && (typeof type !== 'string' || !VALID_TRANSACTION_TYPES.has(type))) {
    return res.status(400).json({
      message: 'Invalid transaction type. Expected sale, expense, credit_given, or repayment.'
    });
  }

  try {
    if (!userExists(req.userId)) {
      return res.status(401).json({ message: 'User account no longer exists.' });
    }

    const transactions = type === undefined
      ? fetchTransactions(req.userId)
      : fetchTransactionsByType(req.userId, type);

    return res.json({ transactions });
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