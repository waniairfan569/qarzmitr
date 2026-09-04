import { useEffect, useState } from 'react'
import { LoaderCircle } from 'lucide-react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useT } from '../i18n'

// The backend redirects here with #token=… after Google approves the sign-in.
// Reading it from the fragment keeps the token out of server logs and referrers.
function readTokenFromFragment() {
  const fragment = window.location.hash.startsWith('#') ? window.location.hash.slice(1) : ''
  return new URLSearchParams(fragment).get('token') || ''
}

export default function GoogleCallbackPage() {
  const t = useT()
  const { acceptToken, isAuthenticated } = useAuth()
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    const issued = readTokenFromFragment()
    if (!issued) {
      setFailed(true)
      return
    }
    // Clear the fragment so the token is not left sitting in the address bar.
    window.history.replaceState(null, '', window.location.pathname)
    acceptToken(issued)
  }, [acceptToken])

  if (failed) {
    return <Navigate to="/login?error=Google%20sign-in%20did%20not%20return%20a%20session." replace />
  }
  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />
  }

  return (
    <div className="grid min-h-screen place-content-center bg-paper text-center text-ink">
      <LoaderCircle className="mx-auto animate-spin text-saffron" size={34} />
      <p className="mt-4 text-sm font-bold">{t(`auth.finishingGoogle`)}</p>
    </div>
  )
}
