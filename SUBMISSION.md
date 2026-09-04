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

This matters because the obvious question about any AI credit product is "how do I know this isn't a hallucinated number?" Our answer is structural rather than reassuring: the model was never given the option. We back it with 69 automated tests, one of which pins the exact score from our live demo run so a regression in the formula fails loudly.

Three further choices follow from the same principle:

- **Volatility, not size.** Consistency is scored on the coefficient of variation, so a shop turning over 4,000 rupees a week is judged on steadiness rather than penalised for being small.
- **Absence is not evidence.** A shopkeeper who has never extended credit scores a neutral 50, not zero — there is no repayment history to judge. Undated lines are excluded from time-based metrics rather than assigned a guessed week.
- **It refuses thin data.** Fewer than 3 transactions, or sales on fewer than 2 distinct dates, returns a `422` explaining what is missing instead of producing a confident number from nothing.

---

## What we verified

A ledger page carrying ten mixed Urdu-English entries was pushed through the full chain against live Alibaba Cloud infrastructure, with no stage stubbed:

- **12 of 12 lines** transcribed
- **10 of 10 transactions** correctly typed
- **71/100** scored, with a fluent Urdu explanation

Classification held across the script boundary — چینی (sugar) to `sale`, ادھار (udhaar) to `credit_given`, واپسی (waapsi) to `repayment` — and customer names attached only to the credit and repayment rows, leaving walk-in sales anonymous.

### The most useful result was a failure

The vision model made two genuine transcription errors:

| On the page | Read as | What the structuring step recorded |
|---|---|---|
| دہی (yoghurt) | دبی (Dubai) | `cash sale of milk and dubai (likely dairy product)` |
| آٹا (flour) | آئنا (non-word) | `expense for 10kg aina (likely flour or atta)` |

Both rows were still typed correctly. Neither error was hidden and neither corrupted the ledger — the uncertainty travels with the row into the database, where a reviewer can see exactly which entries to check.

A system that reads handwriting *will* misread handwriting. The design question is whether it tells you.

---

## Beyond the core pipeline

**A lender view.** The same evidence reframed for a loan officer: the score with its band, the three weighted metrics, and the ledger totals behind them — sales, expenses, credit extended, repaid and still outstanding. Where the band warrants it, an indicative facility ceiling is derived from average monthly sales, with the multiple and the measurement period stated on the page.

**Authentication built properly.** Password (bcrypt at 12 rounds, with the 72-*byte* limit enforced correctly — 37 Urdu characters already exceed it), Google OAuth with account linking rather than duplication, and emailed single-use password reset. Reset requests answer identically whether or not an address is registered, so the endpoint cannot be used to discover accounts. Each account carries a `token_version` that increments on reset, so a password reset immediately evicts any session issued before it rather than leaving a stolen token valid for days.

**Safe degradation everywhere.** Every external integration reports itself unavailable instead of crashing when its credentials are absent. Without a DashScope key each AI step returns a stated `skipped`. Without OSS credentials images go to local disk. Without Google credentials the sign-in button hides itself. Without SMTP the reset link goes to the server log.

---

## What we are not claiming

This is a feasibility prototype built to prove the pipeline is real. It is not a finished lending product, and no score it produces should decide a loan on its own. The lender view's band thresholds and facility multiples are illustrative defaults, not underwriting policy.

Transcription accuracy has been measured on a small number of ledger pages, not at scale. Google sign-in is implemented but not switched on, since it needs OAuth client credentials. The OSS storage path is correct but has not been exercised against a live bucket; local disk is the tested route.

We state these openly because a credit product that overclaims is worse than one that admits its limits.

---

## What comes next

Field-test transcription against many real ledgers across different handwriting and page layouts. Calibrate the metric weights with an actual lending partner rather than choosing them ourselves. Put the uncertainty flags in front of a human reviewer as a first-class workflow, so the "uncertain" rows become a queue rather than a note.

---

## Stack

**Frontend** React 19 · Vite 8 · Tailwind 4 · Recharts
**Backend** Node 18+ · Express 5 · better-sqlite3 · Nodemailer
**AI** Qwen-VL-Plus and Qwen-Plus via Alibaba Cloud Model Studio, OpenAI-compatible endpoint, `ap-southeast-1`
**Storage** Alibaba Cloud OSS with a local-disk fallback

Running instructions and the full API surface are in [README.md](README.md).
