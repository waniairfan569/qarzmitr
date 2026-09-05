const { env } = require('../config/env');
const { OTP_TTL_MINUTES } = require('./phoneAuth');

/**
 * Delivery of the one-time code.
 *
 * No SMS gateway is configured for the prototype, so the code is written to the
 * server log instead of being sent. It is never returned over HTTP: a code in
 * an API response would let anyone who can reach the endpoint sign in as any
 * number, which is the whole thing the code exists to prevent.
 */
function isDeliveryConfigured() {
  return Boolean(env.smsApiKey && env.smsSender);
}

function buildMessage(code) {
  return `QarzMitr: your code is ${code}. It expires in ${OTP_TTL_MINUTES} minutes. Do not share it with anyone.`;
}

function sendOtp({ phone, code }) {
  const text = buildMessage(code);

  if (!isDeliveryConfigured()) {
    console.info(`[sms] No gateway configured. Code for ${phone}:\n  ${text}`);
    return { status: 'logged', reason: 'No SMS gateway is configured.' };
  }

  return { status: 'sent', reason: null };
}

module.exports = {
  buildMessage,
  isDeliveryConfigured,
  sendOtp
};
