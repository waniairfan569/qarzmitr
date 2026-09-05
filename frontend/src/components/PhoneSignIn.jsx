import { useState } from 'react'
import { AlertCircle, ArrowRight, Info, LoaderCircle, Smartphone } from 'lucide-react'
import { api } from '../api/client'
import { useAuth } from '../context/AuthContext'
import { useT } from '../i18n'

/**
 * Signing in with a phone number.
 *
 * Most Pakistani shopkeepers have a phone and many have no email, so this is
 * the way in that matches the person the product is for. Name and shop name
 * are asked for on the same screen and are optional — a returning shopkeeper
 * only needs the code.
 */
export default function PhoneSignIn({ onSignedIn }) {
  const t = useT()
  const { acceptSession } = useAuth()
  const [phone, setPhone] = useState('')
  const [code, setCode] = useState('')
  const [name, setName] = useState('')
  const [shopName, setShopName] = useState('')
  const [sentTo, setSentTo] = useState('')
  const [busy, setBusy] = useState('')
  const [error, setError] = useState('')

  async function requestCode(event) {
    event.preventDefault()
    setBusy('send')
    setError('')
    try {
      await api.requestPhoneCode(phone.trim())
      setSentTo(phone.trim())
      setCode('')
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setBusy('')
    }
  }

  async function verify(event) {
    event.preventDefault()
    setBusy('verify')
    setError('')
    try {
      const session = await api.verifyPhoneCode({
        phone: sentTo,
        code: code.trim(),
        name: name.trim() || undefined,
        shop_name: shopName.trim() || undefined,
      })
      acceptSession(session)
      if (onSignedIn) onSignedIn()
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setBusy('')
    }
  }

  if (!sentTo) {
    return (
      <form className="space-y-4" onSubmit={requestCode} noValidate>
        <label className="block">
          <span className="field-label">{t(`phone.label`)}</span>
          <input
            className="input-field"
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            required
            dir="ltr"
            value={phone}
            placeholder="0300 1234567"
            onChange={(event) => setPhone(event.target.value)}
          />
        </label>
        <p className="text-xs leading-5 text-ink/55">{t(`phone.hint`)}</p>
        {error && <div className="error-box" role="alert"><AlertCircle size={17} />{error}</div>}
        <button className="primary-button w-full" type="submit" disabled={busy === 'send'}>
          {busy === 'send'
            ? <><LoaderCircle className="animate-spin" size={17} /> {t(`phone.sending`)}</>
            : <><Smartphone size={17} /> {t(`phone.send`)}</>}
        </button>
      </form>
    )
  }

  return (
    <form className="space-y-4" onSubmit={verify} noValidate>
      <p className="flex items-center justify-between gap-3 rounded-xl bg-leaf/[0.08] px-4 py-3 text-sm font-semibold text-leaf">
        {t(`phone.sentTo`, { phone: sentTo })}
        <button type="button" className="text-button" onClick={() => { setSentTo(''); setError('') }}>
          {t(`phone.change`)}
        </button>
      </p>

      <label className="block">
        <span className="field-label">{t(`phone.codeLabel`)}</span>
        <input
          className="input-field text-center font-mono text-2xl tracking-[0.4em]"
          type="text"
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={6}
          required
          dir="ltr"
          value={code}
          placeholder="••••••"
          onChange={(event) => setCode(event.target.value.replace(/\D/g, ''))}
        />
      </label>

      <details className="rounded-xl border border-ink/10 bg-cream/60 p-3">
        <summary className="cursor-pointer text-xs font-bold text-ink/65">
          {t(`phone.newHere`)}
        </summary>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <label className="block">
            <span className="field-label">{t(`phone.nameLabel`)} <span className="font-normal normal-case text-ink/40">({t(`phone.optional`)})</span></span>
            <input className="input-field" type="text" value={name} onChange={(event) => setName(event.target.value)} />
          </label>
          <label className="block">
            <span className="field-label">{t(`phone.shopLabel`)} <span className="font-normal normal-case text-ink/40">({t(`phone.optional`)})</span></span>
            <input className="input-field" type="text" value={shopName} onChange={(event) => setShopName(event.target.value)} />
          </label>
        </div>
      </details>

      {error && <div className="error-box" role="alert"><AlertCircle size={17} />{error}</div>}

      <button className="primary-button w-full" type="submit" disabled={busy === 'verify' || code.length !== 6}>
        {busy === 'verify'
          ? <><LoaderCircle className="animate-spin" size={17} /> {t(`phone.verifying`)}</>
          : <>{t(`phone.verify`)} <ArrowRight size={17} /></>}
      </button>

      <button type="button" className="text-button w-full" onClick={requestCode} disabled={busy === 'send'}>
        {t(`phone.resend`)}
      </button>

      {/* Honest about what the prototype does not do, rather than leaving
          someone waiting for an SMS that is never sent. */}
      <p className="flex items-start gap-2 text-xs leading-5 text-ink/45">
        <Info className="mt-0.5 shrink-0" size={13} /> {t(`phone.noSms`)}
      </p>
    </form>
  )
}
