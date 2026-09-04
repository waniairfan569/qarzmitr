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
