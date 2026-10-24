const { env } = require('../config/env');
const { OTP_TTL_MINUTES } = require('./phoneAuth');

/**
 * Delivery of the one-time code, through Twilio's REST API, which reaches
 * Pakistani mobile numbers.
 *
 * Until SMS_ACCOUNT_SID, SMS_API_KEY (the auth token) and SMS_SENDER are set,
 * the code is written to the server log instead. It is never returned over
 * HTTP: a code in an API response would let anyone who can reach the endpoint
 * sign in as any number, which is the whole thing the code exists to prevent.
 */
function isDeliveryConfigured() {
  return Boolean(env.smsAccountSid && env.smsApiKey && env.smsSender);
}

function buildMessage(code) {
  return `QarzMitr: your code is ${code}. It expires in ${OTP_TTL_MINUTES} minutes. Do not share it with anyone.`;
}

async function sendOtp({ phone, code }) {
  const text = buildMessage(code);

  if (!isDeliveryConfigured()) {
    console.info(`[sms] No gateway configured. Code for ${phone}:\n  ${text}`);
    return { status: 'logged', reason: 'No SMS gateway is configured.' };
  }

  const url = `https://api.twilio.com/2010-04-01/Accounts/${encodeURIComponent(env.smsAccountSid)}/Messages.json`;
  const auth = Buffer.from(`${env.smsAccountSid}:${env.smsApiKey}`).toString('base64');
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { Authorization: `Basic ${auth}`, 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ To: phone, From: env.smsSender, Body: text }),
      signal: AbortSignal.timeout(15000)
    });
    if (!response.ok) {
      const detail = await response.text().catch(() => '');
      console.error(`[sms] Gateway refused the message (HTTP ${response.status}): ${detail.slice(0, 300)}`);
      return { status: 'failed', reason: `Gateway answered HTTP ${response.status}.` };
    }
    return { status: 'sent', reason: null };
  } catch (error) {
    console.error('[sms] Could not reach the gateway:', error.message);
    return { status: 'failed', reason: 'The SMS gateway could not be reached.' };
  }
}

module.exports = {
  buildMessage,
  isDeliveryConfigured,
  sendOtp
};
