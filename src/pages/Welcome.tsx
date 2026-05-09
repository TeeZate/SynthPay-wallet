import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { walletApi } from '../lib/api'
// @ts-ignore
import { startRegistration, startAuthentication } from '@simplewebauthn/browser'

type Step = 'idle' | 'challenge' | 'biometric' | 'verifying'

export default function Welcome() {
  const [loading, setLoading] = useState(false)
  const [step,    setStep]    = useState<Step>('idle')
  const [error,   setError]   = useState('')
  const { login } = useAuth()
  const navigate  = useNavigate()

  const statusText: Record<Step, string> = {
    idle:      '',
    challenge: 'Preparing secure challenge...',
    biometric: 'Waiting for Face ID / fingerprint...',
    verifying: 'Verifying with server...',
  }

  const handleRegister = async () => {
    setLoading(true); setError('')
    try {
      setStep('challenge')
      const beginRes = await walletApi.registerBegin()
      const { options, temp_user_id } = beginRes.data

      setStep('biometric')
      const credential = await startRegistration(options)

      setStep('verifying')
      const completeRes = await walletApi.registerComplete(credential, temp_user_id)
      const { user_id, balance, token } = completeRes.data

      login({ user_id, balance, reputation: 'new' }, token)
      navigate('/wallet')
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || 'Registration failed. Please try again.')
    } finally {
      setLoading(false); setStep('idle')
    }
  }

  const handleLogin = async () => {
    setLoading(true); setError('')
    try {
      setStep('challenge')
      const beginRes = await walletApi.loginBegin()
      const { options } = beginRes.data

      setStep('biometric')
      const credential = await startAuthentication(options)

      setStep('verifying')
      const completeRes = await walletApi.loginComplete(credential)
      const { user_id, balance, token } = completeRes.data

      login({ user_id, balance, reputation: 'new' }, token)
      navigate('/wallet')
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || 'Login failed. Please try again.')
    } finally {
      setLoading(false); setStep('idle')
    }
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: '#03030a',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px 20px',
    }}>

      {/* Background glow */}
      <div style={{
        position: 'fixed', top: '20%', left: '50%',
        transform: 'translateX(-50%)',
        width: 400, height: 400,
        background: 'radial-gradient(circle, rgba(0,229,255,0.06) 0%, transparent 70%)',
        pointerEvents: 'none'
      }} />

      <div style={{ width: '100%', maxWidth: 360, position: 'relative', zIndex: 1 }}>

        {/* Logo mark */}
        <div style={{ textAlign: 'center', marginBottom: 48 }}>
          <div style={{
            width: 72, height: 72,
            borderRadius: 20,
            margin: '0 auto 20px',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'linear-gradient(135deg, rgba(0,229,255,0.15), rgba(0,229,255,0.05))',
            border: '1px solid rgba(0,229,255,0.2)',
          }}>
            <span style={{ fontSize: 32 }}>⚡</span>
          </div>
          <h1 style={{
            fontSize: 28, fontWeight: 800,
            color: '#e2e8f0', marginBottom: 8,
            fontFamily: 'system-ui, sans-serif'
          }}>SynthPay</h1>
          <p style={{ fontSize: 14, color: '#64748b', lineHeight: 1.5 }}>
            Pay any API. Any price.<br />One biometric tap.
          </p>
        </div>

        {/* Main actions */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <button
            onClick={handleRegister}
            disabled={loading}
            style={{
              width: '100%',
              padding: '16px 24px',
              borderRadius: 16,
              border: 'none',
              background: loading ? 'rgba(0,229,255,0.4)' : '#00e5ff',
              color: '#03030a',
              fontSize: 15,
              fontWeight: 700,
              cursor: loading ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 10,
              transition: 'all 0.2s',
            }}>
            Create Wallet with Face ID
          </button>

          <button
            onClick={handleLogin}
            disabled={loading}
            style={{
              width: '100%',
              padding: '16px 24px',
              borderRadius: 16,
              border: '1px solid #1a1a2e',
              background: 'transparent',
              color: '#e2e8f0',
              fontSize: 15,
              fontWeight: 600,
              cursor: loading ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 10,
              transition: 'all 0.2s',
              opacity: loading ? 0.5 : 1,
            }}>

            Sign in with Passkey
          </button>
          <button
            onClick={() => navigate('/recover')}
            style={{
              width: '100%', padding: '14px',
              borderRadius: 16, border: 'none',
              background: 'transparent', color: '#334155',
              fontSize: 13, cursor: 'pointer', marginTop: 4,
            }}>
            Using a different device? →
          </button>
        </div>

        {/* Status indicator */}
        {loading && step !== 'idle' && (
          <div style={{
            marginTop: 24,
            padding: '14px 20px',
            borderRadius: 12,
            background: 'rgba(0,229,255,0.06)',
            border: '1px solid rgba(0,229,255,0.15)',
            textAlign: 'center',
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 10,
            }}>
              <div style={{
                width: 16, height: 16,
                borderRadius: '50%',
                border: '2px solid rgba(0,229,255,0.3)',
                borderTopColor: '#00e5ff',
                animation: 'spin 0.8s linear infinite',
              }} />
              <p style={{
                fontSize: 13,
                color: '#00e5ff',
                fontFamily: 'monospace',
                letterSpacing: 1,
              }}>
                {statusText[step]}
              </p>
            </div>
          </div>
        )}

        {/* Error state */}
        {error && (
          <div style={{
            marginTop: 16,
            padding: '12px 16px',
            borderRadius: 10,
            background: 'rgba(239,68,68,0.08)',
            border: '1px solid rgba(239,68,68,0.2)',
          }}>
            <p style={{ fontSize: 13, color: '#ef4444', textAlign: 'center', lineHeight: 1.5 }}>
              {error}
            </p>
          </div>
        )}

        {/* Trust indicators */}
        <div style={{
          marginTop: 40,
          display: 'flex',
          flexDirection: 'column',
          gap: 10,
        }}>
          {[
            ['🔒', 'No password. No email required.'],
            ['⚡', 'Wallet created in under 4 seconds.'],
            ['🏦', 'Funds secured by Stripe.'],
          ].map(([icon, text]) => (
            <div key={text} style={{
              display: 'flex', alignItems: 'center', gap: 10,
            }}>
              <span style={{ fontSize: 14 }}>{icon}</span>
              <p style={{ fontSize: 12, color: '#334155' }}>{text}</p>
            </div>
          ))}
        </div>

        <p style={{
          textAlign: 'center',
          fontSize: 11,
          color: '#1a1a2e',
          marginTop: 32,
          fontFamily: 'monospace',
          letterSpacing: 1,
        }}>
          synthpay.io
        </p>
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  )
}