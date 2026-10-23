const { LENDERS } = require('../catalog/lenders');

// How far short still counts as "almost": close enough that a few more weeks
// of recorded trade or collected udhaar could close it.
const ALMOST_SCORE_GAP = 10;
const ALMOST_MONTHS_GAP = 3;

const STATUS_ORDER = { eligible: 0, almost: 1, not_yet: 2 };

/**
 * Calendar months that have at least one dated entry. Counting months with
 * entries, rather than the span from first date to last, means one misread
 * date (a 1986 for a 2026) adds a single month instead of forty years.
 */
function tradingMonths(transactions) {
  const months = new Set();
  for (const transaction of transactions) {
    const date = transaction.transaction_date;
    if (typeof date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(date)) {
      months.add(date.slice(0, 7));
    }
  }
  return months.size;
}

function matchLender(lender, { score, months, facility, amount }) {
  const missing = [];
  if (score < lender.min_score) {
    missing.push({ key: 'score', have: score, need: lender.min_score });
  }
  if (months < lender.min_months) {
    missing.push({ key: 'history', have: months, need: lender.min_months });
  }
  if (amount && amount > lender.max_loan) {
    missing.push({ key: 'amount', have: amount, need: lender.max_loan });
  }

  let status = 'eligible';
  if (missing.length > 0) {
    // A loan larger than the lender ever makes cannot be fixed by waiting.
    const far = missing.some((gap) => gap.key === 'amount'
      || (gap.key === 'score' && gap.need - gap.have > ALMOST_SCORE_GAP)
      || (gap.key === 'history' && gap.need - gap.have > ALMOST_MONTHS_GAP));
    status = far ? 'not_yet' : 'almost';
  }

  return {
    id: lender.id,
    name: lender.name,
    name_ur: lender.name_ur,
    type: lender.type,
    website: lender.website,
    focus: lender.focus || null,
    documents: lender.documents,
    criteria: {
      min_score: lender.min_score,
      min_months: lender.min_months,
      max_loan: lender.max_loan
    },
    status,
    missing,
    // What the ledger supports, capped at what this lender lends. Shown only
    // when every criterion is met, so it never reads as a promise to the rest.
    indicative_amount: status === 'eligible' && facility > 0 ? Math.min(facility, lender.max_loan) : null
  };
}

/**
 * Matches a shopkeeper against each lender's criteria with fixed rules, the
 * same way the score is computed: no model is involved, and the same ledger
 * always gives the same list.
 */
function buildLoanOptions({ readiness, transactions, amount = null, lenders = LENDERS }) {
  if (!readiness.has_score) {
    return {
      has_score: false,
      message: 'Upload a ledger page and compute a score to see which lenders could work with you.'
    };
  }

  const months = tradingMonths(transactions);
  const profile = {
    score: readiness.score,
    months,
    facility: readiness.indicative_facility,
    amount
  };

  const options = lenders
    .map((lender) => matchLender(lender, profile))
    .sort((left, right) => (STATUS_ORDER[left.status] - STATUS_ORDER[right.status])
      || (right.criteria.max_loan - left.criteria.max_loan));

  return {
    has_score: true,
    score: readiness.score,
    history_months: months,
    indicative_facility: readiness.indicative_facility,
    requested_amount: amount,
    criteria_are_examples: true,
    options
  };
}

module.exports = {
  ALMOST_MONTHS_GAP,
  ALMOST_SCORE_GAP,
  buildLoanOptions,
  matchLender,
  tradingMonths
};
