const { db } = require('../db/database');
const { buildReviewQueue } = require('../services/review');

const VALID_TYPES = new Set(['sale', 'expense', 'credit_given', 'repayment']);
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

function fetchTransactions(userId) {
  return db.prepare(`
    SELECT id, type, amount, customer_name, transaction_date, note, reviewed_at
    FROM transactions
    WHERE user_id = ?
    ORDER BY transaction_date DESC, created_at DESC, id DESC
  `).all(userId);
}

function getReview(req, res, next) {
  try {
    return res.json(buildReviewQueue(fetchTransactions(req.userId)));
  } catch (error) {
    return next(error);
  }
}

/**
 * Validates a correction before it touches the ledger. Only the four fields a
 * shopkeeper can meaningfully judge are editable; everything else about the row
 * stays as it was recorded.
 */
function validatePatch(body) {
  const patch = {};

  if (body.type !== undefined) {
    if (!VALID_TYPES.has(body.type)) {
      return { error: 'Type must be sale, expense, credit_given or repayment.' };
    }
    patch.type = body.type;
  }

  if (body.amount !== undefined) {
    const amount = typeof body.amount === 'string' ? Number(body.amount.trim()) : body.amount;
    if (!Number.isFinite(amount) || amount < 0) {
      return { error: 'Amount must be a number of zero or more.' };
    }
    patch.amount = amount;
  }

  if (body.customer_name !== undefined) {
    if (body.customer_name === null) {
      patch.customer_name = null;
    } else if (typeof body.customer_name === 'string') {
      const name = body.customer_name.trim();
      if (name.length > 100) {
        return { error: 'Customer name must be 100 characters or fewer.' };
      }
      patch.customer_name = name || null;
    } else {
      return { error: 'Customer name must be text.' };
    }
  }

  if (body.transaction_date !== undefined) {
    if (body.transaction_date === null || body.transaction_date === '') {
      patch.transaction_date = null;
    } else if (typeof body.transaction_date === 'string' && ISO_DATE.test(body.transaction_date)) {
      const [year, month, day] = body.transaction_date.split('-').map(Number);
      const parsed = new Date(Date.UTC(year, month - 1, day));
      if (
        parsed.getUTCFullYear() !== year
        || parsed.getUTCMonth() !== month - 1
        || parsed.getUTCDate() !== day
      ) {
        return { error: 'That date does not exist. Use YYYY-MM-DD.' };
      }
      patch.transaction_date = body.transaction_date;
    } else {
      return { error: 'Date must be YYYY-MM-DD, or empty.' };
    }
  }

  return { patch };
}

function updateTransaction(req, res, next) {
  const { id } = req.params;
  const body = req.body || {};

  try {
    const existing = db.prepare('SELECT id, user_id, type FROM transactions WHERE id = ?').get(id);

    if (!existing) {
      return res.status(404).json({ message: 'Transaction not found.' });
    }
    // Checked explicitly rather than relying on the query, so one shopkeeper can
    // never correct a row belonging to another.
    if (existing.user_id !== req.userId) {
      return res.status(403).json({ message: 'You do not have permission to change this transaction.' });
    }

    const { error, patch } = validatePatch(body);
    if (error) {
      return res.status(400).json({ message: error });
    }

    const nextType = patch.type || existing.type;
    const clearsName = patch.customer_name === null
      || (patch.customer_name === undefined && body.customer_name === null);
    if (['credit_given', 'repayment'].includes(nextType) && clearsName) {
      return res.status(400).json({
        message: 'Credit and repayments need a customer name so the balance can be tracked.'
      });
    }

    const fields = Object.keys(patch);
    const assignments = fields.map((field) => `${field} = ?`);
    // Confirming an already-correct row is a valid action, so an empty patch is
    // allowed and simply marks the row reviewed.
    assignments.push('reviewed_at = CURRENT_TIMESTAMP');

    db.prepare(`UPDATE transactions SET ${assignments.join(', ')} WHERE id = ?`)
      .run(...fields.map((field) => patch[field]), id);

    const updated = db.prepare(`
      SELECT id, type, amount, customer_name, transaction_date, note, reviewed_at
      FROM transactions
      WHERE id = ?
    `).get(id);

    return res.json({
      message: fields.length ? 'Transaction corrected.' : 'Transaction confirmed as correct.',
      transaction: updated
    });
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  getReview,
  updateTransaction,
  validatePatch
};
