import { Navigate, Outlet, Route, Routes, useLocation } from 'react-router-dom'
import { LoaderCircle } from 'lucide-react'
import { useAuth } from './context/AuthContext'
import DashboardPage from './pages/DashboardPage'
import ForgotPasswordPage from './pages/ForgotPasswordPage'
import GoogleCallbackPage from './pages/GoogleCallbackPage'
import LenderPage from './pages/LenderPage'
import LoginPage from './pages/LoginPage'
import ResetPasswordPage from './pages/ResetPasswordPage'
import OverviewPage from './pages/OverviewPage'
import SignupPage from './pages/SignupPage'

function ProtectedRoute() {
  const { isAuthenticated, restoring } = useAuth()
  const location = useLocation()

  if (restoring) {
    return <div className="grid min-h-screen place-content-center bg-paper text-center text-ink"><LoaderCircle className="mx-auto animate-spin text-saffron" size={34} /><p className="mt-4 text-sm font-bold">Restoring your session…</p></div>
  }
  if (!isAuthenticated) return <Navigate to="/login" replace state={{ from: location }} />
  return <Outlet />
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/signup" element={<SignupPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/reset-password" element={<ResetPasswordPage />} />
      <Route path="/auth/google" element={<GoogleCallbackPage />} />
      <Route element={<ProtectedRoute />}>
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/lender" element={<LenderPage />} />
        <Route path="/overview" element={<OverviewPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  )
}
