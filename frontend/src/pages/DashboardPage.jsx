import { useCallback, useEffect, useState } from 'react'
import { Link, Navigate, useParams } from 'react-router-dom'
import { AlertTriangle, ArrowRight, BarChart3, CalendarRange, Camera, FileText, Landmark, ListChecks, LoaderCircle, RefreshCw, Users, WalletCards } from 'lucide-react'
import { api } from '../api/client'
import AppShell from '../components/AppShell'
import CustomerBalances from '../components/CustomerBalances'
import LedgerWorkflow from '../components/LedgerWorkflow'
import ListenButton from '../components/ListenButton'
import LoanOptions from '../components/LoanOptions'
import LoanReadiness from '../components/LoanReadiness'
import PaymentReminders from '../components/PaymentReminders'
import PeriodHistory from '../components/PeriodHistory'
import ReviewQueue from '../components/ReviewQueue'
import ScoreCard from '../components/ScoreCard'
import ScoreChart from '../components/ScoreChart'
import TransactionTable from '../components/TransactionTable'
import { useAuth } from '../context/AuthContext'
import { useMoney, useT } from '../i18n'

const EMPTY_DASHBOARD = { transactions: [], latestScore: null, scoreHistory: [] }
const SECTIONS = new Set(['home', 'add', 'udhaar', 'loans', 'records'])
const RECORD_TABS = [
  { id: 'history', icon: CalendarRange },
  { id: 'transactions', icon: ListChecks },
]

/**
 * One page, five sections. The data is loaded once here and shared, so moving
 * between sections is instant and an upload refreshes every one of them.
 */
export default function DashboardPage() {
  const { section = 'home' } = useParams()
  const { token, user, logout } = useAuth()
  const t = useT()
  const pkr = useMoney()
  const [dashboard, setDashboard] = useState(EMPTY_DASHBOARD)
  const [transactions, setTransactions] = useState([])
  const [filter, setFilter] = useState('')
  const [range, setRange] = useState({ preset: 'all', from: '', to: '' })
  const [totals, setTotals] = useState(null)
  const [loading, setLoading] = useState(true)
  const [transactionLoading, setTransactionLoading] = useState(false)
  const [error, setError] = useState('')
  const [transactionError, setTransactionError] = useState('')
  const [customers, setCustomers] = useState(null)
  const [customerError, setCustomerError] = useState('')
  const [refreshKey, setRefreshKey] = useState(0)
  const [recordTab, setRecordTab] = useState('history')
  const [refreshing, setRefreshing] = useState(false)
  const [refreshedAt, setRefreshedAt] = useState(null)

  const loadDashboard = useCallback(async () => {
    setError('')
    setCustomerError('')
    setRefreshing(true)
    setRefreshedAt(null)
    try {
      const [result, customerResult] = await Promise.all([
        api.dashboard(token),
        api.customers(token).catch((requestError) => {
          if (requestError.status !== 401) setCustomerError(requestError.message)
          return null
        }),
      ])
      setDashboard(result)
      setTransactions(result.transactions)
      setCustomers(customerResult)
      setFilter('')
      // Nudges the panels that load their own data to reload after an upload.
      setRefreshKey((key) => key + 1)
    } catch (requestError) {
      if (requestError.status === 401) logout()
      else setError(requestError.message)
    } finally {
      setLoading(false)
      setRefreshing(false)
      setRefreshedAt(new Date())
    }
  }, [logout, token])

  useEffect(() => {
    loadDashboard()
  }, [loadDashboard])

  // A new section starts at its top, not wherever the last one was scrolled to.
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [section])

  async function loadTransactions(nextFilter, nextRange) {
    setFilter(nextFilter)
    setRange(nextRange)
    setTransactionLoading(true)
    setTransactionError('')
    try {
      const result = await api.transactions(token, {
        type: nextFilter,
        from: nextRange.from,
        to: nextRange.to,
      })
      setTransactions(result.transactions)
      setTotals(result.totals || null)
    } catch (requestError) {
      if (requestError.status === 401) logout()
      else setTransactionError(requestError.message)
    } finally {
      setTransactionLoading(false)
    }
  }

  if (!SECTIONS.has(section)) return <Navigate to="/dashboard" replace />

  if (loading) {
    return <div className="grid min-h-screen place-content-center bg-paper text-center text-ink"><LoaderCircle className="mx-auto animate-spin text-saffron" size={34} /><p className="mt-4 text-sm font-bold">{t(`dash.opening`)}</p></div>
  }

  const owing = customers?.summary?.customers_owing ?? 0
  const outstanding = customers?.summary?.total_outstanding ?? 0
  const score = dashboard.latestScore?.score

  const errorBanner = error && (
    <div className="mb-6 flex items-center justify-between gap-4 rounded-2xl border border-coral/20 bg-coral/10 p-5 text-sm font-semibold text-coral" role="alert">
      <span className="flex items-center gap-3"><AlertTriangle size={18} />{error}</span>
      <button className="underline" onClick={loadDashboard}>{t(`dash.tryAgain`)}</button>
    </div>
  )

  return (
    <AppShell badges={{ udhaar: owing }}>
      {section === 'home' && (
        <>
          <header className="mb-7 flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
            <div className="animate-rise">
              <div className="section-kicker">{t(`dash.kicker`)}</div>
              <h1 className="mt-3 max-w-3xl font-display text-4xl leading-[0.98] md:text-6xl">{t(`dash.greeting`, { name: user?.name?.split(' ')[0] || '' })}</h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-ink/55">{t(`dash.subtitle`)}</p>
            </div>
            <div className="flex flex-col items-start gap-2 self-start md:items-end md:self-auto">
              <button type="button" className="secondary-button" onClick={loadDashboard} disabled={refreshing}>
                {refreshing
                  ? <><LoaderCircle className="animate-spin" size={15} /> {t(`dash.refreshing`)}</>
                  : <><RefreshCw size={15} /> {t(`dash.refresh`)}</>}
              </button>
              {/* Without this the button did its work in silence and looked broken. */}
              <p className="min-h-4 text-xs text-ink/45" aria-live="polite">
                {refreshing
                  ? t(`dash.reading`)
                  : refreshedAt
                    ? t(`dash.updated`, { time: refreshedAt.toLocaleTimeString(), count: dashboard.transactions.length })
                    : ''}
              </p>
            </div>
          </header>

          {errorBanner}

          {/* What to do next, before the detail: one card per section that needs the shopkeeper. */}
          <div className="mb-6 grid gap-4 md:grid-cols-3">
            <NextStep
              to="/dashboard/add"
              icon={Camera}
              primary
              title={t(`next.add.title`)}
              body={t(`next.add.body`)}
            />
            <NextStep
              to="/dashboard/udhaar"
              icon={Users}
              title={owing > 0 ? t(`next.udhaar.owed`, { count: owing, amount: pkr(outstanding) }) : t(`next.udhaar.none`)}
              body={t(`next.udhaar.body`)}
            />
            <NextStep
              to="/dashboard/loans"
              icon={Landmark}
              title={score !== undefined ? t(`next.loans.title`, { score }) : t(`next.loans.noScore`)}
              body={t(`next.loans.body`)}
            />
          </div>

          <div className="grid gap-6 xl:grid-cols-[1.08fr_0.92fr]">
            <ScoreCard latestScore={dashboard.latestScore} />
            <ScoreChart scoreHistory={dashboard.scoreHistory} />
          </div>

          <div className="mt-6 grid gap-6 lg:grid-cols-[1.25fr_0.75fr]">
            <section className="card p-6 md:p-8">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="section-kicker">{t(`explain.kicker`)}</div>
                  <h2 className="mt-2 font-display text-3xl">{t(`explain.title`)}</h2>
                </div>
                {/* Hides itself when the device has no Urdu voice installed. */}
                <ListenButton text={dashboard.latestScore?.explanation_text} label={t(`explain.listen`)} />
              </div>
              <div className="mt-5 rounded-2xl border-s-4 border-saffron bg-saffron/[0.08] p-6">
                <p className="urdu-text text-xl leading-[2.1] text-ink" dir="rtl" lang="ur">
                  {dashboard.latestScore?.explanation_text || t(`explain.none`)}
                </p>
              </div>
            </section>
            <section className="card p-6 md:p-8">
              <div className="section-kicker">{t(`evidence.kicker`)}</div>
              <div className="mt-5 grid grid-cols-2 gap-3">
                <Metric icon={WalletCards} value={dashboard.transactions.length} label={t(`evidence.transactions`)} />
                <Metric icon={BarChart3} value={dashboard.scoreHistory.length} label={t(`evidence.scoreRuns`)} />
              </div>
              <p className="mt-5 border-t border-ink/10 pt-5 text-xs leading-5 text-ink/70">{t(`evidence.note`)}</p>
            </section>
          </div>
        </>
      )}

      {section === 'add' && (
        <>
          <SectionHeader id="add" />
          {errorBanner}
          <LedgerWorkflow onDataChanged={loadDashboard} />
          <div className="mt-6"><ReviewQueue refreshKey={refreshKey} onCorrected={loadDashboard} /></div>
        </>
      )}

      {section === 'udhaar' && (
        <>
          <SectionHeader id="udhaar" />
          {errorBanner}
          <CustomerBalances data={customers} error={customerError} />
          <div className="mt-6"><PaymentReminders refreshKey={refreshKey} /></div>
        </>
      )}

      {section === 'loans' && (
        <>
          <SectionHeader
            id="loans"
            action={<Link className="secondary-button" to="/lender"><FileText size={15} /> {t(`sec.loans.statement`)}</Link>}
          />
          {errorBanner}
          <LoanReadiness refreshKey={refreshKey} />
          <div className="mt-6"><LoanOptions refreshKey={refreshKey} /></div>
        </>
      )}

      {section === 'records' && (
        <>
          <SectionHeader id="records" />
          {errorBanner}
          <div className="flex gap-1 rounded-2xl bg-ink/[0.06] p-1.5" role="tablist" aria-label={t(`tab.aria`)}>
            {RECORD_TABS.map(({ id, icon: Icon }) => (
              <button
                key={id}
                type="button"
                role="tab"
                id={`tab-${id}`}
                aria-selected={recordTab === id}
                aria-controls={`panel-${id}`}
                className={`inline-flex flex-1 items-center justify-center gap-2 whitespace-nowrap rounded-xl px-4 py-3 text-xs font-bold transition ${
                  recordTab === id ? 'bg-cream text-ink shadow-[0_2px_10px_rgba(23,57,52,.08)]' : 'text-ink/55 hover:text-ink'
                }`}
                onClick={() => setRecordTab(id)}
              >
                <Icon size={15} /> {t(`tab.${id}`)}
              </button>
            ))}
          </div>
          <div className="mt-4">
            <div role="tabpanel" id="panel-history" aria-labelledby="tab-history" hidden={recordTab !== 'history'}>
              <PeriodHistory refreshKey={refreshKey} />
            </div>
            <div role="tabpanel" id="panel-transactions" aria-labelledby="tab-transactions" hidden={recordTab !== 'transactions'}>
              <TransactionTable
                transactions={transactions}
                totals={totals}
                filter={filter}
                onFilter={(nextFilter) => loadTransactions(nextFilter, range)}
                range={range}
                onRange={(nextRange) => loadTransactions(filter, nextRange)}
                loading={transactionLoading}
                error={transactionError}
              />
            </div>
          </div>
        </>
      )}

      <footer className="mt-8 flex flex-col gap-3 border-t border-ink/10 pt-6 text-xs leading-5 text-ink/45 md:flex-row md:justify-between">
        <p>{t(`footer.prototype`)}</p>
        <p className="max-w-2xl md:text-right">{t(`footer.builtFor`)}</p>
      </footer>
    </AppShell>
  )
}

function SectionHeader({ id, action }) {
  const t = useT()
  return (
    <header className="mb-6 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
      <div>
        <div className="section-kicker">{t(`nav.${id}`)}</div>
        <h1 className="mt-2 font-display text-4xl leading-tight md:text-5xl">{t(`sec.${id}.title`)}</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-ink/60">{t(`sec.${id}.body`)}</p>
      </div>
      {action}
    </header>
  )
}

function NextStep({ to, icon: Icon, title, body, primary }) {
  return (
    <Link
      to={to}
      className={`group flex items-start gap-4 rounded-2xl border p-5 transition hover:-translate-y-0.5 ${
        primary ? 'border-saffron bg-saffron text-ink' : 'border-ink/10 bg-cream/70 text-ink hover:bg-cream'
      }`}
    >
      <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-full ${primary ? 'bg-ink text-saffron' : 'bg-ink/[0.07] text-leaf'}`}>
        <Icon size={18} />
      </span>
      <span className="min-w-0 flex-1">
        <strong className="block font-display text-lg leading-snug">{title}</strong>
        <span className={`mt-1 block text-sm leading-5 ${primary ? 'text-ink/75' : 'text-ink/60'}`}>{body}</span>
      </span>
      <ArrowRight size={18} className="mt-1 shrink-0 transition group-hover:translate-x-0.5 rtl:rotate-180" />
    </Link>
  )
}

function Metric({ icon: Icon, value, label }) {
  return <div className="rounded-2xl bg-ink/[0.045] p-4"><Icon className="text-saffron-dark" size={18} /><strong className="mt-4 block font-display text-3xl">{value}</strong><span className="mt-1 block text-[10px] font-bold uppercase tracking-[0.14em] text-ink/45">{label}</span></div>
}
