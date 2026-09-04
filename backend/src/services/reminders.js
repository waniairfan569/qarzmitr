/**
 * Builds a polite Urdu reminder for a customer who still owes money.
 *
 * Templates rather than a model call: a shopkeeper asking for money needs the
 * wording to be predictable and respectful every time, it has to work with no
 * connection, and it costs nothing. Tone softens or firms with the age of the
 * debt, which is how the conversation actually goes.
 */

const TONES = [
  {
    id: 'gentle',
    maxDays: 13,
    label: 'Gentle nudge',
    describe: 'Recent credit — a light reminder is enough.'
  },
  {
    id: 'firm',
    maxDays: 29,
    label: 'Direct reminder',
    describe: 'Two weeks or more — worth asking clearly.'
  },
  {
    id: 'urgent',
    maxDays: Infinity,
    label: 'Overdue',
    describe: 'A month or more — ask for a date to settle.'
  }
];

function toneFor(days) {
  const age = Number.isFinite(days) ? days : 0;
  return TONES.find((tone) => age <= tone.maxDays);
}

function formatAmount(amount) {
  return Number(amount || 0).toLocaleString('en-PK');
}

function buildMessage({ name, outstanding, days, shopName }) {
  const amount = formatAmount(outstanding);
  const shop = shopName || 'ہماری دکان';
  const tone = toneFor(days);

  if (tone.id === 'gentle') {
    return `السلام علیکم ${name} صاحب/صاحبہ،\n\n${shop} کے کھاتے میں آپ کا بقایا ${amount} روپے ہے۔ جب آسانی ہو، ادائیگی کر دیجیے گا۔\n\nشکریہ۔`;
  }

  if (tone.id === 'firm') {
    return `السلام علیکم ${name} صاحب/صاحبہ،\n\n${shop} کے کھاتے میں آپ کا بقایا ${amount} روپے ہے، جو ${days} دن سے واجب الادا ہے۔ براہِ کرم جلد ادائیگی کر دیجیے تاکہ حساب صاف رہے۔\n\nشکریہ۔`;
  }

  return `السلام علیکم ${name} صاحب/صاحبہ،\n\n${shop} کے کھاتے میں آپ کا بقایا ${amount} روپے ہے اور ${days} دن گزر چکے ہیں۔ براہِ کرم بتا دیجیے کہ آپ کب تک ادائیگی کر سکتے ہیں، تاکہ ہم حساب مکمل کر سکیں۔\n\nشکریہ۔`;
}

function buildEnglishMessage({ name, outstanding, days, shopName }) {
  const amount = formatAmount(outstanding);
  const shop = shopName || 'our shop';
  const tone = toneFor(days);

  if (tone.id === 'gentle') {
    return `Assalam-o-alaikum ${name},\n\nYour balance at ${shop} is PKR ${amount}. Please settle it whenever convenient.\n\nThank you.`;
  }
  if (tone.id === 'firm') {
    return `Assalam-o-alaikum ${name},\n\nYour balance at ${shop} is PKR ${amount}, outstanding for ${days} days. Please settle it soon so the account stays clear.\n\nThank you.`;
  }
  return `Assalam-o-alaikum ${name},\n\nYour balance at ${shop} is PKR ${amount} and ${days} days have passed. Please let us know when you can settle so we can close the account.\n\nThank you.`;
}

/**
 * Only customers who still owe get a reminder, and undated credit is treated as
 * age zero rather than guessed — chasing someone over a date the ledger never
 * recorded is worse than asking gently.
 */
function buildReminders(customers, shopName) {
  return customers
    .filter((customer) => !customer.settled && customer.outstanding > 0)
    .map((customer) => {
      const days = customer.days_outstanding === null ? 0 : customer.days_outstanding;
      const tone = toneFor(days);

      return {
        name: customer.name,
        outstanding: customer.outstanding,
        days_outstanding: customer.days_outstanding,
        tone: tone.id,
        tone_label: tone.label,
        tone_note: tone.describe,
        message_urdu: buildMessage({ name: customer.name, outstanding: customer.outstanding, days, shopName }),
        message_english: buildEnglishMessage({ name: customer.name, outstanding: customer.outstanding, days, shopName })
      };
    });
}

module.exports = {
  TONES,
  buildReminders,
  toneFor
};
