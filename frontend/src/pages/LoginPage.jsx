import { useState } from 'react'
import { ArrowRight, AlertCircle, LoaderCircle } from 'lucide-react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import AuthFrame from '../components/AuthFrame'
import { useT } from '../i18n'
import GoogleButton from '../components/GoogleButton'
import PhoneSignIn from '../components/PhoneSignIn'
import { useAuth } from '../context/AuthContext'


export default function LoginPage() {
  const { login, isAuthenticated } = useAuth()
  const navigate = useNavigate()
  const t = useT()
  const location = useLocation()
  const [method, setMethod] = useState('phone')
  const [form, setForm] = useState({ email: '', password: '' })
  // A failed Google redirect comes back as ?error=… on this page.
  const [error, setError] = useState(() => new URLSearchParams(window.location.search).get('error') || '')
  const [loading, setLoading] = useState(false)

  if (isAuthenticated) return <Navigate to="/dashboard" replace />

  async function submit(event) {
    event.preventDefault()
    setError('')
    if (!form.email.trim() || !form.password) {
      setError('Enter your email and password.')
      return
    }
    setLoading(true)
    try {
      await login({ email: form.email.trim(), password: form.password })
      navigate(location.state?.from?.pathname || '/dashboard', { replace: true })
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthFrame eyebrow={t(`auth.welcomeBack`)} title={t(`auth.openRecord`)} subtitle="">
      <div className="mb-6 space-y-4"><GoogleButton label="Sign in with Google" /></div>

      <div className="mb-5 flex gap-1 rounded-full bg-ink/[0.06] p-1" role="group" aria-label={t(`phone.label`)}>
        {['phone', 'email'].map((option) => (
          <button
            key={option}
            type="button"
            aria-pressed={method === option}
            className={`flex-1 rounded-full px-4 py-2.5 text-xs font-bold transition ${
              method === option ? 'bg-ink text-paper' : 'text-ink/60 hover:text-ink'
            }`}
            onClick={() => { setMethod(option); setError('') }}
          >
            {option === 'phone' ? t(`phone.tab`) : t(`phone.emailTab`)}
          </button>
        ))}
      </div>

      {method === 'phone' && (
        <PhoneSignIn onSignedIn={() => navigate(location.state?.from?.pathname || '/dashboard', { replace: true })} />
      )}

      {method === 'email' && (
      <>
      <form className="space-y-5" onSubmit={submit} noValidate>
        <Field label={t(`auth.email`)} type="email" autoComplete="email" value={form.email} onChange={(value) => setForm({ ...form, email: value })} placeholder="you@shop.com" />
        <Field label={t(`auth.password`)} type="password" autoComplete="current-password" value={form.password} onChange={(value) => setForm({ ...form, password: value })} placeholder="At least 8 characters" />
        <div className="flex justify-end -mt-2">
          <Link className="text-button" to="/forgot-password">{t(`auth.forgot`)}</Link>
        </div>
        {error && <div className="error-box" role="alert"><AlertCircle size={17} />{error}</div>}
        <button className="primary-button w-full" type="submit" disabled={loading}>
          {loading ? <><LoaderCircle className="animate-spin" size={17} /> {t(`auth.signingIn`)}</> : <>{t(`auth.signIn`)} <ArrowRight size={17} /></>}
        </button>
      </form>
      <p className="mt-7 text-center text-sm text-ink/55">{t(`auth.newHere`)} <Link className="font-bold text-leaf underline decoration-saffron decoration-2 underline-offset-4" to="/signup">{t(`auth.createAccount`)}</Link></p>
        </>
      )}
    </AuthFrame>
  )
}

function Field({ label, onChange, ...props }) {
  return <label className="block"><span className="field-label">{label}</span><input className="input-field" required onChange={(event) => onChange(event.target.value)} {...props} /></label>
}
