const assert = require('node:assert/strict');
const { describe, it } = require('node:test');

const { buildReminders, toneFor } = require('../src/services/reminders');

function owing(name, outstanding, days) {
  return { name, outstanding, days_outstanding: days, settled: false };
}

describe('toneFor', () => {
  it('softens or firms with the age of the debt', () => {
    assert.equal(toneFor(0).id, 'gentle');
    assert.equal(toneFor(13).id, 'gentle');
    assert.equal(toneFor(14).id, 'firm');
    assert.equal(toneFor(29).id, 'firm');
    assert.equal(toneFor(30).id, 'urgent');
    assert.equal(toneFor(400).id, 'urgent');
  });

  it('falls back to the gentlest tone when the age is unknown', () => {
    assert.equal(toneFor(null).id, 'gentle');
    assert.equal(toneFor(undefined).id, 'gentle');
  });
});

describe('buildReminders', () => {
  it('writes a reminder only for customers who still owe', () => {
    const reminders = buildReminders([
      owing('Nasreen Bibi', 700, 18),
      { name: 'Imran Ali', outstanding: 0, days_outstanding: null, settled: true }
    ], 'Ayesha General Store');

    assert.equal(reminders.length, 1);
    assert.equal(reminders[0].name, 'Nasreen Bibi');
  });

  it('names the customer, the shop and the amount in the Urdu message', () => {
    const [reminder] = buildReminders([owing('Nasreen Bibi', 1700, 5)], 'Ayesha General Store');

    assert.match(reminder.message_urdu, /Nasreen Bibi/);
    assert.match(reminder.message_urdu, /Ayesha General Store/);
    assert.match(reminder.message_urdu, /1,700/);
    assert.match(reminder.message_urdu, /السلام علیکم/);
    assert.match(reminder.message_urdu, /شکریہ/);
  });

  it('mentions the age of the debt once it is worth mentioning', () => {
    const [gentle] = buildReminders([owing('A', 500, 3)], 'Shop');
    const [firm] = buildReminders([owing('B', 500, 20)], 'Shop');

    assert.ok(!gentle.message_urdu.includes('3 دن'), 'a fresh debt should not be aged at the customer');
    assert.match(firm.message_urdu, /20 دن/);
  });

  it('offers an English version alongside the Urdu one', () => {
    const [reminder] = buildReminders([owing('Bilal Ahmed', 2400, 40)], 'Ayesha General Store');

    assert.match(reminder.message_english, /Bilal Ahmed/);
    assert.match(reminder.message_english, /PKR 2,400/);
    assert.match(reminder.message_english, /40 days/);
  });

  it('treats undated credit as fresh rather than guessing an age', () => {
    const [reminder] = buildReminders([owing('Undated', 900, null)], 'Shop');

    assert.equal(reminder.tone, 'gentle');
    assert.equal(reminder.days_outstanding, null);
    assert.ok(!/null/.test(reminder.message_urdu), 'a missing date must never reach the message');
    assert.ok(!/NaN/.test(reminder.message_urdu));
  });

  it('falls back to a neutral shop name when none is set', () => {
    const [reminder] = buildReminders([owing('A', 100, 1)], null);
    assert.match(reminder.message_urdu, /ہماری دکان/);
    assert.match(reminder.message_english, /our shop/);
  });

  it('labels the tone so the shopkeeper knows what they are sending', () => {
    const [reminder] = buildReminders([owing('A', 100, 45)], 'Shop');
    assert.equal(reminder.tone_label, 'Overdue');
    assert.ok(reminder.tone_note.length > 0);
  });

  it('returns nothing when the book is clear', () => {
    assert.deepEqual(buildReminders([], 'Shop'), []);
  });
});
