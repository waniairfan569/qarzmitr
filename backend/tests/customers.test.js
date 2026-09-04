const assert = require('node:assert/strict');
const { describe, it } = require('node:test');

const {
  buildCustomerBalances,
  canonicaliseNames,
  looksLikeSamePerson,
  normalizeName,
  oldestUnsettledDate
} = require('../src/services/customers');

const TODAY = '2026-09-04';

function credit(amount, name, date) {
  return { type: 'credit_given', amount, customer_name: name, transaction_date: date };
}
function repay(amount, name, date) {
  return { type: 'repayment', amount, customer_name: name, transaction_date: date };
}
function sale(amount, name, date) {
  return { type: 'sale', amount, customer_name: name, transaction_date: date };
}

function balances(transactions) {
  return buildCustomerBalances(transactions, TODAY);
}
function find(result, name) {
  return result.customers.find((customer) => customer.name === name);
}

describe('normalizeName', () => {
  it('trims and collapses whitespace so one customer is not split in two', () => {
    assert.equal(normalizeName('  Nasreen   Bibi '), 'Nasreen Bibi');
  });

  it('returns an empty string for anything that is not a name', () => {
    for (const value of [null, undefined, 42, {}, '   ']) {
      assert.equal(normalizeName(value), '');
    }
  });
});

describe('buildCustomerBalances', () => {
  it('reports what a customer still owes', () => {
    const result = balances([
      credit(1800, 'Nasreen Bibi', '2026-08-15'),
      repay(1100, 'Nasreen Bibi', '2026-08-22')
    ]);

    const nasreen = find(result, 'Nasreen Bibi');
    assert.equal(nasreen.credit_given, 1800);
    assert.equal(nasreen.repaid, 1100);
    assert.equal(nasreen.outstanding, 700);
    assert.equal(nasreen.settled, false);
    assert.equal(nasreen.transactions, 2);
    assert.equal(nasreen.last_activity, '2026-08-22');
  });

  it('marks a fully repaid customer as settled with nothing outstanding', () => {
    const result = balances([
      credit(1000, 'Imran Ali', '2026-08-15'),
      repay(1000, 'Imran Ali', '2026-08-20')
    ]);

    const imran = find(result, 'Imran Ali');
    assert.equal(imran.outstanding, 0);
    assert.equal(imran.settled, true);
    assert.equal(imran.oldest_unsettled, null);
    assert.equal(imran.days_outstanding, null);
  });

  it('never shows a negative debt when a customer overpays', () => {
    const result = balances([
      credit(500, 'Shazia', '2026-08-15'),
      repay(800, 'Shazia', '2026-08-20')
    ]);

    const shazia = find(result, 'Shazia');
    assert.equal(shazia.outstanding, 0, 'a debt cannot go below zero');
    assert.equal(shazia.overpaid, 300);
    assert.equal(shazia.settled, true);
  });

  it('ignores sales and expenses even when a name is attached', () => {
    const result = balances([
      sale(4000, 'Walk-in customers', '2026-08-15'),
      sale(500, 'Nasreen Bibi', '2026-08-15'),
      credit(900, 'Nasreen Bibi', '2026-08-16')
    ]);

    assert.equal(result.customers.length, 1, 'a walk-in buyer is not a debtor');
    assert.equal(find(result, 'Walk-in customers'), undefined);
    assert.equal(find(result, 'Nasreen Bibi').credit_given, 900);
  });

  it('skips rows with no customer name', () => {
    const result = balances([credit(700, null, '2026-08-15'), credit(300, '  ', '2026-08-16')]);
    assert.deepEqual(result.customers, []);
    assert.equal(result.summary.total_outstanding, 0);
  });

  it('treats spacing variants of a name as the same person', () => {
    const result = balances([
      credit(600, 'Nasreen  Bibi', '2026-08-15'),
      repay(200, ' Nasreen Bibi ', '2026-08-18')
    ]);

    assert.equal(result.customers.length, 1);
    assert.equal(find(result, 'Nasreen Bibi').outstanding, 400);
  });

  it('ages the oldest debt that repayments have not yet reached', () => {
    // 500 repaid clears the first 400 credit and part of the second, so the
    // second credit is the oldest one still open.
    const result = balances([
      credit(400, 'Bilal', '2026-08-01'),
      credit(900, 'Bilal', '2026-08-20'),
      repay(500, 'Bilal', '2026-08-25')
    ]);

    const bilal = find(result, 'Bilal');
    assert.equal(bilal.outstanding, 800);
    assert.equal(bilal.oldest_unsettled, '2026-08-20');
    assert.equal(bilal.days_outstanding, 15);
  });

  it('sorts the largest debt first and pushes settled customers down', () => {
    const result = balances([
      credit(300, 'Small', '2026-08-15'),
      credit(5000, 'Large', '2026-08-15'),
      credit(900, 'Paid', '2026-08-15'),
      repay(900, 'Paid', '2026-08-16')
    ]);

    assert.deepEqual(result.customers.map((c) => c.name), ['Large', 'Small', 'Paid']);
  });

  it('summarises the book across every customer', () => {
    const result = balances([
      credit(1800, 'Nasreen Bibi', '2026-08-15'),
      repay(1100, 'Nasreen Bibi', '2026-08-22'),
      credit(2400, 'Bilal Ahmed', '2026-08-18'),
      credit(1000, 'Imran Ali', '2026-08-20'),
      repay(1000, 'Imran Ali', '2026-08-28')
    ]);

    assert.equal(result.summary.total_outstanding, 3100);
    assert.equal(result.summary.total_credit_given, 5200);
    assert.equal(result.summary.total_repaid, 2100);
    assert.equal(result.summary.customers_owing, 2);
    assert.equal(result.summary.customers_settled, 1);
    assert.equal(result.summary.oldest_days_outstanding, 20);
  });

  it('handles undated credit without crashing or inventing an age', () => {
    const result = balances([credit(700, 'Undated', null), repay(200, 'Undated', null)]);
    const entry = find(result, 'Undated');
    assert.equal(entry.outstanding, 500);
    assert.equal(entry.oldest_unsettled, null);
    assert.equal(entry.days_outstanding, null);
    assert.equal(entry.last_activity, null);
  });

  it('ignores non-numeric amounts rather than producing NaN', () => {
    const result = balances([
      credit('not a number', 'Odd', '2026-08-15'),
      credit(500, 'Odd', '2026-08-16')
    ]);
    assert.equal(find(result, 'Odd').outstanding, 500);
  });

  it('returns an empty book for an empty ledger', () => {
    const result = balances([]);
    assert.deepEqual(result.customers, []);
    assert.equal(result.summary.customers_owing, 0);
    assert.equal(result.summary.oldest_days_outstanding, 0);
  });
});

describe('oldestUnsettledDate', () => {
  it('returns null once repayments cover every credit', () => {
    assert.equal(
      oldestUnsettledDate([{ amount: 500, date: '2026-08-01' }], [{ amount: 500 }]),
      null
    );
  });

  it('returns the earliest credit when nothing has been repaid', () => {
    assert.equal(
      oldestUnsettledDate(
        [{ amount: 300, date: '2026-08-10' }, { amount: 200, date: '2026-08-02' }],
        []
      ),
      '2026-08-02'
    );
  });
});

describe('looksLikeSamePerson', () => {
  it('treats a shortened name as the same person', () => {
    assert.equal(looksLikeSamePerson('nasreen', 'nasreen bibi'), true);
    assert.equal(looksLikeSamePerson('imran', 'imran ali'), true);
  });

  it('refuses to merge on a trailing word, which is usually a different person', () => {
    // "Ali" is far more likely a second customer than a short form of "Imran Ali".
    assert.equal(looksLikeSamePerson('ali', 'imran ali'), false);
    assert.equal(looksLikeSamePerson('bibi', 'nasreen bibi'), false);
  });

  it('forgives a single-character slip in a name long enough to be sure', () => {
    assert.equal(looksLikeSamePerson('nasreen', 'nasreem'), true);
    assert.equal(looksLikeSamePerson('bilal ahmed', 'bilal ahmad'), true);
    // Too short for one character to be a typo rather than a different name.
    assert.equal(looksLikeSamePerson('ali', 'asad'), false);
  });

  it('keeps unrelated names apart', () => {
    assert.equal(looksLikeSamePerson('nasreen bibi', 'shazia parveen'), false);
  });
});

describe('canonicaliseNames', () => {
  it('picks the fullest, properly written spelling as the canonical one', () => {
    const { mapping } = canonicaliseNames(['Nasreen', 'nasreen  bibi', 'Nasreen Bibi']);
    assert.equal(mapping.get('Nasreen'), 'Nasreen Bibi');
    assert.equal(mapping.get('nasreen bibi'), 'Nasreen Bibi');
  });

  it('leaves genuinely different customers separate', () => {
    const { groups } = canonicaliseNames(['Nasreen Bibi', 'Shazia Parveen', 'Bilal Ahmed']);
    assert.equal(groups.length, 3);
  });
});

describe('buildCustomerBalances with spelling variants', () => {
  it('adds up one customer written three different ways', () => {
    const result = balances([
      credit(1000, 'Nasreen Bibi', '2026-08-01'),
      repay(400, 'Nasreen', '2026-08-10'),
      credit(500, 'nasreen  bibi', '2026-08-20')
    ]);

    assert.equal(result.customers.length, 1, 'one person, not three');
    const nasreen = result.customers[0];
    assert.equal(nasreen.name, 'Nasreen Bibi');
    assert.equal(nasreen.credit_given, 1500);
    assert.equal(nasreen.repaid, 400);
    assert.equal(nasreen.outstanding, 1100);
  });

  it('reports the other spellings so the merge is visible, not silent', () => {
    const result = balances([
      credit(1000, 'Nasreen Bibi', '2026-08-01'),
      repay(400, 'Nasreen', '2026-08-10')
    ]);

    assert.deepEqual(result.customers[0].aliases, ['Nasreen']);
  });

  it('leaves aliases empty when the name was written consistently', () => {
    const result = balances([credit(1000, 'Nasreen Bibi', '2026-08-01')]);
    assert.deepEqual(result.customers[0].aliases, []);
  });

  it('works on Urdu script as well as transliterations', () => {
    const result = balances([
      credit(900, 'عمران علی', '2026-08-01'),
      repay(300, 'عمران', '2026-08-05')
    ]);

    assert.equal(result.customers.length, 1);
    assert.equal(result.customers[0].name, 'عمران علی');
    assert.equal(result.customers[0].outstanding, 600);
  });
});
