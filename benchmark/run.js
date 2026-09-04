/**
 * Runs every rendered benchmark page through the live pipeline and scores the
 * result against the ground truth in pages.json.
 *
 *   node benchmark/run.js [--base http://localhost:3000]
 *
 * Needs the backend running with DASHSCOPE_API_KEY set. Creates one throwaway
 * account, uses it for every page, and deletes it at the end so no demo data
 * is disturbed.
 */

const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const IMAGES = path.join(ROOT, 'images');
const BASE = (() => {
  const flag = process.argv.indexOf('--base');
  return flag > -1 ? process.argv[flag + 1] : 'http://localhost:3000';
})();

const spec = JSON.parse(fs.readFileSync(path.join(ROOT, 'pages.json'), 'utf8'));

const TYPES = ['sale', 'expense', 'credit_given', 'repayment'];

const sleep = (ms) => new Promise((resolve) => { setTimeout(resolve, ms); });

// The upstream model occasionally returns a transient 502. Retrying with backoff
// keeps a network hiccup from being recorded as a transcription failure.
async function api(route, { token, body, form, attempts = 3 } = {}) {
  let lastError;

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    const headers = {};
    if (token) headers.Authorization = `Bearer ${token}`;
    if (body) headers['Content-Type'] = 'application/json';

    let response;
    try {
      response = await fetch(`${BASE}${route}`, {
        method: body || form ? 'POST' : 'GET',
        headers,
        body: form || (body ? JSON.stringify(body) : undefined)
      });
    } catch (error) {
      lastError = error;
      await sleep(attempt * 2000);
      continue;
    }

    const json = await response.json().catch(() => null);
    if (response.ok) return json;

    lastError = new Error(`${route} -> ${response.status}: ${json?.message || 'no message'}`);
    if (response.status < 500) break;
    await sleep(attempt * 2000);
  }

  throw lastError;
}

// Rows are matched to the ground truth by amount, which is unique within each
// page. Anything left unmatched counts as a miss on one side or a spurious row
// on the other.
function scorePage(page, produced) {
  const expected = page.rows.map((row) => ({
    type: row.truth[0],
    amount: row.truth[1],
    customer: row.truth[2],
    day: row.truth[3]
  }));

  const pool = [...produced];
  const result = {
    expected: expected.length,
    produced: produced.length,
    matched: 0,
    typeOk: 0,
    typeApplicable: 0,
    dateOk: 0,
    dateApplicable: 0,
    customerOk: 0,
    customerApplicable: 0,
    flagged: 0,
    misses: [],
    typeErrors: [],
    spurious: 0
  };

  for (const want of expected) {
    const index = pool.findIndex((row) => Number(row.amount) === want.amount);
    if (index === -1) {
      result.misses.push(`${want.type} ${want.amount}`);
      continue;
    }

    const got = pool.splice(index, 1)[0];
    result.matched += 1;

    if (typeof got.note === 'string' && /uncertain|likely|unclear|assum/i.test(got.note)) {
      result.flagged += 1;
    }

    // "*" means the page is deliberately ambiguous: any valid type is acceptable,
    // what matters is that the row was captured at all.
    if (want.type !== '*') {
      result.typeApplicable += 1;
      if (got.type === want.type) {
        result.typeOk += 1;
      } else {
        result.typeErrors.push({
          amount: want.amount,
          expected: want.type,
          got: got.type,
          note: got.note || null
        });
      }
    }

    if (want.day !== null) {
      result.dateApplicable += 1;
      if (got.transaction_date === `2026-09-0${want.day}`) result.dateOk += 1;
    } else {
      // An undated line must come back undated rather than carrying a guess.
      result.dateApplicable += 1;
      if (got.transaction_date === null) result.dateOk += 1;
    }

    if (want.customer) {
      result.customerApplicable += 1;
      const name = (got.customer_name || '').toLowerCase();
      if (name.includes(want.customer.toLowerCase())) result.customerOk += 1;
    }
  }

  result.spurious = pool.length;
  return result;
}

function pct(numerator, denominator) {
  if (denominator === 0) return '  n/a';
  return `${((numerator / denominator) * 100).toFixed(0).padStart(3)}%`;
}

async function main() {
  const email = `benchmark-${Date.now()}@example.com`;
  const { token } = await api('/auth/signup', {
    body: { name: 'Benchmark', email, password: 'Benchmark1234!', shop_name: 'Benchmark' }
  });

  const onlyFlag = process.argv.indexOf('--only');
  const only = onlyFlag > -1 ? process.argv[onlyFlag + 1].split(',') : null;
  const pages = only ? spec.pages.filter((page) => only.includes(page.id)) : spec.pages;

  const rows = [];
  console.log(`Running ${pages.length} pages against ${BASE}\n`);

  for (const page of pages) {
    const file = path.join(IMAGES, `${page.id}.png`);
    if (!fs.existsSync(file)) {
      console.log(`${page.id.padEnd(22)} SKIPPED (render.ps1 not run)`);
      continue;
    }

    process.stdout.write(`${page.id.padEnd(22)} `);
    try {
      const form = new FormData();
      form.append('image', new Blob([fs.readFileSync(file)], { type: 'image/png' }), `${page.id}.png`);
      const upload = await api('/upload', { token, form });

      if (upload.ocr.status !== 'completed') {
        console.log(`OCR ${upload.ocr.status}: ${upload.ocr.reason}`);
        continue;
      }

      const structured = await api('/structure', { token, body: { ledger_id: upload.ledger.id } });
      const score = scorePage(page, structured.transactions || []);
      rows.push({ id: page.id, why: page.why, ...score });

      console.log(
        `rows ${String(score.matched)}/${String(score.expected)}`
        + `  type ${pct(score.typeOk, score.typeApplicable)}`
        + `  date ${pct(score.dateOk, score.dateApplicable)}`
        + `  name ${pct(score.customerOk, score.customerApplicable)}`
        + (score.spurious ? `  +${score.spurious} spurious` : '')
      );
    } catch (error) {
      console.log(`FAILED: ${error.message}`);
    }
  }

  const total = rows.reduce((sum, row) => ({
    expected: sum.expected + row.expected,
    matched: sum.matched + row.matched,
    typeOk: sum.typeOk + row.typeOk,
    typeApplicable: sum.typeApplicable + row.typeApplicable,
    dateOk: sum.dateOk + row.dateOk,
    dateApplicable: sum.dateApplicable + row.dateApplicable,
    customerOk: sum.customerOk + row.customerOk,
    customerApplicable: sum.customerApplicable + row.customerApplicable,
    flagged: sum.flagged + row.flagged,
    spurious: sum.spurious + row.spurious
  }), {
    expected: 0, matched: 0, typeOk: 0, typeApplicable: 0, dateOk: 0,
    dateApplicable: 0, customerOk: 0, customerApplicable: 0, flagged: 0, spurious: 0
  });

  console.log('\n' + '='.repeat(64));
  console.log(`pages                 ${rows.length}`);
  console.log(`transactions expected ${total.expected}`);
  console.log(`transactions captured ${total.matched}  (${pct(total.matched, total.expected).trim()})`);
  console.log(`spurious rows         ${total.spurious}`);
  console.log(`type correct          ${total.typeOk}/${total.typeApplicable}  (${pct(total.typeOk, total.typeApplicable).trim()})`);
  console.log(`date correct          ${total.dateOk}/${total.dateApplicable}  (${pct(total.dateOk, total.dateApplicable).trim()})`);
  console.log(`customer correct      ${total.customerOk}/${total.customerApplicable}  (${pct(total.customerOk, total.customerApplicable).trim()})`);
  console.log(`rows carrying a flag  ${total.flagged}`);
  console.log('='.repeat(64));

  fs.writeFileSync(
    path.join(ROOT, 'results.json'),
    JSON.stringify({ ranAt: new Date().toISOString(), base: BASE, total, pages: rows }, null, 2)
  );
  console.log('\nWritten to benchmark/results.json');
  console.log(`Throwaway account: ${email} (delete with benchmark/cleanup.js)`);
  fs.writeFileSync(path.join(ROOT, '.last-account'), email);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
