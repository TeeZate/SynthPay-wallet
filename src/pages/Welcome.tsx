import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { walletApi } from '../lib/api'
// @ts-ignore
import { startRegistration, startAuthentication } from '@simplewebauthn/browser'

export default function Welcome() {
  const [loading, setLoading] = useState(false)
  const [status,  setStatus]  = useState('')
  const [error,   setError]   = useState('')
  const { login } = useAuth()
  const navigate  = useNavigate()

  const handleRegister = async () => {
    setLoading(true)
    setError('')
    setStatus('Requesting challenge...')

    try {
      const beginRes = await walletApi.registerBegin()
      const { options, temp_user_id } = beginRes.data
      setStatus('Waiting for biometric...')

      const credential = await startRegistration(options)
      setStatus('Verifying...')

      const completeRes = await walletApi.registerComplete(credential, temp_user_id)
      const { user_id, balance, token } = completeRes.data

      login({ user_id, balance, reputation: 'new' }, token)
      navigate('/wallet')
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || 'Registration failed')
      setStatus('')
    } finally {
      setLoading(false)
    }
  }

  const handleLogin = async () => {
    setLoading(true)
    setError('')
    setStatus('Requesting challenge...')

    try {
      const beginRes = await walletApi.loginBegin()
      const { options } = beginRes.data
      setStatus('Waiting for biometric...')

      const credential = await startAuthentication(options)
      setStatus('Verifying...')

      const completeRes = await walletApi.loginComplete(credential)
      const { user_id, balance, token } = completeRes.data

      login({ user_id, balance, reputation: 'new' }, token)
      navigate('/wallet')
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || 'Login failed')
      setStatus('')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4"
         style={{ background: '#03030a' }}>
      <div className="w-full max-w-sm">

        {/* Logo */}
        <div className="text-center mb-16">
          <div className="w-16 h-16 rounded-2xl mx-auto mb-6 flex items-center justify-center"
               style={{ background: 'linear-gradient(135deg, #00e5ff22, #00e5ff11)',
                        border: '1px solid #00e5ff33' }}>
            <span style={{ fontSize: 28 }}>⚡</span>
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">SynthPay</h1>
          <p className="text-sm" style={{ color: '#64748b' }}>
            Pay any API. Any price. One tap.
          </p>
        </div>

        {/* Buttons */}
        <div className="space-y-3">
          <button
            onClick={handleRegister}
            disabled={loading}
            className="w-full py-4 rounded-2xl font-semibold text-sm transition-all"
            style={{
              background: '#00e5ff',
              color:      '#03030a',
              opacity:    loading ? 0.5 : 1
            }}>
            Create Wallet with Face ID
          </button>

          <button
            onClick={handleLogin}
            disabled={loading}
            className="w-full py-4 rounded-2xl font-semibold text-sm transition-all"
            style={{
              background: 'transparent',
              color:      '#e2e8f0',
              border:     '1px solid #1a1a2e',
              opacity:    loading ? 0.5 : 1
            }}>
            Sign in with Passkey
          </button>
        </div>

        {/* Status */}
        {status && (
          <p className="text-center text-xs mt-6"
             style={{ color: '#00e5ff', fontFamily: 'monospace' }}>
            {status}
          </p>
        )}

        {error && (
          <p className="text-center text-xs mt-4"
             style={{ color: '#ef4444' }}>
            {error}
          </p>
        )}

        <p className="text-center text-xs mt-8"
           style={{ color: '#334155' }}>
          No password. No email. Just your device.
        </p>
      </div>
    </div>
  )
}