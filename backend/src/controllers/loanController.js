const { findLender } = require('../catalog/lenders');
const { buildLoanOptions } = require('../services/loanOptions');
const { buildReadiness } = require('../services/readiness');
const {
  buildSharedStatement,
  createShare,
  listShares,
  openShare,
  revokeShare
} = require('../services/shares');
const { fetchLatestScore, fetchTransactions, userExists } = require('./dashboardController');

const MAX_REQUESTED_AMOUNT = 10_000_000;

/** An optional "how much do you need" amount: a whole number of rupees, or nothing. */
function parseAmount(value) {
  if (value === undefined || value === '') return { amount: null };
  const amount = Number(value);
  if (!Number.isInteger(amount) || amount <= 0 || amount > MAX_REQUESTED_AMOUNT) {
    return { error: `amount must be a whole number of rupees between 1 and ${MAX_REQUESTED_AMOUNT}.` };
  }
  return { amount };
}

function getLoanOptions(req, res, next) {
  try {
    if (!userExists(req.userId)) {
      return res.status(401).json({ message: 'User account no longer exists.' });
    }

    const { amount, error } = parseAmount(req.query.amount);
    if (error) return res.status(400).json({ message: error });

    const transactions = fetchTransactions(req.userId);
    const readiness = buildReadiness(fetchLatestScore(req.userId), transactions);
    return res.json(buildLoanOptions({ readiness, transactions, amount }));
  } catch (error) {
    return next(error);
  }
}

function postShare(req, res, next) {
  try {
    if (!userExists(req.userId)) {
      return res.status(401).json({ message: 'User account no longer exists.' });
    }

    const { lender_id: lenderId, consent } = req.body || {};
    // Consent is checked on the server too, so no client can share by skipping the screen.
    if (consent !== true) {
      return res.status(400).json({ message: 'Confirm that you agree to share your statement before a link is made.' });
    }
    if (!findLender(lenderId)) {
      return res.status(400).json({ message: 'Choose a lender from the list.' });
    }
    if (!fetchLatestScore(req.userId)) {
      return res.status(409).json({ message: 'Compute a score before sharing a statement.' });
    }

    const { token, share } = createShare(req.userId, lenderId);
    return res.status(201).json({ token, share });
  } catch (error) {
    return next(error);
  }
}

function getShares(req, res, next) {
  try {
    return res.json({ shares: listShares(req.userId) });
  } catch (error) {
    return next(error);
  }
}

function postRevokeShare(req, res, next) {
  try {
    if (!revokeShare(req.userId, req.params.id)) {
      return res.status(404).json({ message: 'That link was not found or is already withdrawn.' });
    }
    return res.json({ message: 'Link withdrawn.' });
  } catch (error) {
    return next(error);
  }
}

/** Public: anyone holding a live link sees the statement, and nothing else. */
function getSharedStatement(req, res, next) {
  try {
    const share = openShare(req.params.token);
    // One answer for unknown, expired and withdrawn links, so a guess learns nothing.
    if (!share) {
      return res.status(404).json({ message: 'This link has expired or was withdrawn by the shopkeeper.' });
    }

    const lender = findLender(share.lender_id);
    return res.json({
      ...buildSharedStatement(share.user_id),
      shared_for: lender ? { id: lender.id, name: lender.name, name_ur: lender.name_ur } : null,
      expires_at: share.expires_at
    });
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  getLoanOptions,
  getShares,
  getSharedStatement,
  parseAmount,
  postRevokeShare,
  postShare
};
