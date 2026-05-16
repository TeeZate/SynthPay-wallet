import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import Welcome from './pages/Welcome'
import Wallet from './pages/Wallet'
import TopUp from './pages/TopUp'
import RecoveryLogin from './pages/RecoveryLogin'
import Marketplace from './pages/Marketplace'
import Analytics from './pages/Analytics'
import Migrate from './pages/Migrate'

const Protected = ({ children }: { children: React.ReactNode }) => {
  const { user, isLoading } = useAuth()
  if (isLoading) return null
  if (!user) return <Navigate to="/" replace />
  return <>{children}</>
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Welcome />} />
          <Route path="/wallet" element={<Protected><Wallet /></Protected>} />
          <Route path="/topup" element={<Protected><TopUp /></Protected>} />
          <Route path="/marketplace" element={<Protected><Marketplace /></Protected>} />
          <Route path="/analytics"  element={<Protected><Analytics /></Protected>} />
          <Route path="/recover" element={<RecoveryLogin />} />
          <Route path="/migrate" element={<Migrate />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}