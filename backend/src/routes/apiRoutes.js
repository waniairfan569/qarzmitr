const express = require('express');
const {
  getCustomers,
  getDashboard,
  getReminders,
  getSummary,
  getTransactions
} = require('../controllers/dashboardController');
const { scoreUser } = require('../controllers/scoreController');
const { structureLedger } = require('../controllers/structureController');
const { uploadImage, uploadLedger } = require('../controllers/uploadController');
const verifyToken = require('../middleware/verifyToken');

const router = express.Router();

router.use(verifyToken);
router.post('/upload', uploadImage, uploadLedger);
router.post('/structure', structureLedger);
router.post('/score', scoreUser);
router.get('/dashboard', getDashboard);
router.get('/transactions', getTransactions);
router.get('/customers', getCustomers);
router.get('/reminders', getReminders);
router.get('/summary', getSummary);

module.exports = router;