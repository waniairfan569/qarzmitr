const assert = require('node:assert/strict');
const { describe, it } = require('node:test');

const {
  calculateCashFlowConsistency,
  calculateRepaymentRatio,
  calculateRevenueTrend,
  computeScore,
  computeScoreMetrics,
  dailyRevenueSeries,
  leastSquaresSlope,
  parseTransactionDay,
  populationStandardDeviation
} = require('../src/services/scoring');

function sale(amount, date) {
  return { type: 'sale', amount, transaction_date: date };
}
function expense(amount, date) {
  return { type: 'expense', amount, transaction_date: date };
}
function creditGiven(amount, date) {
  return { type: 'credit_given', amount, transaction_date: date };
}
function repayment(amount, date) {
  return { type: 'repayment', amount, transaction_date: date };
}

describe('parseTransactionDay', () => {
  it('converts a valid ISO date to a whole day number', () => {
    assert.equal(parseTransactionDay('1970-01-01'), 0);
    assert.equal(parseTransactionDay('1970-01-02'), 1);
  });

  it('rejects anything that is not a real YYYY-MM-DD date', () => {
    for (const value of ['2026-13-01', '2026-02-30', '13-08-2026', '2026-8-1', '', null, undefined, 20260813]) {
      assert.equal(parseTransactionDay(value), null, `expected null for ${String(value)}`);
    }
  });
});

describe('populationStandardDeviation', () => {
  it('is zero for a flat series', () => {
    assert.equal(populationStandardDeviation([5, 5, 5]), 0);
  });

  it('divides by n rather than n-1', () => {
    // mean 4, squared deviations 4+0+4 = 8, 8/3 -> sqrt
    assert.equal(populationStandardDeviation([2, 4, 6]), Math.sqrt(8 / 3));
  });

  it('returns zero for an empty series', () => {
    assert.equal(populationStandardDeviation([]), 0);
  });
});

describe('leastSquaresSlope', () => {
  it('finds the slope of a clean upward line', () => {
    const points = [{ day: 0, revenue: 100 }, { day: 1, revenue: 200 }, { day: 2, revenue: 300 }];
    assert.equal(leastSquaresSlope(points), 100);
  });

  it('is negative for a declining series', () => {
    const points = [{ day: 0, revenue: 300 }, { day: 1, revenue: 100 }];
    assert.equal(leastSquaresSlope(points), -200);
  });

  it('needs at least two points', () => {
    assert.equal(leastSquaresSlope([{ day: 0, revenue: 100 }]), 0);
    assert.equal(leastSquaresSlope([]), 0);
  });
});

describe('dailyRevenueSeries', () => {
  it('sums sales per day and sorts chronologically', () => {
    const series = dailyRevenueSeries([
      sale(300, '2026-08-15'),
      sale(200, '2026-08-13'),
      sale(100, '2026-08-13')
    ]);
    assert.deepEqual(series.map((point) => point.revenue), [300, 300]);
    assert.ok(series[0].day < series[1].day);
  });

  it('counts only sales, not other transaction types', () => {
    const series = dailyRevenueSeries([
      sale(500, '2026-08-13'),
      expense(400, '2026-08-13'),
      creditGiven(300, '2026-08-13'),
      repayment(200, '2026-08-13')
    ]);
    assert.equal(series.length, 1);
    assert.equal(series[0].revenue, 500);
  });

  it('drops rows with unusable dates instead of guessing a day', () => {
    assert.deepEqual(dailyRevenueSeries([sale(500, null), sale(400, 'last tuesday')]), []);
  });
});

describe('calculateCashFlowConsistency', () => {
  it('scores perfectly steady weekly net income at 100', () => {
    // One sale of 1000 in each of three consecutive Mondays.
    const transactions = [sale(1000, '2026-08-03'), sale(1000, '2026-08-10'), sale(1000, '2026-08-17')];
    assert.equal(calculateCashFlowConsistency(transactions), 100);
  });

  it('scores a coefficient of variation of 1 at 50', () => {
    // Weekly nets of 0 and 2000: mean absolute 1000, population sd 1000, CV = 1.
    const transactions = [sale(2000, '2026-08-10')];
    transactions.push(sale(1000, '2026-08-03'), expense(1000, '2026-08-04'));
    assert.equal(calculateCashFlowConsistency(transactions), 50);
  });

  it('falls as volatility rises', () => {
    const steady = [sale(1000, '2026-08-03'), sale(1100, '2026-08-10'), sale(900, '2026-08-17')];
    const erratic = [sale(200, '2026-08-03'), sale(5000, '2026-08-10'), sale(50, '2026-08-17')];
    assert.ok(calculateCashFlowConsistency(steady) > calculateCashFlowConsistency(erratic));
  });

  it('treats sales and repayments as income, expenses and credit given as outflow', () => {
    // Both weeks net to exactly zero, so income is perfectly consistent.
    const transactions = [
      sale(1000, '2026-08-03'), expense(1000, '2026-08-04'),
      repayment(500, '2026-08-10'), creditGiven(500, '2026-08-11')
    ];
    assert.equal(calculateCashFlowConsistency(transactions), 100);
  });

  it('groups days into Monday-anchored weeks', () => {
    // 2026-08-08 is a Saturday and 2026-08-09 a Sunday: same week, one bucket.
    const sameWeek = calculateCashFlowConsistency([sale(500, '2026-08-08'), sale(500, '2026-08-09')]);
    assert.equal(sameWeek, 100);
  });

  it('returns 0 when nothing is dated', () => {
    assert.equal(calculateCashFlowConsistency([sale(1000, null)]), 0);
    assert.equal(calculateCashFlowConsistency([]), 0);
  });
});

describe('calculateRepaymentRatio', () => {
  it('scores full repayment at 100', () => {
    assert.equal(calculateRepaymentRatio([creditGiven(1000, '2026-08-13'), repayment(1000, '2026-08-20')]), 100);
  });

  it('scores partial repayment proportionally', () => {
    assert.equal(calculateRepaymentRatio([creditGiven(1000, '2026-08-13'), repayment(250, '2026-08-20')]), 25);
  });

  it('stays neutral at 50 when no credit was ever extended', () => {
    assert.equal(calculateRepaymentRatio([sale(5000, '2026-08-13')]), 50);
    assert.equal(calculateRepaymentRatio([]), 50);
  });

  it('caps overpayment at 100 rather than rewarding it', () => {
    assert.equal(calculateRepaymentRatio([creditGiven(100, '2026-08-13'), repayment(900, '2026-08-20')]), 100);
  });

  it('counts undated credit and repayments', () => {
    assert.equal(calculateRepaymentRatio([creditGiven(1000, null), repayment(500, null)]), 50);
  });
});

describe('calculateRevenueTrend', () => {
  it('scores flat revenue at the neutral midpoint', () => {
    assert.equal(calculateRevenueTrend([sale(1000, '2026-08-13'), sale(1000, '2026-08-20')]), 50);
  });

  it('scores growth above 50 and decline below it', () => {
    const growing = calculateRevenueTrend([sale(500, '2026-08-13'), sale(1500, '2026-08-20')]);
    const shrinking = calculateRevenueTrend([sale(1500, '2026-08-13'), sale(500, '2026-08-20')]);
    assert.ok(growing > 50, `expected growth above 50, got ${growing}`);
    assert.ok(shrinking < 50, `expected decline below 50, got ${shrinking}`);
  });

  it('clamps an extreme collapse to 0 and an extreme climb to 100', () => {
    assert.equal(calculateRevenueTrend([sale(100000, '2026-08-13'), sale(1, '2026-09-13')]), 0);
    assert.equal(calculateRevenueTrend([sale(1, '2026-08-13'), sale(100000, '2026-09-13')]), 100);
  });

  it('stays neutral when there are fewer than two dated sales days', () => {
    assert.equal(calculateRevenueTrend([sale(1000, '2026-08-13')]), 50);
    assert.equal(calculateRevenueTrend([sale(1000, null), sale(2000, null)]), 50);
    assert.equal(calculateRevenueTrend([]), 50);
  });
});

describe('computeScore', () => {
  it('applies the documented 40/35/25 weighting', () => {
    const score = computeScore({ cashFlowConsistency: 80, repaymentRatio: 60, revenueTrend: 40 });
    // 32 + 21 + 10 = 63
    assert.equal(score, 63);
  });

  it('reproduces the verified live run of 4 September 2026', () => {
    const score = computeScore({ cashFlowConsistency: 80.01, repaymentRatio: 64.04, revenueTrend: 66.06 });
    assert.equal(score, 71);
  });

  it('returns whole numbers within 0-100 at both extremes', () => {
    assert.equal(computeScore({ cashFlowConsistency: 0, repaymentRatio: 0, revenueTrend: 0 }), 0);
    assert.equal(computeScore({ cashFlowConsistency: 100, repaymentRatio: 100, revenueTrend: 100 }), 100);
  });

  it('never exceeds the range even if a sub-score is out of bounds', () => {
    assert.equal(computeScore({ cashFlowConsistency: 500, repaymentRatio: 500, revenueTrend: 500 }), 100);
    assert.equal(computeScore({ cashFlowConsistency: -500, repaymentRatio: -500, revenueTrend: -500 }), 0);
  });
});

describe('computeScoreMetrics', () => {
  it('returns all three sub-scores alongside the composite', () => {
    const metrics = computeScoreMetrics([
      sale(1000, '2026-08-03'),
      sale(1000, '2026-08-10'),
      creditGiven(500, '2026-08-04'),
      repayment(500, '2026-08-11')
    ]);
    assert.deepEqual(Object.keys(metrics).sort(), [
      'cashFlowConsistency', 'repaymentRatio', 'revenueTrend', 'score'
    ]);
    assert.equal(metrics.repaymentRatio, 100);
    for (const key of ['cashFlowConsistency', 'repaymentRatio', 'revenueTrend', 'score']) {
      assert.ok(metrics[key] >= 0 && metrics[key] <= 100, `${key} out of range: ${metrics[key]}`);
    }
    assert.equal(Number.isInteger(metrics.score), true);
  });

  it('is deterministic — the same ledger always scores the same', () => {
    const ledger = [
      sale(3800, '2026-08-13'), expense(1450, '2026-08-14'),
      sale(4050, '2026-08-15'), creditGiven(1800, '2026-08-15'),
      sale(4200, '2026-08-16'), repayment(1100, '2026-08-18')
    ];
    const first = computeScoreMetrics(ledger);
    const second = computeScoreMetrics([...ledger].reverse());
    assert.deepEqual(first, second);
  });

  it('ignores negative and non-numeric amounts rather than crashing', () => {
    const metrics = computeScoreMetrics([
      sale(-500, '2026-08-13'),
      sale('not a number', '2026-08-14'),
      sale(1000, '2026-08-20'),
      { type: 'sale', amount: undefined, transaction_date: '2026-08-21' }
    ]);
    assert.equal(Number.isFinite(metrics.score), true);
    assert.ok(metrics.score >= 0 && metrics.score <= 100);
  });
});
