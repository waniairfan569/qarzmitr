import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { AlertTriangle, BarChart3, Landmark, LoaderCircle, RefreshCw, WalletCards } from 'lucide-react'
import { api } from '../api/client'
import AppShell from '../components/AppShell'
import LedgerWorkflow from '../components/LedgerWorkflow'
import ScoreCard from '../components/ScoreCard'
import ScoreChart from '../components/ScoreChart'
import TransactionTable from '../components/TransactionTable'
import { useAuth } from '../context/AuthContext'

const EMPTY_DASHBOARD = { transactions: [], latestScore: null, scoreHistory: [] }

export default function DashboardPage() {
  const { token, user, logout } = useAuth()
  const [dashboard, setDashboard] = useState(EMPTY_DASHBOARD)
  const [transactions, setTransactions] = useState([])
  const [filter, setFilter] = useState('')
  const [loading, setLoading] = useState(true)
  const [transactionLoading, setTransactionLoading] = useState(false)
  const [error, setError] = useState('')
  const [transactionError, setTransactionError] = useState('')

  const loadDashboard = useCallback(async () => {
    setError('')
    try {
      const result = await api.dashboard(token)
      setDashboard(result)
      setTransactions(result.transactions)
      setFilter('')
    } catch (requestError) {
      if (requestError.status === 401) logout()
      else setError(requestError.message)
    } finally {
      setLoading(false)
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
    return <div className="grid min-h-screen place-content-center bg-paper text-center text-ink"><LoaderCircle className="mx-auto animate-spin text-saffron" size={34} /><p className="mt-4 text-sm font-bold">Opening your ledger…</p></div>
  }

  return (
    <AppShell>
      <header className="mb-9 flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
        <div className="animate-rise">
          <div className="section-kicker">Shopkeeper dashboard</div>
          <h1 className="mt-3 max-w-3xl font-display text-5xl leading-[0.95] md:text-7xl">Salaam, {user?.name?.split(' ')[0]}.</h1>
          <p className="mt-4 max-w-2xl text-sm leading-6 text-ink/55">Your paper trail, translated into a financial profile you can understand and stand behind.</p>
        </div>
        <div className="flex flex-wrap gap-3 self-start md:self-auto">
          <Link className="secondary-button" to="/lender"><Landmark size={15} /> Lender view</Link>
          <button type="button" className="secondary-button" onClick={loadDashboard}><RefreshCw size={15} /> Refresh record</button>
        </div>
      </header>

      {error && (
        <div className="mb-6 flex items-center justify-between gap-4 rounded-2xl border border-coral/20 bg-coral/10 p-5 text-sm font-semibold text-coral" role="alert">
          <span className="flex items-center gap-3"><AlertTriangle size={18} />{error}</span>
          <button className="underline" onClick={loadDashboard}>Try again</button>
        </div>
      )}

      <div className="grid gap-6 xl:grid-cols-[1.08fr_0.92fr]">
        <ScoreCard latestScore={dashboard.latestScore} />
        <ScoreChart scoreHistory={dashboard.scoreHistory} />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1.25fr_0.75fr]">
        <section className="card p-6 md:p-8">
          <div className="section-kicker">In your own words</div>
          <h2 className="mt-2 font-display text-3xl">What your score means</h2>
          <div className="mt-6 rounded-2xl border-s-4 border-saffron bg-saffron/[0.08] p-6">
            <p className="urdu-text text-xl leading-[2.1] text-ink" dir="rtl" lang="ur">
              {dashboard.latestScore?.explanation_text || 'Explanation not available yet'}
            </p>
          </div>
        </section>
        <section className="card p-6 md:p-8">
          <div className="section-kicker">Evidence at a glance</div>
          <div className="mt-6 grid grid-cols-2 gap-3">
            <Metric icon={WalletCards} value={dashboard.transactions.length} label="Transactions" />
            <Metric icon={BarChart3} value={dashboard.scoreHistory.length} label="Score runs" />
          </div>
          <p className="mt-5 border-t border-ink/10 pt-5 text-xs leading-5 text-ink/50">The score itself is calculated by deterministic backend code. AI only explains the result in Urdu.</p>
        </section>
      </div>

      <div className="mt-6"><LedgerWorkflow onDataChanged={loadDashboard} /></div>
      <div className="mt-6"><TransactionTable transactions={transactions} filter={filter} onFilter={changeFilter} loading={transactionLoading} error={transactionError} /></div>

      <footer className="mt-8 flex flex-col gap-3 border-t border-ink/10 pt-6 text-xs leading-5 text-ink/45 md:flex-row md:justify-between">
        <p>QarzMitr is a feasibility prototype, not a final lending decision.</p>
        <p className="max-w-2xl md:text-right">Built for people who have never used a banking app—using only what they already do.</p>
      </footer>
    </AppShell>
  )
}

function Metric({ icon: Icon, value, label }) {
  return <div className="rounded-2xl bg-ink/[0.045] p-4"><Icon className="text-saffron-dark" size={18} /><strong className="mt-4 block font-display text-3xl">{value}</strong><span className="mt-1 block text-[10px] font-bold uppercase tracking-[0.14em] text-ink/45">{label}</span></div>
}
