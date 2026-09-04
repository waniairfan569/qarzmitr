/**
 * Turns the pipeline's own doubts into a list a shopkeeper can act on.
 *
 * Flagging an uncertain transcription is only half the promise. Until the
 * flagged row can be corrected, the shopkeeper is told something might be wrong
 * and given no way to fix it.
 */

const UNCERTAIN_NOTE = /uncertain|unclear|likely|assum|probabl|possibly|\?/i;
const NEEDS_A_NAME = new Set(['credit_given', 'repayment']);

function isIsoDate(value) {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value);
}

/**
 * Reasons are ordered by how much damage the gap does, most serious first.
 * A credit line with no name cannot be chased or repaid against at all, so it
 * outranks a row that is merely undated.
 */
function reasonsFor(transaction) {
  const reasons = [];

  if (NEEDS_A_NAME.has(transaction.type) && !String(transaction.customer_name || '').trim()) {
    reasons.push({
      code: 'missing_customer',
      severity: 'high',
      label: 'No customer name',
      detail: 'Credit and repayments need a name, otherwise this cannot be tracked against anyone.'
    });
  }

  if (typeof transaction.note === 'string' && UNCERTAIN_NOTE.test(transaction.note)) {
    reasons.push({
      code: 'uncertain_reading',
      severity: 'medium',
      label: 'Unsure reading',
      detail: transaction.note.trim()
    });
  }

  if (!isIsoDate(transaction.transaction_date)) {
    reasons.push({
      code: 'missing_date',
      severity: 'low',
      label: 'No date',
      detail: 'Undated rows are left out of the weekly and monthly figures your score is measured on.'
    });
  }

  return reasons;
}

const SEVERITY_RANK = { high: 0, medium: 1, low: 2 };

function buildReviewQueue(transactions) {
  const items = [];

  for (const transaction of transactions) {
    if (transaction.reviewed_at) continue;

    const reasons = reasonsFor(transaction);
    if (reasons.length === 0) continue;

    items.push({
      id: transaction.id,
      type: transaction.type,
      amount: transaction.amount,
      customer_name: transaction.customer_name,
      transaction_date: transaction.transaction_date,
      note: transaction.note,
      reasons,
      severity: reasons[0].severity
    });
  }

  items.sort((left, right) => (
    SEVERITY_RANK[left.severity] - SEVERITY_RANK[right.severity]
    || String(right.transaction_date || '').localeCompare(String(left.transaction_date || ''))
  ));

  return {
    items,
    summary: {
      total: items.length,
      high: items.filter((item) => item.severity === 'high').length,
      medium: items.filter((item) => item.severity === 'medium').length,
      low: items.filter((item) => item.severity === 'low').length
    }
  };
}

module.exports = {
  UNCERTAIN_NOTE,
  buildReviewQueue,
  reasonsFor
};
