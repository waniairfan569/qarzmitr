import { AlertTriangle, BookOpen, LoaderCircle } from 'lucide-react'
import { useT } from '../i18n'
import DateRangeFilter from './DateRangeFilter'

const FILTERS = [
  { value: '', label: 'All entries' },
  { value: 'sale', label: 'Sales' },
  { value: 'expense', label: 'Expenses' },
  { value: 'credit_given', label: 'Credit given' },
  { value: 'repayment', label: 'Repayments' },
]

const TYPE_LABELS = Object.fromEntries(FILTERS.slice(1).map(({ value, label }) => [value, label.replace(/s$/, '')]))

function money(value) {
  return new Intl.NumberFormat('en-PK', { maximumFractionDigits: 0 }).format(Number(value || 0))
}

function formatAmount(value) {
  return new Intl.NumberFormat('en-PK', { style: 'currency', currency: 'PKR', maximumFractionDigits: 0 }).format(Number(value))
}

function formatDate(value) {
  if (!value) return 'Date not captured'
  return new Intl.DateTimeFormat('en-PK', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(`${value}T00:00:00`))
}

export default function TransactionTable({ transactions, totals, filter, onFilter, range, onRange, loading, error }) {
  const t = useT()
  return (
    <section className="card overflow-hidden">
      {/* The heading sits above the controls rather than beside them, so the
          whole filter fits on one row instead of stacking into a column. */}
      <div className="border-b border-ink/10 p-6 md:p-8">
        <div>
          <div className="section-kicker">{t(`txn.kicker`)}</div>
          <h2 className="mt-2 font-display text-3xl">{t(`txn.title`)}</h2>
          {totals && (
            <p className="mt-2 text-sm text-ink/60">
              {t(`txn.rangeTotals`, {
                count: totals.count,
                sales: money(totals.sale),
                expenses: money(totals.expense),
                net: money(totals.net),
              })}
            </p>
          )}
          {(range?.from || range?.to) && (
            <p className="mt-1 text-xs text-ink/45">{t(`txn.undatedNote`)}</p>
          )}
        </div>

        <div className="mt-5 flex flex-wrap items-center gap-2">
          <DateRangeFilter value={range} onChange={onRange} disabled={loading} />
          <label className="block">
            <span className="sr-only">{t(`txn.type`)}</span>
            <select
              className="select-field !min-w-0 !rounded-full !py-2 !text-xs !font-bold"
              value={filter}
              onChange={(event) => onFilter(event.target.value)}
              disabled={loading}
            >
              {FILTERS.map((item) => <option key={item.value} value={item.value}>{item.value ? t(`type.${item.value}`) : t(`type.all`)}</option>)}
            </select>
          </label>
        </div>
      </div>

      {error && (
        <div className="m-6 flex items-center gap-3 rounded-xl bg-coral/10 p-4 text-sm font-semibold text-coral md:m-8">
          <AlertTriangle size={18} /> {error}
        </div>
      )}
      {loading ? (
        <div className="grid min-h-56 place-content-center text-ink/45"><LoaderCircle className="animate-spin" /></div>
      ) : transactions.length === 0 ? (
        <div className="grid min-h-64 place-content-center px-6 text-center">
          <BookOpen className="mx-auto text-saffron" size={30} />
          {/* An empty ledger and an empty date range are different problems. */}
          <p className="mt-4 font-display text-2xl text-ink/45">
            {range?.from || range?.to ? t(`txn.noneInRange`) : t(`txn.empty`)}
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-left">
            <thead>
              <tr className="bg-ink/[0.035] text-[10px] font-bold uppercase tracking-[0.18em] text-ink/45">
                <th className="px-6 py-4 md:px-8">{t(`txn.type`)}</th><th className="px-5 py-4">{t(`txn.amount`)}</th><th className="px-5 py-4">{t(`txn.customer`)}</th><th className="px-5 py-4">{t(`txn.date`)}</th><th className="px-6 py-4 md:px-8">{t(`txn.note`)}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink/8">
              {transactions.map((transaction) => {
                const uncertain = transaction.note?.toLowerCase().includes('uncertain')
                return (
                  <tr key={transaction.id} className="transition-colors hover:bg-saffron/[0.06]">
                    <td className="px-6 py-5 md:px-8"><span className={`type-pill type-${transaction.type}`}>{TYPE_LABELS[transaction.type] || transaction.type}</span></td>
                    <td className="px-5 py-5 font-mono text-sm font-bold">{formatAmount(transaction.amount)}</td>
                    <td className="px-5 py-5 text-sm font-semibold">{transaction.customer_name || '—'}</td>
                    <td className="px-5 py-5 text-sm text-ink/55">{formatDate(transaction.transaction_date)}</td>
                    <td className="max-w-xs px-6 py-5 text-sm text-ink/55 md:px-8">
                      <span className="inline-flex items-start gap-2">{uncertain && <AlertTriangle className="mt-0.5 shrink-0 text-saffron-dark" size={14} />}{transaction.note || '—'}</span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}
