const express = require('express');
const {
  getCustomers,
  getDashboard,
  getReadiness,
  getReminders,
  getSummary,
  getTransactions
} = require('../controllers/dashboardController');
const { getLoanOptions, getShares, postRevokeShare, postShare } = require('../controllers/loanController');
const { scoreUser } = require('../controllers/scoreController');
const { structureLedger } = require('../controllers/structureController');
const { uploadImage, uploadLedger } = require('../controllers/uploadController');
const { getReview, updateTransaction } = require('../controllers/reviewController');
const { shareCreateLimiter, uploadLimiter } = require('../middleware/rateLimits');
const verifyToken = require('../middleware/verifyToken');

const router = express.Router();

router.use(verifyToken);
router.post('/upload', uploadLimiter, uploadImage, uploadLedger);
router.post('/structure', structureLedger);
router.post('/score', scoreUser);
router.get('/dashboard', getDashboard);
router.get('/transactions', getTransactions);
router.get('/customers', getCustomers);
router.get('/readiness', getReadiness);
router.get('/reminders', getReminders);
router.get('/summary', getSummary);
router.get('/review', getReview);
router.patch('/transactions/:id', updateTransaction);
router.get('/loan-options', getLoanOptions);
router.get('/shares', getShares);
router.post('/shares', shareCreateLimiter, postShare);
router.post('/shares/:id/revoke', postRevokeShare);

module.exports = router;