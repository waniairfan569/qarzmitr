const assert = require('node:assert/strict');
const { describe, it } = require('node:test');

const {
  MAX_ATTEMPTS,
  expiryFrom,
  formatPhone,
  generateCode,
  hashCode,
  isExpired,
  normalizePhone
} = require('../src/services/phoneAuth');
const { buildMessage, isDeliveryConfigured } = require('../src/services/sms');

describe('normalizePhone', () => {
  it('accepts the ways a Pakistani number is actually written', () => {
    for (const written of [
      '03001234567',
      '0300 1234567',
      '0300-123-4567',
      '3001234567',
      '+923001234567',
      '+92 300 1234567',
      '00923001234567',
      '(0300) 1234567'
    ]) {
      assert.equal(normalizePhone(written), '+923001234567', `failed on ${written}`);
    }
  });

  it('rejects anything that is not a Pakistani mobile number', () => {
    for (const bad of [
      '0211234567',      // landline, does not start with 3
      '030012345',       // too short
      '030012345678',    // too long
      '+13001234567',    // wrong country
      'not a number',
      '',
      null,
      undefined,
      3001234567
    ]) {
      assert.equal(normalizePhone(bad), null, `should have rejected ${String(bad)}`);
    }
  });

  it('gives every spelling of one number the same stored form', () => {
    // Otherwise the same shopkeeper ends up with two accounts.
    const forms = ['03211234567', '+923211234567', '3211234567'];
    const stored = new Set(forms.map(normalizePhone));
    assert.equal(stored.size, 1);
  });
});

describe('formatPhone', () => {
  it('shows the number back the way its owner writes it', () => {
    assert.equal(formatPhone('+923001234567'), '0300 1234567');
  });
});

describe('generateCode', () => {
  it('is always six digits, leading zeros kept', () => {
    for (let i = 0; i < 300; i += 1) {
      assert.match(generateCode(), /^\d{6}$/);
    }
  });

  it('does not return the same code every time', () => {
    const codes = new Set(Array.from({ length: 50 }, generateCode));
    assert.ok(codes.size > 1, 'codes must not be predictable');
  });
});

describe('hashCode', () => {
  it('never stores the code itself', () => {
    const hash = hashCode('+923001234567', '123456');
    assert.notEqual(hash, '123456');
    assert.equal(hash.length, 64);
  });

  it('binds the code to one number, so a code cannot be replayed on another', () => {
    assert.notEqual(
      hashCode('+923001234567', '123456'),
      hashCode('+923009999999', '123456')
    );
  });

  it('is deterministic for the same pair', () => {
    assert.equal(hashCode('+923001234567', '123456'), hashCode('+923001234567', '123456'));
  });
});

describe('expiry', () => {
  it('sets a code to expire five minutes out', () => {
    const now = new Date('2026-09-05T10:00:00.000Z');
    assert.equal(expiryFrom(now), '2026-09-05T10:05:00.000Z');
  });

  it('treats a passed time as expired and a future one as live', () => {
    const now = new Date('2026-09-05T10:00:00.000Z');
    assert.equal(isExpired('2026-09-05T09:59:59.000Z', now), true);
    assert.equal(isExpired('2026-09-05T10:04:00.000Z', now), false);
    assert.equal(isExpired(null, now), true);
  });
});

describe('guessing budget', () => {
  it('retires a code well before a six-digit space could be searched', () => {
    // A million combinations; five guesses is the point of the limit.
    assert.ok(MAX_ATTEMPTS <= 5, 'a generous attempt limit would defeat the code');
  });
});

describe('sms', () => {
  it('has no gateway configured in the prototype', () => {
    assert.equal(isDeliveryConfigured(), false);
  });

  it('writes a message that carries the code, the expiry and a warning', () => {
    const text = buildMessage('123456');
    assert.match(text, /123456/);
    assert.match(text, /5 minutes/);
    assert.match(text, /not share/i);
  });
});
