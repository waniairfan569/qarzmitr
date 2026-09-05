const rateLimit = require('express-rate-limit');

/**
 * Limits on the endpoints worth attacking.
 *
 * Everything else about the auth was built carefully — bcrypt at 12 rounds,
 * hashed single-use reset tokens, sessions retired on reset — and none of it
 * helps if an attacker can simply try passwords until one works.
 */

const MINUTE = 60 * 1000;

function message(text) {
  return (req, res) => res.status(429).json({ message: text });
}

/**
 * Guessing a password. Successful sign-ins are not counted, so somebody
 * working normally is never locked out by their own activity — only a run of
 * failures counts against the limit.
 */
const loginLimiter = rateLimit({
  windowMs: 15 * MINUTE,
  limit: 10,
  skipSuccessfulRequests: true,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  handler: message('Too many sign-in attempts. Wait a few minutes and try again.')
});

/**
 * Requesting reset links. Left open this is both a way to hunt for registered
 * addresses and a way to have us send mail on an attacker's behalf.
 */
const passwordResetLimiter = rateLimit({
  windowMs: 60 * MINUTE,
  limit: 5,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  handler: message('Too many password reset requests. Try again in an hour.')
});

/** Consuming a reset link — the token is the thing being guessed here. */
const resetConfirmLimiter = rateLimit({
  windowMs: 15 * MINUTE,
  limit: 10,
  skipSuccessfulRequests: true,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  handler: message('Too many attempts. Wait a few minutes and try again.')
});

/**
 * Asking for an SMS code. Left open this sends messages at someone else's
 * expense and pesters a number that never asked for them.
 */
const otpRequestLimiter = rateLimit({
  windowMs: 60 * MINUTE,
  limit: 5,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  handler: message('Too many code requests. Try again in an hour.')
});

/**
 * Entering a code. Each code already retires itself after five wrong guesses;
 * this stops an attacker cycling through fresh codes to keep guessing.
 */
const otpVerifyLimiter = rateLimit({
  windowMs: 15 * MINUTE,
  limit: 15,
  skipSuccessfulRequests: true,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  handler: message('Too many attempts. Wait a few minutes and try again.')
});

/** Signup: enough for a family sharing a shop, not enough to fill the database. */
const signupLimiter = rateLimit({
  windowMs: 60 * MINUTE,
  limit: 8,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  handler: message('Too many accounts created from here. Try again in an hour.')
});

/**
 * Uploads run two model calls each, so this protects the API budget as much as
 * the server. A shopkeeper photographing a day's page will never reach it.
 */
const uploadLimiter = rateLimit({
  windowMs: 60 * MINUTE,
  limit: 40,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  handler: message('Too many ledger uploads in one hour. Try again shortly.')
});

module.exports = {
  loginLimiter,
  otpRequestLimiter,
  otpVerifyLimiter,
  passwordResetLimiter,
  resetConfirmLimiter,
  signupLimiter,
  uploadLimiter
};
