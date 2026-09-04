const { randomUUID } = require('crypto');
const jwt = require('jsonwebtoken');
const { db } = require('../db/database');
const { env, isGoogleSignInConfigured } = require('../config/env');
const { GoogleOAuthError, buildAuthorizationUrl, verifySignIn } = require('../services/googleOAuth');
const { OAUTH_ONLY_PASSWORD, issueToken } = require('../services/session');

const STATE_TTL_SECONDS = 600;

// The state parameter is a short-lived signed token rather than a server-side
// session, so the CSRF check needs no storage and survives a restart.
function issueState() {
  return jwt.sign({ purpose: 'google-oauth' }, env.jwtSecret, { expiresIn: STATE_TTL_SECONDS });
}

function stateIsValid(state) {
  try {
    return jwt.verify(state, env.jwtSecret).purpose === 'google-oauth';
  } catch {
    return false;
  }
}

function frontendUrl(path) {
  return `${env.frontendOrigin.replace(/\/+$/, '')}${path}`;
}

function redirectWithError(res, reason) {
  return res.redirect(`${frontendUrl('/login')}?error=${encodeURIComponent(reason)}`);
}

function status(req, res) {
  return res.json({ google: isGoogleSignInConfigured() });
}

function start(req, res) {
  if (!isGoogleSignInConfigured()) {
    return res.status(503).json({
      message: 'Google sign-in is not configured on this server.'
    });
  }

  return res.redirect(buildAuthorizationUrl(issueState()));
}

// Links by Google id first, then by email so an existing password account is
// claimed rather than duplicated, and finally creates a new Google-only account.
function findOrCreateUser(profile) {
  const byGoogleId = db.prepare('SELECT * FROM users WHERE google_id = ?').get(profile.googleId);
  if (byGoogleId) {
    return byGoogleId;
  }

  const byEmail = db.prepare('SELECT * FROM users WHERE email = ?').get(profile.email);
  if (byEmail) {
    db.prepare('UPDATE users SET google_id = ? WHERE id = ?').run(profile.googleId, byEmail.id);
    return db.prepare('SELECT * FROM users WHERE id = ?').get(byEmail.id);
  }

  const userId = randomUUID();
  db.prepare(`
    INSERT INTO users (id, name, email, password_hash, shop_name, google_id)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(userId, profile.name || profile.email.split('@')[0], profile.email, OAUTH_ONLY_PASSWORD, null, profile.googleId);

  return db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
}

async function callback(req, res, next) {
  if (!isGoogleSignInConfigured()) {
    return redirectWithError(res, 'Google sign-in is not configured on this server.');
  }

  const { code, state, error: googleError } = req.query || {};

  if (googleError) {
    return redirectWithError(res, 'Google sign-in was cancelled.');
  }
  if (typeof code !== 'string' || !code) {
    return redirectWithError(res, 'Google did not return a sign-in code.');
  }
  if (typeof state !== 'string' || !stateIsValid(state)) {
    return redirectWithError(res, 'This sign-in request expired. Try again.');
  }

  try {
    const profile = await verifySignIn(code);
    const user = findOrCreateUser(profile);

    // The token rides in the fragment so it never reaches the server logs or
    // the Referer header of any request the callback page goes on to make.
    return res.redirect(`${frontendUrl('/auth/google')}#token=${encodeURIComponent(issueToken(user))}`);
  } catch (error) {
    if (error instanceof GoogleOAuthError) {
      console.error('Google sign-in failed:', error.cause || error);
      return redirectWithError(res, error.message);
    }
    return next(error);
  }
}

module.exports = {
  callback,
  findOrCreateUser,
  start,
  status
};
