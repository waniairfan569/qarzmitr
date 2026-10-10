// Hosted models answer "overloaded" or "rate limited" often enough that one
// failed call should not fail a shopkeeper's upload. These statuses mean "try
// again shortly"; anything else (a bad key, a missing model) will not improve.
const RETRYABLE_STATUSES = new Set([429, 500, 502, 503, 504]);
const RETRY_DELAYS_MS = [1500, 4000];

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// The caller's abort signal still bounds the whole attempt, retries included.
async function fetchWithRetry(url, options) {
  for (let attempt = 0; ; attempt += 1) {
    const response = await fetch(url, options);
    if (!RETRYABLE_STATUSES.has(response.status) || attempt >= RETRY_DELAYS_MS.length) {
      return response;
    }

    await response.text().catch(() => {});
    console.warn(`Model request returned HTTP ${response.status}; retrying (${attempt + 1}/${RETRY_DELAYS_MS.length}).`);
    await wait(RETRY_DELAYS_MS[attempt]);
  }
}

module.exports = {
  fetchWithRetry,
  RETRYABLE_STATUSES
};
