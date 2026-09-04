import { useCallback, useEffect, useState } from 'react'
import { AlertTriangle, Check, CircleCheck, LoaderCircle, PencilLine } from 'lucide-react'
import { api } from '../api/client'
import { useAuth } from '../context/AuthContext'

const TYPES = [
  { id: 'sale', label: 'Sale' },
  { id: 'expense', label: 'Expense' },
  { id: 'credit_given', label: 'Credit given (udhaar)' },
  { id: 'repayment', label: 'Repayment (waapsi)' },
]

const SEVERITY = {
  high: { chip: 'bg-coral/12 text-coral', label: 'Needs a name' },
  medium: { chip: 'bg-saffron/18 text-saffron-dark', label: 'Unsure reading' },
  low: { chip: 'bg-ink/[0.07] text-ink/60', label: 'Missing date' },
}

export default function ReviewQueue({ refreshKey, onCorrected }) {
  const { token } = useAuth()
  const [queue, setQueue] = useState(null)
  const [editing, setEditing] = useState(null)
  const [draft, setDraft] = useState({})
  const [busy, setBusy] = useState('')
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    setError('')
    try {
      setQueue(await api.review(token))
    } catch (requestError) {
      setError(requestError.message)
    }
  }, [token])

  useEffect(() => {
    load()
  }, [load, refreshKey])

  function startEdit(item) {
    setEditing(item.id)
    setDraft({
      type: item.type || 'sale',
      amount: item.amount ?? '',
      customer_name: item.customer_name || '',
      transaction_date: item.transaction_date || '',
    })
    setError('')
  }

  async function save(item, patch) {
    setBusy(item.id)
    setError('')
    try {
      await api.correctTransaction(token, item.id, patch)
      setEditing(null)
      await load()
      // The score, balances and history all read from these rows.
      if (onCorrected) await onCorrected()
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setBusy('')
    }
  }

  if (!queue) {
    return (
      <section className="card p-6 md:p-8">
        <div className="flex items-center gap-3 text-sm font-bold text-ink/55">
          <LoaderCircle className="animate-spin text-saffron" size={18} /> Checking your entries…
        </div>
      </section>
    )
  }

  return (
    <section className="card p-6 md:p-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="section-kicker">Worth a second look</div>
          <h2 className="mt-2 font-display text-3xl">Entries to check</h2>
          <p className="mt-2 max-w-xl text-sm leading-6 text-ink/60">
            When the reading was unsure, or a detail is missing, the entry is listed here instead of
            being quietly accepted. Correct it or confirm it — either way it stops asking.
          </p>
        </div>
        {queue.summary.total > 0 && (
          <div className="rounded-2xl bg-ink/[0.05] px-5 py-4 text-end">
            <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-ink/50">To check</span>
            <strong className="mt-1 block font-display text-3xl text-ink">{queue.summary.total}</strong>
          </div>
        )}
      </div>

      {error && <div className="error-box mt-6" role="alert"><AlertTriangle size={17} />{error}</div>}

      {queue.items.length === 0 && (
        <div className="mt-7 rounded-2xl border border-dashed border-leaf/35 bg-leaf/[0.06] p-8 text-center">
          <CircleCheck className="mx-auto text-leaf" size={26} />
          <p className="mt-3 font-display text-xl">Every entry looks clear</p>
          <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-ink/55">
            Nothing was flagged as uncertain or incomplete on the pages you have uploaded.
          </p>
        </div>
      )}

      {queue.items.length > 0 && (
        <ul className="mt-7 flex flex-col gap-3">
          {queue.items.map((item) => (
            <li key={item.id} className="rounded-2xl border border-ink/10 bg-cream/60 p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`rounded-full px-3 py-1 text-[11px] font-bold ${SEVERITY[item.severity].chip}`}>
                      {SEVERITY[item.severity].label}
                    </span>
                    <strong className="text-base text-ink">PKR {Number(item.amount || 0).toLocaleString('en-PK')}</strong>
                    <span className="text-xs text-ink/50">
                      {item.type} · {item.transaction_date || 'no date'}{item.customer_name ? ` · ${item.customer_name}` : ''}
                    </span>
                  </div>
                  <ul className="mt-2 flex flex-col gap-1">
                    {item.reasons.map((reason) => (
                      <li key={reason.code} className="text-xs leading-5 text-ink/60">
                        <strong className="text-ink/75">{reason.label}:</strong> {reason.detail}
                      </li>
                    ))}
                  </ul>
                </div>
                {editing !== item.id && (
                  <div className="flex shrink-0 gap-2">
                    <button type="button" className="secondary-button !min-h-10 !px-4 !text-xs" onClick={() => startEdit(item)}>
                      <PencilLine size={14} /> Correct
                    </button>
                    <button
                      type="button"
                      className="secondary-button !min-h-10 !px-4 !text-xs"
                      disabled={busy === item.id}
                      onClick={() => save(item, {})}
                    >
                      {busy === item.id ? <LoaderCircle className="animate-spin" size={14} /> : <Check size={14} />} It's right
                    </button>
                  </div>
                )}
              </div>

              {editing === item.id && (
                <form
                  className="mt-4 grid gap-3 border-t border-ink/10 pt-4 sm:grid-cols-2"
                  onSubmit={(event) => { event.preventDefault(); save(item, draft) }}
                >
                  <label className="block">
                    <span className="field-label">What kind of entry</span>
                    <select className="select-field w-full" value={draft.type} onChange={(e) => setDraft({ ...draft, type: e.target.value })}>
                      {TYPES.map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}
                    </select>
                  </label>
                  <label className="block">
                    <span className="field-label">Amount (PKR)</span>
                    <input className="input-field w-full" type="number" min="0" step="1" value={draft.amount} onChange={(e) => setDraft({ ...draft, amount: e.target.value })} />
                  </label>
                  <label className="block">
                    <span className="field-label">Customer name</span>
                    <input className="input-field w-full" type="text" value={draft.customer_name} placeholder="Leave empty for a walk-in sale" onChange={(e) => setDraft({ ...draft, customer_name: e.target.value })} />
                  </label>
                  <label className="block">
                    <span className="field-label">Date</span>
                    <input className="input-field w-full" type="date" value={draft.transaction_date} onChange={(e) => setDraft({ ...draft, transaction_date: e.target.value })} />
                  </label>
                  <div className="flex gap-2 sm:col-span-2">
                    <button type="submit" className="primary-button !min-h-11 !px-5 !text-xs" disabled={busy === item.id}>
                      {busy === item.id ? <><LoaderCircle className="animate-spin" size={14} /> Saving…</> : <>Save correction</>}
                    </button>
                    <button type="button" className="secondary-button !min-h-11 !px-5 !text-xs" onClick={() => setEditing(null)}>Cancel</button>
                  </div>
                </form>
              )}
            </li>
          ))}
        </ul>
      )}

      <p className="mt-6 border-t border-ink/10 pt-5 text-xs leading-5 text-ink/55">
        Corrections update your score, balances and history straight away — the figures are always
        recalculated from these entries, never stored separately.
      </p>
    </section>
  )
}
