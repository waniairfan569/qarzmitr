process.env.DATABASE_URL = ':memory:';

const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
const { describe, it } = require('node:test');

const { db, initializeDatabase } = require('../src/db/database');

initializeDatabase();

const { LENDERS, findLender } = require('../src/catalog/lenders');
const { buildLoanOptions, matchLender, tradingMonths } = require('../src/services/loanOptions');
const {
  buildSharedStatement,
  createShare,
  listShares,
  openShare,
  revokeShare
} = require('../src/services/shares');
const { parseAmount } = require('../src/controllers/loanController');

const LENDER = { id: 'test', name: 'Test MFB', name_ur: 'ٹیسٹ', type: 'conventional', website: 'https://example.com', min_score: 60, min_months: 3, max_loan: 100000, documents: ['cnic'] };

function readiness(overrides = {}) {
  return { has_score: true, score: 69, indicative_facility: 40000, ...overrides };
}

function dated(...dates) {
  return dates.map((transaction_date) => ({ type: 'sale', amount: 100, transaction_date }));
}

describe('tradingMonths', () => {
  it('counts calendar months that have entries', () => {
    assert.equal(tradingMonths(dated('2026-09-14', '2026-09-30', '2026-10-02')), 2);
  });

  it('lets one misread year add a single month, not decades', () => {
    assert.equal(tradingMonths(dated('1986-10-23', '2026-09-14', '2026-10-02')), 3);
  });

  it('ignores undated and malformed rows', () => {
    assert.equal(tradingMonths([{ transaction_date: null }, { transaction_date: 'last week' }]), 0);
  });
});

describe('matchLender', () => {
  it('is eligible when every criterion is met, and caps the amount at the lender maximum', () => {
    const result = matchLender(LENDER, { score: 70, months: 3, facility: 250000, amount: null });
    assert.equal(result.status, 'eligible');
    assert.deepEqual(result.missing, []);
    assert.equal(result.indicative_amount, 100000);
  });

  it('is almost when the gaps are small, and names each one', () => {
    const result = matchLender(LENDER, { score: 55, months: 1, facility: 40000, amount: null });
    assert.equal(result.status, 'almost');
    assert.deepEqual(result.missing, [
      { key: 'score', have: 55, need: 60 },
      { key: 'history', have: 1, need: 3 }
    ]);
    assert.equal(result.indicative_amount, null);
  });

  it('is not yet when the score is more than 10 points short', () => {
    assert.equal(matchLender(LENDER, { score: 49, months: 6, facility: 0, amount: null }).status, 'not_yet');
  });

  it('is not yet when more than 3 months of history are missing', () => {
    assert.equal(matchLender({ ...LENDER, min_months: 6 }, { score: 90, months: 2, facility: 0, amount: null }).status, 'not_yet');
  });

  it('is not yet when the loan asked for is bigger than the lender ever makes', () => {
    const result = matchLender(LENDER, { score: 90, months: 6, facility: 50000, amount: 150000 });
    assert.equal(result.status, 'not_yet');
    assert.deepEqual(result.missing, [{ key: 'amount', have: 150000, need: 100000 }]);
  });
});

describe('buildLoanOptions', () => {
  it('needs a score first', () => {
    assert.equal(buildLoanOptions({ readiness: { has_score: false }, transactions: [] }).has_score, false);
  });

  it('lists every lender, eligible first, and says the criteria are examples', () => {
    const result = buildLoanOptions({ readiness: readiness(), transactions: dated('2026-09-14', '2026-10-02') });
    assert.equal(result.criteria_are_examples, true);
    assert.equal(result.history_months, 2);
    assert.equal(result.options.length, LENDERS.length);
    const order = { eligible: 0, almost: 1, not_yet: 2 };
    const ranks = result.options.map((option) => order[option.status]);
    assert.deepEqual(ranks, [...ranks].sort((left, right) => left - right));
  });

  // The seeded demo covers the three weeks before the day it is seeded, which
  // lands in one calendar month or two depending on the date.
  it('gives the demo shop (69, one or two months) a mix of outcomes', () => {
    for (const transactions of [dated('2026-10-03', '2026-10-24'), dated('2026-09-14', '2026-10-02')]) {
      const result = buildLoanOptions({ readiness: readiness(), transactions });
      const statuses = new Set(result.options.map((option) => option.status));
      assert.deepEqual([...statuses].sort(), ['almost', 'eligible', 'not_yet'], `${result.history_months} month(s)`);
    }
  });

  it('is deterministic', () => {
    const input = { readiness: readiness(), transactions: dated('2026-09-14', '2026-10-02'), amount: 60000 };
    assert.deepEqual(buildLoanOptions(input), buildLoanOptions(input));
  });
});

describe('parseAmount', () => {
  it('treats a missing amount as no preference', () => {
    assert.deepEqual(parseAmount(undefined), { amount: null });
    assert.deepEqual(parseAmount(''), { amount: null });
  });

  it('accepts whole rupees and rejects anything else', () => {
    assert.deepEqual(parseAmount('50000'), { amount: 50000 });
    for (const bad of ['-5', '0', '12.5', 'lots', '99999999']) {
      assert.ok(parseAmount(bad).error, bad);
    }
  });
});

describe('statement shares', () => {
  function makeUser() {
    const id = randomUUID();
    db.prepare(`INSERT INTO users (id, name, email, password_hash, shop_name) VALUES (?, ?, ?, 'x', ?)`)
      .run(id, 'Ayesha Bibi', `${id}@example.com`, 'Ayesha General Store');
    db.prepare(`INSERT INTO scores (id, user_id, score, cash_flow_consistency, repayment_ratio, revenue_trend) VALUES (?, ?, 69, 66.9, 68.8, 73.5)`)
      .run(randomUUID(), id);
    const add = db.prepare(`INSERT INTO transactions (id, user_id, type, amount, customer_name, transaction_date, note) VALUES (?, ?, ?, ?, ?, ?, ?)`);
    add.run(randomUUID(), id, 'credit_given', 900, 'Imran Ali', '2026-09-20', 'private note');
    add.run(randomUUID(), id, 'repayment', 500, 'imran ali', '2026-09-28', null);
    add.run(randomUUID(), id, 'credit_given', 700, 'Nasreen Bibi', '2026-10-01', null);
    return id;
  }

  it('stores only a hash, and opens with the raw token', () => {
    const userId = makeUser();
    const { token, share } = createShare(userId, 'akhuwat');
    assert.equal(share.status, 'active');
    const stored = db.prepare('SELECT token_hash FROM statement_shares WHERE id = ?').get(share.id);
    assert.notEqual(stored.token_hash, token);
    assert.equal(openShare(token).id, share.id);
    assert.equal(listShares(userId)[0].view_count, 1);
  });

  it('refuses unknown, withdrawn and expired links', () => {
    const userId = makeUser();
    assert.equal(openShare('not-a-real-token-at-all'), null);

    const withdrawn = createShare(userId, 'kashf');
    assert.equal(revokeShare(userId, withdrawn.share.id), true);
    assert.equal(openShare(withdrawn.token), null);
    assert.equal(revokeShare(userId, withdrawn.share.id), false);

    const expired = createShare(userId, 'nrsp');
    db.prepare('UPDATE statement_shares SET expires_at = ? WHERE id = ?').run('2000-01-01T00:00:00.000Z', expired.share.id);
    assert.equal(openShare(expired.token), null);
  });

  it('only lets the owner withdraw a link', () => {
    const owner = makeUser();
    const stranger = makeUser();
    const { share } = createShare(owner, 'akhuwat');
    assert.equal(revokeShare(stranger, share.id), false);
  });

  it('shows a lender the evidence without customer names or notes', () => {
    const userId = makeUser();
    const statement = buildSharedStatement(userId);
    assert.equal(statement.latestScore.score, 69);
    assert.equal(statement.owner.shop_name, 'Ayesha General Store');
    const names = statement.transactions.map((row) => row.customer_name);
    assert.ok(names.every((name) => /^Customer \d+$/.test(name)));
    // The same person written two ways is still one customer.
    assert.equal(new Set(names).size, 2);
    assert.ok(statement.transactions.every((row) => !('note' in row)));
    assert.doesNotMatch(JSON.stringify(statement), /Imran|Nasreen|private note|@example\.com/);
  });

  it('knows every lender the catalogue lists', () => {
    for (const lender of LENDERS) assert.equal(findLender(lender.id), lender);
    assert.equal(findLender('nobody'), null);
  });
});
