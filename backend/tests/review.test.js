process.env.DATABASE_URL = ':memory:';

const assert = require('node:assert/strict');
const { describe, it } = require('node:test');

const { initializeDatabase } = require('../src/db/database');

initializeDatabase();

const { buildReviewQueue, reasonsFor } = require('../src/services/review');
const { validatePatch } = require('../src/controllers/reviewController');

function row(overrides) {
  return {
    id: 'row-1',
    type: 'sale',
    amount: 500,
    customer_name: null,
    transaction_date: '2026-09-01',
    note: null,
    reviewed_at: null,
    ...overrides
  };
}

describe('reasonsFor', () => {
  it('finds nothing wrong with a complete row', () => {
    assert.deepEqual(reasonsFor(row()), []);
  });

  it('flags credit with no customer name as the most serious gap', () => {
    const reasons = reasonsFor(row({ type: 'credit_given', customer_name: null }));
    assert.equal(reasons[0].code, 'missing_customer');
    assert.equal(reasons[0].severity, 'high');
  });

  it('does not demand a name on a sale or an expense', () => {
    assert.deepEqual(reasonsFor(row({ type: 'sale', customer_name: null })), []);
    assert.deepEqual(reasonsFor(row({ type: 'expense', customer_name: null })), []);
  });

  it('picks up the wording the structuring step uses when it is unsure', () => {
    for (const note of [
      'uncertain: could be flour',
      'likely dairy product',
      'unclear handwriting',
      'assumed to be a sale'
    ]) {
      const reasons = reasonsFor(row({ note }));
      assert.equal(reasons[0].code, 'uncertain_reading', `missed: ${note}`);
      assert.equal(reasons[0].detail, note);
    }
  });

  it('leaves a confident note alone', () => {
    assert.deepEqual(reasonsFor(row({ note: 'cash sale of 2kg sugar' })), []);
  });

  it('flags an undated row, which the score cannot use', () => {
    assert.equal(reasonsFor(row({ transaction_date: null }))[0].code, 'missing_date');
    assert.equal(reasonsFor(row({ transaction_date: '13-08-2026' }))[0].code, 'missing_date');
  });

  it('reports every problem on one row', () => {
    const reasons = reasonsFor(row({ type: 'repayment', customer_name: null, note: 'uncertain', transaction_date: null }));
    assert.deepEqual(reasons.map((reason) => reason.code), ['missing_customer', 'uncertain_reading', 'missing_date']);
  });
});

describe('buildReviewQueue', () => {
  it('lists only rows that need attention', () => {
    const queue = buildReviewQueue([
      row({ id: 'clean' }),
      row({ id: 'undated', transaction_date: null })
    ]);

    assert.equal(queue.items.length, 1);
    assert.equal(queue.items[0].id, 'undated');
  });

  it('drops a row once it has been reviewed', () => {
    const queue = buildReviewQueue([
      row({ id: 'fixed', transaction_date: null, reviewed_at: '2026-09-04 10:00:00' })
    ]);
    assert.deepEqual(queue.items, []);
  });

  it('puts the most damaging problems first', () => {
    const queue = buildReviewQueue([
      row({ id: 'low', transaction_date: null }),
      row({ id: 'high', type: 'credit_given', customer_name: null }),
      row({ id: 'medium', note: 'uncertain: maybe rice' })
    ]);

    assert.deepEqual(queue.items.map((item) => item.id), ['high', 'medium', 'low']);
  });

  it('counts the queue by severity', () => {
    const queue = buildReviewQueue([
      row({ id: 'a', type: 'credit_given', customer_name: null }),
      row({ id: 'b', note: 'likely flour' }),
      row({ id: 'c', transaction_date: null }),
      row({ id: 'd' })
    ]);

    assert.deepEqual(queue.summary, { total: 3, high: 1, medium: 1, low: 1 });
  });

  it('returns an empty queue for a clean ledger', () => {
    const queue = buildReviewQueue([row(), row({ id: 'two' })]);
    assert.deepEqual(queue.items, []);
    assert.equal(queue.summary.total, 0);
  });
});

describe('validatePatch', () => {
  it('accepts a correction to every editable field', () => {
    const { patch, error } = validatePatch({
      type: 'expense',
      amount: '1250',
      customer_name: '  Nasreen Bibi ',
      transaction_date: '2026-09-02'
    });

    assert.equal(error, undefined);
    assert.deepEqual(patch, {
      type: 'expense',
      amount: 1250,
      customer_name: 'Nasreen Bibi',
      transaction_date: '2026-09-02'
    });
  });

  it('refuses a type outside the four the ledger allows', () => {
    assert.match(validatePatch({ type: 'refund' }).error, /sale, expense/);
  });

  it('refuses an amount that is not a number, or is negative', () => {
    assert.match(validatePatch({ amount: 'abc' }).error, /number/);
    assert.match(validatePatch({ amount: -5 }).error, /number/);
  });

  it('refuses a date that does not exist', () => {
    assert.match(validatePatch({ transaction_date: '2026-02-30' }).error, /does not exist/);
    assert.match(validatePatch({ transaction_date: '02-09-2026' }).error, /YYYY-MM-DD/);
  });

  it('allows a date to be cleared', () => {
    assert.equal(validatePatch({ transaction_date: '' }).patch.transaction_date, null);
    assert.equal(validatePatch({ transaction_date: null }).patch.transaction_date, null);
  });

  it('treats a blank customer name as no name', () => {
    assert.equal(validatePatch({ customer_name: '   ' }).patch.customer_name, null);
  });

  it('returns an empty patch when nothing was changed, so a row can just be confirmed', () => {
    assert.deepEqual(validatePatch({}).patch, {});
  });
});
