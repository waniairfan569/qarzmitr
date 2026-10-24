/**
 * Checks a lender can lean on when deciding how far to trust a record.
 *
 * None of them proves a ledger is true; together they make an invented one
 * hard to pass off. Each answers pass, warn or info with a plain reason, and
 * every one is ordinary arithmetic on the record, never a model's opinion.
 */
const DAY_MS = 24 * 60 * 60 * 1000;
const TOTAL_TOLERANCE = 0.01;

// "کل فروخت / total sales: 19,000" and "واپسی / repayments received: 2,500"
const SALES_TOTAL = /(?:total\s+sales|کل\s*فروخت)[^\d\n]*([\d,]+(?:\.\d+)?)/i;
const REPAYMENT_TOTAL = /(?:repayments?\s+received|total\s+repayments?|کل\s*واپسی)[^\d\n]*([\d,]+(?:\.\d+)?)/i;

function toNumber(text) {
  return Number(String(text).replace(/,/g, ''));
}

function sumOf(rows, type) {
  return rows.filter((row) => row.type === type).reduce((total, row) => total + Math.max(0, Number(row.amount) || 0), 0);
}

function close(stated, counted) {
  return Math.abs(stated - counted) <= Math.max(1, stated * TOTAL_TOLERANCE);
}

/** Totals written on the page itself, against the entries read from it. */
function pageTotalsCheck(pages) {
  let checked = 0;
  const mismatches = [];

  for (const page of pages) {
    const text = page.raw_ocr_text || '';
    for (const [pattern, type, label] of [[SALES_TOTAL, 'sale', 'sales'], [REPAYMENT_TOTAL, 'repayment', 'repayments']]) {
      const match = text.match(pattern);
      if (!match) continue;
      checked += 1;
      const stated = toNumber(match[1]);
      const counted = sumOf(page.rows, type);
      if (!close(stated, counted)) mismatches.push(`${label}: page says ${stated.toLocaleString('en-PK')}, entries add up to ${counted.toLocaleString('en-PK')}`);
    }
  }

  if (checked === 0) {
    return { code: 'page_totals', status: 'info', label: 'Page totals', detail: 'No page states its own total, so there was nothing to cross-check.' };
  }
  if (mismatches.length) {
    return { code: 'page_totals', status: 'warn', label: 'Page totals', detail: `${mismatches.length} of ${checked} totals written on the pages do not match the entries (${mismatches.slice(0, 2).join('; ')}).` };
  }
  return { code: 'page_totals', status: 'pass', label: 'Page totals', detail: `All ${checked} totals written on the pages match the entries read from them.` };
}

/** Months of trade photographed in one sitting look more like a rewrite than a diary. */
function uploadSpreadCheck(photographedRows, uploadDays) {
  const dates = photographedRows.map((row) => row.transaction_date).filter((date) => /^\d{4}-\d{2}-\d{2}$/.test(date || '')).sort();
  if (dates.length < 2) {
    return { code: 'upload_spread', status: 'info', label: 'Uploaded over time', detail: 'Not enough dated entries yet.' };
  }
  const spanDays = Math.round((Date.parse(dates[dates.length - 1]) - Date.parse(dates[0])) / DAY_MS) + 1;
  if (spanDays <= 31) {
    return { code: 'upload_spread', status: 'info', label: 'Uploaded over time', detail: `The entries cover ${spanDays} days, too short to judge how they were added.` };
  }
  if (uploadDays <= 1) {
    return { code: 'upload_spread', status: 'warn', label: 'Uploaded over time', detail: `${spanDays} days of entries were all photographed on a single day. Worth asking to see the original book.` };
  }
  return { code: 'upload_spread', status: 'pass', label: 'Uploaded over time', detail: `${spanDays} days of entries were photographed on ${uploadDays} separate days.` };
}

/** A sudden jump just before applying is the pattern an inflated record would show. */
function salesJumpCheck(rows) {
  const byDay = new Map();
  for (const row of rows) {
    if (row.type !== 'sale' || !/^\d{4}-\d{2}-\d{2}$/.test(row.transaction_date || '')) continue;
    byDay.set(row.transaction_date, (byDay.get(row.transaction_date) || 0) + Math.max(0, Number(row.amount) || 0));
  }
  const days = [...byDay.keys()].sort();
  if (days.length < 10) {
    return { code: 'sales_jump', status: 'info', label: 'Steady sales', detail: 'Fewer than 10 trading days, too few to compare.' };
  }
  const cutoff = Date.parse(days[days.length - 1]) - (7 * DAY_MS);
  const recent = days.filter((day) => Date.parse(day) > cutoff);
  const earlier = days.filter((day) => Date.parse(day) <= cutoff);
  if (earlier.length < 3) {
    return { code: 'sales_jump', status: 'info', label: 'Steady sales', detail: 'Not enough earlier trading days to compare with the latest week.' };
  }
  const average = (list) => list.reduce((total, day) => total + byDay.get(day), 0) / list.length;
  const ratio = average(recent) / Math.max(1, average(earlier));
  if (ratio >= 2) {
    return { code: 'sales_jump', status: 'warn', label: 'Steady sales', detail: `Daily sales in the latest week average ${ratio.toFixed(1)} times the earlier days. It may be real growth; worth asking.` };
  }
  return { code: 'sales_jump', status: 'pass', label: 'Steady sales', detail: `The latest week's daily sales are ${ratio.toFixed(1)} times the earlier average, in line with the rest of the record.` };
}

function shareCheck({ code, label, part, whole, limit, passText, warnText }) {
  if (whole === 0) return { code, status: 'info', label, detail: 'No entries yet.' };
  const share = part / whole;
  return share > limit
    ? { code, status: 'warn', label, detail: warnText(Math.round(share * 100)) }
    : { code, status: 'pass', label, detail: passText(Math.round(share * 100)) };
}

function buildChecks({ pages, rows, uploadDays }) {
  const photographed = rows.filter((row) => row.source !== 'manual');
  const typed = rows.length - photographed.length;
  const edited = photographed.filter((row) => row.edited_at).length;

  return [
    pageTotalsCheck(pages),
    uploadSpreadCheck(photographed, uploadDays),
    salesJumpCheck(rows),
    shareCheck({
      code: 'typed_share', label: 'Read from photos', part: typed, whole: rows.length, limit: 0.3,
      passText: (p) => `${100 - p}% of entries were read from photographed pages.`,
      warnText: (p) => `${p}% of entries were typed by hand rather than read from a photo.`
    }),
    shareCheck({
      code: 'edited_share', label: 'Left as read', part: edited, whole: photographed.length, limit: 0.2,
      passText: (p) => `${p}% of photographed entries were changed after being read.`,
      warnText: (p) => `${p}% of photographed entries were changed after being read. Compare them with the page.`
    })
  ];
}

module.exports = {
  buildChecks,
  pageTotalsCheck,
  salesJumpCheck,
  uploadSpreadCheck
};
