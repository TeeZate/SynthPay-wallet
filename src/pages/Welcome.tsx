import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { walletApi } from '../lib/api'
// @ts-ignore
import { startRegistration, startAuthentication } from '@simplewebauthn/browser'
import { Fingerprint, KeyRound, ArrowRight, Lock, Zap, Landmark } from 'lucide-react'

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
      background: '#FFFFFF',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '60px 32px 48px',
      fontFamily: "'DM Sans', system-ui, sans-serif",
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800;900&family=DM+Mono:wght@400;500&display=swap');
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes fadeUp { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: none; } }
      `}</style>

      <div style={{ width: '100%', maxWidth: 360, animation: 'fadeUp 0.4s ease' }}>

        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 48 }}>
          <svg viewBox="0 0 130 40" height="26" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ display: 'block', margin: '0 auto' }}>
            <text x="0" y="32" fontFamily="'DM Sans', sans-serif" fontWeight="900" fontSize="36" fill="#0D0C0A">S</text>
            <text x="24" y="34" fontFamily="'DM Sans', sans-serif" fontWeight="300" fontSize="38" fill="#F59B00">/</text>
            <text x="44" y="30" fontFamily="'DM Sans', sans-serif" fontWeight="800" fontSize="22" fill="#0D0C0A">YNTH</text>
            <text x="44" y="39" fontFamily="'DM Sans', sans-serif" fontWeight="400" fontSize="11" fill="#9A958F" letterSpacing="3">PAY</text>
            <circle cx="122" cy="14" r="5" fill="#F59B00"/>
          </svg>
        </div>

        {/* Headline */}
        <h1 style={{
          fontSize: 26, fontWeight: 800, color: '#0D0C0A',
          marginBottom: 12, lineHeight: 1.25, whiteSpace: 'pre-line',
          textAlign: 'center',
        }}>
          {'Pay any API.\nOne biometric tap.'}
        </h1>
        <p style={{
          fontSize: 14, color: '#9A958F', textAlign: 'center',
          lineHeight: 1.6, marginBottom: 36,
        }}>
          No password. No email required. Your wallet, secured by your face.
        </p>

        {/* Buttons */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {/* Primary */}
          <button
            onClick={handleRegister}
            disabled={loading}
            style={{
              width: '100%',
              padding: '16px 24px',
              borderRadius: 16,
              border: 'none',
              background: loading ? 'rgba(245,155,0,0.5)' : '#F59B00',
              color: '#FFFFFF',
              fontSize: 15,
              fontWeight: 700,
              cursor: loading ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 10,
              transition: 'all 0.2s',
              boxShadow: '0 4px 14px rgba(245,155,0,0.3)',
              fontFamily: "'DM Sans', sans-serif",
            }}>
            <Fingerprint size={18} />
            Create wallet — Face ID
          </button>

          {/* Divider */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '4px 0' }}>
            <div style={{ flex: 1, height: 1, background: '#E8E4DF' }} />
            <span style={{ fontSize: 12, color: '#9A958F' }}>already have a wallet?</span>
            <div style={{ flex: 1, height: 1, background: '#E8E4DF' }} />
          </div>

          {/* Secondary */}
          <button
            onClick={handleLogin}
            disabled={loading}
            style={{
              width: '100%',
              padding: '16px 24px',
              borderRadius: 16,
              border: '1.5px solid #D4CFC9',
              background: '#FFFFFF',
              color: '#0D0C0A',
              fontSize: 15,
              fontWeight: 600,
              cursor: loading ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 10,
              transition: 'all 0.2s',
              opacity: loading ? 0.5 : 1,
              fontFamily: "'DM Sans', sans-serif",
            }}>
            <KeyRound size={18} />
            Sign in with passkey
          </button>

          {/* Ghost */}
          <button
            onClick={() => navigate('/recover')}
            style={{
              width: '100%', padding: '14px',
              borderRadius: 16, border: 'none',
              background: 'transparent', color: '#9A958F',
              fontSize: 13, cursor: 'pointer', marginTop: 4,
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              fontFamily: "'DM Sans', sans-serif",
            }}>
            Using a different device?
            <ArrowRight size={14} />
          </button>
        </div>

        {/* Loading state */}
        {loading && step !== 'idle' && (
          <div style={{
            marginTop: 24,
            padding: '14px 20px',
            borderRadius: 12,
            background: 'rgba(245,155,0,0.08)',
            border: '1px solid rgba(245,155,0,0.2)',
            textAlign: 'center',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
              <div style={{
                width: 16, height: 16,
                borderRadius: '50%',
                border: '2px solid rgba(245,155,0,0.3)',
                borderTopColor: '#F59B00',
                animation: 'spin 0.8s linear infinite',
              }} />
              <p style={{
                fontSize: 13, color: '#F59B00',
                fontFamily: "'DM Mono', monospace", letterSpacing: 1,
              }}>
                {statusText[step]}
              </p>
            </div>
          </div>
        )}

        {/* Error state */}
        {error && (
          <div style={{
            marginTop: 16, padding: '12px 16px',
            borderRadius: 10,
            background: 'rgba(220,38,38,0.06)',
            border: '1px solid rgba(220,38,38,0.2)',
          }}>
            <p style={{ fontSize: 13, color: '#DC2626', textAlign: 'center', lineHeight: 1.5 }}>
              {error}
            </p>
          </div>
        )}

        {/* Trust row */}
        <div style={{
          marginTop: 40,
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: 16,
        }}>
          {[
            { icon: <Lock size={16} color="#4A4845" />, label: 'No password needed' },
            { icon: <Zap size={16} color="#4A4845" />, label: 'Created in 4 seconds' },
            { icon: <Landmark size={16} color="#4A4845" />, label: 'Secured by Stripe' },
          ].map(({ icon, label }) => (
            <div key={label} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
              <div style={{
                width: 40, height: 40, borderRadius: 10,
                background: '#F3F1EE', border: '1px solid #E8E4DF',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                {icon}
              </div>
              <p style={{ fontSize: 11, color: '#9A958F', textAlign: 'center', lineHeight: 1.4 }}>{label}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
