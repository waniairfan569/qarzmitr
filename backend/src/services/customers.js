const DAY_MS = 24 * 60 * 60 * 1000;

// Only credit and repayment lines say anything about what a customer owes.
// Sales and expenses are excluded even when a name is attached, so a walk-in
// buyer never appears as a debtor.
const LEDGER_TYPES = new Set(['credit_given', 'repayment']);

function normalizeName(name) {
  return typeof name === 'string' ? name.trim().replace(/\s+/g, ' ') : '';
}

function amountOf(transaction) {
  const amount = Number(transaction.amount);
  return Number.isFinite(amount) ? Math.max(0, amount) : 0;
}

function isIsoDate(value) {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value);
}

/**
 * Settles repayments against credit oldest-first, the way a shopkeeper works
 * down a customer's page, and reports the date of the oldest credit still
 * unpaid. That date is what makes a debt feel old, not the total.
 */
function oldestUnsettledDate(credits, repayments) {
  const dated = credits
    .filter((entry) => isIsoDate(entry.date))
    .sort((left, right) => left.date.localeCompare(right.date));
  let pool = repayments.reduce((total, entry) => total + entry.amount, 0);

  for (const credit of dated) {
    if (pool >= credit.amount) {
      pool -= credit.amount;
      continue;
    }
    return credit.date;
  }

  return null;
}

function daysSince(date, today) {
  if (!isIsoDate(date)) return null;
  const elapsed = Math.floor((Date.parse(today) - Date.parse(date)) / DAY_MS);
  return Number.isFinite(elapsed) ? Math.max(0, elapsed) : null;
}

function buildCustomerBalances(transactions, today = new Date().toISOString().slice(0, 10)) {
  const byName = new Map();

  for (const transaction of transactions) {
    if (!LEDGER_TYPES.has(transaction.type)) continue;

    const name = normalizeName(transaction.customer_name);
    if (!name) continue;

    if (!byName.has(name)) {
      byName.set(name, { name, credits: [], repayments: [], lastActivity: null });
    }

    const entry = byName.get(name);
    const record = { amount: amountOf(transaction), date: transaction.transaction_date };

    if (transaction.type === 'credit_given') entry.credits.push(record);
    else entry.repayments.push(record);

    if (isIsoDate(record.date) && (!entry.lastActivity || record.date > entry.lastActivity)) {
      entry.lastActivity = record.date;
    }
  }

  const customers = [...byName.values()].map((entry) => {
    const creditGiven = entry.credits.reduce((total, item) => total + item.amount, 0);
    const repaid = entry.repayments.reduce((total, item) => total + item.amount, 0);
    const outstanding = Math.round((creditGiven - repaid) * 100) / 100;
    const oldest = outstanding > 0 ? oldestUnsettledDate(entry.credits, entry.repayments) : null;

    return {
      name: entry.name,
      credit_given: creditGiven,
      repaid,
      outstanding: Math.max(0, outstanding),
      // A customer who has paid back more than they were lent is settled, not owed to.
      overpaid: outstanding < 0 ? Math.abs(outstanding) : 0,
      settled: outstanding <= 0,
      transactions: entry.credits.length + entry.repayments.length,
      last_activity: entry.lastActivity,
      oldest_unsettled: oldest,
      days_outstanding: daysSince(oldest, today)
    };
  });

  // Largest debt first; settled customers drop to the bottom, most recent first.
  customers.sort((left, right) => (
    right.outstanding - left.outstanding
    || (right.last_activity || '').localeCompare(left.last_activity || '')
    || left.name.localeCompare(right.name)
  ));

  const owing = customers.filter((customer) => !customer.settled);

  return {
    customers,
    summary: {
      total_outstanding: Math.round(owing.reduce((total, c) => total + c.outstanding, 0) * 100) / 100,
      total_credit_given: Math.round(customers.reduce((total, c) => total + c.credit_given, 0) * 100) / 100,
      total_repaid: Math.round(customers.reduce((total, c) => total + c.repaid, 0) * 100) / 100,
      customers_owing: owing.length,
      customers_settled: customers.length - owing.length,
      oldest_days_outstanding: owing.reduce(
        (worst, c) => (c.days_outstanding !== null && c.days_outstanding > worst ? c.days_outstanding : worst),
        0
      )
    }
  };
}

module.exports = {
  buildCustomerBalances,
  normalizeName,
  oldestUnsettledDate
};
