const express = require('express');
const {
  forgotPassword,
  login,
  me,
  resetPassword,
  signup
} = require('../controllers/authController');
const google = require('../controllers/googleController');
const verifyToken = require('../middleware/verifyToken');

const router = express.Router();

router.post('/signup', signup);
router.post('/login', login);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);
router.get('/providers', google.status);
router.get('/google', google.start);
router.get('/google/callback', google.callback);
router.get('/me', verifyToken, me);

module.exports = router;
