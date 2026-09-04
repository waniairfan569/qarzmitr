const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * The same bands the lender view uses, kept here so the shopkeeper and the loan
 * officer are never shown two different answers about the same score.
 *
 * These thresholds are illustrative defaults for a prototype, not underwriting
 * policy. A real deployment would take them from the lending partner.
 */
const BANDS = [
  { min: 70, id: 'recommended', label: 'Ready to be recommended', multiple: 1 },
  { min: 55, id: 'review', label: 'Ready, with a review', multiple: 0.5 },
  { min: 40, id: 'manual', label: 'Needs a closer look', multiple: 0 },
  { min: 0, id: 'early', label: 'Still building evidence', multiple: 0 }
];

// Ordered by weight, so the advice names the lever that actually moves the
// score most rather than whichever metric happens to be lowest.
const LEVERS = [
  {
    key: 'cash_flow_consistency',
    weight: 0.4,
    name: 'Steady weekly income',
    action: 'Record every trading day, including the quiet ones. The score rewards a steady week far more than one big week.'
  },
  {
    key: 'repayment_ratio',
    weight: 0.35,
    name: 'Customers paying you back',
    action: 'Collect the udhaar you are owed. Every repayment you record lifts this directly — the reminders are written for you.'
  },
  {
    key: 'revenue_trend',
    weight: 0.25,
    name: 'Sales growing over time',
    action: 'Keep uploading pages as trade continues, so a rising month is visible rather than assumed.'
  }
];

function bandFor(score) {
  return BANDS.find((band) => score >= band.min) || BANDS[BANDS.length - 1];
}

function nextBandAbove(score) {
  const higher = BANDS.filter((band) => band.min > score);
  return higher.length ? higher[higher.length - 1] : null;
}

function averageMonthlySales(transactions) {
  const sales = transactions.filter((row) => row.type === 'sale');
  const dates = sales
    .map((row) => row.transaction_date)
    .filter((date) => typeof date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(date))
    .sort();

  if (dates.length === 0) return 0;

  const total = sales.reduce((sum, row) => {
    const amount = Number(row.amount);
    return sum + (Number.isFinite(amount) ? Math.max(0, amount) : 0);
  }, 0);

  const span = Math.max(1, Math.round((Date.parse(dates[dates.length - 1]) - Date.parse(dates[0])) / DAY_MS) + 1);
  const months = Math.max(1, span / 30);
  return Math.round(total / months);
}

/**
 * Turns a score into the one thing a shopkeeper actually wants to know: am I
 * close to being lendable, and what would move me?
 */
function buildReadiness(latestScore, transactions) {
  if (!latestScore) {
    return {
      has_score: false,
      message: 'Upload a ledger page and compute a score to see how close you are.'
    };
  }

  const score = Number(latestScore.score) || 0;
  const band = bandFor(score);
  const next = nextBandAbove(score);
  const monthlySales = averageMonthlySales(transactions);

  const levers = LEVERS
    .map((lever) => {
      const value = Number(latestScore[lever.key]) || 0;
      return {
        ...lever,
        value: Math.round(value * 100) / 100,
        // How many points of the final score this metric is currently leaving on
        // the table — headroom weighted by how much the metric actually counts.
        points_available: Math.round((100 - value) * lever.weight * 10) / 10
      };
    })
    .sort((left, right) => right.points_available - left.points_available);

  return {
    has_score: true,
    score,
    band: { id: band.id, label: band.label },
    eligible: band.multiple > 0,
    next_band: next
      ? { id: next.id, label: next.label, at: next.min, points_needed: next.min - score }
      : null,
    indicative_facility: band.multiple > 0 ? Math.round(monthlySales * band.multiple) : 0,
    monthly_sales: monthlySales,
    // The single most useful thing to do next.
    biggest_lever: levers[0],
    levers
  };
}

module.exports = {
  BANDS,
  LEVERS,
  bandFor,
  buildReadiness,
  nextBandAbove
};
