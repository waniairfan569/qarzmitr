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

function modelList(value, fallback) {
  const models = String(value || '').split(',').map((model) => model.trim()).filter(Boolean);
  return models.length ? models : [fallback];
}

const env = {
  dashscopeApiKey: process.env.DASHSCOPE_API_KEY,
  dashscopeBaseUrl: (process.env.DASHSCOPE_BASE_URL || 'https://dashscope-intl.aliyuncs.com/compatible-mode/v1').replace(/\/+$/, ''),
  // Any OpenAI-compatible provider works if these name its models. Each may
  // list several, comma-separated: when one is out of quota or overloaded the
  // next is tried, and free tiers count each model's quota separately.
  visionModels: modelList(process.env.VISION_MODEL, 'qwen-vl-plus'),
  textModels: modelList(process.env.TEXT_MODEL, 'qwen-plus'),
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
  smsAccountSid: process.env.SMS_ACCOUNT_SID,
  smsApiKey: process.env.SMS_API_KEY,
  smsSender: process.env.SMS_SENDER,
  // Locally-stored ledger photos. Point this at a persistent disk in production,
  // or every redeploy loses the images behind existing ledgers.
  uploadsDir: path.resolve(__dirname, '../..', process.env.UPLOADS_DIR || './uploads'),
  passwordResetTtlMinutes:Number.parseInt(process.env.PASSWORD_RESET_TTL_MINUTES || '30', 10) || 30,
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

// On Gemini's free tier each model has its own small daily quota, so the lite
// models are always kept behind whatever is configured, as fallbacks.
const GEMINI_FALLBACKS = ['gemini-3.5-flash-lite', 'gemini-3.1-flash-lite', 'gemini-flash-lite-latest'];
if (env.dashscopeBaseUrl.includes('generativelanguage.googleapis.com')) {
  env.visionModels = [...new Set([...env.visionModels, ...GEMINI_FALLBACKS])];
  env.textModels = [...new Set([...env.textModels, ...GEMINI_FALLBACKS])];
}

// The first model in each list, for messages that name the model in use.
env.visionModel = env.visionModels[0];
env.textModel = env.textModels[0];

module.exports = {
  env,
  isGoogleSignInConfigured,
  validateEnvironment
};