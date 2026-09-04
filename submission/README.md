# Submission attachments

Sample input and output from one live run of the QarzMitr pipeline, kept together so the
result can be checked against the page it came from.

| File | What it is |
|---|---|
| `sample-ledger-page.png` | The ledger page that was uploaded — ten entries in mixed Urdu and English |
| `qarzmitr-sample-output.csv` | The typed transactions the pipeline produced from it |

## How this run went

The page was uploaded to `POST /upload`, transcribed by Qwen-VL-Plus, then structured by
Qwen-Plus via `POST /structure`. All ten entries were typed correctly: Urdu terms
ادھار (*udhaar*, credit given) and واپسی (*waapsi*, repayment) were classified from the
Urdu alone, and customer names were attached only to the credit and repayment rows,
leaving walk-in sales anonymous.

## Two transcription errors, both flagged

The vision model misread two words, and the structuring step recorded its uncertainty
instead of asserting a clean answer:

| On the page | Read as | What the CSV records |
|---|---|---|
| دہی (yoghurt) | دبی (Dubai) | `cash sale of milk and dubai (likely dairy product)` |
| آٹا (flour) | آئنا (non-word) | `mirror (aina) 10kg purchased — likely typo; interpreted as expense` |

Both rows were still typed correctly — `sale` and `expense` respectively — so the
misreads changed the description but not the financial classification, and the doubt is
visible to anyone reviewing the ledger.

This run was carried out independently of the one described in
[SUBMISSION.md](../SUBMISSION.md), and reproduced the same flagging behaviour on the same
two words. The handling is consistent, not a one-off.

## Reproducing it

With `DASHSCOPE_API_KEY` set and the backend running:

```bash
curl -X POST http://localhost:3000/upload \
  -H "Authorization: Bearer $TOKEN" \
  -F "image=@submission/sample-ledger-page.png;type=image/png"

curl -X POST http://localhost:3000/structure \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"ledger_id":"<id returned above>"}'
```

Transcription is not deterministic, so the wording of the notes will vary between runs.
The transaction types and amounts should not.

---

## Two sample ledgers for a demo

| File | What it shows |
|---|---|
| `sample-ledger-growth.png` | Four rising days plus three repayments. Uploading it against the seeded demo record moves the score **69 → 85**, which crosses the band threshold so the card turns green. |
| `sample-ledger-full.png` | One page that exercises every part of the app at once. |

`sample-ledger-full.png` was built so a single upload lights up every panel:

- **All four transaction types** — sale, expense, credit given, repayment
- **A customer who still owes** — Nasreen, 1,200 outstanding at 15 days, which is old enough to change the reminder's tone from gentle to direct
- **A customer who has settled** — Imran Ali, 1,200 lent and 1,200 returned
- **A name written two ways** — the full name on the credit line, the short form on the repayment, matched into one balance and labelled *"also written as"*
- **Two credit lines with no customer name** — the highest-severity entry in the review queue, because credit that names nobody cannot be tracked
- **One line with no date** — the lowest-severity entry, left out of the weekly figures rather than placed in a guessed week
- **Three trading weeks**, one of them negative, so the history has something to show

Verified against the live pipeline: 10 of 10 transactions parsed, and every panel populated as intended.
