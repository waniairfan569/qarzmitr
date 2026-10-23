process.env.DATABASE_URL = ':memory:';

const assert = require('node:assert/strict');
const { describe, it } = require('node:test');

const { initializeDatabase } = require('../src/db/database');

initializeDatabase();

const { isPlausibleDate, repairDate } = require('../src/services/dates');
const { validateModelTransactions } = require('../src/controllers/structureController');
const { reasonsFor } = require('../src/services/review');

const TODAY = new Date('2026-10-24T12:00:00Z');

describe('isPlausibleDate', () => {
  it('accepts recent dates and the next few days', () => {
    for (const date of ['2026-10-24', '2026-10-03', '2025-11-01', '2026-10-30']) {
      assert.equal(isPlausibleDate(date, TODAY), true, date);
    }
  });

  it('rejects dates over a year old, far ahead, or that do not exist', () => {
    for (const date of ['1986-10-03', '2025-10-01', '2026-12-25', '2026-02-30', '03-10-86', null]) {
      assert.equal(isPlausibleDate(date, TODAY), false, String(date));
    }
  });
});

describe('repairDate', () => {
  it('leaves a plausible date alone', () => {
    assert.deepEqual(repairDate('2026-10-03', TODAY), { date: '2026-10-03', repaired: false });
  });

  it('turns a page read as 1986 into this year, keeping day and month', () => {
    assert.deepEqual(repairDate('1986-10-03', TODAY), { date: '2026-10-03', repaired: true });
  });

  it('uses last year when this year would be in the future', () => {
    assert.deepEqual(repairDate('1986-12-20', TODAY), { date: '2025-12-20', repaired: true });
  });

  it('gives up on a day that exists in no recent year', () => {
    assert.deepEqual(repairDate('1986-02-30', TODAY), { date: null, repaired: false });
  });
});

describe('structuring a page whose year was misread', () => {
  const OWNER = { ledgerId: 'ledger-1', userId: 'user-1', today: TODAY };

  it('stores this year and flags the row for the shopkeeper to confirm', () => {
    const { transactions, warnings } = validateModelTransactions([
      { type: 'sale', amount: 20950, customer_name: null, date: '1986-10-03', note: 'total bakery sales' }
    ], OWNER);

    assert.equal(transactions[0].transaction_date, '2026-10-03');
    assert.match(transactions[0].note, /^total bakery sales; uncertain: date read as 1986-10-03, year assumed 2026$/);
    assert.equal(warnings.length, 1);
    // The note makes it show up in "To check".
    assert.equal(reasonsFor(transactions[0], TODAY)[0].code, 'uncertain_reading');
  });

  it('leaves a recent date and its note untouched', () => {
    const { transactions, warnings } = validateModelTransactions([
      { type: 'sale', amount: 500, date: '2026-10-20', note: 'cash sale' }
    ], OWNER);
    assert.equal(transactions[0].transaction_date, '2026-10-20');
    assert.equal(transactions[0].note, 'cash sale');
    assert.deepEqual(warnings, []);
  });
});

describe('rows already saved with an unlikely date', () => {
  it('are flagged as high severity in To check', () => {
    const reasons = reasonsFor({ type: 'sale', amount: 500, transaction_date: '1986-10-03', note: null }, TODAY);
    assert.equal(reasons[0].code, 'unlikely_date');
    assert.equal(reasons[0].severity, 'high');
  });
});
