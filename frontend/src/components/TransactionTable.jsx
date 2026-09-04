import { AlertTriangle, BookOpen, LoaderCircle } from 'lucide-react'
import { useT } from '../i18n'

const FILTERS = [
  { value: '', label: 'All entries' },
  { value: 'sale', label: 'Sales' },
  { value: 'expense', label: 'Expenses' },
  { value: 'credit_given', label: 'Credit given' },
  { value: 'repayment', label: 'Repayments' },
]

const TYPE_LABELS = Object.fromEntries(FILTERS.slice(1).map(({ value, label }) => [value, label.replace(/s$/, '')]))

function formatAmount(value) {
  return new Intl.NumberFormat('en-PK', { style: 'currency', currency: 'PKR', maximumFractionDigits: 0 }).format(Number(value))
}

function formatDate(value) {
  if (!value) return 'Date not captured'
  return new Intl.DateTimeFormat('en-PK', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(`${value}T00:00:00`))
}

export default function TransactionTable({ transactions, filter, onFilter, loading, error }) {
  const t = useT()
  return (
    <section className="card overflow-hidden">
      <div className="flex flex-col gap-5 border-b border-ink/10 p-6 md:flex-row md:items-end md:justify-between md:p-8">
        <div>
          <div className="section-kicker">{t(`txn.kicker`)}</div>
          <h2 className="mt-2 font-display text-3xl">{t(`txn.title`)}</h2>
          <p className="mt-2 text-sm text-ink/50">{transactions.length} {transactions.length === 1 ? 'entry' : 'entries'} in this view</p>
        </div>
        <label className="block">
          <span className="sr-only">{t(`txn.type`)}</span>
          <select className="select-field" value={filter} onChange={(event) => onFilter(event.target.value)} disabled={loading}>
            {FILTERS.map((item) => <option key={item.value} value={item.value}>{item.value ? t(`type.${item.value}`) : t(`type.all`)}</option>)}
          </select>
        </label>
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
          <p className="mt-4 font-display text-2xl text-ink/45">{t(`txn.empty`)}</p>
          <p className="mt-2 text-sm text-ink/45">Upload and process a ledger to bring the record to life.</p>
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
