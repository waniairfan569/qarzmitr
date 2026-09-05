import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { api } from '../api/client'

const TOKEN_KEY = 'qarzmitr_token'
const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem(TOKEN_KEY))
  const [user, setUser] = useState(null)
  const [restoring, setRestoring] = useState(Boolean(token))

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY)
    setToken(null)
    setUser(null)
    setRestoring(false)
  }, [])

  const acceptSession = useCallback((session) => {
    localStorage.setItem(TOKEN_KEY, session.token)
    setToken(session.token)
    setUser(session.user)
  }, [])

  const login = useCallback(async (credentials) => {
    const session = await api.login(credentials)
    acceptSession(session)
    return session
  }, [acceptSession])

  const signup = useCallback(async (details) => {
    const session = await api.signup(details)
    acceptSession(session)
    return session
  }, [acceptSession])

  const resetPassword = useCallback(async (resetToken, password) => {
    const session = await api.resetPassword(resetToken, password)
    acceptSession(session)
    return session
  }, [acceptSession])

  // Google sign-in hands the token back in the callback URL fragment; the
  // profile is then fetched by the restore effect below.
  const acceptToken = useCallback((issuedToken) => {
    localStorage.setItem(TOKEN_KEY, issuedToken)
    setToken(issuedToken)
    setUser(null)
  }, [])

  useEffect(() => {
    if (!token || user) {
      setRestoring(false)
      return
    }

    let active = true
    setRestoring(true)
    api.me(token)
      .then(({ user: restoredUser }) => {
        if (active) setUser(restoredUser)
      })
      .catch((error) => {
        if (active && error.status === 401) logout()
      })
      .finally(() => {
        if (active) setRestoring(false)
      })

    return () => {
      active = false
    }
  }, [logout, token, user])

  const value = useMemo(() => ({
    token,
    user,
    restoring,
    isAuthenticated: Boolean(token && user),
    login,
    signup,
    logout,
    resetPassword,
    acceptToken,
    acceptSession,
  }), [token, user, restoring, login, signup, logout, resetPassword, acceptToken, acceptSession])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used inside AuthProvider.')
  return context
}
