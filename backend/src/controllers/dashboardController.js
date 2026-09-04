const { db } = require('../db/database');

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
    ORDER BY computed_at ASC, id ASC
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

module.exports = {
  getDashboard,
  getTransactions
};