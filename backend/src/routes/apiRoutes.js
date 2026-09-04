const express = require('express');
const {
  getCustomers,
  getDashboard,
  getReadiness,
  getReminders,
  getSummary,
  getTransactions
} = require('../controllers/dashboardController');
const { scoreUser } = require('../controllers/scoreController');
const { structureLedger } = require('../controllers/structureController');
const { uploadImage, uploadLedger } = require('../controllers/uploadController');
const { getReview, updateTransaction } = require('../controllers/reviewController');
const verifyToken = require('../middleware/verifyToken');

const router = express.Router();

router.use(verifyToken);
router.post('/upload', uploadImage, uploadLedger);
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

module.exports = router;