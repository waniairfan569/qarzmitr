const express = require('express');
const { getSharedStatement } = require('../controllers/loanController');
const { sharedStatementLimiter } = require('../middleware/rateLimits');

// Mounted before the authenticated routes: a lender opening a link has no account.
const router = express.Router();

router.get('/:token', sharedStatementLimiter, getSharedStatement);

module.exports = router;
