import { useCallback, useEffect, useState } from 'react'
import { AlertTriangle, CalendarRange, LoaderCircle, TrendingUp } from 'lucide-react'
import { api } from '../api/client'
import { useAuth } from '../context/AuthContext'

const PERIODS = [
  { id: 'day', label: 'Daily' },
  { id: 'week', label: 'Weekly' },
  { id: 'month', label: 'Monthly' },
  { id: 'year', label: 'Yearly' },
]

function pkr(amount) {
  return Number(amount || 0).toLocaleString('en-PK')
}

export default function PeriodHistory({ refreshKey }) {
  const { token } = useAuth()
  const [period, setPeriod] = useState('week')
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = useCallback(async (next) => {
    setLoading(true)
    setError('')
    try {
      setData(await api.summary(token, next))
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setLoading(false)
    }
  }, [token])

  useEffect(() => {
    load(period)
  }, [load, period, refreshKey])

  const periods = data?.periods || []
  // Bars are drawn against the largest absolute net in view, so a loss-making
  // period reads as clearly as a strong one.
  const scale = periods.reduce((max, item) => Math.max(max, Math.abs(item.net)), 0) || 1
  const recent = [...periods].reverse()

  return (
    <section className="card p-6 md:p-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="section-kicker">Trading history</div>
          <h2 className="mt-2 font-display text-3xl">How the shop has been doing</h2>
          <p className="mt-2 max-w-lg text-sm leading-6 text-ink/60">
            Every ledger page you upload adds to this record. Weekly net income is exactly what the
            cash flow part of your score is measured on.
          </p>
        </div>
        <div className="flex gap-1 rounded-full bg-ink/[0.06] p-1" role="group" aria-label="Choose a period">
          {PERIODS.map((option) => (
            <button
              key={option.id}
              type="button"
              className={`rounded-full px-4 py-2 text-xs font-bold transition ${
                period === option.id ? 'bg-ink text-paper' : 'text-ink/60 hover:text-ink'
              }`}
              aria-pressed={period === option.id}
              onClick={() => setPeriod(option.id)}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {error && <div className="error-box mt-6" role="alert"><AlertTriangle size={17} />{error}</div>}

      {loading && !data && (
        <div className="mt-7 flex items-center gap-3 text-sm font-bold text-ink/55">
          <LoaderCircle className="animate-spin text-saffron" size={18} /> Loading history…
        </div>
      )}

      {data && periods.length === 0 && !error && (
        <div className="mt-7 rounded-2xl border border-dashed border-ink/20 p-8 text-center">
          <CalendarRange className="mx-auto text-ink/30" size={26} />
          <p className="mt-3 font-display text-xl">Nothing dated yet</p>
          <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-ink/55">
            Upload a ledger page with dates on it and your trading history will build up here.
          </p>
        </div>
      )}

      {data && periods.length > 0 && (
        <>
          <div className="mt-7 grid gap-3 sm:grid-cols-3">
            <Tile label="Total sales" value={`PKR ${pkr(data.totals.sales)}`} />
            <Tile label={`Average per ${period}`} value={`PKR ${pkr(data.average_net)}`} />
            <Tile label="Best period" value={data.best_period?.label || '—'} sub={data.best_period ? `PKR ${pkr(data.best_period.net)} net` : ''} />
          </div>

          <div className="mt-6 overflow-x-auto">
            <table className="w-full min-w-[560px] text-sm">
              <thead>
                <tr className="border-b border-ink/15 text-[10px] font-bold uppercase tracking-[0.12em] text-ink/45">
                  <th className="pb-3 pe-4 text-start">Period</th>
                  <th className="pb-3 pe-4 text-end">Sales</th>
                  <th className="pb-3 pe-4 text-end">Expenses</th>
                  <th className="pb-3 pe-4 text-end">Given</th>
                  <th className="pb-3 pe-4 text-end">Repaid</th>
                  <th className="pb-3 pe-4 text-end">Net</th>
                  <th className="pb-3 w-[110px] text-start">&nbsp;</th>
                </tr>
              </thead>
              <tbody>
                {recent.map((item) => (
                  <tr key={item.key} className="border-b border-ink/[0.07]">
                    <td className="py-3 pe-4 font-bold text-ink">{item.label}</td>
                    <td className="py-3 pe-4 text-end tabular-nums text-ink/70">{pkr(item.sales)}</td>
                    <td className="py-3 pe-4 text-end tabular-nums text-ink/70">{pkr(item.expenses)}</td>
                    <td className="py-3 pe-4 text-end tabular-nums text-ink/70">{pkr(item.credit_given)}</td>
                    <td className="py-3 pe-4 text-end tabular-nums text-ink/70">{pkr(item.repayments)}</td>
                    <td className={`py-3 pe-4 text-end font-bold tabular-nums ${item.net < 0 ? 'text-coral' : 'text-leaf'}`}>
                      {item.net < 0 ? '−' : ''}{pkr(Math.abs(item.net))}
                    </td>
                    <td className="py-3">
                      <div className="h-2 w-full rounded-full bg-ink/[0.08]">
                        <div
                          className={`h-full rounded-full ${item.net < 0 ? 'bg-coral' : 'bg-leaf'}`}
                          style={{ width: `${Math.max(3, (Math.abs(item.net) / scale) * 100)}%` }}
                        />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <p className="mt-5 flex items-start gap-2.5 border-t border-ink/10 pt-5 text-xs leading-5 text-ink/55">
            <TrendingUp className="mt-0.5 shrink-0 text-leaf" size={15} />
            Net income counts sales and repayments in, expenses and credit given out — the same signing
            the score uses, so these numbers and your cash flow metric always agree.
            {data.undated_transactions > 0 && (
              <span> {data.undated_transactions} transaction{data.undated_transactions === 1 ? '' : 's'} carried no
                usable date and {data.undated_transactions === 1 ? 'is' : 'are'} left out rather than placed in a guessed period.</span>
            )}
          </p>
        </>
      )}
    </section>
  )
}

function Tile({ label, value, sub }) {
  return (
    <div className="rounded-2xl bg-ink/[0.045] p-4">
      <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-ink/45">{label}</span>
      <strong className="mt-2 block font-display text-2xl tabular-nums text-ink">{value}</strong>
      {sub && <span className="mt-0.5 block text-xs text-ink/55">{sub}</span>}
    </div>
  )
}
