const assert = require('node:assert/strict');
const { describe, it } = require('node:test');

const { bucketKey, mondayOf, summariseByPeriod } = require('../src/services/periods');

const T = (type, amount, date) => ({ type, amount, transaction_date: date });

describe('mondayOf', () => {
  it('anchors any day to the Monday of its week', () => {
    // 2026-08-31 is a Monday; the 1st to the 6th of September fall in that week.
    assert.equal(mondayOf('2026-08-31'), '2026-08-31');
    assert.equal(mondayOf('2026-09-01'), '2026-08-31');
    assert.equal(mondayOf('2026-09-06'), '2026-08-31');
    assert.equal(mondayOf('2026-09-07'), '2026-09-07');
  });
});

describe('bucketKey', () => {
  it('keys each period at the right granularity', () => {
    assert.equal(bucketKey('2026-09-03', 'day'), '2026-09-03');
    assert.equal(bucketKey('2026-09-03', 'week'), '2026-08-31');
    assert.equal(bucketKey('2026-09-03', 'month'), '2026-09');
    assert.equal(bucketKey('2026-09-03', 'year'), '2026');
  });
});

describe('summariseByPeriod', () => {
  const ledger = [
    T('sale', 4000, '2026-08-15'),
    T('expense', 1000, '2026-08-15'),
    T('credit_given', 1500, '2026-08-16'),
    T('repayment', 500, '2026-09-02'),
    T('sale', 3000, '2026-09-02'),
    T('sale', 2000, '2027-01-10')
  ];

  it('rejects a period it does not know', () => {
    assert.throws(() => summariseByPeriod([], 'fortnight'), TypeError);
  });

  it('groups by month and signs the net correctly', () => {
    const result = summariseByPeriod(ledger, 'month');
    const august = result.periods.find((p) => p.key === '2026-08');

    assert.equal(august.sales, 4000);
    assert.equal(august.expenses, 1000);
    assert.equal(august.credit_given, 1500);
    // 4000 in, 1000 + 1500 out
    assert.equal(august.net, 1500);
    assert.equal(august.transactions, 3);
  });

  it('returns periods in chronological order', () => {
    const result = summariseByPeriod(ledger, 'month');
    assert.deepEqual(result.periods.map((p) => p.key), ['2026-08', '2026-09', '2027-01']);
  });

  it('groups by day, week and year at the right granularity', () => {
    assert.equal(summariseByPeriod(ledger, 'day').periods.length, 4);
    assert.equal(summariseByPeriod(ledger, 'year').periods.length, 2);

    const weeks = summariseByPeriod(ledger, 'week');
    assert.ok(weeks.periods.every((p) => p.label.startsWith('Week of ')));
  });

  it('counts undated rows instead of dropping them silently', () => {
    const result = summariseByPeriod([...ledger, T('sale', 900, null), T('sale', 100, 'yesterday')], 'month');
    assert.equal(result.undated_transactions, 2);
    // Undated money must not leak into a period it cannot be placed in.
    assert.equal(result.totals.sales, 9000);
  });

  it('totals every period and reports the best one', () => {
    const result = summariseByPeriod(ledger, 'month');
    assert.equal(result.totals.sales, 9000);
    assert.equal(result.totals.transactions, 6);
    // September nets 3500 — a 3000 sale plus a 500 repayment, nothing going out.
    assert.equal(result.best_period.key, '2026-09');
    assert.equal(result.best_period.net, 3500);
  });

  it('averages net income across the periods the ledger covers', () => {
    // Nets are 1500, 3500 and 2000 across three months.
    const result = summariseByPeriod(ledger, 'month');
    assert.equal(result.average_net, Math.round((7000 / 3) * 100) / 100);
  });

  it('handles an empty ledger without inventing a period', () => {
    const result = summariseByPeriod([], 'month');
    assert.deepEqual(result.periods, []);
    assert.equal(result.best_period, null);
    assert.equal(result.average_net, 0);
  });

  it('ignores negative and unnumeric amounts', () => {
    const result = summariseByPeriod([T('sale', -500, '2026-08-15'), T('sale', 'abc', '2026-08-15')], 'month');
    assert.equal(result.totals.sales, 0);
  });
});
