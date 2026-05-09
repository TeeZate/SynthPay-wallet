import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { analytics } from '../lib/analytics'

interface User {
  user_id:    string
  balance:    number
  reputation: string
}

interface AuthContextType {
  user:      User | null
  token:     string | null
  login:     (user: User, token: string) => void
  logout:    () => void
  setUser:   (user: User) => void
  isLoading: boolean
}

const AuthContext = createContext<AuthContextType | null>(null)

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user,      setUserState] = useState<User | null>(null)
  const [token,     setToken]     = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const stored      = localStorage.getItem('synthpay_user')
    const storedToken = localStorage.getItem('synthpay_user_token')
    if (stored && storedToken) {
      setUserState(JSON.parse(stored))
      setToken(storedToken)
    }
    setIsLoading(false)
  }, [])

  const login = (user: User, token: string) => {
    setUserState(user)
    setToken(token)
    localStorage.setItem('synthpay_user',       JSON.stringify(user))
    localStorage.setItem('synthpay_user_token', token)
    analytics.identify(user.user_id, { reputation: user.reputation })
    analytics.track('wallet_login')
  }

  const logout = () => {
    analytics.track('wallet_logout')
    analytics.reset()
    setUserState(null)
    setToken(null)
    localStorage.removeItem('synthpay_user')
    localStorage.removeItem('synthpay_user_token')
  }

  const setUser = (user: User) => {
    setUserState(user)
    localStorage.setItem('synthpay_user', JSON.stringify(user))
  }

  return (
    <AuthContext.Provider value={{ user, token, login, logout, setUser, isLoading }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}