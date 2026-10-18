import { createContext, useContext, useState, useEffect } from 'react'
import api, { initCsrf } from '../api/axios'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    initCsrf().then(() => {
      api.get('/auth/me')
        .then(res => setUser(res.data.user))
        .catch(() => setUser(null))
        .finally(() => setLoading(false))
    }).catch(() => {
      setUser(null)
      setLoading(false)
    })
  }, [])

  const login = async (identifier, password) => {
    await initCsrf()
    const res = await api.post('/auth/login', { email: identifier, password })
    // Si WebAuthn requis, on ne met pas encore l'utilisateur en contexte
    if (!res.data.requiresWebAuthn) {
      setUser(res.data.user)
    }
    return res.data   // Retourne tout : { user } ou { requiresWebAuthn: true }
  }

  const logout = async () => {
    try { await api.post('/auth/logout') } catch {}
    setUser(null)
    window.location.href = '/login'
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, setUser }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
