const { randomUUID } = require('crypto');
const { db } = require('../db/database');
const {
  STRUCTURE_MODEL,
  StructureServiceError,
  structureLedgerText
} = require('../services/structure');

const VALID_TRANSACTION_TYPES = new Set([
  'sale',
  'expense',
  'credit_given',
  'repayment'
]);
const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

const insertTransaction = db.prepare(`
  INSERT INTO transactions (
    id, ledger_id, user_id, type, amount, customer_name, transaction_date, note
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
`);

const insertTransactionBatch = db.transaction((transactions) => {
  for (const transaction of transactions) {
    insertTransaction.run(
      transaction.id,
      transaction.ledger_id,
      transaction.user_id,
      transaction.type,
      transaction.amount,
      transaction.customer_name,
      transaction.transaction_date,
      transaction.note
    );
  }
});

function warning(index, field, message) {
  return { index, field, message };
}

function validateModelTransactions(modelTransactions, { ledgerId, userId }) {
  const transactions = [];
  const warnings = [];

  modelTransactions.forEach((modelTransaction, index) => {
    if (!modelTransaction || typeof modelTransaction !== 'object' || Array.isArray(modelTransaction)) {
      warnings.push(warning(index, 'transaction', 'Skipped: transaction must be a JSON object.'));
      return;
    }

    if (!VALID_TRANSACTION_TYPES.has(modelTransaction.type)) {
      warnings.push(warning(
        index,
        'type',
        `Skipped: invalid transaction type "${String(modelTransaction.type)}".`
      ));
      return;
    }

    const rawAmount = modelTransaction.amount;
    const amount = typeof rawAmount === 'number'
      ? rawAmount
      : (typeof rawAmount === 'string' && rawAmount.trim() ? Number(rawAmount) : Number.NaN);
    if (!Number.isFinite(amount)) {
      warnings.push(warning(
        index,
        'amount',
        `Skipped: amount "${String(modelTransaction.amount)}" is not numeric.`
      ));
      return;
    }

    let customerName = null;
    if (modelTransaction.customer_name !== null && modelTransaction.customer_name !== undefined) {
      if (typeof modelTransaction.customer_name === 'string') {
        customerName = modelTransaction.customer_name.trim() || null;
      } else {
        warnings.push(warning(index, 'customer_name', 'Non-string customer name was stored as null.'));
      }
    }

    let transactionDate = null;
    if (modelTransaction.date !== null && modelTransaction.date !== undefined) {
      if (typeof modelTransaction.date === 'string' && ISO_DATE_PATTERN.test(modelTransaction.date)) {
        transactionDate = modelTransaction.date;
      } else {
        warnings.push(warning(index, 'date', 'Invalid date was stored as null; expected YYYY-MM-DD.'));
      }
    }

    const note = typeof modelTransaction.note === 'string'
      ? modelTransaction.note.trim() || null
      : null;
    if (note && note.toLowerCase().includes('uncertain')) {
      warnings.push(warning(index, 'note', note));
    }

    transactions.push({
      id: randomUUID(),
      ledger_id: ledgerId,
      user_id: userId,
      type: modelTransaction.type,
      amount,
      customer_name: customerName,
      transaction_date: transactionDate,
      note
    });
  });

  return { transactions, warnings };
}

async function structureLedger(req, res, next) {
  const { ledger_id: ledgerId } = req.body || {};
  if (typeof ledgerId !== 'string' || !ledgerId.trim()) {
    return res.status(400).json({ message: 'ledger_id is required and must be a non-empty string.' });
  }

  try {
    const ledger = db.prepare(`
      SELECT id, user_id, raw_ocr_text
      FROM ledgers
      WHERE id = ?
    `).get(ledgerId.trim());

    if (!ledger) {
      return res.status(404).json({ message: 'Ledger not found.' });
    }
    if (ledger.user_id !== req.userId) {
      return res.status(403).json({ message: 'You do not have permission to structure this ledger.' });
    }
    if (typeof ledger.raw_ocr_text !== 'string' || !ledger.raw_ocr_text.trim()) {
      return res.status(400).json({
        message: 'This ledger has no OCR text to structure. Complete OCR before structuring transactions.'
      });
    }

    let result;
    try {
      result = await structureLedgerText(ledger.raw_ocr_text);
    } catch (error) {
      if (error instanceof StructureServiceError) {
        console.error('Transaction structuring failed:', error.cause || error);
        const message = error.code === 'MALFORMED_MODEL_OUTPUT'
          ? `${error.message} Raw model output: ${error.rawOutput}`
          : error.message;
        return res.status(502).json({ message });
      }
      throw error;
    }

    if (result.status === 'skipped') {
      return res.status(200).json({
        message: 'Transaction structuring was skipped because DASHSCOPE_API_KEY is not configured.',
        status: 'skipped',
        model: STRUCTURE_MODEL,
        ledger_id: ledger.id,
        count: 0,
        transactions: [],
        warnings: [],
        reason: result.reason
      });
    }

    const { transactions, warnings } = validateModelTransactions(result.transactions, {
      ledgerId: ledger.id,
      userId: req.userId
    });
    insertTransactionBatch(transactions);

    return res.status(201).json({
      message: 'Ledger transactions structured successfully.',
      status: 'completed',
      model: STRUCTURE_MODEL,
      ledger_id: ledger.id,
      count: transactions.length,
      transactions,
      warnings
    });
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  structureLedger,
  validateModelTransactions
};