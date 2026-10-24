const assert = require('node:assert/strict');
const { describe, it } = require('node:test');

const { buildChecks, pageTotalsCheck, salesJumpCheck, uploadSpreadCheck } = require('../src/services/verification');

const sale = (amount, date) => ({ type: 'sale', amount, transaction_date: date, source: 'ledger', edited_at: null });
const repayment = (amount, date) => ({ type: 'repayment', amount, transaction_date: date, source: 'ledger', edited_at: null });

// The footer of submission/sample-ledger-growth.png, as the vision model reads it.
const GROWTH_PAGE = 'کل فروخت / total sales: 19,000\nواپسی / repayments received: 2,500';
const GROWTH_ROWS = [sale(4600, '2026-09-01'), sale(4800, '2026-09-02'), sale(4700, '2026-09-03'), sale(4900, '2026-09-04'),
  repayment(900, '2026-09-01'), repayment(800, '2026-09-02'), repayment(800, '2026-09-03')];

describe('pageTotalsCheck', () => {
  it('passes when the totals written on the page match the entries read from it', () => {
    const check = pageTotalsCheck([{ raw_ocr_text: GROWTH_PAGE, rows: GROWTH_ROWS }]);
    assert.equal(check.status, 'pass');
    assert.match(check.detail, /All 2 totals/);
  });

  it('warns when an entry was changed so the page no longer adds up', () => {
    const inflated = GROWTH_ROWS.map((row, i) => (i === 0 ? { ...row, amount: 14600 } : row));
    const check = pageTotalsCheck([{ raw_ocr_text: GROWTH_PAGE, rows: inflated }]);
    assert.equal(check.status, 'warn');
    assert.match(check.detail, /page says 19,000, entries add up to 29,000/);
  });

  it('has nothing to say about a page with no written total', () => {
    assert.equal(pageTotalsCheck([{ raw_ocr_text: 'چینی 4600', rows: GROWTH_ROWS }]).status, 'info');
  });
});

describe('uploadSpreadCheck', () => {
  const months = [sale(100, '2026-06-01'), sale(100, '2026-07-15'), sale(100, '2026-09-30')];

  it('warns when months of entries were all photographed on one day', () => {
    assert.equal(uploadSpreadCheck(months, 1).status, 'warn');
  });

  it('passes when they were photographed on separate days', () => {
    assert.equal(uploadSpreadCheck(months, 4).status, 'pass');
  });

  it('does not judge a short history', () => {
    assert.equal(uploadSpreadCheck([sale(1, '2026-10-01'), sale(1, '2026-10-20')], 1).status, 'info');
  });
});

describe('salesJumpCheck', () => {
  const days = (from, count, amount) => Array.from({ length: count }, (_, i) => sale(amount, new Date(Date.parse(from) + i * 86400000).toISOString().slice(0, 10)));

  it('passes steady trade', () => {
    assert.equal(salesJumpCheck(days('2026-10-01', 20, 5000)).status, 'pass');
  });

  it('warns when the latest week suddenly doubles', () => {
    const rows = [...days('2026-10-01', 13, 5000), ...days('2026-10-14', 7, 15000)];
    const check = salesJumpCheck(rows);
    assert.equal(check.status, 'warn');
    assert.match(check.detail, /3\.0 times/);
  });
});

describe('buildChecks', () => {
  it('flags a record that is mostly typed or mostly changed after reading', () => {
    const typed = Array.from({ length: 6 }, () => ({ ...sale(100, '2026-10-01'), source: 'manual' }));
    const edited = Array.from({ length: 4 }, () => ({ ...sale(100, '2026-10-01'), edited_at: '2026-10-02' }));
    const byCode = Object.fromEntries(buildChecks({ pages: [], rows: [...typed, ...edited], uploadDays: 1 }).map((check) => [check.code, check.status]));
    assert.equal(byCode.typed_share, 'warn');
    assert.equal(byCode.edited_share, 'warn');
  });
});
