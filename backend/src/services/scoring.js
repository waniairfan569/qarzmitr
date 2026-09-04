const { env } = require('../config/env');

const DASHSCOPE_URL = `${env.dashscopeBaseUrl}/chat/completions`;
const SCORING_EXPLANATION_MODEL = 'qwen-plus';
const EXPLANATION_SYSTEM_PROMPT = 'You are a financial assistant explaining a credit score to a small shopkeeper in simple, respectful Urdu. Do not use technical jargon. Be encouraging but honest. Keep it to 3-4 sentences.';
const REQUEST_TIMEOUT_MS = 45_000;
const DAY_MS = 24 * 60 * 60 * 1000;

class ScoringExplanationError extends Error {
  constructor(message, { cause, code } = {}) {
    super(message, cause ? { cause } : undefined);
    this.name = 'ScoringExplanationError';
    this.code = code;
  }
}

function clamp(value, minimum, maximum) {
  return Math.min(maximum, Math.max(minimum, value));
}

function roundSubScore(value) {
  return Math.round(clamp(value, 0, 100) * 100) / 100;
}

function nonNegativeAmount(transaction) {
  const amount = Number(transaction.amount);
  return Number.isFinite(amount) ? Math.max(0, amount) : 0;
}

function parseTransactionDay(transactionDate) {
  if (typeof transactionDate !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(transactionDate)) {
    return null;
  }

  const [year, month, day] = transactionDate.split('-').map(Number);
  const timestamp = Date.UTC(year, month - 1, day);
  const parsed = new Date(timestamp);

  if (
    parsed.getUTCFullYear() !== year
    || parsed.getUTCMonth() !== month - 1
    || parsed.getUTCDate() !== day
  ) {
    return null;
  }

  return timestamp / DAY_MS;
}

function mondayWeekKey(dayNumber) {
  const date = new Date(dayNumber * DAY_MS);
  const daysSinceMonday = (date.getUTCDay() + 6) % 7;
  return dayNumber - daysSinceMonday;
}

function populationStandardDeviation(values) {
  if (values.length === 0) {
    return 0;
  }

  const mean = values.reduce((sum, value) => sum + value, 0) / values.length;
  const variance = values.reduce((sum, value) => sum + ((value - mean) ** 2), 0) / values.length;
  return Math.sqrt(variance);
}

function calculateCashFlowConsistency(transactions) {
  const weeklyNetIncome = new Map();

  for (const transaction of transactions) {
    const dayNumber = parseTransactionDay(transaction.transaction_date);
    if (dayNumber === null) {
      continue;
    }

    const amount = nonNegativeAmount(transaction);
    // Weekly net income = sales + repayments - expenses - credit given.
    // Null/invalid dates are excluded because assigning them to a week would fabricate timing.
    // Only weeks represented in the ledger are compared; unrecorded weeks are not assumed to be zero.
    const signedAmount = transaction.type === 'sale' || transaction.type === 'repayment'
      ? amount
      : -amount;
    const weekKey = mondayWeekKey(dayNumber);
    weeklyNetIncome.set(weekKey, (weeklyNetIncome.get(weekKey) || 0) + signedAmount);
  }

  const weeklyValues = [...weeklyNetIncome.values()];
  if (weeklyValues.length === 0) {
    return 0;
  }

  const standardDeviation = populationStandardDeviation(weeklyValues);
  const meanAbsoluteNet = weeklyValues.reduce((sum, value) => sum + Math.abs(value), 0)
    / weeklyValues.length;

  // Normalize relative volatility rather than PKR magnitude:
  // CV = population standard deviation / mean absolute weekly net income.
  // score = 100 / (1 + CV), so no volatility scores 100, CV=1 scores 50,
  // and increasingly volatile cash flow approaches 0 without becoming negative.
  if (meanAbsoluteNet === 0) {
    return 100;
  }
  return roundSubScore(100 / (1 + (standardDeviation / meanAbsoluteNet)));
}

function calculateRepaymentRatio(transactions) {
  let repayments = 0;
  let creditGiven = 0;

  for (const transaction of transactions) {
    if (transaction.type === 'repayment') {
      repayments += nonNegativeAmount(transaction);
    } else if (transaction.type === 'credit_given') {
      creditGiven += nonNegativeAmount(transaction);
    }
  }

  // With no credit issued there is no repayment history to judge, so use a neutral 50.
  // Otherwise score = clamp(repayments / credit given, 0, 1) * 100.
  if (creditGiven === 0) {
    return 50;
  }
  return roundSubScore(clamp(repayments / creditGiven, 0, 1) * 100);
}

function dailyRevenueSeries(transactions) {
  // Aggregate sales recorded on each valid date. Unrecorded days are not treated as zero revenue,
  // because the ledger does not prove that the shop had no sales on those dates.
  const revenueByDay = new Map();

  for (const transaction of transactions) {
    if (transaction.type !== 'sale') {
      continue;
    }

    const dayNumber = parseTransactionDay(transaction.transaction_date);
    if (dayNumber === null) {
      continue;
    }

    const amount = nonNegativeAmount(transaction);
    revenueByDay.set(dayNumber, (revenueByDay.get(dayNumber) || 0) + amount);
  }

  return [...revenueByDay.entries()]
    .map(([day, revenue]) => ({ day, revenue }))
    .sort((left, right) => left.day - right.day);
}

function leastSquaresSlope(points) {
  if (points.length < 2) {
    return 0;
  }

  const origin = points[0].day;
  const xValues = points.map((point) => point.day - origin);
  const meanX = xValues.reduce((sum, value) => sum + value, 0) / xValues.length;
  const meanY = points.reduce((sum, point) => sum + point.revenue, 0) / points.length;
  let numerator = 0;
  let denominator = 0;

  for (let index = 0; index < points.length; index += 1) {
    const xDelta = xValues[index] - meanX;
    numerator += xDelta * (points[index].revenue - meanY);
    denominator += xDelta ** 2;
  }

  return denominator === 0 ? 0 : numerator / denominator;
}

function calculateRevenueTrend(transactions) {
  const dailyRevenue = dailyRevenueSeries(transactions);
  if (dailyRevenue.length < 2) {
    return 50;
  }

  const meanRevenue = dailyRevenue.reduce((sum, point) => sum + point.revenue, 0)
    / dailyRevenue.length;
  if (meanRevenue === 0) {
    return 50;
  }

  const slopePerDay = leastSquaresSlope(dailyRevenue);
  const trackedDays = dailyRevenue[dailyRevenue.length - 1].day - dailyRevenue[0].day;
  const projectedChange = slopePerDay * trackedDays;

  // Map the regression's projected period change relative to mean observed daily sales.
  // score = clamp(50 + 50 * (projectedChange / meanRevenue), 0, 100).
  // Flat revenue scores 50; growth equal to mean revenue scores 100; an equivalent
  // decline scores 0. Larger changes remain clamped to the 0-100 range.
  return roundSubScore(50 + (50 * (projectedChange / meanRevenue)));
}

function computeScore({ cashFlowConsistency, repaymentRatio, revenueTrend }) {
  // Each input is already normalized to 0-100 before applying the specified weights.
  const score = (
    (cashFlowConsistency * 0.4)
    + (repaymentRatio * 0.35)
    + (revenueTrend * 0.25)
  );
  return Math.round(clamp(score, 0, 100));
}

function computeScoreMetrics(transactions) {
  const cashFlowConsistency = calculateCashFlowConsistency(transactions);
  const repaymentRatio = calculateRepaymentRatio(transactions);
  const revenueTrend = calculateRevenueTrend(transactions);

  return {
    cashFlowConsistency,
    repaymentRatio,
    revenueTrend,
    score: computeScore({ cashFlowConsistency, repaymentRatio, revenueTrend })
  };
}

function buildExplanationUserPrompt({ score, cashFlowConsistency, repaymentRatio, revenueTrend }) {
  return `The shopkeeper's credit score is ${score}/100.
Cash flow consistency: ${cashFlowConsistency}/100
Repayment ratio: ${repaymentRatio}/100
Revenue trend: ${revenueTrend}/100 (positive means growing)

Explain what this score means and what would improve it.`;
}

function readResponseText(responseBody) {
  const content = responseBody?.choices?.[0]?.message?.content;

  if (typeof content === 'string') {
    return content.trim();
  }

  if (Array.isArray(content)) {
    return content
      .filter((part) => part && part.type === 'text' && typeof part.text === 'string')
      .map((part) => part.text)
      .join('\n')
      .trim();
  }

  return '';
}

async function generateScoreExplanation(metrics) {
  if (!env.dashscopeApiKey) {
    return {
      status: 'skipped',
      explanationText: null,
      reason: 'DASHSCOPE_API_KEY is not configured.'
    };
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(DASHSCOPE_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${env.dashscopeApiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: SCORING_EXPLANATION_MODEL,
        messages: [
          { role: 'system', content: EXPLANATION_SYSTEM_PROMPT },
          { role: 'user', content: buildExplanationUserPrompt(metrics) }
        ]
      }),
      signal: controller.signal
    });

    let responseBody;
    try {
      responseBody = await response.json();
    } catch (error) {
      throw new ScoringExplanationError('DashScope returned an invalid API response.', {
        cause: error,
        code: 'INVALID_API_RESPONSE'
      });
    }

    if (!response.ok) {
      const providerMessage = responseBody?.error?.message || `HTTP ${response.status}`;
      throw new ScoringExplanationError(`DashScope rejected the explanation request: ${providerMessage}`, {
        code: 'DASHSCOPE_REJECTED'
      });
    }

    const explanationText = readResponseText(responseBody);
    if (!explanationText) {
      throw new ScoringExplanationError('DashScope returned no score explanation.', {
        code: 'EMPTY_MODEL_OUTPUT'
      });
    }

    return {
      status: 'completed',
      explanationText,
      reason: null
    };
  } catch (error) {
    if (error instanceof ScoringExplanationError) {
      throw error;
    }
    if (error.name === 'AbortError') {
      throw new ScoringExplanationError('DashScope explanation request timed out.', {
        cause: error,
        code: 'DASHSCOPE_TIMEOUT'
      });
    }
    throw new ScoringExplanationError('DashScope explanation request failed.', {
      cause: error,
      code: 'DASHSCOPE_REQUEST_FAILED'
    });
  } finally {
    clearTimeout(timeout);
  }
}

module.exports = {
  SCORING_EXPLANATION_MODEL,
  ScoringExplanationError,
  calculateCashFlowConsistency,
  calculateRepaymentRatio,
  calculateRevenueTrend,
  computeScore,
  computeScoreMetrics,
  dailyRevenueSeries,
  generateScoreExplanation,
  leastSquaresSlope,
  parseTransactionDay,
  populationStandardDeviation
};
