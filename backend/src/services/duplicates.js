/**
 * Spots a page that was already added. A rephotographed page has different
 * bytes, so the image hash cannot catch it; its entries can. When most of a
 * new page's entries already exist, the page is held back and the
 * shopkeeper is asked before it is counted a second time.
 */
const DUPLICATE_SHARE = 0.6;
const MIN_MATCHES = 2;

function normaliseName(name) {
  return String(name || '').trim().toLowerCase().replace(/\s+/g, ' ');
}

function entryKey(row) {
  return [row.type, Number(row.amount), row.transaction_date || '', normaliseName(row.customer_name)].join('|');
}

/**
 * Counts how many new rows already exist, each existing row matching at most
 * once, so two genuine 500-rupee sales on the same day are not both
 * explained by a single earlier one.
 */
function findDuplicates(newRows, existingRows) {
  const pool = new Map();
  for (const row of existingRows) {
    const key = entryKey(row);
    pool.set(key, (pool.get(key) || 0) + 1);
  }

  let matched = 0;
  for (const row of newRows) {
    const key = entryKey(row);
    const left = pool.get(key) || 0;
    if (left > 0) {
      matched += 1;
      pool.set(key, left - 1);
    }
  }

  const count = newRows.length;
  const isDuplicate = matched >= MIN_MATCHES && matched >= Math.ceil(count * DUPLICATE_SHARE);
  return { matched, count, isDuplicate };
}

module.exports = {
  DUPLICATE_SHARE,
  MIN_MATCHES,
  entryKey,
  findDuplicates
};
