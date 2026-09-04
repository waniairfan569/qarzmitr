const { env } = require('../config/env');

const AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
const TOKEN_URL = 'https://oauth2.googleapis.com/token';
const USERINFO_URL = 'https://www.googleapis.com/oauth2/v3/userinfo';
const REQUEST_TIMEOUT_MS = 15_000;

class GoogleOAuthError extends Error {
  constructor(message, { cause, code } = {}) {
    super(message, cause ? { cause } : undefined);
    this.name = 'GoogleOAuthError';
    this.code = code;
  }
}

function buildAuthorizationUrl(state) {
  const params = new URLSearchParams({
    client_id: env.googleClientId,
    redirect_uri: env.googleCallbackUrl,
    response_type: 'code',
    scope: 'openid email profile',
    state,
    prompt: 'select_account'
  });

  return `${AUTH_URL}?${params.toString()}`;
}

async function postForm(url, body) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    return await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams(body).toString(),
      signal: controller.signal
    });
  } finally {
    clearTimeout(timeout);
  }
}

async function exchangeCodeForAccessToken(code) {
  let response;
  try {
    response = await postForm(TOKEN_URL, {
      code,
      client_id: env.googleClientId,
      client_secret: env.googleClientSecret,
      redirect_uri: env.googleCallbackUrl,
      grant_type: 'authorization_code'
    });
  } catch (error) {
    throw new GoogleOAuthError('Could not reach Google to exchange the sign-in code.', {
      cause: error,
      code: 'TOKEN_REQUEST_FAILED'
    });
  }

  const body = await response.json().catch(() => null);
  if (!response.ok || !body?.access_token) {
    throw new GoogleOAuthError(
      `Google rejected the sign-in code: ${body?.error_description || body?.error || `HTTP ${response.status}`}`,
      { code: 'TOKEN_REJECTED' }
    );
  }

  return body.access_token;
}

// The profile is read straight from Google over TLS using the access token we
// just received, so there is no ID token signature to verify ourselves.
async function fetchProfile(accessToken) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  let response;
  try {
    response = await fetch(USERINFO_URL, {
      headers: { Authorization: `Bearer ${accessToken}` },
      signal: controller.signal
    });
  } catch (error) {
    throw new GoogleOAuthError('Could not reach Google to read your profile.', {
      cause: error,
      code: 'USERINFO_REQUEST_FAILED'
    });
  } finally {
    clearTimeout(timeout);
  }

  const body = await response.json().catch(() => null);
  if (!response.ok || !body?.sub) {
    throw new GoogleOAuthError('Google did not return a usable profile.', { code: 'USERINFO_REJECTED' });
  }
  if (!body.email) {
    throw new GoogleOAuthError('This Google account has no email address attached.', { code: 'NO_EMAIL' });
  }
  if (body.email_verified === false) {
    throw new GoogleOAuthError('This Google account has an unverified email address.', { code: 'EMAIL_UNVERIFIED' });
  }

  return {
    googleId: body.sub,
    email: String(body.email).trim().toLowerCase(),
    name: typeof body.name === 'string' && body.name.trim() ? body.name.trim().slice(0, 100) : null
  };
}

async function verifySignIn(code) {
  return fetchProfile(await exchangeCodeForAccessToken(code));
}

module.exports = {
  GoogleOAuthError,
  buildAuthorizationUrl,
  exchangeCodeForAccessToken,
  fetchProfile,
  verifySignIn
};
