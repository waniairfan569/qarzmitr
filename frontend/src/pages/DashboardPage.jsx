import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { AlertTriangle, BarChart3, CalendarRange, ClipboardCheck, Landmark, ListChecks, LoaderCircle, MessageSquareText, RefreshCw, Users, WalletCards } from 'lucide-react'
import { api } from '../api/client'
import AppShell from '../components/AppShell'
import CustomerBalances from '../components/CustomerBalances'
import LedgerWorkflow from '../components/LedgerWorkflow'
import ListenButton from '../components/ListenButton'
import LoanReadiness from '../components/LoanReadiness'
import PaymentReminders from '../components/PaymentReminders'
import PeriodHistory from '../components/PeriodHistory'
import ReviewQueue from '../components/ReviewQueue'
import ScoreCard from '../components/ScoreCard'
import ScoreChart from '../components/ScoreChart'
import TransactionTable from '../components/TransactionTable'
import { useAuth } from '../context/AuthContext'
import { useT } from '../i18n'

const EMPTY_DASHBOARD = { transactions: [], latestScore: null, scoreHistory: [] }

const TABS = [
  { id: 'udhaar', icon: Users },
  { id: 'reminders', icon: MessageSquareText },
  { id: 'history', icon: CalendarRange },
  { id: 'review', icon: ClipboardCheck },
  { id: 'transactions', icon: ListChecks },
]

export default function DashboardPage() {
  const { token, user, logout } = useAuth()
  const t = useT()
  const [dashboard, setDashboard] = useState(EMPTY_DASHBOARD)
  const [transactions, setTransactions] = useState([])
  const [filter, setFilter] = useState('')
  const [loading, setLoading] = useState(true)
  const [transactionLoading, setTransactionLoading] = useState(false)
  const [error, setError] = useState('')
  const [transactionError, setTransactionError] = useState('')
  const [customers, setCustomers] = useState(null)
  const [customerError, setCustomerError] = useState('')
  const [refreshKey, setRefreshKey] = useState(0)
  const [tab, setTab] = useState('udhaar')
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
      // Nudges the history and reminder panels to reload after an upload.
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

  async function changeFilter(nextFilter) {
    setFilter(nextFilter)
    setTransactionLoading(true)
    setTransactionError('')
    try {
      const result = await api.transactions(token, nextFilter)
      setTransactions(result.transactions)
    } catch (requestError) {
      if (requestError.status === 401) logout()
      else setTransactionError(requestError.message)
    } finally {
      setTransactionLoading(false)
    }
  }

  if (loading) {
    return <div className="grid min-h-screen place-content-center bg-paper text-center text-ink"><LoaderCircle className="mx-auto animate-spin text-saffron" size={34} /><p className="mt-4 text-sm font-bold">{t(`dash.opening`)}</p></div>
  }

  const owing = customers?.summary?.customers_owing ?? 0

  return (
    <AppShell>
      <header className="mb-7 flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
        <div className="animate-rise">
          <div className="section-kicker">{t(`dash.kicker`)}</div>
          <h1 className="mt-3 max-w-3xl font-display text-4xl leading-[0.98] md:text-6xl">{t(`dash.greeting`, { name: user?.name?.split(' ')[0] || '' })}</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-ink/55">{t(`dash.subtitle`)}</p>
        </div>
        <div className="flex flex-col items-start gap-2 self-start md:items-end md:self-auto">
          <div className="flex flex-wrap gap-3">
            <Link className="secondary-button" to="/lender"><Landmark size={15} /> {t(`dash.lenderView`)}</Link>
            <button type="button" className="secondary-button" onClick={loadDashboard} disabled={refreshing}>
              {refreshing
                ? <><LoaderCircle className="animate-spin" size={15} /> {t(`dash.refreshing`)}</>
                : <><RefreshCw size={15} /> {t(`dash.refresh`)}</>}
            </button>
          </div>
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

      {error && (
        <div className="mb-6 flex items-center justify-between gap-4 rounded-2xl border border-coral/20 bg-coral/10 p-5 text-sm font-semibold text-coral" role="alert">
          <span className="flex items-center gap-3"><AlertTriangle size={18} />{error}</span>
          <button className="underline" onClick={loadDashboard}>{t(`dash.tryAgain`)}</button>
        </div>
      )}

      <div className="grid gap-6 xl:grid-cols-[1.08fr_0.92fr]">
        <ScoreCard latestScore={dashboard.latestScore} />
        <ScoreChart scoreHistory={dashboard.scoreHistory} />
      </div>

      <div className="mt-6"><LoanReadiness refreshKey={refreshKey} /></div>

      {/* The upload is the whole point of the product, so it sits directly under
          the score rather than below every panel the score produced. */}
      <div className="mt-6"><LedgerWorkflow onDataChanged={loadDashboard} /></div>

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

      {/* Four long panels became one tabbed shelf, so the page stops growing
          every time a feature is added. All four stay mounted and are hidden
          rather than unmounted, so switching is instant and nothing refetches. */}
      <div className="mt-8">
        <div className="flex flex-wrap gap-1 rounded-2xl bg-ink/[0.06] p-1.5" role="tablist" aria-label={t(`tab.aria`)}>
          {TABS.map(({ id, icon: Icon }) => (
            <button
              key={id}
              type="button"
              role="tab"
              id={`tab-${id}`}
              aria-selected={tab === id}
              aria-controls={`panel-${id}`}
              className={`inline-flex flex-1 min-w-[140px] items-center justify-center gap-2 rounded-xl px-4 py-3 text-xs font-bold transition ${
                tab === id ? 'bg-cream text-ink shadow-[0_2px_10px_rgba(23,57,52,.08)]' : 'text-ink/55 hover:text-ink'
              }`}
              onClick={() => setTab(id)}
            >
              <Icon size={15} /> {t(`tab.${id}`)}
              {id === 'udhaar' && owing > 0 && (
                <span className="rounded-full bg-saffron/25 px-2 py-0.5 text-[10px] text-saffron-dark">{owing}</span>
              )}
            </button>
          ))}
        </div>

        <div className="mt-4">
          <div role="tabpanel" id="panel-udhaar" aria-labelledby="tab-udhaar" hidden={tab !== 'udhaar'}>
            <CustomerBalances data={customers} error={customerError} />
          </div>
          <div role="tabpanel" id="panel-reminders" aria-labelledby="tab-reminders" hidden={tab !== 'reminders'}>
            <PaymentReminders refreshKey={refreshKey} />
          </div>
          <div role="tabpanel" id="panel-history" aria-labelledby="tab-history" hidden={tab !== 'history'}>
            <PeriodHistory refreshKey={refreshKey} />
          </div>
          <div role="tabpanel" id="panel-review" aria-labelledby="tab-review" hidden={tab !== 'review'}>
            <ReviewQueue refreshKey={refreshKey} onCorrected={loadDashboard} />
          </div>
          <div role="tabpanel" id="panel-transactions" aria-labelledby="tab-transactions" hidden={tab !== 'transactions'}>
            <TransactionTable transactions={transactions} filter={filter} onFilter={changeFilter} loading={transactionLoading} error={transactionError} />
          </div>
        </div>
      </div>

      <footer className="mt-8 flex flex-col gap-3 border-t border-ink/10 pt-6 text-xs leading-5 text-ink/45 md:flex-row md:justify-between">
        <p>{t(`footer.prototype`)}</p>
        <p className="max-w-2xl md:text-right">{t(`footer.builtFor`)}</p>
      </footer>
    </AppShell>
  )
}

function Metric({ icon: Icon, value, label }) {
  return <div className="rounded-2xl bg-ink/[0.045] p-4"><Icon className="text-saffron-dark" size={18} /><strong className="mt-4 block font-display text-3xl">{value}</strong><span className="mt-1 block text-[10px] font-bold uppercase tracking-[0.14em] text-ink/45">{label}</span></div>
}
