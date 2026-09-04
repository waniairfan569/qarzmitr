const nodemailer = require('nodemailer');
const { env } = require('../config/env');

let cachedTransport = null;

// SMTP stays optional. Without a host configured the reset link is written to
// the server log instead — it is never returned over HTTP, because a reset link
// in an API response would let anyone who can reach the endpoint take over any
// account.
function isDeliveryConfigured() {
  return Boolean(env.smtpHost);
}

function getTransport() {
  if (!cachedTransport) {
    cachedTransport = nodemailer.createTransport({
      host: env.smtpHost,
      port: env.smtpPort,
      secure: env.smtpSecure,
      auth: env.smtpUser ? { user: env.smtpUser, pass: env.smtpPassword } : undefined
    });
  }

  return cachedTransport;
}

function buildResetUrl(token) {
  const base = env.frontendOrigin.replace(/\/+$/, '');
  return `${base}/reset-password?token=${encodeURIComponent(token)}`;
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function buildPasswordResetMessage({ email, token }) {
  const resetUrl = buildResetUrl(token);
  const minutes = env.passwordResetTtlMinutes;

  const text = [
    'Reset your QarzMitr password',
    '',
    `Open this link to choose a new password. It expires in ${minutes} minutes and can only be used once.`,
    '',
    resetUrl,
    '',
    'If you did not ask for this, you can ignore this email — your password will not change.'
  ].join('\n');

  const html = `<div style="font-family:system-ui,Segoe UI,Helvetica,Arial,sans-serif;max-width:520px;color:#173934">
  <h1 style="font-size:20px;margin:0 0 16px">Reset your QarzMitr password</h1>
  <p style="line-height:1.6;margin:0 0 20px">Choose a new password using the button below. This link expires in ${minutes} minutes and can only be used once.</p>
  <p style="margin:0 0 24px"><a href="${escapeHtml(resetUrl)}" style="display:inline-block;background:#173934;color:#fffaf0;padding:12px 22px;border-radius:8px;text-decoration:none;font-weight:700">Choose a new password</a></p>
  <p style="line-height:1.6;margin:0 0 8px;font-size:13px;color:#5c6f69">Or paste this into your browser:</p>
  <p style="margin:0 0 24px;font-size:13px;word-break:break-all"><a href="${escapeHtml(resetUrl)}" style="color:#26705d">${escapeHtml(resetUrl)}</a></p>
  <p style="line-height:1.6;margin:0;font-size:13px;color:#5c6f69">If you did not ask for this, ignore this email — your password will not change.</p>
</div>`;

  return {
    from: env.mailFrom,
    to: email,
    subject: 'Reset your QarzMitr password',
    text,
    html
  };
}

async function sendPasswordResetEmail({ email, token }) {
  const message = buildPasswordResetMessage({ email, token });

  if (!isDeliveryConfigured()) {
    console.info(
      `[mailer] No SMTP host configured. Password reset link for ${email} `
      + `(valid ${env.passwordResetTtlMinutes} minutes):\n  ${buildResetUrl(token)}`
    );
    return { status: 'logged', reason: 'No SMTP host is configured.' };
  }

  try {
    await getTransport().sendMail(message);
    return { status: 'sent', reason: null };
  } catch (error) {
    // A failing mail server must not tell the caller whether the address exists,
    // so this is logged and swallowed rather than surfaced in the response.
    console.error('[mailer] Password reset email could not be sent:', error.message);
    return { status: 'failed', reason: error.message };
  }
}

module.exports = {
  buildPasswordResetMessage,
  buildResetUrl,
  isDeliveryConfigured,
  sendPasswordResetEmail
};
