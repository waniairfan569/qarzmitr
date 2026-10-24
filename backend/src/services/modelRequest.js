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

    // A used-up daily quota will not recover in four seconds; hand it straight
    // back so the next model in the list can be tried instead.
    const text = await response.clone().text().catch(() => '');
    if (response.status === 429 && /quota|exhausted/i.test(text)) {
      return response;
    }

    await response.text().catch(() => {});
    console.warn(`Model request returned HTTP ${response.status}; retrying (${attempt + 1}/${RETRY_DELAYS_MS.length}).`);
    await wait(RETRY_DELAYS_MS[attempt]);
  }
}

// Worth trying another model: out of quota, model gone, or still overloaded
// after the retries above. A bad key (401) or a bad request (400) is not.
const FALLBACK_STATUSES = new Set([404, 429, 500, 502, 503, 504]);

/** Tries each model in turn; returns the first answer that is not worth falling back from. */
async function fetchFromModels(url, models, buildOptions) {
  for (let index = 0; ; index += 1) {
    const model = models[index];
    const response = await fetchWithRetry(url, buildOptions(model));
    const last = index >= models.length - 1;
    if (!FALLBACK_STATUSES.has(response.status) || last) {
      return { response, model };
    }
    await response.text().catch(() => {});
    console.warn(`Model ${model} answered HTTP ${response.status}; trying ${models[index + 1]}.`);
  }
}

module.exports = {
  FALLBACK_STATUSES,
  fetchFromModels,
  fetchWithRetry,
  RETRYABLE_STATUSES
};
