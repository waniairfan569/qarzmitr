import { useEffect, useState } from 'react'
import { LoaderCircle, X } from 'lucide-react'
import { api } from '../api/client'
import { useAuth } from '../context/AuthContext'
import { useT } from '../i18n'

const TYPES = ['sale', 'expense', 'credit_given', 'repayment']
const NEEDS_A_NAME = new Set(['credit_given', 'repayment'])

function todayIso() {
  const now = new Date()
  return new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 10)
}

/** Adds an entry by hand, or edits one, with the same checks the server makes. */
export default function EntryDialog({ entry, onClose, onSaved }) {
  const { token } = useAuth()
  const t = useT()
  const editing = Boolean(entry)
  const [type, setType] = useState(entry?.type || 'sale')
  const [amount, setAmount] = useState(entry ? String(entry.amount) : '')
  const [customer, setCustomer] = useState(entry?.customer_name || '')
  const [date, setDate] = useState(entry ? entry.transaction_date || '' : todayIso())
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    const onKey = (event) => { if (event.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  async function save(event) {
    event.preventDefault()
    setError('')
    if (NEEDS_A_NAME.has(type) && !customer.trim()) {
      setError(t(`entry.needsName`))
      return
    }
    setBusy(true)
    try {
      const body = { type, amount: Number(amount), customer_name: customer.trim() || null, transaction_date: date || null }
      if (editing) await api.correctTransaction(token, entry.id, body)
      else await api.addTransaction(token, { ...body, note: note.trim() || null })
      await onSaved()
      onClose()
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-ink/40 p-4" onClick={onClose}>
      <form
        className="card relative max-h-[90vh] w-full max-w-md overflow-y-auto p-6 md:p-7"
        role="dialog"
        aria-modal="true"
        aria-labelledby="entry-title"
        onClick={(event) => event.stopPropagation()}
        onSubmit={save}
      >
        <button type="button" className="icon-button absolute end-4 top-4" onClick={onClose} aria-label={t(`entry.cancel`)}>
          <X size={16} />
        </button>
        <h2 id="entry-title" className="pe-10 font-display text-2xl">{editing ? t(`entry.editTitle`) : t(`entry.addTitle`)}</h2>
        {!editing && <p className="mt-1 text-sm text-ink/60">{t(`entry.addBody`)}</p>}

        <div className="mt-5 grid gap-4">
          <label className="block" htmlFor="entry-type">
            <span className="field-label">{t(`txn.type`)}</span>
            <select id="entry-type" className="select-field mt-2 w-full" value={type} onChange={(event) => setType(event.target.value)} autoFocus>
              {TYPES.map((value) => <option key={value} value={value}>{t(`type.${value}`)}</option>)}
            </select>
          </label>

          <label className="block" htmlFor="entry-amount">
            <span className="field-label">{t(`entry.amount`)}</span>
            <input
              id="entry-amount"
              className="input-field"
              inputMode="numeric"
              required
              value={amount}
              onChange={(event) => setAmount(event.target.value.replace(/[^\d]/g, ''))}
              placeholder="4500"
            />
          </label>

          <label className="block" htmlFor="entry-customer">
            <span className="field-label">{t(`txn.customer`)}{NEEDS_A_NAME.has(type) ? ' *' : ` (${t(`entry.optional`)})`}</span>
            <input id="entry-customer" className="input-field" value={customer} maxLength={100} onChange={(event) => setCustomer(event.target.value)} placeholder="Imran Ali" />
            {NEEDS_A_NAME.has(type) && <span className="mt-1 block text-xs text-ink/50">{t(`entry.needsName`)}</span>}
          </label>

          <label className="block" htmlFor="entry-date">
            <span className="field-label">{t(`txn.date`)}</span>
            <input id="entry-date" type="date" className="input-field" value={date} max={todayIso()} onChange={(event) => setDate(event.target.value)} />
          </label>

          {!editing && (
            <label className="block" htmlFor="entry-note">
              <span className="field-label">{t(`txn.note`)} ({t(`entry.optional`)})</span>
              <input id="entry-note" className="input-field" value={note} maxLength={200} onChange={(event) => setNote(event.target.value)} />
            </label>
          )}
        </div>

        {error && <div className="error-box mt-4" role="alert">{error}</div>}

        <div className="mt-6 flex flex-wrap justify-end gap-3">
          <button type="button" className="text-button" onClick={onClose}>{t(`entry.cancel`)}</button>
          <button type="submit" className="primary-button !min-h-11 !px-6 !text-xs" disabled={busy || !amount}>
            {busy && <LoaderCircle className="animate-spin" size={15} />} {t(`entry.save`)}
          </button>
        </div>
      </form>
    </div>
  )
}
