const jwt = require('jsonwebtoken');
const { db } = require('../db/database');
const { env } = require('../config/env');

function verifyToken(req, res, next) {
  const authorization = req.get('authorization');
  const match = authorization && authorization.match(/^Bearer\s+(.+)$/i);

  if (!match) {
    return res.status(401).json({ message: 'Authentication token is required.' });
  }

  let payload;
  try {
    payload = jwt.verify(match[1], env.jwtSecret);
  } catch (error) {
    return res.status(401).json({ message: 'Invalid or expired authentication token.' });
  }

  if (!payload.sub || typeof payload.sub !== 'string') {
    return res.status(401).json({ message: 'Invalid authentication token.' });
  }

  // A password reset bumps token_version, which retires every token issued
  // before it — otherwise a stolen session would outlive the reset meant to end it.
  const user = db.prepare('SELECT token_version FROM users WHERE id = ?').get(payload.sub);
  if (!user) {
    return res.status(401).json({ message: 'User account no longer exists.' });
  }
  if ((payload.tv ?? 0) !== user.token_version) {
    return res.status(401).json({ message: 'Your password changed. Sign in again.' });
  }

  req.userId = payload.sub;
  return next();
}

module.exports = verifyToken;
