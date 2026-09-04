import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { AlertTriangle, ArrowLeft, FileText, LoaderCircle, TrendingDown, TrendingUp } from 'lucide-react'
import { api } from '../api/client'
import AppShell from '../components/AppShell'
import { useAuth } from '../context/AuthContext'

const DAY_MS = 24 * 60 * 60 * 1000

// Tone classes are written out in full so Tailwind can see them at build time.
const BANDS = [
  { min: 70, label: 'Recommended', multiple: 1, tone: 'text-leaf', note: 'Consistent ledger evidence across the tracked period.' },
  { min: 55, label: 'Recommended with review', multiple: 0.5, tone: 'text-saffron-dark', note: 'Viable, but confirm repayment behaviour before disbursing.' },
  { min: 40, label: 'Refer for manual review', multiple: 0, tone: 'text-saffron-dark', note: 'Ledger evidence is mixed. No automatic facility suggested.' },
  { min: 0, label: 'Not recommended yet', multiple: 0, tone: 'text-coral', note: 'Insufficient or declining evidence. Re-assess after more ledger pages.' }
]

function pkr(amount) {
  return `PKR ${Math.round(amount).toLocaleString('en-PK')}`
}

function sumBy(transactions, type) {
  return transactions
    .filter((transaction) => transaction.type === type)
    .reduce((total, transaction) => total + Math.max(0, Number(transaction.amount) || 0), 0)
}

function buildAssessment(transactions, latestScore, scoreHistory) {
  const dated = transactions
    .map((transaction) => transaction.transaction_date)
    .filter(Boolean)
    .sort()

  const firstDay = dated[0] || null
  const lastDay = dated[dated.length - 1] || null
  const spanDays = firstDay && lastDay
    ? Math.max(1, Math.round((Date.parse(lastDay) - Date.parse(firstDay)) / DAY_MS) + 1)
    : 0
  const months = spanDays ? Math.max(1, spanDays / 30) : 0

  const sales = sumBy(transactions, 'sale')
  const expenses = sumBy(transactions, 'expense')
  const creditGiven = sumBy(transactions, 'credit_given')
  const repaid = sumBy(transactions, 'repayment')
  const monthlySales = months ? sales / months : 0

  const band = BANDS.find((entry) => (latestScore?.score ?? 0) >= entry.min) || BANDS[BANDS.length - 1]
  const previous = scoreHistory.length > 1 ? scoreHistory[scoreHistory.length - 2].score : null
  const delta = previous === null ? null : (latestScore?.score ?? 0) - previous

  return {
    firstDay,
    lastDay,
    spanDays,
    sales,
    expenses,
    creditGiven,
    repaid,
    outstanding: Math.max(0, creditGiven - repaid),
    monthlySales,
    band,
    facility: monthlySales * band.multiple,
    delta,
    customers: new Set(transactions.map((transaction) => transaction.customer_name).filter(Boolean)).size
  }
}

export default function LenderPage() {
  const { token, user, logout } = useAuth()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    setError('')
    try {
      setData(await api.dashboard(token))
    } catch (requestError) {
      if (requestError.status === 401) logout()
      else setError(requestError.message)
    } finally {
      setLoading(false)
    }
  }, [logout, token])

  useEffect(() => {
    load()
  }, [load])

  const assessment = useMemo(
    () => (data ? buildAssessment(data.transactions, data.latestScore, data.scoreHistory) : null),
    [data]
  )

  if (loading) {
    return (
      <div className="grid min-h-screen place-content-center bg-paper text-center text-ink">
        <LoaderCircle className="mx-auto animate-spin text-saffron" size={34} />
        <p className="mt-4 text-sm font-bold">Preparing assessment…</p>
      </div>
    )
  }

  return (
    <AppShell>
      <div className="mx-auto max-w-5xl">
        <Link className="text-button inline-flex items-center gap-2" to="/dashboard">
          <ArrowLeft size={15} /> Back to shopkeeper view
        </Link>

        {error && (
          <div className="error-box mt-6" role="alert">
            <AlertTriangle size={17} /> {error}
          </div>
        )}

        <header className="mt-6">
          <div className="section-kicker">Lender assessment</div>
          <h1 className="mt-3 font-display text-4xl leading-[1.02] md:text-5xl">{user?.shop_name || 'Unnamed shop'}</h1>
          <p className="mt-3 text-sm text-ink/55">
            {user?.name} · Prepared {new Date().toLocaleDateString()} · Evidence from ledger photographs only
          </p>
        </header>

        {!data?.latestScore || !assessment ? (
          <section className="card mt-6 p-8 text-center">
            <FileText className="mx-auto text-ink/30" size={30} />
            <p className="mt-4 font-display text-2xl">No score has been computed yet</p>
            <p className="mx-auto mt-2 max-w-md text-sm text-ink/55">
              This applicant needs at least one processed ledger page before an assessment can be produced.
            </p>
          </section>
        ) : (
          <>
            <section className="card mt-6 grid gap-8 p-7 md:grid-cols-[210px_1fr] md:p-9">
              <div className="text-center md:text-left">
                <div className="section-kicker">Score</div>
                <strong className={`mt-2 block font-display text-7xl leading-none ${assessment.band.tone}`}>
                  {data.latestScore.score}
                </strong>
                <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-ink/45">out of 100</span>
                {assessment.delta !== null && (
                  <p className={`mt-4 inline-flex items-center gap-1.5 text-xs font-bold ${assessment.delta < 0 ? 'text-coral' : 'text-leaf'}`}>
                    {assessment.delta < 0 ? <TrendingDown size={14} /> : <TrendingUp size={14} />}
                    {assessment.delta > 0 ? '+' : ''}{assessment.delta} since previous run
                  </p>
                )}
              </div>

              <div className="border-t border-ink/10 pt-6 md:border-s md:border-t-0 md:ps-8 md:pt-0">
                <div className="section-kicker">Recommendation</div>
                <p className={`mt-2 font-display text-3xl leading-tight ${assessment.band.tone}`}>
                  {assessment.band.label}
                </p>
                <p className="mt-3 max-w-md text-sm leading-6 text-ink/60">{assessment.band.note}</p>
                {assessment.band.multiple > 0 && (
                  <div className="mt-5 rounded-2xl bg-ink/[0.045] p-5">
                    <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-ink/45">
                      Indicative facility ceiling
                    </span>
                    <strong className="mt-1 block font-display text-3xl">{pkr(assessment.facility)}</strong>
                    <p className="mt-2 text-xs leading-5 text-ink/50">
                      {assessment.band.multiple}× average monthly sales of {pkr(assessment.monthlySales)},
                      measured across {assessment.spanDays} days of ledger evidence.
                    </p>
                  </div>
                )}
              </div>
            </section>

            <section className="mt-6 grid gap-4 sm:grid-cols-3">
              <Metric label="Cash flow consistency" value={data.latestScore.cash_flow_consistency} weight="40%" />
              <Metric label="Repayment ratio" value={data.latestScore.repayment_ratio} weight="35%" />
              <Metric label="Revenue trend" value={data.latestScore.revenue_trend} weight="25%" />
            </section>

            <section className="card mt-6 p-6 md:p-8">
              <div className="section-kicker">Ledger evidence</div>
              <h2 className="mt-2 font-display text-2xl">What the paper record shows</h2>
              <dl className="mt-6 grid gap-x-8 gap-y-0 sm:grid-cols-2">
                <Row label="Transactions on record" value={data.transactions.length} />
                <Row label="Named customers" value={assessment.customers} />
                <Row label="Period covered" value={assessment.firstDay ? `${assessment.firstDay} → ${assessment.lastDay}` : 'Undated'} />
                <Row label="Score runs" value={data.scoreHistory.length} />
                <Row label="Total sales" value={pkr(assessment.sales)} />
                <Row label="Total expenses" value={pkr(assessment.expenses)} />
                <Row label="Credit extended to customers" value={pkr(assessment.creditGiven)} />
                <Row label="Repaid by customers" value={pkr(assessment.repaid)} />
                <Row label="Outstanding customer credit" value={pkr(assessment.outstanding)} emphasis />
                <Row label="Average monthly sales" value={pkr(assessment.monthlySales)} emphasis />
              </dl>
            </section>

            <section className="card mt-6 p-6 md:p-8">
              <div className="section-kicker">Method</div>
              <h2 className="mt-2 font-display text-2xl">How this number was reached</h2>
              <p className="mt-4 max-w-2xl text-sm leading-6 text-ink/60">
                The score is arithmetic, not inference. Three metrics are computed from the transaction
                record in backend code and combined at fixed weights — 40% cash flow consistency,
                35% repayment ratio, 25% revenue trend. Re-running the same ledger always produces the
                same score. A language model is used only to transcribe the handwriting and to explain
                the finished result to the shopkeeper in Urdu; it is never asked what the score should be.
              </p>
              <p className="mt-4 rounded-2xl border-s-4 border-coral bg-coral/[0.07] p-5 text-sm leading-6 text-ink/70">
                <strong>This is a feasibility prototype.</strong> The band thresholds and the facility
                multiple above are illustrative defaults, not underwriting policy, and transcription of
                handwriting can carry errors. No figure here should decide a loan on its own.
              </p>
            </section>
          </>
        )}
      </div>
    </AppShell>
  )
}

function Metric({ label, value, weight }) {
  const percent = Math.max(0, Math.min(100, Number(value) || 0))
  return (
    <div className="card p-5">
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-ink/45">{label}</span>
        <span className="text-[10px] font-bold text-ink/35">{weight}</span>
      </div>
      <strong className="mt-3 block font-display text-4xl leading-none">{percent.toFixed(1)}</strong>
      <div className="progress-track mt-4">
        <div className="h-full rounded-full bg-leaf" style={{ width: `${percent}%` }} />
      </div>
    </div>
  )
}

function Row({ label, value, emphasis }) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-b border-ink/10 py-3">
      <dt className="text-sm text-ink/55">{label}</dt>
      <dd className={`text-end text-sm tabular-nums ${emphasis ? 'font-display text-lg text-ink' : 'font-bold text-ink'}`}>
        {value}
      </dd>
    </div>
  )
}
