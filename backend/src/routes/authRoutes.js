const express = require('express');
const {
  forgotPassword,
  login,
  me,
  resetPassword,
  signup
} = require('../controllers/authController');
const google = require('../controllers/googleController');
const phone = require('../controllers/phoneController');
const {
  loginLimiter,
  otpRequestLimiter,
  otpVerifyLimiter,
  passwordResetLimiter,
  resetConfirmLimiter,
  signupLimiter
} = require('../middleware/rateLimits');
const verifyToken = require('../middleware/verifyToken');

const router = express.Router();

router.post('/signup', signupLimiter, signup);
router.post('/login', loginLimiter, login);
router.post('/forgot-password', passwordResetLimiter, forgotPassword);
router.post('/reset-password', resetConfirmLimiter, resetPassword);
router.post('/phone/request', otpRequestLimiter, phone.requestCode);
router.post('/phone/verify', otpVerifyLimiter, phone.verifyCode);
router.get('/providers', google.status);
router.get('/google', google.start);
router.get('/google/callback', google.callback);
router.get('/me', verifyToken, me);

module.exports = router;
