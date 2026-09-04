const DAY_MS = 24 * 60 * 60 * 1000;

// Only credit and repayment lines say anything about what a customer owes.
// Sales and expenses are excluded even when a name is attached, so a walk-in
// buyer never appears as a debtor.
const LEDGER_TYPES = new Set(['credit_given', 'repayment']);

function normalizeName(name) {
  return typeof name === 'string' ? name.trim().replace(/\s+/g, ' ') : '';
}

// Lowercased, punctuation stripped — used only for comparing two names, never
// for display. The name shown back is always what the ledger actually said.
function comparableName(name) {
  return normalizeName(name)
    .toLowerCase()
    .replace(/[.,'’`-]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function editDistance(left, right) {
  if (left === right) return 0;
  if (Math.abs(left.length - right.length) > 2) return 3;

  let previous = Array.from({ length: right.length + 1 }, (unused, index) => index);

  for (let i = 1; i <= left.length; i += 1) {
    const current = [i];
    for (let j = 1; j <= right.length; j += 1) {
      current[j] = Math.min(
        previous[j] + 1,
        current[j - 1] + 1,
        previous[j - 1] + (left[i - 1] === right[j - 1] ? 0 : 1)
      );
    }
    previous = current;
  }

  return previous[right.length];
}

/**
 * Two spellings are the same customer when either:
 *
 *   - the shorter name is how you would shorten the longer one, i.e. its words
 *     are a leading run of the longer name's words ("Nasreen" for
 *     "Nasreen Bibi"). Matching on a trailing word is deliberately refused,
 *     because "Ali" and "Imran Ali" are very often two different people; or
 *   - they differ by a single character in a name long enough for that to read
 *     as a slip rather than a different person ("Nasreen" / "Nasreem").
 *
 * Anything less certain is left as two customers. Wrongly merging two people
 * puts one person's debt on another's name, which is far worse than showing a
 * shopkeeper two rows they can recognise as the same person.
 */
function looksLikeSamePerson(left, right) {
  if (left === right) return true;

  const leftWords = left.split(' ');
  const rightWords = right.split(' ');
  const [shorter, longer] = leftWords.length <= rightWords.length
    ? [leftWords, rightWords]
    : [rightWords, leftWords];

  if (shorter.every((word, index) => word === longer[index])) {
    return true;
  }

  return Math.min(left.length, right.length) >= 5 && editDistance(left, right) <= 1;
}

/**
 * Collapses spelling variants onto one canonical name. The fullest spelling
 * wins, since it carries the most information for the shopkeeper to recognise.
 */
function canonicaliseNames(names) {
  const cleaned = names.map(normalizeName).filter(Boolean);
  const unique = [...new Set(cleaned)];
  const frequency = cleaned.reduce((counts, name) => counts.set(name, (counts.get(name) || 0) + 1), new Map());
  const capitalisedWords = (name) => name.split(' ').filter((word) => /^[A-Z؀-ۿ]/.test(word)).length;

  // Longest first so a shortening attaches to the fullest spelling rather than
  // the reverse. Between equal-length spellings prefer the one written as a
  // name — properly capitalised, and failing that the one used most often.
  const ordered = [...unique].sort((a, b) => (
    b.length - a.length
    || capitalisedWords(b) - capitalisedWords(a)
    || (frequency.get(b) - frequency.get(a))
    || a.localeCompare(b)
  ));

  const groups = [];
  const mapping = new Map();

  for (const name of ordered) {
    const comparable = comparableName(name);
    const match = groups.find((group) => group.members
      .some((member) => looksLikeSamePerson(comparable, comparableName(member))));

    if (match) {
      match.members.push(name);
      mapping.set(name, match.canonical);
    } else {
      groups.push({ canonical: name, members: [name] });
      mapping.set(name, name);
    }
  }

  return { mapping, groups };
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
  const relevant = transactions.filter((transaction) => LEDGER_TYPES.has(transaction.type));
  const { mapping, groups } = canonicaliseNames(relevant.map((row) => row.customer_name));
  const aliasesOf = new Map(groups.map((group) => [
    group.canonical,
    [...new Set(group.members)].filter((member) => member !== group.canonical)
  ]));

  const byName = new Map();

  for (const transaction of relevant) {
    const written = normalizeName(transaction.customer_name);
    if (!written) continue;

    const name = mapping.get(written) || written;

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
      // Other spellings of this name found on the ledger, so a merge is visible
      // to the shopkeeper rather than silent.
      aliases: aliasesOf.get(entry.name) || [],
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
  canonicaliseNames,
  comparableName,
  editDistance,
  looksLikeSamePerson,
  normalizeName,
  oldestUnsettledDate
};
