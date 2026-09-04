process.env.FRONTEND_ORIGIN = 'http://localhost:5173';
process.env.PASSWORD_RESET_TTL_MINUTES = '30';
process.env.MAIL_FROM = 'QarzMitr <no-reply@qarzmitr.local>';

const assert = require('node:assert/strict');
const { describe, it } = require('node:test');

const {
  buildPasswordResetMessage,
  buildResetUrl,
  isDeliveryConfigured,
  sendPasswordResetEmail
} = require('../src/services/mailer');

describe('buildResetUrl', () => {
  it('points at the frontend reset page', () => {
    assert.equal(
      buildResetUrl('abc123'),
      'http://localhost:5173/reset-password?token=abc123'
    );
  });

  it('percent-encodes tokens so URL-unsafe characters survive the round trip', () => {
    assert.equal(buildResetUrl('a+b/c=d').split('token=')[1], 'a%2Bb%2Fc%3Dd');
  });
});

describe('buildPasswordResetMessage', () => {
  const message = buildPasswordResetMessage({
    email: 'shopkeeper@example.com',
    token: 'reset-token-123'
  });

  it('addresses the account holder and names the sender', () => {
    assert.equal(message.to, 'shopkeeper@example.com');
    assert.equal(message.from, 'QarzMitr <no-reply@qarzmitr.local>');
    assert.match(message.subject, /Reset your QarzMitr password/);
  });

  it('carries the link in both the text and HTML parts', () => {
    const url = 'http://localhost:5173/reset-password?token=reset-token-123';
    assert.ok(message.text.includes(url), 'plain-text part must carry the link');
    assert.ok(message.html.includes(url), 'HTML part must carry the link');
  });

  it('states the expiry so the reader knows the link is short-lived', () => {
    assert.match(message.text, /30 minutes/);
    assert.match(message.html, /30 minutes/);
  });

  it('tells an unintended recipient that ignoring it is safe', () => {
    assert.match(message.text, /did not ask for this/i);
    assert.match(message.html, /did not ask for this/i);
  });

  it('cannot be broken out of by a hostile token', () => {
    const injected = buildPasswordResetMessage({
      email: 'x@example.com',
      token: '"><script>alert(1)</script>'
    });
    const href = injected.html.match(/href="([^"]*)"/)[1];

    // Two layers hold here: percent-encoding in the URL, then HTML escaping.
    assert.ok(!injected.html.includes('<script>'), 'no live markup may reach the email body');
    assert.ok(!href.includes('"'), 'the token must not be able to close the href attribute');
    assert.ok(href.includes('%3Cscript%3E'), 'the token should survive as encoded text');
  });
});

describe('sendPasswordResetEmail without SMTP configured', () => {
  it('reports that it logged rather than sent, and never returns the link', async () => {
    assert.equal(isDeliveryConfigured(), false, 'no SMTP_HOST is set in this suite');

    const result = await sendPasswordResetEmail({
      email: 'shopkeeper@example.com',
      token: 'reset-token-123'
    });

    assert.equal(result.status, 'logged');
    assert.match(result.reason, /No SMTP host/);
    // The caller must never receive anything it could forward to a browser.
    assert.equal(JSON.stringify(result).includes('reset-token-123'), false);
  });
});
