import { AlertTriangle, CheckCircle2, HandCoins, LoaderCircle, Users } from 'lucide-react'
import { useT } from '../i18n'

function pkr(amount) {
  return Number(amount || 0).toLocaleString('en-PK')
}

// A debt is only worth chasing once it has been sitting a while; two weeks is
// the point most shopkeepers start asking.
function ageTone(days) {
  if (days === null || days === undefined) return 'text-ink/45'
  if (days >= 14) return 'text-coral'
  if (days >= 7) return 'text-saffron-dark'
  return 'text-ink/55'
}

export default function CustomerBalances({ data, loading, error }) {
  const t = useT()
  if (loading) {
    return (
      <section className="card p-6 md:p-8">
        <div className="flex items-center gap-3 text-sm font-bold text-ink/55">
          <LoaderCircle className="animate-spin text-saffron" size={18} /> {t(`udhaar.working`)}
        </div>
      </section>
    )
  }

  const customers = data?.customers || []
  const summary = data?.summary
  const owing = customers.filter((customer) => !customer.settled)
  const settled = customers.filter((customer) => customer.settled)

  return (
    <section className="card p-6 md:p-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="section-kicker">{t(`udhaar.kicker`)}</div>
          <h2 className="mt-2 font-display text-3xl">{t(`udhaar.title`)}</h2>
          <p className="mt-2 max-w-lg text-sm leading-6 text-ink/60">
            {t(`udhaar.body`)}
          </p>
        </div>
        {summary && (
          <div className="rounded-2xl bg-ink/[0.05] px-5 py-4 text-end">
            <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-ink/50">{t(`udhaar.totalOutstanding`)}</span>
            <strong className="mt-1 block font-display text-3xl tabular-nums text-ink">PKR {pkr(summary.total_outstanding)}</strong>
            <span className="mt-1 block text-xs text-ink/55">
              {t(`udhaar.across`, { count: summary.customers_owing })}
            </span>
          </div>
        )}
      </div>

      {error && (
        <div className="error-box mt-6" role="alert"><AlertTriangle size={17} />{error}</div>
      )}

      {!error && customers.length === 0 && (
        <div className="mt-7 rounded-2xl border border-dashed border-ink/20 p-8 text-center">
          <Users className="mx-auto text-ink/30" size={26} />
          <p className="mt-3 font-display text-xl">{t(`udhaar.emptyTitle`)}</p>
          <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-ink/55">
            {t(`udhaar.emptyBody`)}
          </p>
        </div>
      )}

      {owing.length > 0 && (
        <ul className="mt-7 flex flex-col gap-3">
          {owing.map((customer) => (
            <li key={customer.name} className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-ink/10 bg-cream/60 px-5 py-4">
              <div className="min-w-0">
                <strong className="block truncate text-base text-ink">{customer.name}</strong>
                <span className="mt-0.5 block text-xs text-ink/50">
                  {t(`udhaar.given`, { given: pkr(customer.credit_given), repaid: pkr(customer.repaid) })}
                  {customer.last_activity ? ` · ${t(`udhaar.last`, { date: customer.last_activity })}` : ''}
                </span>
                {customer.aliases?.length > 0 && (
                  <span className="mt-1 block text-xs text-saffron-dark" title="Different spellings on your pages, counted as one person">
                    {t(`udhaar.alias`, { names: customer.aliases.join(`، `) })}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-6">
                {customer.days_outstanding !== null && (
                  <span className={`text-xs font-bold ${ageTone(customer.days_outstanding)}`}>
                    {t(`udhaar.days`, { days: customer.days_outstanding })}
                  </span>
                )}
                <div className="text-end">
                  <strong className="block font-display text-2xl tabular-nums text-ink">PKR {pkr(customer.outstanding)}</strong>
                  <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-ink/45">{t(`udhaar.outstanding`)}</span>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      {settled.length > 0 && (
        <div className="mt-6 border-t border-ink/10 pt-5">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2 text-sm text-ink/60">
            <CheckCircle2 className="text-leaf" size={16} />
            <span className="font-bold text-ink">{t(`udhaar.settled`)}</span>
            {settled.map((customer) => (
              <span key={customer.name} className="rounded-full bg-leaf/10 px-3 py-1 text-xs font-bold text-leaf">
                {customer.name}
              </span>
            ))}
          </div>
        </div>
      )}

      {summary && summary.oldest_days_outstanding >= 14 && (
        <p className="mt-6 flex items-start gap-2.5 rounded-2xl border-s-4 border-saffron bg-saffron/[0.09] p-4 text-sm leading-6 text-ink/75">
          <HandCoins className="mt-0.5 shrink-0 text-saffron-dark" size={17} />
          {t(`udhaar.nudge`, { days: summary.oldest_days_outstanding })}
        </p>
      )}
    </section>
  )
}
