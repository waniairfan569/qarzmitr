import { useCallback, useEffect, useState } from 'react'
import { ArrowRight, Banknote, CircleCheck, Download, Target } from 'lucide-react'
import { Link } from 'react-router-dom'
import { api } from '../api/client'
import { useAuth } from '../context/AuthContext'
import { useMoney, useT } from '../i18n'

const leverKey = (key) => ({ cash_flow_consistency: `cashflow`, repayment_ratio: `repayment`, revenue_trend: `revenue` })[key] || key

export default function LoanReadiness({ refreshKey }) {
  const { token } = useAuth()
  const t = useT()
  const pkr = useMoney()
  const [data, setData] = useState(null)

  const load = useCallback(async () => {
    try {
      setData(await api.readiness(token))
    } catch {
      setData(null)
    }
  }, [token])

  useEffect(() => {
    load()
  }, [load, refreshKey])

  if (!data?.has_score) return null

  const { score, band, eligible, next_band: next, biggest_lever: lever } = data
  const target = next ? next.at : 100
  const progress = Math.min(100, Math.max(4, (score / target) * 100))

  return (
    <section className={`card overflow-hidden p-6 md:p-8 ${eligible ? 'border-leaf/30' : ''}`}>
      <div className="grid gap-8 lg:grid-cols-[1.15fr_0.85fr]">
        <div>
          <div className="section-kicker">{t(`ready.kicker`)}</div>
          <h2 className="mt-2 font-display text-3xl leading-tight">
            {eligible
              ? t(`ready.eligibleTitle`)
              : t(`ready.awayTitle`, { points: next.points_needed })}
          </h2>
          <p className="mt-3 max-w-xl text-sm leading-6 text-ink/65">
            {eligible
              ? t(`ready.eligibleBody`, { sales: pkr(data.monthly_sales), facility: pkr(data.indicative_facility) })
              : t(`ready.awayBody`, { at: next.at, score })}
          </p>

          <div className="mt-6">
            <div className="flex items-end justify-between gap-4 text-xs font-bold text-ink/50">
              <span>{t(`ready.now`, { score })}</span>
              <span>{eligible ? t(`ready.eligible`) : t(`ready.needed`, { at: next.at })}</span>
            </div>
            <div className="mt-2 h-3 rounded-full bg-ink/[0.08]">
              <div
                className={`h-full rounded-full transition-all duration-700 ${eligible ? 'bg-leaf' : 'bg-saffron'}`}
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className={`mt-3 inline-flex items-center gap-2 text-sm font-bold ${eligible ? 'text-leaf' : 'text-saffron-dark'}`}>
              {eligible ? <CircleCheck size={16} /> : <Target size={16} />} {t(`ready.band.${band.id}`)}
            </p>
            {eligible && (
              <Link className="secondary-button mt-4 !min-h-11 !px-5 !text-xs" to="/lender">
                <Download size={15} /> {t(`ready.getStatement`)}
              </Link>
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-ink/10 bg-cream/70 p-5">
          <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.14em] text-ink/50">
            <ArrowRight size={13} /> {t(`ready.lifts`)}
          </div>
          <strong className="mt-3 block font-display text-xl leading-tight text-ink">{t(`ready.lever.${leverKey(lever.key)}`)}</strong>
          <p className="mt-2 text-sm leading-6 text-ink/65">{t(`ready.lever.${leverKey(lever.key)}.action`)}</p>
          <div className="mt-4 flex items-baseline gap-2 border-t border-ink/10 pt-4">
            <Banknote className="text-saffron-dark" size={16} />
            <span className="text-sm text-ink/60">
              {t(`ready.worth`, { points: lever.points_available })}
            </span>
          </div>
        </div>
      </div>

      <p className="mt-6 max-w-3xl border-t border-ink/10 pt-5 text-xs leading-5 text-ink/50">
        {t(`ready.caveat`)}
      </p>
    </section>
  )
}
