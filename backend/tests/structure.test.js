// The structuring controller prepares statements at require time, so point the
// database at memory before anything loads it.
process.env.DATABASE_URL = ':memory:';

const assert = require('node:assert/strict');
const { describe, it } = require('node:test');

const { initializeDatabase } = require('../src/db/database');

initializeDatabase();

const { parseStructuredTransactions, StructureServiceError } = require('../src/services/structure');
const { validateModelTransactions } = require('../src/controllers/structureController');

const OWNER = { ledgerId: 'ledger-1', userId: 'user-1' };

function validate(rows) {
  return validateModelTransactions(rows, OWNER);
}

describe('parseStructuredTransactions', () => {
  it('parses a bare JSON array', () => {
    const parsed = parseStructuredTransactions('[{"type":"sale","amount":380}]');
    assert.equal(parsed.length, 1);
    assert.equal(parsed[0].amount, 380);
  });

  it('strips the markdown fences models add despite being told not to', () => {
    const fenced = '```json\n[{"type":"sale","amount":250}]\n```';
    assert.deepEqual(parseStructuredTransactions(fenced), [{ type: 'sale', amount: 250 }]);
    assert.deepEqual(parseStructuredTransactions('```\n[]\n```'), []);
  });

  it('throws a flagged error carrying the raw output when the model returns prose', () => {
    assert.throws(
      () => parseStructuredTransactions('Sorry, I could not read that ledger.'),
      (error) => {
        assert.ok(error instanceof StructureServiceError);
        assert.equal(error.code, 'MALFORMED_MODEL_OUTPUT');
        assert.match(error.rawOutput, /Sorry/);
        return true;
      }
    );
  });

  it('rejects valid JSON that is not an array', () => {
    assert.throws(() => parseStructuredTransactions('{"type":"sale"}'), StructureServiceError);
  });
});

describe('validateModelTransactions', () => {
  it('accepts a well-formed row and stamps it with owner ids', () => {
    const { transactions, warnings } = validate([
      { type: 'credit_given', amount: 1800, customer_name: 'Nasreen Bibi', date: '2026-08-13', note: 'ration on credit' }
    ]);

    assert.equal(warnings.length, 0);
    assert.equal(transactions.length, 1);
    assert.equal(transactions[0].ledger_id, OWNER.ledgerId);
    assert.equal(transactions[0].user_id, OWNER.userId);
    assert.equal(transactions[0].customer_name, 'Nasreen Bibi');
    assert.equal(transactions[0].transaction_date, '2026-08-13');
    assert.match(transactions[0].id, /^[0-9a-f-]{36}$/);
  });

  it('drops rows whose type is not one of the four the ledger allows', () => {
    const { transactions, warnings } = validate([
      { type: 'refund', amount: 100 },
      { type: 'sale', amount: 100 }
    ]);

    assert.equal(transactions.length, 1);
    assert.equal(warnings.length, 1);
    assert.equal(warnings[0].field, 'type');
    assert.equal(warnings[0].index, 0);
  });

  it('coerces numeric strings but drops genuinely unnumeric amounts', () => {
    const { transactions, warnings } = validate([
      { type: 'sale', amount: '450' },
      { type: 'sale', amount: 'چار سو' },
      { type: 'sale', amount: null }
    ]);

    assert.equal(transactions.length, 1);
    assert.equal(transactions[0].amount, 450);
    assert.equal(warnings.length, 2);
    assert.ok(warnings.every((entry) => entry.field === 'amount'));
  });

  it('surfaces the model\'s own uncertainty flag as a warning', () => {
    const { transactions, warnings } = validate([
      { type: 'expense', amount: 900, note: 'uncertain: aina is likely flour or atta' }
    ]);

    // The row is still stored — an uncertain reading is reported, not discarded.
    assert.equal(transactions.length, 1);
    assert.equal(warnings.length, 1);
    assert.equal(warnings[0].field, 'note');
    assert.match(warnings[0].message, /uncertain/);
  });

  it('nulls a malformed date rather than storing a guess', () => {
    const { transactions, warnings } = validate([
      { type: 'sale', amount: 100, date: '13-08-2026' }
    ]);

    assert.equal(transactions[0].transaction_date, null);
    assert.equal(warnings[0].field, 'date');
  });

  it('nulls a non-string customer name and says so', () => {
    const { transactions, warnings } = validate([
      { type: 'sale', amount: 100, customer_name: 42 },
      { type: 'sale', amount: 100, customer_name: '   ' }
    ]);

    assert.equal(transactions[0].customer_name, null);
    assert.equal(transactions[1].customer_name, null);
    assert.equal(warnings.length, 1);
    assert.equal(warnings[0].field, 'customer_name');
  });

  it('skips entries that are not objects at all', () => {
    const { transactions, warnings } = validate([null, 'a line of text', ['nested'], { type: 'sale', amount: 1 }]);

    assert.equal(transactions.length, 1);
    assert.equal(warnings.length, 3);
    assert.ok(warnings.every((entry) => entry.field === 'transaction'));
  });

  it('keeps warning indexes aligned with the model output positions', () => {
    const { warnings } = validate([
      { type: 'sale', amount: 100 },
      { type: 'nonsense', amount: 100 },
      { type: 'sale', amount: 100 }
    ]);

    assert.equal(warnings.length, 1);
    assert.equal(warnings[0].index, 1);
  });

  it('returns empty results for an empty ledger', () => {
    assert.deepEqual(validate([]), { transactions: [], warnings: [] });
  });
});
