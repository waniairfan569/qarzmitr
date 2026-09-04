import { useState } from 'react'
import { AlertCircle, ArrowLeft, ArrowRight, LoaderCircle, MailCheck } from 'lucide-react'
import { Link } from 'react-router-dom'
import AuthFrame from '../components/AuthFrame'
import { api } from '../api/client'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [sent, setSent] = useState(false)
  const [loading, setLoading] = useState(false)

  async function submit(event) {
    event.preventDefault()
    setError('')
    if (!email.trim()) {
      setError('Enter the email address on your account.')
      return
    }
    setLoading(true)
    try {
      await api.forgotPassword(email.trim())
      setSent(true)
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setLoading(false)
    }
  }

  if (sent) {
    return (
      <AuthFrame eyebrow="Check your inbox" title="The link is on its way." subtitle="If an account exists for that address, you can reset it from the link we sent.">
        <div className="rounded-2xl border border-leaf/30 bg-leaf/[0.08] p-6">
          <MailCheck className="text-leaf" size={24} />
          <p className="mt-4 text-sm leading-6 text-ink/70">
            We sent a reset link to <strong className="text-ink">{email.trim()}</strong>. It expires in 30 minutes
            and can only be used once.
          </p>
          <p className="mt-3 text-xs leading-5 text-ink/50">
            Nothing arrived? Check your spam folder, or request another link — issuing a new one
            immediately cancels the previous.
          </p>
        </div>
        <button className="secondary-button mt-5 w-full" type="button" onClick={() => setSent(false)}>
          Use a different address
        </button>
        <p className="mt-7 text-center text-sm text-ink/55">
          <Link className="text-button inline-flex items-center gap-2" to="/login"><ArrowLeft size={14} /> Back to sign in</Link>
        </p>
      </AuthFrame>
    )
  }

  return (
    <AuthFrame eyebrow="Password reset" title="Let's get you back in." subtitle="Enter your email and we'll send a link to choose a new password.">
      <form className="space-y-5" onSubmit={submit} noValidate>
        <label className="block">
          <span className="field-label">Email address</span>
          <input
            className="input-field"
            type="email"
            autoComplete="email"
            required
            value={email}
            placeholder="you@shop.com"
            onChange={(event) => setEmail(event.target.value)}
          />
        </label>
        {error && <div className="error-box" role="alert"><AlertCircle size={17} />{error}</div>}
        <button className="primary-button w-full" type="submit" disabled={loading}>
          {loading ? <><LoaderCircle className="animate-spin" size={17} /> Sending…</> : <>Send reset link <ArrowRight size={17} /></>}
        </button>
      </form>
      <p className="mt-7 text-center text-sm text-ink/55">
        Remembered it? <Link className="font-bold text-leaf underline decoration-saffron decoration-2 underline-offset-4" to="/login">Sign in</Link>
      </p>
    </AuthFrame>
  )
}
