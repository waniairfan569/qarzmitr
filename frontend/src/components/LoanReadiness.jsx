import { useCallback, useEffect, useState } from 'react'
import { ArrowRight, Banknote, CircleCheck, Target } from 'lucide-react'
import { api } from '../api/client'
import { useAuth } from '../context/AuthContext'

function pkr(amount) {
  return Number(amount || 0).toLocaleString('en-PK')
}

export default function LoanReadiness({ refreshKey }) {
  const { token } = useAuth()
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
          <div className="section-kicker">Getting a loan</div>
          <h2 className="mt-2 font-display text-3xl leading-tight">
            {eligible
              ? 'A lender can act on this today'
              : `You are ${next.points_needed} point${next.points_needed === 1 ? '' : 's'} away`}
          </h2>
          <p className="mt-3 max-w-xl text-sm leading-6 text-ink/65">
            {eligible
              ? `Your record is strong enough to put in front of a microfinance institution. On average monthly sales of PKR ${pkr(data.monthly_sales)}, that supports an indicative facility of about PKR ${pkr(data.indicative_facility)}.`
              : `At ${next.at} out of 100 a microfinance institution can be asked to consider you. You are at ${score}.`}
          </p>

          <div className="mt-6">
            <div className="flex items-end justify-between gap-4 text-xs font-bold text-ink/50">
              <span>{score} now</span>
              <span>{eligible ? 'Eligible' : `${next.at} needed`}</span>
            </div>
            <div className="mt-2 h-3 rounded-full bg-ink/[0.08]">
              <div
                className={`h-full rounded-full transition-all duration-700 ${eligible ? 'bg-leaf' : 'bg-saffron'}`}
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className={`mt-3 inline-flex items-center gap-2 text-sm font-bold ${eligible ? 'text-leaf' : 'text-saffron-dark'}`}>
              {eligible ? <CircleCheck size={16} /> : <Target size={16} />} {band.label}
            </p>
          </div>
        </div>

        <div className="rounded-2xl border border-ink/10 bg-cream/70 p-5">
          <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.14em] text-ink/50">
            <ArrowRight size={13} /> What lifts it most
          </div>
          <strong className="mt-3 block font-display text-xl leading-tight text-ink">{lever.name}</strong>
          <p className="mt-2 text-sm leading-6 text-ink/65">{lever.action}</p>
          <div className="mt-4 flex items-baseline gap-2 border-t border-ink/10 pt-4">
            <Banknote className="text-saffron-dark" size={16} />
            <span className="text-sm text-ink/60">
              Worth up to <strong className="text-ink">{lever.points_available} points</strong> of your score
            </span>
          </div>
        </div>
      </div>

      <p className="mt-6 border-t border-ink/10 pt-5 text-xs leading-5 text-ink/50">
        These thresholds are prototype defaults, not a lender's own policy, and no score decides a loan on its own.
        A lender sees the same evidence in the lender view.
      </p>
    </section>
  )
}
