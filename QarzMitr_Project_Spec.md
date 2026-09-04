# QarzMitr — Technical Specification & Build Guide
**Alibaba Cloud AI Hackathon Pakistan 2026 — Financial Inclusion Track**

---

## 1. Project Summary

QarzMitr turns an unbanked shopkeeper's handwritten paper ledger into a verifiable, AI-generated credit score — with zero behavior change required from the user. A photo of an existing ledger page is enough to build a growing financial profile that a microfinance institution could act on.

**Core insight**: The data already exists on paper. The missing piece is a way to read, structure, and score it.

---

## 2. Tech Stack

| Layer | Technology | Notes |
|---|---|---|
| Frontend | React + Vite (or Next.js) | Fast to scaffold, component reuse across dashboard views |
| Styling | Tailwind CSS | Speed of build matters more than custom design at hackathon stage |
| Backend | Node.js + Express | Matches your existing experience, fast API development |
| Database | PostgreSQL (or SQLite for demo speed) | Relational fits transaction/score data well |
| Auth | JWT-based email/password auth (custom) or Firebase Auth | Firebase Auth is faster to implement if time-constrained |
| Vision/OCR | Qwen-VL (Alibaba Model Studio) or Alibaba Cloud OCR | Extracts text from ledger photo |
| LLM (structuring + explanation) | Qwen (Alibaba Model Studio, DashScope API — OpenAI-SDK compatible) | Structures transactions, generates Urdu explanations |
| File storage | Alibaba Cloud OSS (Object Storage Service) | Store uploaded ledger photos |
| Hosting | Alibaba Cloud ECS or a free-tier host (Vercel/Render) for demo | Use Alibaba Cloud if credits allow — scores extra alignment points with judges |
| Dev tool | Qoder (AI coding assistant, Alibaba) | Use this spec file as the master prompt/reference document while building |

### Required API keys / access
- Alibaba Cloud Model Studio (DashScope) API key — for Qwen text + Qwen-VL vision calls
- Alibaba Cloud OSS access key + secret (if using OSS for image storage)
- (Fallback only, if Alibaba access is delayed) OpenAI API key — same prompt structure, swap endpoint

---

## 3. Architecture Overview

```
[React Frontend]
   │  (upload ledger photo, view dashboard)
   ▼
[Express Backend API]
   │
   ├── /auth        → Authentication module
   ├── /upload       → Image upload → OSS storage
   ├── /ocr           → Send image to Qwen-VL → raw text
   ├── /structure     → Send raw text to Qwen → structured transactions JSON
   ├── /score         → Compute score from transactions + Qwen explanation
   └── /dashboard      → Return user's transactions + score history
   │
   ▼
[PostgreSQL Database]
   users | ledgers | transactions | scores
```

---

## 4. Database Schema

```sql
-- Users
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  email VARCHAR(150) UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  shop_name VARCHAR(150),
  created_at TIMESTAMP DEFAULT now()
);

-- Ledger uploads (raw photos + OCR text)
CREATE TABLE ledgers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  image_url TEXT NOT NULL,
  raw_ocr_text TEXT,
  uploaded_at TIMESTAMP DEFAULT now()
);

-- Structured transactions (parsed from ledger text)
CREATE TABLE transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ledger_id UUID REFERENCES ledgers(id),
  user_id UUID REFERENCES users(id),
  type VARCHAR(20) CHECK (type IN ('sale','expense','credit_given','repayment')),
  amount NUMERIC(12,2) NOT NULL,
  customer_name VARCHAR(100),
  transaction_date DATE,
  created_at TIMESTAMP DEFAULT now()
);

-- Credit scores (one per scoring run, so history is preserved)
CREATE TABLE scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  score INT NOT NULL CHECK (score BETWEEN 0 AND 100),
  explanation_text TEXT,
  cash_flow_consistency NUMERIC,
  repayment_ratio NUMERIC,
  revenue_trend NUMERIC,
  computed_at TIMESTAMP DEFAULT now()
);
```

---

## 5. Module Breakdown

### Module 1 — Authentication

**Purpose**: Secure signup/login so each shopkeeper's ledger data and score history is private and persistent.

**Endpoints**:
- `POST /auth/signup` — name, email, password, shop_name → creates user, returns JWT
- `POST /auth/login` — email, password → returns JWT
- `GET /auth/me` — returns current user profile (JWT-protected)

**Implementation notes**:
- Hash passwords with bcrypt before storing
- Issue JWT on login/signup, store in httpOnly cookie or return to frontend for localStorage-free handling (use React state/context, not localStorage, if built as an artifact — but for a standalone deployed app, secure cookie is fine)
- Middleware: `verifyToken` on all protected routes (`/upload`, `/dashboard`, etc.)

**No AI involved here** — this is standard auth, keep it simple and working over clever.

---

### Module 2 — Ledger Capture & OCR

**Purpose**: Convert a photo of a handwritten ledger page into raw extracted text.

**Flow**:
1. User uploads image via frontend (`<input type="file">`)
2. Backend uploads image to Alibaba Cloud OSS, gets a URL
3. Backend sends image (as URL or base64) to Qwen-VL with an OCR-focused prompt
4. Raw extracted text saved to `ledgers.raw_ocr_text`

**Endpoint**: `POST /upload` (multipart form, JWT-protected)

**AI Prompt (Qwen-VL, vision call)**:
```
System: You are an OCR assistant specialized in reading handwritten Urdu and mixed Urdu-English shopkeeper ledgers. Extract all visible text exactly as written, preserving line breaks. Do not translate. Do not summarize. If a word is unclear, mark it as [unclear] rather than guessing.

User: [image attached] Extract all text from this ledger page.
```

**API call shape (Model Studio / DashScope, OpenAI-SDK compatible)**:
```javascript
const response = await fetch("https://dashscope-intl.aliyuncs.com/compatible-mode/v1/chat/completions", {
  method: "POST",
  headers: {
    "Authorization": `Bearer ${DASHSCOPE_API_KEY}`,
    "Content-Type": "application/json"
  },
  body: JSON.stringify({
    model: "qwen-vl-plus",
    messages: [
      { role: "system", content: "You are an OCR assistant..." },
      { role: "user", content: [
          { type: "text", text: "Extract all text from this ledger page." },
          { type: "image_url", image_url: { url: imageUrl } }
        ]
      }
    ]
  })
});
```

---

### Module 3 — Transaction Structuring

**Purpose**: Convert messy raw OCR text into clean, categorized transaction records.

**Flow**:
1. Backend sends `raw_ocr_text` to Qwen (text model) with a structuring prompt
2. Model returns JSON array of transactions
3. Backend parses JSON, inserts rows into `transactions` table

**Endpoint**: `POST /structure` (internal call, triggered right after OCR, or a separate button "Process Ledger")

**AI Prompt (Qwen, text call)**:
```
System: You are a financial data assistant. You will receive raw, messy text extracted from a handwritten shopkeeper ledger written in Urdu, English, or a mix. Convert it into a structured JSON array of transactions.

Each transaction must have:
- "type": one of "sale", "expense", "credit_given", "repayment"
- "amount": a number (PKR, no currency symbol)
- "customer_name": string or null if not mentioned
- "date": string in YYYY-MM-DD if a date is present, else null
- "note": short English summary of what the line meant

Rules:
- If a line mentions giving goods/money to a customer without immediate payment, classify as "credit_given"
- If a line mentions a customer paying back previously owed money, classify as "repayment"
- If unclear, make your best reasonable inference and lower-case flag it in "note" as "uncertain: ..."
- Output ONLY valid JSON, no explanation, no markdown formatting.

User: Here is the raw ledger text:
"""
{raw_ocr_text}
"""
```

**Why this prompt design works**: Forcing strict JSON-only output means your backend can `JSON.parse()` the response directly without brittle regex extraction. The "uncertain" flag handles OCR/interpretation errors gracefully instead of silently producing wrong data — good for judges' Q&A ("what happens when it's wrong?").

---

### Module 4 — Credit Scoring Engine

**Purpose**: Compute a transparent score from structured transactions and explain it in plain Urdu.

**Flow**:
1. Backend pulls all transactions for a user
2. Backend computes three sub-metrics in code (not AI — keep this transparent and auditable):
   - **Cash flow consistency**: standard deviation of weekly net income (lower = more consistent = higher score)
   - **Repayment ratio**: repayments ÷ credit given (higher = more reliable customers/shop)
   - **Revenue trend**: slope of revenue over the tracked period (positive = growing)
3. Combine into a 0–100 score using a simple weighted formula (documented, not a black box)
4. Send the three metrics + score to Qwen to generate a plain-Urdu explanation
5. Save to `scores` table

**Endpoint**: `POST /score` (JWT-protected, triggered after enough transactions exist)

**Scoring formula (example, adjust weights as needed)**:
```javascript
function computeScore({ cashFlowConsistency, repaymentRatio, revenueTrend }) {
  // Each sub-score normalized 0-100 before weighting
  const score =
    (cashFlowConsistency * 0.4) +
    (repaymentRatio * 0.35) +
    (revenueTrend * 0.25);
  return Math.round(Math.min(100, Math.max(0, score)));
}
```

**AI Prompt (Qwen, text call — explanation only, NOT the scoring math itself)**:
```
System: You are a financial assistant explaining a credit score to a small shopkeeper in simple, respectful Urdu. Do not use technical jargon. Be encouraging but honest. Keep it to 3-4 sentences.

User: The shopkeeper's credit score is {score}/100.
Cash flow consistency: {cashFlowConsistency}/100
Repayment ratio: {repaymentRatio}/100
Revenue trend: {revenueTrend}/100 (positive means growing)

Explain what this score means and what would improve it.
```

**Important judging point**: Keep the actual score computation in your own backend code (deterministic, auditable), and use the LLM only for the human-readable explanation. This is more defensible than letting the LLM "decide" the score — a judge asking "how do I know this isn't a black box / hallucinating a number" gets a clean answer: the math is transparent code, the AI just explains it.

---

### Module 5 — Dashboard

**Purpose**: Shopkeeper-facing view of their financial profile.

**Endpoint**: `GET /dashboard` (JWT-protected) — returns transactions list + latest score + score history

**Frontend components**:
- Score card (big number, 0–100, color-coded)
- Explanation text (from Module 4, shown in Urdu)
- Transaction history table (filterable by type)
- Simple line chart: score over time (use `recharts` if built as a React artifact, or Chart.js in the deployed app)
- Upload button to add a new ledger page

**Optional (if time allows) — Lender view**:
- A second, simplified view showing the same data framed for a loan officer: score, key metrics, transaction count, "recommended for" tag

---

## 6. Full API Endpoint List

| Method | Route | Auth | Purpose |
|---|---|---|---|
| POST | /auth/signup | No | Create account |
| POST | /auth/login | No | Login, get JWT |
| GET | /auth/me | Yes | Get current user |
| POST | /upload | Yes | Upload ledger photo → OCR |
| POST | /structure | Yes | Structure OCR text into transactions |
| POST | /score | Yes | Compute/update credit score |
| GET | /dashboard | Yes | Get user's transactions + score history |
| GET | /transactions | Yes | Get raw transaction list (with filters) |

---

## 7. Environment Variables

```
DASHSCOPE_API_KEY=
OSS_ACCESS_KEY_ID=
OSS_ACCESS_KEY_SECRET=
OSS_BUCKET_NAME=
DATABASE_URL=
JWT_SECRET=
PORT=3000
```

---

## 8. Build Order (Recommended Sequence)

1. **Day 1 AM**: Auth module + database setup — get signup/login fully working first, everything else depends on it
2. **Day 1 Midday**: Upload + OCR module — get one real ledger photo → raw text working end-to-end before anything else
3. **Day 1 PM**: Structuring module — raw text → structured JSON transactions, tested against 3-4 sample ledgers
4. **Day 1 Evening**: Scoring module — formula + AI explanation
5. **Day 2 AM**: Dashboard frontend — wire everything to a clean UI
6. **Day 2 Midday**: Polish, error handling (what happens when OCR fails or text is garbled — handle gracefully, don't crash), prepare 2-3 clean demo ledger samples
7. **Day 2 PM**: Rehearse the live demo end-to-end at least 3 times before presenting

---

## 9. Demo Script (for judges)

1. Show a real shopkeeper persona (name, shop type — make it specific and human, not abstract)
2. Upload a real handwritten ledger photo live on stage
3. Show OCR extraction happening in real time
4. Show structured transactions appearing
5. Show the score generate with its Urdu explanation
6. Show the dashboard with score history (pre-loaded with 2-3 weeks of sample data so the trend line looks real)
7. Close with the differentiation line: "Unlike digital khata apps or bank-data-based scoring, this works for someone who has never used a banking app and never will — using only what they already do."

---

## 10. Things That Will Make Judges Trust This More

- **Transparency**: score is computed by auditable code, not an opaque AI "vibe" — say this explicitly
- **Graceful failure handling**: show what happens when OCR misreads something (don't hide it — show the "uncertain" flag working as intended)
- **Honest framing**: this is a prototype proving feasibility, not a finished lending product — say this in your closing slide, it builds credibility rather than undermining it
- **Real numbers**: keep the stats (161–182M unbanked, 5M SMEs) visible on a slide, not just spoken

---

## 11. Responsible Use Note

Per the hackathon's tools access conditions, all Qoder credits and Alibaba Cloud resources should be used only for this project's development — no unrelated testing, no excessive/wasteful API calls during development (batch your test calls, don't loop unnecessarily against the live API), and no account sharing.
