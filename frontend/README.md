# QarzMitr — frontend

React 19 + Vite 8 + Tailwind 4. The shopkeeper dashboard, the lender view, and
the authentication screens.

See the [project README](../README.md) for what QarzMitr does and how the whole
pipeline fits together.

## Running it

The backend must be running first — see [backend](../backend).

```bash
cp .env.example .env      # point VITE_API_BASE_URL at the backend
npm install
npm run dev               # http://localhost:5173
```

```bash
npm run build             # production build
npm run lint              # oxlint
```

## Layout

| Path | What's there |
|---|---|
| `src/pages/` | Route components — dashboard, lender view, auth screens |
| `src/components/` | Score card, score chart, transaction table, ledger workflow |
| `src/context/AuthContext.jsx` | Session state and token handling |
| `src/api/client.js` | Every backend call, in one place |
| `src/index.css` | Design tokens and shared component classes |

## One thing to know about the CSS

Tailwind v4 puts its utilities in `@layer utilities`, and unlayered CSS beats
layered CSS regardless of specificity. The component classes in `index.css`
(`.card`, `.section-kicker`, `.primary-button`) are unlayered, so a Tailwind
utility will **not** override them — `class="card bg-ink"` silently keeps the
card's own background. Add a variant class in `index.css` instead of reaching
for a utility.
