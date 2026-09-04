# Transcription benchmark

Measures how accurately QarzMitr turns a ledger page into typed transactions,
across twelve pages chosen to stress different failure modes rather than to
flatter the pipeline.

## Results

Run on 4 September 2026 against Qwen-VL-Plus and Qwen-Plus on Alibaba Cloud
Model Studio (`ap-southeast-1`).

| Measure | Result |
|---|---|
| Pages | 12 |
| Transactions expected | 64 |
| **Transactions captured** | **64 (100%)** |
| **Spurious rows invented** | **0** |
| **Transaction type correct** | **61/62 (98%)** |
| **Date correct** | **64/64 (100%)** |
| Customer name correct | 25/26 (96%) |
| Rows carrying an uncertainty note | 6 |

Zero spurious rows matters as much as the capture rate: across 64 opportunities
the model never invented a transaction that was not on the page. For a credit
product, a fabricated sale is a worse failure than a missed one.

## The one type error

A single row out of 62 was mistyped, and it was on the page written to be
ambiguous on purpose:

> **پرانا حساب — ادھار**, PKR 2,000
> Expected `credit_given`, returned `repayment`
> The model's own note: *"repayment of old account (adhār), **likely** customer repayment"*

The phrase can honestly be read either way — new credit against an old account,
or settling one. A human bookkeeper would have to ask. The model chose one
reading and marked its doubt rather than asserting a clean answer, which is the
behaviour the prompt asks for.

## What the twelve pages test

| Page | What it stresses |
|---|---|
| `01-baseline-clean` | Well lit, mixed Urdu and English, date column — the easy case |
| `02-urdu-only` | No English cue words; type inferred from Urdu alone |
| `03-english-only` | The opposite control |
| `04-dense` | Sixteen rows on one page — do entries get dropped when it is busy? |
| `05-sparse` | Three rows — does a thin page get padded with invented ones? |
| `06-faded` | Low contrast, as in poor light or with a drying pen |
| `07-rotated` | Photographed askew, as a phone photo of a notebook usually is |
| `08-noisy` | Ruled lines and speckle over the writing |
| `09-no-dates` | No per-line dates — undated rows must stay undated, not be guessed |
| `10-plain-amounts` | Amounts without separators, some with `PKR`/`Rs` prefixes |
| `11-ambiguous` | Deliberately unclear wording — a flag is the correct answer |
| `12-two-column` | Left credit / right debit layout |

Dense, faded, rotated, noisy and two-column pages all returned every row
correctly typed and dated. The pipeline held on every degradation tested.

## Honest limits

These pages are **rendered, not photographed**. They vary layout, density,
contrast, rotation, noise and script mix, but they do not reproduce genuine
handwriting, paper texture, shadows, or a creased page under a phone camera.
Real handwriting is materially harder, and the numbers above should be read as
an upper bound rather than a field result.

The next honest step is a set of photographs of real shopkeeper ledgers, scored
the same way.

## Running it

Needs the backend running with `DASHSCOPE_API_KEY` set.

```bash
# 1. Render the pages (Windows, uses System.Drawing)
powershell -File benchmark/render.ps1

# 2. Run them through the live pipeline and score the output
node benchmark/run.js

# 3. Remove the throwaway accounts it created
node benchmark/cleanup.js
```

Useful flags:

```bash
node benchmark/run.js --only 04-dense,11-ambiguous   # re-run selected pages
node benchmark/run.js --base https://your-host       # target a deployment
```

Each page costs two model calls, one for transcription and one for structuring,
so a full run is 24 calls. Transient upstream `502`s are retried with backoff
rather than being recorded as transcription failures.

Ground truth lives in `pages.json`; per-page results are written to
`results.json`. The benchmark creates one throwaway account and never touches
the demo record.
