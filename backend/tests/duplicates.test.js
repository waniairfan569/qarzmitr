process.env.DATABASE_URL = ':memory:';

const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
const { afterEach, describe, it } = require('node:test');

const { db, initializeDatabase } = require('../src/db/database');

initializeDatabase();

const { findDuplicates } = require('../src/services/duplicates');
const { buildEvidence } = require('../src/services/evidence');
const { fetchFromModels, fetchWithRetry } = require('../src/services/modelRequest');

const row = (type, amount, date, customer = null) => ({ type, amount, transaction_date: date, customer_name: customer });

describe('findDuplicates', () => {
  const existing = [
    row('sale', 4600, '2026-10-01'),
    row('credit_given', 900, '2026-10-01', 'Imran Ali'),
    row('expense', 2400, '2026-10-02'),
    row('sale', 4800, '2026-10-02')
  ];

  it('spots a page whose entries are already recorded, even with a name written differently', () => {
    const page = [row('sale', 4600, '2026-10-01'), row('credit_given', 900, '2026-10-01', '  imran  ali '), row('expense', 2400, '2026-10-02')];
    assert.deepEqual(findDuplicates(page, existing), { matched: 3, count: 3, isDuplicate: true });
  });

  it('lets a new page through when only a coincidental entry or two match', () => {
    const page = [row('sale', 4600, '2026-10-01'), row('sale', 5000, '2026-10-05'), row('expense', 900, '2026-10-05'), row('sale', 4700, '2026-10-06')];
    assert.equal(findDuplicates(page, existing).isDuplicate, false);
  });

  it('matches each earlier entry only once, so two genuine equal sales are not both explained away', () => {
    const page = [row('sale', 500, '2026-10-03'), row('sale', 500, '2026-10-03')];
    assert.equal(findDuplicates(page, [row('sale', 500, '2026-10-03')]).matched, 1);
  });

  it('never flags a one-line page', () => {
    assert.equal(findDuplicates([row('sale', 4600, '2026-10-01')], existing).isDuplicate, false);
  });
});

describe('buildEvidence', () => {
  it('separates photographed, typed and edited entries, and counts upload days', () => {
    const userId = randomUUID();
    db.prepare(`INSERT INTO users (id, name, email, password_hash) VALUES (?, 'T', ?, 'x')`).run(userId, `${userId}@example.com`);
    const ledger = (id, at) => db.prepare(`INSERT INTO ledgers (id, user_id, image_url, uploaded_at) VALUES (?, ?, 'x', ?)`).run(id, userId, at);
    ledger('l1', '2026-10-01 10:00:00');
    ledger('l2', '2026-10-05 10:00:00');
    ledger('l3', '2026-10-06 10:00:00'); // read but never saved: not evidence
    const add = db.prepare(`INSERT INTO transactions (id, ledger_id, user_id, type, amount, source, edited_at) VALUES (?, ?, ?, 'sale', 100, ?, ?)`);
    add.run(randomUUID(), 'l1', userId, 'ledger', null);
    add.run(randomUUID(), 'l1', userId, 'ledger', '2026-10-02 09:00:00');
    add.run(randomUUID(), 'l2', userId, 'ledger', null);
    add.run(randomUUID(), null, userId, 'manual', null);

    assert.deepEqual(buildEvidence(userId), {
      entries: 4,
      photographed: 3,
      typed: 1,
      edited_after_reading: 1,
      pages: 2,
      upload_days: 2,
      first_upload: '2026-10-01 10:00:00',
      last_upload: '2026-10-05 10:00:00'
    });
  });
});

describe('model fallback', () => {
  const realFetch = global.fetch;
  afterEach(() => { global.fetch = realFetch; });

  function answering(byModel) {
    const calls = [];
    global.fetch = async (url, options) => {
      const { model } = JSON.parse(options.body);
      calls.push(model);
      const [status, body] = byModel[model];
      return new Response(body, { status });
    };
    return calls;
  }

  const build = (model) => ({ method: 'POST', body: JSON.stringify({ model }) });

  it('moves to the next model when one is out of daily quota, without waiting', async () => {
    const calls = answering({ a: [429, '{"error":"Free quota exhausted"}'], b: [200, '{"ok":true}'] });
    const started = Date.now();
    const { response, model } = await fetchFromModels('x', ['a', 'b'], build);
    assert.equal(model, 'b');
    assert.equal(response.status, 200);
    assert.deepEqual(calls, ['a', 'b']);
    assert.ok(Date.now() - started < 1000);
  });

  it('moves on when a model no longer exists', async () => {
    answering({ a: [404, 'Model not exist'], b: [200, '{}'] });
    assert.equal((await fetchFromModels('x', ['a', 'b'], build)).model, 'b');
  });

  it('stops at a bad request instead of trying every model', async () => {
    const calls = answering({ a: [401, 'bad key'], b: [200, '{}'] });
    const { response } = await fetchFromModels('x', ['a', 'b'], build);
    assert.equal(response.status, 401);
    assert.deepEqual(calls, ['a']);
  });

  it('returns the last answer when every model fails', async () => {
    answering({ a: [429, 'quota exhausted'], b: [429, 'quota exhausted'] });
    assert.equal((await fetchFromModels('x', ['a', 'b'], build)).response.status, 429);
  });

  it('still retries a temporary overload on the same model', async () => {
    let n = 0;
    global.fetch = async () => new Response('{}', { status: (n += 1) === 1 ? 503 : 200 });
    assert.equal((await fetchWithRetry('x', {})).status, 200);
    assert.equal(n, 2);
  });
});
