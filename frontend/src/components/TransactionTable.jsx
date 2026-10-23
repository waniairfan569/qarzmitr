import { useState } from 'react'
import { AlertTriangle, BookOpen, Keyboard, LoaderCircle, Pencil, Plus, Trash2 } from 'lucide-react'
import { api } from '../api/client'
import { useAuth } from '../context/AuthContext'
import { useLanguage, useMoney } from '../i18n'
import DateRangeFilter from './DateRangeFilter'
import EntryDialog from './EntryDialog'
import Pagination, { usePaged } from './Pagination'

const FILTERS = [
  { value: '', label: 'All entries' },
  { value: 'sale', label: 'Sales' },
  { value: 'expense', label: 'Expenses' },
  { value: 'credit_given', label: 'Credit given' },
  { value: 'repayment', label: 'Repayments' },
]

function money(value) {
  return new Intl.NumberFormat('en-PK', { maximumFractionDigits: 0 }).format(Number(value || 0))
}

function formatDate(value, isUrdu) {
  return new Intl.DateTimeFormat(isUrdu ? 'ur-PK' : 'en-PK', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(`${value}T00:00:00`))
}

export default function TransactionTable({ transactions, totals, filter, onFilter, range, onRange, loading, error, onChanged }) {
  const { token } = useAuth()
  const { t, isUrdu } = useLanguage()
  const pkr = useMoney()
  const paged = usePaged(transactions)
  // undefined: closed · null: adding a new entry · a row: editing that row
  const [editing, setEditing] = useState(undefined)
  const [confirmingDelete, setConfirmingDelete] = useState(null)
  const [actionError, setActionError] = useState('')

  async function remove(id) {
    setActionError('')
    try {
      await api.deleteTransaction(token, id)
      setConfirmingDelete(null)
      await onChanged()
    } catch (requestError) {
      setActionError(requestError.message)
    }
  }

  return (
    <section className="card overflow-hidden">
      {/* The heading sits above the controls rather than beside them, so the
          whole filter fits on one row instead of stacking into a column. */}
      <div className="border-b border-ink/10 p-6 md:p-8">
        <div>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="section-kicker">{t(`txn.kicker`)}</div>
              <h2 className="mt-2 font-display text-3xl">{t(`txn.title`)}</h2>
            </div>
            <button type="button" className="primary-button !min-h-11 !px-5 !text-xs" onClick={() => setEditing(null)}>
              <Plus size={15} /> {t(`entry.add`)}
            </button>
          </div>
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

      {(error || actionError) && (
        <div className="m-6 flex items-center gap-3 rounded-xl bg-coral/10 p-4 text-sm font-semibold text-coral md:m-8">
          <AlertTriangle size={18} /> {error || actionError}
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
          <table className="w-full min-w-[860px] text-left rtl:text-right">
            <thead>
              <tr className="bg-ink/[0.035] text-xs font-bold uppercase tracking-[0.12em] text-ink/55">
                <th className="px-6 py-4 md:px-8">{t(`txn.type`)}</th><th className="px-5 py-4">{t(`txn.amount`)}</th><th className="px-5 py-4">{t(`txn.customer`)}</th><th className="px-5 py-4">{t(`txn.date`)}</th><th className="px-5 py-4">{t(`txn.note`)}</th><th className="px-6 py-4 text-end md:px-8"><span className="sr-only">{t(`entry.actions`)}</span></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink/8">
              {paged.visible.map((transaction) => {
                const uncertain = transaction.note?.toLowerCase().includes('uncertain')
                return (
                  <tr key={transaction.id} className="transition-colors hover:bg-saffron/[0.06]">
                    <td className="px-6 py-5 md:px-8">
                      <span className={`type-pill type-${transaction.type}`}>{t(`type.${transaction.type}`)}</span>
                      {transaction.source === 'manual' && (
                        <span className="mt-1.5 flex items-center gap-1 text-[10px] font-bold uppercase tracking-[0.08em] text-ink/45">
                          <Keyboard size={11} /> {t(`entry.manual`)}
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-5 font-mono text-sm font-bold">{pkr(transaction.amount)}</td>
                    <td className="px-5 py-5 text-sm font-semibold">{transaction.customer_name || '—'}</td>
                    <td className="px-5 py-5 text-sm text-ink/55">{transaction.transaction_date
                      // bdi keeps day, month and year in order inside right-to-left text.
                      ? <bdi>{formatDate(transaction.transaction_date, isUrdu)}</bdi>
                      : t(`txn.noDate`)}</td>
                    <td className="max-w-xs px-5 py-5 text-sm text-ink/55">
                      <span className="inline-flex items-start gap-2">{uncertain && <AlertTriangle className="mt-0.5 shrink-0 text-saffron-dark" size={14} />}{transaction.note || '—'}</span>
                    </td>
                    <td className="whitespace-nowrap px-6 py-5 text-end md:px-8">
                      {confirmingDelete === transaction.id ? (
                        <span className="inline-flex items-center gap-2 text-xs font-bold">
                          {t(`entry.confirmDelete`)}
                          <button type="button" className="rounded-full bg-coral px-3 py-1.5 text-paper" onClick={() => remove(transaction.id)}>{t(`entry.delete`)}</button>
                          <button type="button" className="text-button !text-xs" onClick={() => setConfirmingDelete(null)}>{t(`entry.keep`)}</button>
                        </span>
                      ) : (
                        <span className="inline-flex gap-1">
                          <button type="button" className="icon-button" onClick={() => setEditing(transaction)} aria-label={t(`entry.edit`)} title={t(`entry.edit`)}>
                            <Pencil size={15} />
                          </button>
                          <button type="button" className="icon-button" onClick={() => setConfirmingDelete(transaction.id)} aria-label={t(`entry.delete`)} title={t(`entry.delete`)}>
                            <Trash2 size={15} />
                          </button>
                        </span>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {!loading && transactions.length > 0 && (
        <Pagination {...paged} onPage={paged.setPage} />
      )}

      {editing !== undefined && (
        <EntryDialog entry={editing} onClose={() => setEditing(undefined)} onSaved={onChanged} />
      )}
    </section>
  )
}
