const jwt = require('jsonwebtoken');
const { env } = require('../config/env');

// Stored in password_hash for accounts that can only sign in through Google.
// bcrypt.compare is never called against it — login checks for it explicitly.
const OAUTH_ONLY_PASSWORD = '__google-oauth-only__';

function issueToken(user) {
  return jwt.sign({ tv: user.token_version ?? 0 }, env.jwtSecret, {
    subject: user.id,
    expiresIn: '7d'
  });
}

function publicUser(user) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    shop_name: user.shop_name,
    created_at: user.created_at,
    auth_provider: user.google_id ? 'google' : 'password',
    has_password: user.password_hash !== OAUTH_ONLY_PASSWORD
  };
}

module.exports = {
  OAUTH_ONLY_PASSWORD,
  issueToken,
  publicUser
};
