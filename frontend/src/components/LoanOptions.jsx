import { useCallback, useEffect, useState } from 'react'
import { Check, CircleCheck, CircleDashed, CircleSlash, Copy, ExternalLink, Landmark, Link2, LoaderCircle, Send, X } from 'lucide-react'
import { useLocation } from 'react-router-dom'
import { api } from '../api/client'
import { useAuth } from '../context/AuthContext'
import { useLanguage, useMoney } from '../i18n'

// Written out in full so Tailwind can see the classes at build time.
const STATUS_STYLE = {
  eligible: { pill: 'bg-leaf/10 text-leaf', Icon: CircleCheck },
  almost: { pill: 'bg-saffron/15 text-saffron-dark', Icon: CircleDashed },
  not_yet: { pill: 'bg-ink/[0.07] text-ink/55', Icon: CircleSlash },
}

const SHARE_STATUS_STYLE = {
  active: 'text-leaf',
  expired: 'text-ink/45',
  revoked: 'text-ink/45',
}

export default function LoanOptions({ refreshKey }) {
  const { token } = useAuth()
  const { t, isUrdu } = useLanguage()
  const pkr = useMoney()
  const [data, setData] = useState(null)
  const [shares, setShares] = useState([])
  const [amountInput, setAmountInput] = useState('')
  const [amount, setAmount] = useState('')
  const [interestFreeOnly, setInterestFreeOnly] = useState(false)
  const [error, setError] = useState('')
  const [sharing, setSharing] = useState(null)
  const { hash } = useLocation()
  const hasData = Boolean(data?.has_score)

  // Arriving from "Share with a lender", go straight to the lender cards once
  // they exist, rather than leaving the shopkeeper at the top of the page.
  useEffect(() => {
    if (hash === '#lenders' && hasData) {
      document.getElementById('lenders')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }, [hash, hasData])

  const load = useCallback(async () => {
    try {
      const [options, shareList] = await Promise.all([api.loanOptions(token, amount), api.shares(token)])
      setData(options)
      setShares(shareList.shares)
      setError('')
    } catch (requestError) {
      setError(requestError.message)
    }
  }, [token, amount])

  useEffect(() => {
    load()
  }, [load, refreshKey])

  if (!data?.has_score) return null

  const lenderName = (option) => (isUrdu ? option.name_ur : option.name)
  const namesById = Object.fromEntries(data.options.map((option) => [option.id, lenderName(option)]))
  const visible = data.options.filter((option) => !interestFreeOnly || option.type === 'interest_free')

  function applyAmount(event) {
    event.preventDefault()
    setAmount(amountInput.trim())
  }

  async function withdraw(id) {
    try {
      await api.revokeShare(token, id)
      await load()
    } catch (requestError) {
      setError(requestError.message)
    }
  }

  return (
    <section id="lenders" className="card scroll-mt-32 p-6 md:p-8" aria-labelledby="loan-options-title">
      <div className="flex flex-wrap items-end justify-between gap-5">
        <div className="max-w-2xl">
          <div className="section-kicker">{t(`loans.kicker`)}</div>
          <h2 id="loan-options-title" className="mt-2 font-display text-3xl leading-tight">{t(`loans.title`)}</h2>
          <p className="mt-2 text-sm leading-6 text-ink/65">{t(`loans.intro`)}</p>
          <p className="mt-2 text-xs font-bold text-ink/50">
            {t(`loans.summary`, { score: data.score, months: data.history_months })}
          </p>
        </div>

        <form className="flex flex-wrap items-end gap-2" onSubmit={applyAmount}>
          <label className="block" htmlFor="loan-amount">
            <span className="field-label">{t(`loans.amountLabel`)}</span>
            <input
              id="loan-amount"
              className="input-field !mt-1.5 !w-44 !py-2.5"
              inputMode="numeric"
              placeholder={t(`loans.amountPlaceholder`)}
              value={amountInput}
              onChange={(event) => setAmountInput(event.target.value.replace(/[^\d]/g, ''))}
            />
          </label>
          <button type="submit" className="secondary-button !min-h-11 !px-4 !text-xs">{t(`loans.check`)}</button>
          {amount && (
            <button type="button" className="text-button !text-xs" onClick={() => { setAmountInput(''); setAmount('') }}>
              {t(`loans.clear`)}
            </button>
          )}
        </form>
      </div>

      <label className="mt-5 inline-flex cursor-pointer items-center gap-2 text-sm font-semibold text-ink/70" htmlFor="loan-interest-free">
        <input
          id="loan-interest-free"
          type="checkbox"
          className="h-4 w-4 accent-[#173934]"
          checked={interestFreeOnly}
          onChange={(event) => setInterestFreeOnly(event.target.checked)}
        />
        {t(`loans.interestFree`)}
      </label>

      {error && <div className="error-box mt-5" role="alert">{error}</div>}

      {visible.length === 0 ? (
        <p className="mt-6 text-sm text-ink/55">{t(`loans.empty`)}</p>
      ) : (
        <ul className="mt-6 grid gap-4 lg:grid-cols-2">
          {visible.map((option) => {
            const style = STATUS_STYLE[option.status]
            return (
              <li key={option.id} className="flex flex-col gap-4 rounded-2xl border border-ink/10 bg-cream/60 p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h3 className="font-display text-xl leading-tight">{lenderName(option)}</h3>
                    <p className="mt-1 text-xs font-semibold text-ink/50">
                      {t(`loans.type.${option.type}`)}
                      {option.focus && <> · {t(`loans.focus.${option.focus}`)}</>}
                    </p>
                  </div>
                  <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold ${style.pill}`}>
                    <style.Icon size={14} /> {t(`loans.status.${option.status}`)}
                  </span>
                </div>

                <div className="text-sm">
                  {option.indicative_amount ? (
                    <p className="font-bold text-leaf">{t(`loans.indicative`, { amount: pkr(option.indicative_amount) })}</p>
                  ) : null}
                  <p className="text-ink/60">{t(`loans.upTo`, { amount: pkr(option.criteria.max_loan) })}</p>
                </div>

                {option.missing.length > 0 && (
                  <ul className="grid gap-1.5 text-sm">
                    {option.missing.map((gap) => (
                      <li key={gap.key} className="flex items-start gap-2 text-ink/70">
                        <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-saffron" aria-hidden="true" />
                        {t(`loans.missing.${gap.key}`, {
                          have: gap.key === 'amount' ? pkr(gap.have) : gap.have,
                          need: gap.key === 'amount' ? pkr(gap.need) : gap.need,
                        })}
                      </li>
                    ))}
                  </ul>
                )}

                <p className="text-xs text-ink/55">
                  <span className="font-bold">{t(`loans.needs`)}:</span>{' '}
                  {option.documents.map((doc) => t(`loans.doc.${doc}`)).join(' · ')}
                </p>

                <div className="mt-auto flex flex-wrap items-center gap-3 border-t border-ink/10 pt-4">
                  {option.status !== 'not_yet' && (
                    <button type="button" className="primary-button !min-h-10 !px-4 !text-xs" onClick={() => setSharing(option)}>
                      <Send size={14} /> {t(`loans.share`)}
                    </button>
                  )}
                  <a className="text-button inline-flex items-center gap-1.5 !text-xs" href={option.website} target="_blank" rel="noopener noreferrer">
                    {t(`loans.website`)} <ExternalLink size={13} />
                  </a>
                </div>
              </li>
            )
          })}
        </ul>
      )}

      {shares.length > 0 && (
        <div className="mt-8">
          <h3 className="flex items-center gap-2 text-sm font-bold"><Link2 size={15} /> {t(`shares.title`)}</h3>
          <ul className="mt-3 divide-y divide-ink/10 rounded-2xl border border-ink/10">
            {shares.map((share) => (
              <li key={share.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 text-sm">
                <div>
                  <strong>{namesById[share.lender_id] || share.lender_id}</strong>
                  <span className={`ms-2 text-xs font-bold ${SHARE_STATUS_STYLE[share.status]}`}>{t(`shares.status.${share.status}`)}</span>
                  <p className="text-xs text-ink/55">
                    {share.view_count > 0 ? t(`shares.opened`, { count: share.view_count }) : t(`shares.notOpened`)}
                    {share.status === 'active' && <> · {t(`shares.until`, { date: new Date(share.expires_at).toLocaleDateString() })}</>}
                  </p>
                </div>
                {share.status === 'active' && (
                  <button type="button" className="text-button !text-xs" onClick={() => withdraw(share.id)}>{t(`shares.withdraw`)}</button>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      <p className="mt-6 flex items-start gap-2 border-t border-ink/10 pt-5 text-xs leading-5 text-ink/50">
        <Landmark size={14} className="mt-0.5 shrink-0" /> {t(`loans.caveat`)}
      </p>

      {sharing && (
        <ShareDialog
          lender={sharing}
          lenderName={lenderName(sharing)}
          onClose={() => setSharing(null)}
          onShared={load}
        />
      )}
    </section>
  )
}

function ShareDialog({ lender, lenderName, onClose, onShared }) {
  const { token } = useAuth()
  const { t } = useLanguage()
  const [agreed, setAgreed] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [created, setCreated] = useState(null)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    const onKey = (event) => { if (event.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  async function create() {
    setBusy(true)
    setError('')
    try {
      const result = await api.createShare(token, lender.id)
      setCreated({ url: `${window.location.origin}/s/${result.token}`, expiresAt: result.share.expires_at })
      onShared()
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setBusy(false)
    }
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(created.url)
      setCopied(true)
    } catch {
      // Clipboard can be blocked; the link is still selectable in the field.
      document.getElementById('share-link')?.select()
    }
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-ink/40 p-4" onClick={onClose}>
      <div
        className="card relative max-h-[90vh] w-full max-w-lg overflow-y-auto p-6 md:p-7"
        role="dialog"
        aria-modal="true"
        aria-labelledby="share-title"
        onClick={(event) => event.stopPropagation()}
      >
        <button type="button" className="icon-button absolute end-4 top-4" onClick={onClose} aria-label={t(`consent.cancel`)}>
          <X size={16} />
        </button>

        {!created ? (
          <>
            <h2 id="share-title" className="pe-10 font-display text-2xl leading-tight">{t(`consent.title`, { lender: lenderName })}</h2>
            <div className="mt-5 grid gap-4 text-sm leading-6">
              <div>
                <h3 className="font-bold text-leaf">{t(`consent.shared`)}</h3>
                <p className="text-ink/70">{t(`consent.sharedList`)}</p>
              </div>
              <div>
                <h3 className="font-bold text-coral">{t(`consent.notShared`)}</h3>
                <p className="text-ink/70">{t(`consent.notSharedList`)}</p>
              </div>
              <p className="rounded-2xl bg-ink/[0.045] p-4 text-ink/70">{t(`consent.terms`)}</p>
            </div>

            <label className="mt-5 flex cursor-pointer items-start gap-3 text-sm font-semibold" htmlFor="share-consent">
              <input
                id="share-consent"
                type="checkbox"
                className="mt-1 h-4 w-4 shrink-0 accent-[#173934]"
                checked={agreed}
                onChange={(event) => setAgreed(event.target.checked)}
                autoFocus
              />
              {t(`consent.agree`, { lender: lenderName })}
            </label>

            {error && <div className="error-box mt-4" role="alert">{error}</div>}

            <div className="mt-6 flex flex-wrap justify-end gap-3">
              <button type="button" className="text-button" onClick={onClose}>{t(`consent.cancel`)}</button>
              <button type="button" className="primary-button !min-h-11 !px-5 !text-xs" disabled={!agreed || busy} onClick={create}>
                {busy ? <LoaderCircle className="animate-spin" size={15} /> : <Link2 size={15} />} {t(`consent.create`)}
              </button>
            </div>
          </>
        ) : (
          <>
            <h2 id="share-title" className="pe-10 font-display text-2xl leading-tight">{t(`consent.ready`)}</h2>
            <p className="mt-2 text-sm text-ink/65">
              {t(`consent.readyBody`, { lender: lenderName, date: new Date(created.expiresAt).toLocaleDateString() })}
            </p>
            <label className="mt-5 block" htmlFor="share-link">
              <span className="sr-only">{t(`consent.copy`)}</span>
              <input id="share-link" className="input-field !mt-0 font-mono !text-xs" dir="ltr" readOnly value={created.url} onFocus={(event) => event.target.select()} />
            </label>
            <div className="mt-5 flex flex-wrap justify-end gap-3">
              <button type="button" className="secondary-button !min-h-11 !px-5 !text-xs" onClick={copy}>
                {copied ? <Check size={15} /> : <Copy size={15} />} {copied ? t(`consent.copied`) : t(`consent.copy`)}
              </button>
              <button type="button" className="primary-button !min-h-11 !px-5 !text-xs" onClick={onClose}>{t(`consent.done`)}</button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
