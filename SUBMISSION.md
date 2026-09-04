# QarzMitr — Submission Write-up

**Track:** Financial Inclusion
**Event:** Alibaba Cloud AI Hackathon Pakistan 2026

---

## What we built

QarzMitr turns a photograph of a shopkeeper's handwritten paper ledger — a *khata* — into a verifiable credit score, with no behaviour change required from the shopkeeper.

Between 161 and 182 million Pakistanis are unbanked, and roughly 5 million of them run a small shop. A shopkeeper can trade reliably for a decade and still be refused a 30,000 rupee loan, not because they are a bad risk but because nothing they did was ever recorded in a form a microfinance institution recognises.

The insight is that it *was* recorded. Every sale, expense and customer debt already sits in a paper ledger, written daily in a mix of Urdu and English. The financial history exists; it is simply unreadable to a lending system. QarzMitr does that translation.

Existing alternatives assume the behaviour change has already happened. Digital khata apps require the shopkeeper to adopt an app and keep using it every day. Bank-data credit scoring requires a bank account. QarzMitr requires a photograph of the notebook they already write in.

---

## How it works

A ledger photo is uploaded and read by **Qwen-VL-Plus**, prompted to transcribe handwritten Urdu and mixed Urdu-English exactly — not translate, not summarise — and to mark anything unclear rather than guess it. The raw transcription then goes to **Qwen-Plus**, which returns a JSON array of typed transactions: `sale`, `expense`, `credit_given`, `repayment`, each with an amount in PKR, an optional customer name and a date.

Those transactions are scored. Three metrics are computed and combined at fixed weights:

| Metric | Weight | Measurement |
|---|---|---|
| Cash flow consistency | 40% | `100 / (1 + CV)`, CV being the coefficient of variation of weekly net income |
| Repayment ratio | 35% | `clamp(repaid / credit extended, 0, 1) × 100` |
| Revenue trend | 25% | Least-squares slope of daily sales, mapped against mean revenue |

Finally the finished score is handed to Qwen-Plus, which explains it to the shopkeeper in plain Urdu.

---

## The decision we most want judges to notice

**The AI does not decide the score.**

The scoring maths runs entirely in ordinary backend code. It is deterministic — the same ledger in any row order returns an identical number — and it is auditable line by line. A language model is used only to *read* the handwriting and to *explain* the finished result. It is never asked what the score should be.

This matters because the obvious question about any AI credit product is "how do I know this isn't a hallucinated number?" Our answer is structural rather than reassuring: the model was never given the option. We back it with 135 automated tests, one of which pins the exact score from our live demo run so a regression in the formula fails loudly.

Three further choices follow from the same principle:

- **Volatility, not size.** Consistency is scored on the coefficient of variation, so a shop turning over 4,000 rupees a week is judged on steadiness rather than penalised for being small.
- **Absence is not evidence.** A shopkeeper who has never extended credit scores a neutral 50, not zero — there is no repayment history to judge. Undated lines are excluded from time-based metrics rather than assigned a guessed week.
- **It refuses thin data.** Fewer than 3 transactions, or sales on fewer than 2 distinct dates, returns a `422` explaining what is missing instead of producing a confident number from nothing.

We also made that maths visible rather than merely claiming it. Cash flow consistency is measured on weekly net income, and the trading history returns those same weeks — 2,350 · 16,820 · 18,950 · 15,000. A judge can point at the weak first week and see exactly why the metric landed at 67 rather than 90.

---

## Why a shopkeeper would actually use it

This is the question we think most AI-for-development projects fail. A credit score only pays off if a lender exists, and only at the moment you apply. So why photograph a page next Tuesday?

Three things now come out of the same upload, each answering a problem a shopkeeper has today:

**The udhaar book.** Who owes what, derived from the credit and repayment lines already on the page. Repayments settle oldest-first, the way a shopkeeper works down a customer's page, so the age of a debt is real rather than being the first date on record. Spelling variants of a name are matched, so one person written two ways is one balance.

**Reminders worth sending.** A polite Urdu message per debtor, ready to copy. Tone follows the age of the debt — no ageing at someone over fresh credit, a clear ask after two weeks, a request for a date after a month. Templated rather than generated, so it reads the same every time, costs nothing, and works with no connection. Nothing is ever sent on the shopkeeper's behalf.

**Trading history.** Sales, expenses, credit, repayments and net income by day, week, month or year.

Collecting an overdue balance also lifts the repayment ratio, which is 35% of the score. **Chasing udhaar and becoming creditworthy are the same action.** The pitch stops being "photograph your ledger and maybe get a loan someday" and becomes *track who owes you money, chase it, watch your trade — and build a credit history for free while you do it*.

---

## Showing the shopkeeper the loan, not just the score

The whole point of a score is that a lender can act on it, yet until recently only the loan officer could see how close a shopkeeper was. That is now the other way round.

At 69 out of 100 the dashboard says **"You are 1 point away"**, names the threshold, and shows the gap as a bar. Past it, the wording changes to what a lender could actually act on — an indicative facility derived from average monthly sales.

The advice names the metric leaving the most score on the table, **weighted rather than lowest-first**. Revenue trend at 73.51 has only 6.6 points left in it; cash flow at 67.26 has 13.1, because it carries 40% of the weight. The repayment lever reads *"collect the udhaar you are owed"* — and the reminders to do exactly that are one tab away.

The band thresholds are prototype defaults, not a lender's policy, and the page says so under the number. Shopkeeper and loan officer read the same bands from the same code, so the two are never shown different answers about the same score.

---

## What we measured

A single successful run proves the pipeline connects. It does not tell you how often it is right. So we built twelve ledger pages designed to stress failure modes rather than flatter the model — dense, sparse, faded, rotated, noisy, Urdu-only, English-only, undated, two-column, and deliberately ambiguous — each with known ground truth.

| Measure | Result |
|---|---|
| Transactions expected | 64 |
| **Captured** | **64 — 100%** |
| **Rows invented** | **0** |
| **Type correct** | **61/62 — 98%** |
| **Date correct** | **64/64 — 100%** |
| Customer name correct | 25/26 — 96% |

**Zero invented rows is the number to read first.** Across 64 opportunities the model never produced a transaction that was not on the page — including on the sparse page, which offered three entries and a lot of blank paper. For a credit product a fabricated sale is a worse failure than a missed one, because it inflates a score rather than understating it.

The benchmark, its ground truth and its results are in [`benchmark/`](benchmark/) and can be re-run.

**An honest limit:** these are rendered pages, not photographs. They vary layout, density, contrast, rotation, noise and script mix, but they do not reproduce real handwriting, paper texture, shadows or a creased page under a phone camera. Read the numbers as an upper bound. The next honest step is scoring photographs of genuine ledgers the same way.

---

## Being wrong, visibly

In our live demo run the vision model made two genuine transcription errors:

| On the page | Read as | What was recorded |
|---|---|---|
| دہی (yoghurt) | دبی (Dubai) | `cash sale of milk and dubai (likely dairy product)` |
| آٹا (flour) | آئنا (non-word) | `expense for 10kg aina (likely flour or atta)` |

Both rows were still typed correctly. The benchmark's single type error behaved the same way: on the deliberately ambiguous line **پرانا حساب — ادھار** the model returned `repayment` where we expected `credit_given`, noting *"likely customer repayment"*. That phrase honestly reads either way; a human bookkeeper would have to ask.

**But flagging is only half the promise.** Telling a shopkeeper an entry might be wrong and giving them no way to fix it is not much better than hiding it. Flagged rows now form a short list they can act on — corrected, or confirmed as right after all. The list is ordered by how much damage each gap does: credit with no customer name ranks highest because it cannot be tracked against anyone at all; an unsure reading is next; a missing date is last. Corrections are validated before they touch the ledger, and because every figure is recalculated from these rows rather than stored, a correction moves the score, the balances and the history at once.

The same caution governs name matching. A shortening attaches to the fullest spelling, and a one-character slip is forgiven — but matching on a *trailing* word is deliberately refused, because "Ali" and "Imran Ali" are very often two different customers, and putting one person's debt on another's name is far worse than showing two rows a shopkeeper can recognise. Every merge is labelled *"also written as"*.

---

## Reaching people who cannot read the explanation

Plenty of shopkeepers keep a khata confidently — figures, names, short entries — without reading a paragraph of formal Urdu comfortably. A score explained only in writing is a score explained to the wrong half of the audience, which for a financial inclusion product is the original problem repeating itself one layer up.

The score explanation and every reminder can be **played aloud**, using the device's own speech synthesis: no network, no cost, and the audio never leaves the phone. Where no Urdu voice is installed the button hides itself rather than reading Urdu script in an English voice, which is worse than silence.

---

## Also built

**A lender view** at `/lender`: the same evidence reframed for a loan officer — score and band, the three weighted metrics, and the ledger totals behind them, with an indicative facility ceiling where the band warrants it.

**Authentication built properly.** Password (bcrypt at 12 rounds, with the 72-*byte* limit enforced correctly — 37 Urdu characters already exceed it), Google OAuth with account linking rather than duplication, and emailed single-use password reset. Reset requests answer identically whether or not an address is registered, so the endpoint cannot be used to discover accounts. Each account carries a `token_version` that increments on reset, so a password reset immediately evicts any session issued before it.

**Safe degradation everywhere.** Every external integration reports itself unavailable instead of crashing when its credentials are absent. Without a DashScope key each AI step returns a stated `skipped`. Without OSS credentials images go to local disk. Without Google credentials the sign-in button hides itself. Without SMTP the reset link goes to the server log.

---

## What we are not claiming

This is a feasibility prototype built to prove the pipeline is real. It is not a finished lending product, and no score it produces should decide a loan on its own. The lender view's band thresholds and facility multiples are illustrative defaults, not underwriting policy.

Transcription accuracy has been measured on rendered pages, not photographs of real handwriting. Google sign-in is implemented but not switched on, since it needs OAuth client credentials. The OSS storage path is correct but has not been exercised against a live bucket; local disk is the tested route.

We state these openly because a credit product that overclaims is worse than one that admits its limits.

---

## What comes next

Field-test transcription against photographs of real ledgers across different handwriting and page layouts. Calibrate the metric weights with an actual lending partner rather than choosing them ourselves. Add voice entry, so a shopkeeper who cannot comfortably write can speak an entry — the natural counterpart to being able to hear the explanation.

---

## Stack

**Frontend** React 19 · Vite 8 · Tailwind 4 · Recharts
**Backend** Node 18+ · Express 5 · better-sqlite3 · Nodemailer
**AI** Qwen-VL-Plus and Qwen-Plus via Alibaba Cloud Model Studio, OpenAI-compatible endpoint, `ap-southeast-1`
**Storage** Alibaba Cloud OSS with a local-disk fallback

Nineteen API routes, five tables, 135 tests. Running instructions and the full API surface are in [README.md](README.md).
