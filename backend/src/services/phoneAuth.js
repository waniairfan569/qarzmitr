const { createHash, randomInt } = require('crypto');

/**
 * Signing in with a phone number and a one-time code.
 *
 * Most Pakistani shopkeepers have a phone number and many have no email at all,
 * so asking for an email address is asking the target user for the one thing
 * they are least likely to have. This is the way in that fits them.
 */

const OTP_DIGITS = 6;
const OTP_TTL_MINUTES = 5;
// A six-digit code is only a million guesses. The expiry alone is not enough;
// the code is retired after a handful of wrong attempts.
const MAX_ATTEMPTS = 5;

/**
 * Accepts the ways a Pakistani number is normally written — 03001234567,
 * 3001234567, 0092300…, +92 300 1234567 — and stores one canonical form.
 * Returns null for anything that is not a valid mobile number.
 */
function normalizePhone(input) {
  if (typeof input !== 'string') return null;

  let digits = input.replace(/[\s()-]/g, '');
  if (digits.startsWith('+')) digits = digits.slice(1);
  if (!/^\d+$/.test(digits)) return null;

  if (digits.startsWith('0092')) digits = digits.slice(4);
  else if (digits.startsWith('92')) digits = digits.slice(2);
  else if (digits.startsWith('0')) digits = digits.slice(1);

  // Pakistani mobile numbers are ten digits and always begin with 3.
  if (!/^3\d{9}$/.test(digits)) return null;

  return `+92${digits}`;
}

/** How the number is shown back to its owner: 0300 1234567. */
function formatPhone(phone) {
  const local = String(phone || '').replace('+92', '0');
  return local.length === 11 ? `${local.slice(0, 4)} ${local.slice(4)}` : local;
}

function generateCode() {
  return String(randomInt(0, 10 ** OTP_DIGITS)).padStart(OTP_DIGITS, '0');
}

// Codes are stored hashed for the same reason reset tokens are: a leaked
// database should not hand over a working way in.
function hashCode(phone, code) {
  return createHash('sha256').update(`${phone}:${code}`).digest('hex');
}

function expiryFrom(now = new Date()) {
  return new Date(now.getTime() + (OTP_TTL_MINUTES * 60 * 1000)).toISOString();
}

function isExpired(expiresAt, now = new Date()) {
  return !expiresAt || Date.parse(expiresAt) <= now.getTime();
}

module.exports = {
  MAX_ATTEMPTS,
  OTP_DIGITS,
  OTP_TTL_MINUTES,
  expiryFrom,
  formatPhone,
  generateCode,
  hashCode,
  isExpired,
  normalizePhone
};
