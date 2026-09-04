import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { AlertTriangle, ArrowLeft, Download, FileText, LoaderCircle, TrendingDown, TrendingUp } from 'lucide-react'
import { api } from '../api/client'
import AppShell from '../components/AppShell'
import { useAuth } from '../context/AuthContext'
import { useMoney, useT } from '../i18n'

const DAY_MS = 24 * 60 * 60 * 1000

// Tone classes are written out in full so Tailwind can see them at build time.
const BANDS = [
  { min: 70, id: 'recommended', multiple: 1, tone: 'text-leaf' },
  { min: 55, id: 'review', multiple: 0.5, tone: 'text-saffron-dark' },
  { min: 40, id: 'manual', multiple: 0, tone: 'text-saffron-dark' },
  { min: 0, id: 'none', multiple: 0, tone: 'text-coral' },
]

function statementReference(latestScore) {
  const id = String(latestScore?.id || '').replace(/-/g, '').slice(0, 8).toUpperCase()
  const day = String(latestScore?.computed_at || '').slice(0, 10).replace(/-/g, '')
  return `QM-${day}-${id || 'PENDING'}`
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
    customers: new Set(transactions.map((transaction) => transaction.customer_name).filter(Boolean)).size,
    ledgerPages: new Set(transactions.map((transaction) => transaction.ledger_id).filter(Boolean)).size
  }
}

export default function LenderPage() {
  const { token, user, logout } = useAuth()
  const t = useT()
  const pkr = useMoney()
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
        <p className="mt-4 text-sm font-bold">{t(`lender.preparing`)}</p>
      </div>
    )
  }

  return (
    <AppShell>
      <div className="mx-auto w-full">
        <div className="no-print flex flex-wrap items-center justify-between gap-4">
          <Link className="text-button inline-flex items-center gap-2" to="/dashboard">
            <ArrowLeft size={15} /> {t(`lender.back`)}
          </Link>
          {data?.latestScore && (
            <div className="text-end">
              <button type="button" className="primary-button !min-h-11 !px-5 !text-xs" onClick={() => window.print()}>
                <Download size={15} /> {t(`lender.download`)}
              </button>
              <p className="mt-1.5 max-w-xs text-xs leading-5 text-ink/50">{t(`lender.downloadHint`)}</p>
            </div>
          )}
        </div>

        {error && (
          <div className="error-box mt-6" role="alert">
            <AlertTriangle size={17} /> {error}
          </div>
        )}

        <div className="print-only print-block mb-5 border-b-2 border-ink pb-4">
          <div className="flex items-baseline justify-between gap-6">
            <strong className="font-display text-2xl">QarzMitr · {t(`lender.statement`)}</strong>
            <span className="text-xs">{t(`lender.reference`)}: {statementReference(data?.latestScore)}</span>
          </div>
          <div className="mt-1 flex flex-wrap gap-x-6 text-xs text-ink/60">
            <span>{t(`lender.generated`)}: {new Date().toLocaleString()}</span>
            {assessment && <span>{t(`lender.pages`)}: {assessment.ledgerPages}</span>}
          </div>
        </div>

        <header className="mt-6">
          <div className="section-kicker">{t(`lender.kicker`)}</div>
          <h1 className="mt-3 font-display text-4xl leading-[1.02] md:text-5xl">{user?.shop_name || t(`lender.unnamed`)}</h1>
          <p className="mt-3 text-sm text-ink/55">
            {t(`lender.prepared`, { name: user?.name || '', date: new Date().toLocaleDateString() })}
          </p>
        </header>

        {!data?.latestScore || !assessment ? (
          <section className="card mt-6 p-8 text-center">
            <FileText className="mx-auto text-ink/30" size={30} />
            <p className="mt-4 font-display text-2xl">{t(`lender.noScore`)}</p>
            <p className="mx-auto mt-2 max-w-md text-sm text-ink/55">
              {t(`lender.noScoreBody`)}
            </p>
          </section>
        ) : (
          <>
            <section className="card mt-6 grid gap-8 p-7 md:grid-cols-[210px_1fr] md:p-9">
              <div className="text-center md:text-left">
                <div className="section-kicker">{t(`lender.score`)}</div>
                <strong className={`mt-2 block font-display text-7xl leading-none ${assessment.band.tone}`}>
                  {data.latestScore.score}
                </strong>
                <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-ink/45">{t(`lender.outOf`)}</span>
                {assessment.delta !== null && (
                  <p className={`mt-4 inline-flex items-center gap-1.5 text-xs font-bold ${assessment.delta < 0 ? 'text-coral' : 'text-leaf'}`}>
                    {assessment.delta < 0 ? <TrendingDown size={14} /> : <TrendingUp size={14} />}
                    {t(`lender.since`, { delta: `${assessment.delta > 0 ? `+` : ``}${assessment.delta}` })}
                  </p>
                )}
              </div>

              <div className="border-t border-ink/10 pt-6 md:border-s md:border-t-0 md:ps-8 md:pt-0">
                <div className="section-kicker">{t(`lender.recommendation`)}</div>
                <p className={`mt-2 font-display text-3xl leading-tight ${assessment.band.tone}`}>
                  {t(`lender.band.${assessment.band.id}`)}
                </p>
                <p className="mt-3 max-w-md text-sm leading-6 text-ink/60">{t(`lender.note.${assessment.band.id}`)}</p>
                {assessment.band.multiple > 0 && (
                  <div className="mt-5 rounded-2xl bg-ink/[0.045] p-5">
                    <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-ink/45">
                      {t(`lender.ceiling`)}
                    </span>
                    <strong className="mt-1 block font-display text-3xl">{pkr(assessment.facility)}</strong>
                    <p className="mt-2 text-xs leading-5 text-ink/50">
                      {t(`lender.ceilingNote`, {
                        multiple: assessment.band.multiple,
                        sales: pkr(assessment.monthlySales),
                        days: assessment.spanDays,
                      })}
                    </p>
                  </div>
                )}
              </div>
            </section>

            <section className="mt-6 grid gap-4 sm:grid-cols-3">
              <Metric label={t(`lender.metric.cashflow`)} value={data.latestScore.cash_flow_consistency} weight="40%" />
              <Metric label={t(`lender.metric.repayment`)} value={data.latestScore.repayment_ratio} weight="35%" />
              <Metric label={t(`lender.metric.revenue`)} value={data.latestScore.revenue_trend} weight="25%" />
            </section>

            <section className="card mt-6 p-6 md:p-8">
              <div className="section-kicker">{t(`lender.evidence`)}</div>
              <h2 className="mt-2 font-display text-2xl">{t(`lender.evidenceTitle`)}</h2>
              <dl className="mt-6 grid gap-x-8 gap-y-0 sm:grid-cols-2">
                <Row label={t(`lender.row.transactions`)} value={data.transactions.length} />
                <Row label={t(`lender.row.customers`)} value={assessment.customers} />
                <Row label={t(`lender.row.period`)} value={assessment.firstDay ? `${assessment.firstDay} → ${assessment.lastDay}` : t(`lender.undated`)} />
                <Row label={t(`lender.row.runs`)} value={data.scoreHistory.length} />
                <Row label={t(`lender.row.sales`)} value={pkr(assessment.sales)} />
                <Row label={t(`lender.row.expenses`)} value={pkr(assessment.expenses)} />
                <Row label={t(`lender.row.credit`)} value={pkr(assessment.creditGiven)} />
                <Row label={t(`lender.row.repaid`)} value={pkr(assessment.repaid)} />
                <Row label={t(`lender.row.outstanding`)} value={pkr(assessment.outstanding)} emphasis />
                <Row label={t(`lender.row.monthly`)} value={pkr(assessment.monthlySales)} emphasis />
              </dl>
            </section>

            <section className="card mt-6 p-6 md:p-8">
              <div className="section-kicker">{t(`lender.method`)}</div>
              <h2 className="mt-2 font-display text-2xl">{t(`lender.methodTitle`)}</h2>
              <p className="mt-4 max-w-2xl text-sm leading-6 text-ink/60">
                {t(`lender.methodBody`)}
              </p>
              <p className="mt-4 max-w-3xl rounded-2xl border-s-4 border-coral bg-coral/[0.07] p-5 text-sm leading-6 text-ink/70">
                {t(`lender.caveat`)}
              </p>
              {/* Printed only: tells whoever receives the sheet what it is and
                  how to quote it back. */}
              <p className="print-only mt-4 border-t border-ink/20 pt-4 text-xs leading-5 text-ink/70">
                {t(`lender.verify`)}
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
