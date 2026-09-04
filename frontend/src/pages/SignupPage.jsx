import { useState } from 'react'
import { AlertCircle, ArrowRight, LoaderCircle } from 'lucide-react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import AuthFrame from '../components/AuthFrame'
import GoogleButton from '../components/GoogleButton'
import { useAuth } from '../context/AuthContext'

const EMPTY_FORM = { name: '', shop_name: '', email: '', password: '' }

export default function SignupPage() {
  const { signup, isAuthenticated } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState(EMPTY_FORM)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  if (isAuthenticated) return <Navigate to="/dashboard" replace />

  function update(field, value) {
    setForm((current) => ({ ...current, [field]: value }))
  }

  async function submit(event) {
    event.preventDefault()
    setError('')
    if (!form.name.trim() || !form.email.trim() || !form.password) {
      setError('Name, email, and password are required.')
      return
    }
    if (!/^\S+@\S+\.\S+$/.test(form.email)) {
      setError('Enter a valid email address.')
      return
    }
    if (form.password.length < 8) {
      setError('Password must be at least 8 characters.')
      return
    }
    setLoading(true)
    try {
      await signup({
        name: form.name.trim(),
        shop_name: form.shop_name.trim(),
        email: form.email.trim(),
        password: form.password,
      })
      navigate('/dashboard', { replace: true })
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthFrame eyebrow="Create your profile" title="Begin with what you already have." subtitle="A shop identity and one ledger photo are enough to get started.">
      <div className="mb-6 space-y-4"><GoogleButton label="Sign up with Google" /></div>
      <form className="space-y-4" onSubmit={submit} noValidate>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Your name" value={form.name} onChange={(value) => update('name', value)} autoComplete="name" placeholder="Ayesha Khan" />
          <Field label="Shop name" value={form.shop_name} onChange={(value) => update('shop_name', value)} autoComplete="organization" placeholder="Ayesha General Store" />
        </div>
        <Field label="Email address" type="email" value={form.email} onChange={(value) => update('email', value)} autoComplete="email" placeholder="you@shop.com" />
        <Field label="Password" type="password" value={form.password} onChange={(value) => update('password', value)} autoComplete="new-password" placeholder="8–72 characters" />
        {error && <div className="error-box" role="alert"><AlertCircle size={17} />{error}</div>}
        <button className="primary-button w-full" type="submit" disabled={loading}>
          {loading ? <><LoaderCircle className="animate-spin" size={17} /> Creating profile…</> : <>Create account <ArrowRight size={17} /></>}
        </button>
      </form>
      <p className="mt-7 text-center text-sm text-ink/55">Already have an account? <Link className="font-bold text-leaf underline decoration-saffron decoration-2 underline-offset-4" to="/login">Sign in</Link></p>
    </AuthFrame>
  )
}

function Field({ label, onChange, ...props }) {
  return <label className="block"><span className="field-label">{label}</span><input className="input-field" required onChange={(event) => onChange(event.target.value)} {...props} /></label>
}
