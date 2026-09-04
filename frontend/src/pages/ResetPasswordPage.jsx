import { useState } from 'react'
import { AlertCircle, ArrowRight, LoaderCircle, ShieldCheck } from 'lucide-react'
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom'
import AuthFrame from '../components/AuthFrame'
import { useAuth } from '../context/AuthContext'

export default function ResetPasswordPage() {
  const { resetPassword, isAuthenticated } = useAuth()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const resetToken = searchParams.get('token') || ''
  const [form, setForm] = useState({ password: '', confirm: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  if (isAuthenticated) return <Navigate to="/dashboard" replace />

  async function submit(event) {
    event.preventDefault()
    setError('')
    if (form.password.length < 8) {
      setError('Choose a password of at least 8 characters.')
      return
    }
    if (form.password !== form.confirm) {
      setError('Both passwords must match.')
      return
    }
    setLoading(true)
    try {
      await resetPassword(resetToken, form.password)
      navigate('/dashboard', { replace: true })
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setLoading(false)
    }
  }

  if (!resetToken) {
    return (
      <AuthFrame eyebrow="Password reset" title="This link is incomplete." subtitle="Reset links can only be opened from the email they were sent to.">
        <div className="error-box" role="alert">
          <AlertCircle size={17} /> No reset token was found in this link.
        </div>
        <Link className="primary-button mt-6 w-full" to="/forgot-password">Request a new link</Link>
      </AuthFrame>
    )
  }

  return (
    <AuthFrame eyebrow="Password reset" title="Choose a new password." subtitle="Once it's saved you'll be signed in on this device.">
      <form className="space-y-5" onSubmit={submit} noValidate>
        <Field
          label="New password"
          autoComplete="new-password"
          value={form.password}
          placeholder="At least 8 characters"
          onChange={(value) => setForm({ ...form, password: value })}
        />
        <Field
          label="Confirm new password"
          autoComplete="new-password"
          value={form.confirm}
          placeholder="Type it once more"
          onChange={(value) => setForm({ ...form, confirm: value })}
        />
        <p className="flex items-start gap-2.5 rounded-xl bg-ink/[0.045] p-3.5 text-xs leading-5 text-ink/55">
          <ShieldCheck className="mt-0.5 shrink-0 text-leaf" size={15} />
          Saving a new password signs out every other device currently using this account.
        </p>
        {error && <div className="error-box" role="alert"><AlertCircle size={17} />{error}</div>}
        <button className="primary-button w-full" type="submit" disabled={loading}>
          {loading ? <><LoaderCircle className="animate-spin" size={17} /> Saving…</> : <>Save and sign in <ArrowRight size={17} /></>}
        </button>
      </form>
      <p className="mt-7 text-center text-sm text-ink/55">
        Link expired? <Link className="font-bold text-leaf underline decoration-saffron decoration-2 underline-offset-4" to="/forgot-password">Request a new one</Link>
      </p>
    </AuthFrame>
  )
}

function Field({ label, onChange, ...props }) {
  return (
    <label className="block">
      <span className="field-label">{label}</span>
      <input className="input-field" type="password" required onChange={(event) => onChange(event.target.value)} {...props} />
    </label>
  )
}
