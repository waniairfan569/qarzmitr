const { db } = require('../db/database');

/**
 * How much of a record a lender can lean on. QarzMitr cannot prove a ledger is
 * truthful, but it can show how the record was built: a page photographed on
 * many separate days is harder to invent than a month typed in one sitting,
 * and rows changed after they were read deserve a second look.
 */
function buildEvidence(userId) {
  const rows = db.prepare(`
    SELECT
      COUNT(*) AS entries,
      COALESCE(SUM(CASE WHEN source = 'manual' THEN 1 ELSE 0 END), 0) AS typed,
      COALESCE(SUM(CASE WHEN source != 'manual' AND edited_at IS NOT NULL THEN 1 ELSE 0 END), 0) AS edited
    FROM transactions
    WHERE user_id = ?
  `).get(userId);

  const pages = db.prepare(`
    SELECT
      COUNT(*) AS pages,
      COUNT(DISTINCT date(uploaded_at)) AS upload_days,
      MIN(uploaded_at) AS first_upload,
      MAX(uploaded_at) AS last_upload
    FROM ledgers
    WHERE user_id = ?
      AND EXISTS (SELECT 1 FROM transactions WHERE transactions.ledger_id = ledgers.id)
  `).get(userId);

  return {
    entries: rows.entries,
    photographed: rows.entries - rows.typed,
    typed: rows.typed,
    edited_after_reading: rows.edited,
    pages: pages.pages,
    upload_days: pages.upload_days,
    first_upload: pages.first_upload,
    last_upload: pages.last_upload
  };
}

module.exports = { buildEvidence };
