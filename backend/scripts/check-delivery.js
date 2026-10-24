/**
 * Sends one real test message, so email and SMS can be confirmed the moment
 * their keys are in .env, before a shopkeeper ever depends on them.
 *
 *   npm run check:email -- you@example.com
 *   npm run check:sms -- 03001234567
 */
const { isDeliveryConfigured: emailReady, sendPasswordResetEmail } = require('../src/services/mailer');
const { isDeliveryConfigured: smsReady, sendOtp } = require('../src/services/sms');
const { normalizePhone } = require('../src/services/phoneAuth');

async function main() {
  const [channel, target] = process.argv.slice(2);

  if (channel === 'email') {
    if (!target) throw new Error('Give an address: npm run check:email -- you@example.com');
    if (!emailReady()) throw new Error('SMTP_HOST is empty in backend/.env, so email would only be logged.');
    const result = await sendPasswordResetEmail({ email: target, token: 'delivery-test' });
    console.log(result.status === 'sent' ? `Sent a test reset email to ${target}. Check the inbox (and spam).` : `Not sent: ${result.reason}`);
    return result.status === 'sent';
  }

  if (channel === 'sms') {
    const phone = normalizePhone(target);
    if (!phone) throw new Error('Give a Pakistani mobile number: npm run check:sms -- 03001234567');
    if (!smsReady()) throw new Error('SMS_ACCOUNT_SID, SMS_API_KEY or SMS_SENDER is empty in backend/.env, so the code would only be logged.');
    const result = await sendOtp({ phone, code: '000000' });
    console.log(result.status === 'sent' ? `Sent a test code to ${phone}.` : `Not sent: ${result.reason}`);
    return result.status === 'sent';
  }

  throw new Error('Use: node scripts/check-delivery.js email you@example.com | sms 03001234567');
}

main()
  .then((ok) => { process.exitCode = ok ? 0 : 1; })
  .catch((error) => { console.error(error.message); process.exitCode = 1; });
