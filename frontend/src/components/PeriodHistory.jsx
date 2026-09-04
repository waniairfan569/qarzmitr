import { useCallback, useEffect, useState } from 'react'
import { AlertTriangle, CalendarRange, LoaderCircle, TrendingUp } from 'lucide-react'
import { api } from '../api/client'
import { useMoney, useT } from '../i18n'
import { useAuth } from '../context/AuthContext'

const PERIODS = [{ id: 'day' }, { id: 'week' }, { id: 'month' }, { id: 'year' }]

export default function PeriodHistory({ refreshKey }) {
  const t = useT()
  const pkr = useMoney()
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
          <div className="section-kicker">{t(`hist.kicker`)}</div>
          <h2 className="mt-2 font-display text-3xl">{t(`hist.title`)}</h2>
          <p className="mt-2 max-w-lg text-sm leading-6 text-ink/60">
            {t(`hist.body`)}
          </p>
        </div>
        <div className="flex gap-1 rounded-full bg-ink/[0.06] p-1" role="group" aria-label={t(`hist.period`)}>
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
              {t(`hist.${option.id}`)}
            </button>
          ))}
        </div>
      </div>

      {error && <div className="error-box mt-6" role="alert"><AlertTriangle size={17} />{error}</div>}

      {loading && !data && (
        <div className="mt-7 flex items-center gap-3 text-sm font-bold text-ink/55">
          <LoaderCircle className="animate-spin text-saffron" size={18} /> {t(`hist.loading`)}
        </div>
      )}

      {data && periods.length === 0 && !error && (
        <div className="mt-7 rounded-2xl border border-dashed border-ink/20 p-8 text-center">
          <CalendarRange className="mx-auto text-ink/30" size={26} />
          <p className="mt-3 font-display text-xl">{t(`hist.emptyTitle`)}</p>
          <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-ink/55">
            {t(`hist.emptyBody`)}
          </p>
        </div>
      )}

      {data && periods.length > 0 && (
        <>
          <div className="mt-7 grid gap-3 sm:grid-cols-3">
            <Tile label={t(`hist.totalSales`)} value={pkr(data.totals.sales)} />
            <Tile label={t(`hist.average`, { period: t(`hist.${period}`) })} value={pkr(data.average_net)} />
            <Tile label={t(`hist.best`)} value={data.best_period?.label || '—'} sub={data.best_period ? t(`hist.netLabel`, { net: pkr(data.best_period.net) }) : ''} />
          </div>

          <div className="mt-6 overflow-x-auto">
            <table className="w-full min-w-[560px] text-sm">
              <thead>
                <tr className="border-b border-ink/15 text-[10px] font-bold uppercase tracking-[0.12em] text-ink/45">
                  <th className="pb-3 pe-4 text-start">{t(`hist.period`)}</th>
                  <th className="pb-3 pe-4 text-end">{t(`hist.sales`)}</th>
                  <th className="pb-3 pe-4 text-end">{t(`hist.expenses`)}</th>
                  <th className="pb-3 pe-4 text-end">{t(`hist.givenCol`)}</th>
                  <th className="pb-3 pe-4 text-end">{t(`hist.repaidCol`)}</th>
                  <th className="pb-3 pe-4 text-end">{t(`hist.net`)}</th>
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

          <p className="mt-5 flex items-start gap-2.5 max-w-3xl border-t border-ink/10 pt-5 text-xs leading-5 text-ink/55">
            <TrendingUp className="mt-0.5 shrink-0 text-leaf" size={15} />
            <span>
              {t(`hist.note`)}
              {data.undated_transactions > 0 && ` ${t(`hist.undated`, { count: data.undated_transactions })}`}
            </span>
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
