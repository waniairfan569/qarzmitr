const { randomUUID } = require('crypto');
const { db } = require('../db/database');
const {
  SCORING_EXPLANATION_MODEL,
  ScoringExplanationError,
  computeScoreMetrics,
  dailyRevenueSeries,
  generateScoreExplanation
} = require('../services/scoring');

const MINIMUM_TRANSACTION_COUNT = 3;
const MINIMUM_REVENUE_DAYS = 2;

function findInsufficientDataReason(transactions) {
  if (transactions.length < MINIMUM_TRANSACTION_COUNT) {
    return `At least ${MINIMUM_TRANSACTION_COUNT} transactions are required to compute a meaningful score.`;
  }

  const positiveRevenueDays = dailyRevenueSeries(transactions)
    .filter((point) => point.revenue > 0);
  if (positiveRevenueDays.length < MINIMUM_REVENUE_DAYS) {
    return `Sales revenue with valid dates is required on at least ${MINIMUM_REVENUE_DAYS} distinct days.`;
  }

  return null;
}

function insertScore({ id, userId, metrics, explanationText }) {
  db.prepare(`
    INSERT INTO scores (
      id,
      user_id,
      score,
      explanation_text,
      cash_flow_consistency,
      repayment_ratio,
      revenue_trend
    ) VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(
    id,
    userId,
    metrics.score,
    explanationText,
    metrics.cashFlowConsistency,
    metrics.repaymentRatio,
    metrics.revenueTrend
  );
}

function responseBody({ scoreId, metrics, explanationResult }) {
  return {
    score_record_id: scoreId,
    score: metrics.score,
    cash_flow_consistency: metrics.cashFlowConsistency,
    repayment_ratio: metrics.repaymentRatio,
    revenue_trend: metrics.revenueTrend,
    explanation_text: explanationResult.explanationText,
    explanation: {
      status: explanationResult.status,
      model: SCORING_EXPLANATION_MODEL,
      reason: explanationResult.reason
    }
  };
}

async function scoreUser(req, res, next) {
  try {
    const user = db.prepare('SELECT id FROM users WHERE id = ?').get(req.userId);
    if (!user) {
      return res.status(401).json({ message: 'User account no longer exists.' });
    }

    const transactions = db.prepare(`
      SELECT id, ledger_id, user_id, type, amount, customer_name, transaction_date, created_at
      FROM transactions
      WHERE user_id = ?
      ORDER BY transaction_date ASC, created_at ASC, id ASC
    `).all(req.userId);

    const insufficientDataReason = findInsufficientDataReason(transactions);
    if (insufficientDataReason) {
      return res.status(422).json({
        message: 'More transaction data is needed before a credit score can be computed.',
        reason: insufficientDataReason,
        minimum_transactions: MINIMUM_TRANSACTION_COUNT,
        transaction_count: transactions.length
      });
    }

    const metrics = computeScoreMetrics(transactions);
    let explanationResult;
    let explanationError = null;

    try {
      explanationResult = await generateScoreExplanation(metrics);
    } catch (error) {
      if (!(error instanceof ScoringExplanationError)) {
        throw error;
      }

      console.error('Score explanation generation failed:', error.cause || error);
      explanationError = error;
      explanationResult = {
        status: 'failed',
        explanationText: null,
        reason: error.message
      };
    }

    const scoreId = randomUUID();
    insertScore({
      id: scoreId,
      userId: req.userId,
      metrics,
      explanationText: explanationResult.explanationText
    });

    const payload = responseBody({ scoreId, metrics, explanationResult });
    if (explanationError) {
      return res.status(502).json({
        message: 'The score was computed and saved, but its Urdu explanation could not be generated.',
        ...payload
      });
    }

    const message = explanationResult.status === 'skipped'
      ? 'Score computed and saved. Urdu explanation was skipped because DASHSCOPE_API_KEY is not configured.'
      : 'Score computed, explained, and saved successfully.';

    return res.status(201).json({ message, ...payload });
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  MINIMUM_REVENUE_DAYS,
  MINIMUM_TRANSACTION_COUNT,
  findInsufficientDataReason,
  scoreUser
};
