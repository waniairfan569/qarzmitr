const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.resolve(__dirname, '../../.env'), quiet: true });

const parsedPort = Number.parseInt(process.env.PORT || '3000', 10);

// ali-oss expects the region as "oss-<region>". Accept either form so a value
// copied straight from the Alibaba console ("ap-southeast-1") also works.
function normalizeOssRegion(region) {
  if (typeof region !== 'string' || !region.trim()) {
    return undefined;
  }

  const trimmed = region.trim().toLowerCase();
  return trimmed.startsWith('oss-') ? trimmed : `oss-${trimmed}`;
}

const env = {
  dashscopeApiKey: process.env.DASHSCOPE_API_KEY,
  dashscopeBaseUrl: (process.env.DASHSCOPE_BASE_URL || 'https://dashscope-intl.aliyuncs.com/compatible-mode/v1').replace(/\/+$/, ''),
  frontendOrigin: process.env.FRONTEND_ORIGIN || 'http://localhost:5173',
  jwtSecret: process.env.JWT_SECRET,
  ossAccessKeyId: process.env.OSS_ACCESS_KEY_ID,
  ossAccessKeySecret: process.env.OSS_ACCESS_KEY_SECRET,
  ossBucketName: process.env.OSS_BUCKET_NAME,
  ossRegion: normalizeOssRegion(process.env.OSS_REGION),
  googleClientId: process.env.GOOGLE_CLIENT_ID,
  googleClientSecret: process.env.GOOGLE_CLIENT_SECRET,
  googleCallbackUrl: process.env.GOOGLE_CALLBACK_URL,
  smtpHost: process.env.SMTP_HOST,
  smtpPort: Number.parseInt(process.env.SMTP_PORT || '587', 10) || 587,
  smtpUser: process.env.SMTP_USER,
  smtpPassword: process.env.SMTP_PASSWORD,
  smtpSecure: process.env.SMTP_SECURE === 'true',
  mailFrom: process.env.MAIL_FROM || 'QarzMitr <no-reply@qarzmitr.local>',
  passwordResetTtlMinutes: Number.parseInt(process.env.PASSWORD_RESET_TTL_MINUTES || '30', 10) || 30,
  port: Number.isInteger(parsedPort) && parsedPort > 0 ? parsedPort : 3000
};

function validateEnvironment() {
  if (!env.jwtSecret) {
    throw new Error('JWT_SECRET is required. Copy .env.example to .env and set a secure value.');
  }
}

// Google sign-in stays switched off until all three values are present, so a
// half-filled .env degrades to email/password rather than failing mid-redirect.
function isGoogleSignInConfigured() {
  return Boolean(env.googleClientId && env.googleClientSecret && env.googleCallbackUrl);
}

module.exports = {
  env,
  isGoogleSignInConfigured,
  validateEnvironment
};