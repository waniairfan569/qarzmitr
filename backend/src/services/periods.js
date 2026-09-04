const DAY_MS = 24 * 60 * 60 * 1000;

const PERIODS = new Set(['day', 'week', 'month', 'year']);

// Sales and repayments bring money in; expenses and credit given take it out.
// This is the same signing the cash flow metric uses, so the two agree.
const INFLOW = new Set(['sale', 'repayment']);

function isIsoDate(value) {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function amountOf(transaction) {
  const amount = Number(transaction.amount);
  return Number.isFinite(amount) ? Math.max(0, amount) : 0;
}

function mondayOf(date) {
  const timestamp = Date.parse(date);
  const weekday = (new Date(timestamp).getUTCDay() + 6) % 7;
  return new Date(timestamp - (weekday * DAY_MS)).toISOString().slice(0, 10);
}

function bucketKey(date, period) {
  if (period === 'day') return date;
  if (period === 'week') return mondayOf(date);
  if (period === 'month') return date.slice(0, 7);
  return date.slice(0, 4);
}

function labelFor(key, period) {
  if (period === 'week') return `Week of ${key}`;
  return key;
}

function emptyBucket(key, period) {
  return {
    key,
    label: labelFor(key, period),
    sales: 0,
    expenses: 0,
    credit_given: 0,
    repayments: 0,
    net: 0,
    transactions: 0
  };
}

/**
 * Groups a ledger into day, week, month or year buckets. Only periods the
 * ledger actually covers are returned — a gap is a week with no recorded
 * entries, which is not the same as a week that earned nothing.
 */
function summariseByPeriod(transactions, period = 'month') {
  if (!PERIODS.has(period)) {
    throw new TypeError(`Unknown period "${period}". Expected day, week, month or year.`);
  }

  const buckets = new Map();
  let undated = 0;

  for (const transaction of transactions) {
    if (!isIsoDate(transaction.transaction_date)) {
      undated += 1;
      continue;
    }

    const key = bucketKey(transaction.transaction_date, period);
    if (!buckets.has(key)) buckets.set(key, emptyBucket(key, period));

    const bucket = buckets.get(key);
    const amount = amountOf(transaction);
    bucket.transactions += 1;

    if (transaction.type === 'sale') bucket.sales += amount;
    else if (transaction.type === 'expense') bucket.expenses += amount;
    else if (transaction.type === 'credit_given') bucket.credit_given += amount;
    else if (transaction.type === 'repayment') bucket.repayments += amount;

    bucket.net += INFLOW.has(transaction.type) ? amount : -amount;
  }

  const periods = [...buckets.values()].sort((left, right) => left.key.localeCompare(right.key));

  const totals = periods.reduce((sum, bucket) => ({
    sales: sum.sales + bucket.sales,
    expenses: sum.expenses + bucket.expenses,
    credit_given: sum.credit_given + bucket.credit_given,
    repayments: sum.repayments + bucket.repayments,
    net: sum.net + bucket.net,
    transactions: sum.transactions + bucket.transactions
  }), { sales: 0, expenses: 0, credit_given: 0, repayments: 0, net: 0, transactions: 0 });

  const best = periods.reduce((top, bucket) => (!top || bucket.net > top.net ? bucket : top), null);

  return {
    period,
    periods,
    totals,
    // Undated rows are counted rather than dropped silently, so the page can
    // say how much of the ledger it could not place in time.
    undated_transactions: undated,
    best_period: best ? { key: best.key, label: best.label, net: best.net } : null,
    average_net: periods.length ? Math.round((totals.net / periods.length) * 100) / 100 : 0
  };
}

module.exports = {
  PERIODS,
  bucketKey,
  mondayOf,
  summariseByPeriod
};
