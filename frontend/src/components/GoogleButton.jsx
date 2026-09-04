import { useEffect, useState } from 'react'
import { api, GOOGLE_SIGN_IN_URL } from '../api/client'

function GoogleGlyph() {
  return (
    <svg width="17" height="17" viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#4285F4" d="M45.1 24.5c0-1.6-.1-3.1-.4-4.5H24v8.5h11.8c-.5 2.7-2 5-4.4 6.6v5.5h7.1c4.1-3.8 6.6-9.4 6.6-16.1z" />
      <path fill="#34A853" d="M24 46c5.9 0 10.9-2 14.5-5.4l-7.1-5.5c-2 1.3-4.5 2.1-7.4 2.1-5.7 0-10.5-3.8-12.2-9H4.5v5.7C8.1 41.1 15.4 46 24 46z" />
      <path fill="#FBBC05" d="M11.8 28.2c-.4-1.3-.7-2.7-.7-4.2s.2-2.9.7-4.2v-5.7H4.5C2.9 17.2 2 20.5 2 24s.9 6.8 2.5 9.9l7.3-5.7z" />
      <path fill="#EA4335" d="M24 10.8c3.2 0 6.1 1.1 8.4 3.3l6.3-6.3C34.9 4.2 29.9 2 24 2 15.4 2 8.1 6.9 4.5 14.1l7.3 5.7c1.7-5.2 6.5-9 12.2-9z" />
    </svg>
  )
}

export default function GoogleButton({ label = 'Continue with Google' }) {
  const [available, setAvailable] = useState(null)

  useEffect(() => {
    let active = true
    api.providers()
      .then(({ google }) => { if (active) setAvailable(Boolean(google)) })
      .catch(() => { if (active) setAvailable(false) })
    return () => { active = false }
  }, [])

  // Hidden entirely rather than shown broken when the server has no Google credentials.
  if (!available) return null

  return (
    <>
      <a
        className="flex min-h-12 w-full items-center justify-center gap-3 rounded-xl border border-ink/15 bg-cream px-4 text-sm font-bold text-ink transition hover:-translate-y-0.5 hover:border-ink/30"
        href={GOOGLE_SIGN_IN_URL}
      >
        <GoogleGlyph /> {label}
      </a>
      <div className="flex items-center gap-4 text-[10px] font-bold uppercase tracking-[0.18em] text-ink/35">
        <span className="h-px flex-1 bg-ink/10" /> or <span className="h-px flex-1 bg-ink/10" />
      </div>
    </>
  )
}
