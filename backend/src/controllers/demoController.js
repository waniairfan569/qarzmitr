const bcrypt = require('bcrypt');
const { db } = require('../db/database');
const { BCRYPT_ROUNDS, DEMO_USER, seedDatabase } = require('../db/seed');
const { issueToken, publicUser } = require('../services/session');

/**
 * Puts the shared demo account back to its starting record, so a rehearsal or
 * a stray upload never reaches the judges. Only the demo account may do this,
 * and only to itself. Reseeding gives the account a new id, so a fresh session
 * is returned and the caller stays signed in.
 */
async function resetDemo(req, res, next) {
  try {
    const current = db.prepare('SELECT email FROM users WHERE id = ?').get(req.userId);
    if (!current || current.email !== DEMO_USER.email) {
      return res.status(403).json({ message: 'Only the demo account can be reset.' });
    }

    const passwordHash = await bcrypt.hash(DEMO_USER.password, BCRYPT_ROUNDS);
    const { transactions } = seedDatabase(passwordHash);
    const user = db.prepare('SELECT * FROM users WHERE email = ?').get(DEMO_USER.email);

    return res.json({
      message: `Demo data reset: ${transactions.length} entries and a score of 69.`,
      token: issueToken(user),
      user: publicUser(user)
    });
  } catch (error) {
    return next(error);
  }
}

module.exports = { resetDemo };
