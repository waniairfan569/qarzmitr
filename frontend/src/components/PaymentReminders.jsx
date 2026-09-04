import { useCallback, useEffect, useState } from 'react'
import { AlertTriangle, Check, Copy, LoaderCircle, MessageSquareText } from 'lucide-react'
import { api } from '../api/client'
import { useMoney, useT } from '../i18n'
import ListenButton from './ListenButton'
import { useAuth } from '../context/AuthContext'

const TONE_STYLES = {
  gentle: 'bg-leaf/10 text-leaf',
  firm: 'bg-saffron/15 text-saffron-dark',
  urgent: 'bg-coral/10 text-coral',
}

export default function PaymentReminders({ refreshKey }) {
  const t = useT()
  const pkr = useMoney()
  const { token } = useAuth()
  const [reminders, setReminders] = useState([])
  const [language, setLanguage] = useState('urdu')
  const [copied, setCopied] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    setError('')
    try {
      const result = await api.reminders(token)
      setReminders(result.reminders || [])
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setLoading(false)
    }
  }, [token])

  useEffect(() => {
    load()
  }, [load, refreshKey])

  async function copyMessage(reminder) {
    const text = language === 'urdu' ? reminder.message_urdu : reminder.message_english
    try {
      await navigator.clipboard.writeText(text)
      setCopied(reminder.name)
      setTimeout(() => setCopied(''), 2200)
    } catch {
      setError(t(`rem.copyError`))
    }
  }

  if (loading) {
    return (
      <section className="card p-6 md:p-8">
        <div className="flex items-center gap-3 text-sm font-bold text-ink/55">
          <LoaderCircle className="animate-spin text-saffron" size={18} /> {t(`rem.preparing`)}
        </div>
      </section>
    )
  }

  return (
    <section className="card p-6 md:p-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="section-kicker">{t(`rem.kicker`)}</div>
          <h2 className="mt-2 font-display text-3xl">{t(`rem.title`)}</h2>
          <p className="mt-2 max-w-lg text-sm leading-6 text-ink/60">
            {t(`rem.body`)}
          </p>
        </div>
        {reminders.length > 0 && (
          <div className="flex gap-1 rounded-full bg-ink/[0.06] p-1" role="group" aria-label="Message language">
            <button
              type="button"
              className={`rounded-full px-4 py-2 text-xs font-bold transition ${language === 'urdu' ? 'bg-ink text-paper' : 'text-ink/60 hover:text-ink'}`}
              aria-pressed={language === 'urdu'}
              onClick={() => setLanguage('urdu')}
            >
              اردو
            </button>
            <button
              type="button"
              className={`rounded-full px-4 py-2 text-xs font-bold transition ${language === 'english' ? 'bg-ink text-paper' : 'text-ink/60 hover:text-ink'}`}
              aria-pressed={language === 'english'}
              onClick={() => setLanguage('english')}
            >
              English
            </button>
          </div>
        )}
      </div>

      {error && <div className="error-box mt-6" role="alert"><AlertTriangle size={17} />{error}</div>}

      {reminders.length === 0 && !error && (
        <div className="mt-7 rounded-2xl border border-dashed border-leaf/35 bg-leaf/[0.06] p-8 text-center">
          <Check className="mx-auto text-leaf" size={26} />
          <p className="mt-3 font-display text-xl">{t(`rem.emptyTitle`)}</p>
          <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-ink/55">
            {t(`rem.emptyBody`)}
          </p>
        </div>
      )}

      {reminders.length > 0 && (
        <ul className="mt-7 flex flex-col gap-4">
          {reminders.map((reminder) => (
            <li key={reminder.name} className="rounded-2xl border border-ink/10 bg-cream/60 p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-3">
                  <strong className="text-base text-ink">{reminder.name}</strong>
                  <span className={`rounded-full px-3 py-1 text-[11px] font-bold ${TONE_STYLES[reminder.tone]}`}>
                    {t(`rem.tone.${reminder.tone}`)}
                  </span>
                  <span className="text-xs text-ink/50">
                    {pkr(reminder.outstanding)}
                    {reminder.days_outstanding !== null ? ` · ${t(`udhaar.days`, { days: reminder.days_outstanding })}` : ''}
                  </span>
                </div>
                <div className="flex shrink-0 gap-2">
                  {language === 'urdu' && <ListenButton text={reminder.message_urdu} label={t(`explain.listen`)} />}
                  <button type="button" className="secondary-button !min-h-10 !px-4 !text-xs" onClick={() => copyMessage(reminder)}>
                    {copied === reminder.name
                      ? <><Check size={14} /> {t(`rem.copied`)}</>
                      : <><Copy size={14} /> {t(`rem.copy`)}</>}
                  </button>
                </div>
              </div>

              <p
                className={`mt-4 whitespace-pre-line rounded-xl bg-paper/70 p-4 text-sm leading-7 text-ink/80 ${language === 'urdu' ? 'urdu-text text-base leading-[2.1]' : ''}`}
                dir={language === 'urdu' ? 'rtl' : 'ltr'}
                lang={language === 'urdu' ? 'ur' : 'en'}
              >
                {language === 'urdu' ? reminder.message_urdu : reminder.message_english}
              </p>
            </li>
          ))}
        </ul>
      )}

      <p className="mt-6 flex items-start gap-2.5 border-t border-ink/10 pt-5 text-xs leading-5 text-ink/55">
        <MessageSquareText className="mt-0.5 shrink-0 text-saffron-dark" size={15} />
        {t(`rem.note`)}
      </p>
    </section>
  )
}
