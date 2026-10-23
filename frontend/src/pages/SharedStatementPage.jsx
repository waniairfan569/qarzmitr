import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { AlertTriangle, Download, EyeOff, LoaderCircle } from 'lucide-react'
import { api } from '../api/client'
import BrandMark from '../components/BrandMark'
import LanguageToggle from '../components/LanguageToggle'
import StatementView from '../components/StatementView'
import { useLanguage } from '../i18n'

/** What a lender sees when they open a link a shopkeeper sent them. No sign-in. */
export default function SharedStatementPage() {
  const { token } = useParams()
  const { t, isUrdu } = useLanguage()
  const [data, setData] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false
    api.sharedStatement(token)
      .then((result) => { if (!cancelled) setData(result) })
      .catch((requestError) => { if (!cancelled) setError(requestError.message) })
    return () => { cancelled = true }
  }, [token])

  const lenderName = data?.shared_for ? (isUrdu ? data.shared_for.name_ur : data.shared_for.name) : ''

  return (
    <div className="min-h-screen bg-paper text-ink">
      <div className="paper-grid fixed inset-0 pointer-events-none opacity-50" aria-hidden="true" />
      <header className="no-print sticky top-0 z-30 border-b border-ink/10 bg-paper/90 backdrop-blur-xl">
        <div className="mx-auto flex items-center justify-between px-5 py-4 md:px-10">
          <BrandMark />
          <div className="flex items-center gap-3">
            <LanguageToggle />
            {data?.latestScore && (
              <button type="button" className="secondary-button !min-h-10 !px-4 !text-xs" onClick={() => window.print()}>
                <Download size={15} /> {t(`lender.download`)}
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="relative mx-auto px-5 pb-16 pt-8 md:px-10 md:pt-12">
        {!data && !error && (
          <div className="grid min-h-[50vh] place-content-center text-center">
            <LoaderCircle className="mx-auto animate-spin text-saffron" size={34} />
            <p className="mt-4 text-sm font-bold">{t(`lender.preparing`)}</p>
          </div>
        )}

        {error && (
          <section className="card mx-auto mt-6 max-w-xl p-8 text-center">
            <AlertTriangle className="mx-auto text-coral" size={30} />
            <p className="mt-4 font-display text-2xl">{t(`shared.goneTitle`)}</p>
            <p className="mt-2 text-sm text-ink/60">{t(`shared.goneBody`)}</p>
          </section>
        )}

        {data && (
          <StatementView
            data={data}
            owner={data.owner}
            notice={(
              <p className="mt-4 inline-flex flex-wrap items-center gap-x-2 gap-y-1 rounded-2xl bg-leaf/10 px-4 py-2.5 text-xs font-semibold leading-5 text-leaf">
                <EyeOff size={14} />
                {t(`shared.notice`, { lender: lenderName, date: new Date(data.expires_at).toLocaleDateString() })}
              </p>
            )}
          />
        )}
      </main>
    </div>
  )
}
