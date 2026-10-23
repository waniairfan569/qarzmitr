import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { AlertTriangle, ArrowLeft, Download, LoaderCircle } from 'lucide-react'
import { api } from '../api/client'
import AppShell from '../components/AppShell'
import StatementView from '../components/StatementView'
import { useAuth } from '../context/AuthContext'
import { useT } from '../i18n'

export default function LenderPage() {
  const { token, user, logout } = useAuth()
  const t = useT()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    setError('')
    try {
      setData(await api.dashboard(token))
    } catch (requestError) {
      if (requestError.status === 401) logout()
      else setError(requestError.message)
    } finally {
      setLoading(false)
    }
  }, [logout, token])

  useEffect(() => {
    load()
  }, [load])

  if (loading) {
    return (
      <div className="grid min-h-screen place-content-center bg-paper text-center text-ink">
        <LoaderCircle className="mx-auto animate-spin text-saffron" size={34} />
        <p className="mt-4 text-sm font-bold">{t(`lender.preparing`)}</p>
      </div>
    )
  }

  return (
    <AppShell>
      <div className="mx-auto w-full">
        <div className="no-print flex flex-wrap items-center justify-between gap-4">
          <Link className="text-button inline-flex items-center gap-2" to="/dashboard/loans">
            <ArrowLeft size={15} /> {t(`lender.back`)}
          </Link>
          {data?.latestScore && (
            <div className="text-end">
              <button type="button" className="primary-button !min-h-11 !px-5 !text-xs" onClick={() => window.print()}>
                <Download size={15} /> {t(`lender.download`)}
              </button>
              <p className="mt-1.5 max-w-xs text-xs leading-5 text-ink/50">{t(`lender.downloadHint`)}</p>
            </div>
          )}
        </div>

        {error && (
          <div className="error-box mt-6" role="alert">
            <AlertTriangle size={17} /> {error}
          </div>
        )}

        <StatementView data={data} owner={user} />
      </div>
    </AppShell>
  )
}
