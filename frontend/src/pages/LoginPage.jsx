import { useState } from 'react'
import { ArrowRight, AlertCircle, KeyRound, LoaderCircle } from 'lucide-react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import AuthFrame from '../components/AuthFrame'
import { useT } from '../i18n'
import GoogleButton from '../components/GoogleButton'
import { useAuth } from '../context/AuthContext'

const DEMO_CREDENTIALS = { email: 'demo@qarzmitr.com', password: 'Demo1234!' }

export default function LoginPage() {
  const { login, isAuthenticated } = useAuth()
  const navigate = useNavigate()
  const t = useT()
  const location = useLocation()
  const [form, setForm] = useState({ email: '', password: '' })
  // A failed Google redirect comes back as ?error=… on this page.
  const [error, setError] = useState(() => new URLSearchParams(window.location.search).get('error') || '')
  const [loading, setLoading] = useState(false)

  if (isAuthenticated) return <Navigate to="/dashboard" replace />

  function fillDemoCredentials() {
    setForm(DEMO_CREDENTIALS)
    setError('')
  }

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
      <aside className="mb-6 rounded-2xl border border-saffron/35 bg-saffron/[0.09] p-4" aria-label="Demo account credentials">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-sm font-bold text-ink"><KeyRound className="text-saffron-dark" size={17} /> {t(`auth.tryDemo`)}</div>
            <p className="mt-1 text-xs leading-5 text-ink/55">{t(`auth.demoHint`)}</p>
          </div>
          <button className="shrink-0 rounded-lg border border-ink/15 bg-cream px-3 py-2 text-[11px] font-bold text-leaf transition hover:-translate-y-0.5 hover:border-leaf/40" type="button" onClick={fillDemoCredentials}>
            {t(`auth.fillDemo`)}
          </button>
        </div>
        <dl className="mt-3 grid gap-2 rounded-xl bg-ink/[0.045] p-3 text-xs sm:grid-cols-2">
          <div><dt className="text-[9px] font-bold uppercase tracking-[0.16em] text-ink/40">Email</dt><dd className="mt-1 font-semibold text-ink">demo@qarzmitr.com</dd></div>
          <div><dt className="text-[9px] font-bold uppercase tracking-[0.16em] text-ink/40">Password</dt><dd className="mt-1 font-semibold text-ink">Demo1234!</dd></div>
        </dl>
      </aside>
      <div className="mb-6 space-y-4"><GoogleButton label="Sign in with Google" /></div>
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
    </AuthFrame>
  )
}

function Field({ label, onChange, ...props }) {
  return <label className="block"><span className="field-label">{label}</span><input className="input-field" required onChange={(event) => onChange(event.target.value)} {...props} /></label>
}
