const express = require('express');
const { getCustomers, getDashboard, getTransactions } = require('../controllers/dashboardController');
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

module.exports = router;