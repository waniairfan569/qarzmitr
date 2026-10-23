/**
 * A ledger page records recent trade. A date more than a year old, or more
 * than a week ahead, is far more likely a misread year ("26" read as "86")
 * than a real entry, and left alone it wrecks every time-based figure.
 */
const DAY_MS = 24 * 60 * 60 * 1000;
const PAST_LIMIT_DAYS = 366;
const FUTURE_LIMIT_DAYS = 7;

function parseIsoDay(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const [year, month, day] = value.split('-').map(Number);
  const time = Date.UTC(year, month - 1, day);
  const check = new Date(time);
  // Rejects dates that do not exist, such as 2026-02-30.
  if (check.getUTCFullYear() !== year || check.getUTCMonth() !== month - 1 || check.getUTCDate() !== day) return null;
  return time;
}

function startOfDay(today) {
  return Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate());
}

function isPlausibleDate(value, today = new Date()) {
  const time = parseIsoDay(value);
  if (time === null) return false;
  const now = startOfDay(today);
  return time >= now - (PAST_LIMIT_DAYS * DAY_MS) && time <= now + (FUTURE_LIMIT_DAYS * DAY_MS);
}

/**
 * Keeps the day and month and tries this year, then last year. Returns the
 * date unchanged when it is already plausible, and null when no year works.
 */
function repairDate(value, today = new Date()) {
  if (isPlausibleDate(value, today)) return { date: value, repaired: false };

  const monthDay = typeof value === 'string' ? value.slice(4) : '';
  const year = today.getUTCFullYear();
  for (const candidateYear of [year, year - 1]) {
    const candidate = `${candidateYear}${monthDay}`;
    if (isPlausibleDate(candidate, today)) return { date: candidate, repaired: true };
  }
  return { date: null, repaired: false };
}

module.exports = {
  FUTURE_LIMIT_DAYS,
  PAST_LIMIT_DAYS,
  isPlausibleDate,
  repairDate
};
