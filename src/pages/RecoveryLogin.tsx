import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { walletApi } from '../lib/api'

type Step = 'email' | 'otp' | 'success'

export default function RecoveryLogin() {
  const [step,    setStep]    = useState<Step>('email')
  const [email,   setEmail]   = useState('')
  const [otp,     setOtp]     = useState('')
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState('')
  const [resendIn, setResendIn] = useState(0)
  const { login } = useAuth()
  const navigate  = useNavigate()

  const handleRequestOTP = async () => {
    if (!email.trim()) { setError('Email required'); return }
    if (!email.includes('@')) { setError('Enter a valid email address'); return }
    setLoading(true); setError('')
    try {
      await walletApi.requestOTP(email.trim())
      setStep('otp')
      // Start 30s resend cooldown
      setResendIn(30)
      const timer = setInterval(() => {
        setResendIn(v => {
          if (v <= 1) { clearInterval(timer); return 0 }
          return v - 1
        })
      }, 1000)
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to send code. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleVerifyOTP = async () => {
    if (!otp.trim() || otp.length < 6) { setError('Enter the 6-digit code'); return }
    setLoading(true); setError('')
    try {
      const res = await walletApi.verifyOTP(email.trim(), otp.trim())
      const { user_id, balance, token } = res.data
      login({ user_id, balance, reputation: 'existing' }, token)
      setStep('success')
      setTimeout(() => navigate('/wallet'), 1500)
    } catch (err: any) {
      setError(err.response?.data?.error || 'Invalid code. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleOTPInput = (val: string) => {
    // Only allow digits, max 6
    const clean = val.replace(/\D/g, '').slice(0, 6)
    setOtp(clean)
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
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>

      {/* Back button */}
      <div style={{ width: '100%', maxWidth: 360, marginBottom: 16 }}>
        <button
          onClick={() => navigate('/')}
          style={{ background: 'none', border: 'none', color: '#64748b', fontSize: 14, cursor: 'pointer', padding: 0 }}>
          ← Back to login
        </button>
      </div>

      <div style={{ width: '100%', maxWidth: 360 }}>

        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 36 }}>
          <div style={{
            width: 64, height: 64, borderRadius: 18,
            background: 'rgba(0,229,255,0.08)',
            border: '1px solid rgba(0,229,255,0.15)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 16px', fontSize: 28,
          }}>
            {step === 'success' ? '✓' : '📧'}
          </div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: '#e2e8f0', marginBottom: 8 }}>
            {step === 'email'   && 'Access your wallet'}
            {step === 'otp'     && 'Enter your code'}
            {step === 'success' && 'Logged in!'}
          </h1>
          <p style={{ fontSize: 13, color: '#64748b', lineHeight: 1.6 }}>
            {step === 'email'   && 'Enter the email linked to your wallet. We\'ll send a one-time code.'}
            {step === 'otp'     && `We sent a 6-digit code to ${email}. It expires in 10 minutes.`}
            {step === 'success' && 'Redirecting to your wallet...'}
          </p>
        </div>

        {/* Step: Email */}
        {step === 'email' && (
          <div>
            <label style={{ display: 'block', fontSize: 11, color: '#64748b', letterSpacing: 2, fontFamily: 'monospace', marginBottom: 8 }}>
              YOUR EMAIL
            </label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleRequestOTP()}
              placeholder="you@example.com"
              autoFocus
              style={{
                width: '100%', padding: '14px 16px',
                borderRadius: 12,
                border: `1px solid ${email ? '#00e5ff44' : '#1a1a2e'}`,
                background: '#0f0f1a', color: '#e2e8f0',
                fontSize: 15, outline: 'none',
                boxSizing: 'border-box', marginBottom: 16,
                transition: 'border-color 0.2s',
              }}
            />

            {error && (
              <div style={{ marginBottom: 16, padding: '10px 14px', borderRadius: 8, background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}>
                <p style={{ fontSize: 13, color: '#ef4444' }}>{error}</p>
              </div>
            )}

            <button
              onClick={handleRequestOTP}
              disabled={loading}
              style={{
                width: '100%', padding: '15px',
                borderRadius: 12, border: 'none',
                background: '#00e5ff', color: '#03030a',
                fontSize: 15, fontWeight: 700,
                cursor: loading ? 'not-allowed' : 'pointer',
                opacity: loading ? 0.6 : 1,
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              }}>
              {loading ? (
                <><div style={{ width: 16, height: 16, borderRadius: '50%', border: '2px solid rgba(3,3,10,0.3)', borderTopColor: '#03030a', animation: 'spin 0.8s linear infinite' }} />Sending code...</>
              ) : 'Send Login Code →'}
            </button>

            <div style={{ marginTop: 24, padding: '16px', borderRadius: 12, background: '#0f0f1a', border: '1px solid #1a1a2e' }}>
              <p style={{ fontSize: 12, color: '#334155', marginBottom: 6 }}>
                <span style={{ color: '#64748b' }}>Don't have an email linked yet?</span>
              </p>
              <p style={{ fontSize: 12, color: '#334155', lineHeight: 1.6 }}>
                Log in with your passkey on your original device, then go to Settings to link your email for cross-device access.
              </p>
            </div>
          </div>
        )}

        {/* Step: OTP */}
        {step === 'otp' && (
          <div>
            <label style={{ display: 'block', fontSize: 11, color: '#64748b', letterSpacing: 2, fontFamily: 'monospace', marginBottom: 8 }}>
              6-DIGIT CODE
            </label>

            {/* Large OTP input */}
            <input
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              value={otp}
              onChange={e => handleOTPInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && otp.length === 6 && handleVerifyOTP()}
              placeholder="000000"
              autoFocus
              maxLength={6}
              style={{
                width: '100%', padding: '18px 16px',
                borderRadius: 12,
                border: `1px solid ${otp.length === 6 ? '#00e5ff' : '#1a1a2e'}`,
                background: '#0f0f1a', color: '#00e5ff',
                fontSize: 32, fontWeight: 700,
                fontFamily: 'monospace',
                textAlign: 'center',
                letterSpacing: 12,
                outline: 'none',
                boxSizing: 'border-box', marginBottom: 8,
                transition: 'border-color 0.2s',
              }}
            />

            {/* Progress dots */}
            <div style={{ display: 'flex', justifyContent: 'center', gap: 6, marginBottom: 20 }}>
              {[0,1,2,3,4,5].map(i => (
                <div key={i} style={{
                  width: 8, height: 8, borderRadius: '50%',
                  background: i < otp.length ? '#00e5ff' : '#1a1a2e',
                  transition: 'background 0.15s',
                }} />
              ))}
            </div>

            {error && (
              <div style={{ marginBottom: 16, padding: '10px 14px', borderRadius: 8, background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}>
                <p style={{ fontSize: 13, color: '#ef4444' }}>{error}</p>
              </div>
            )}

            <button
              onClick={handleVerifyOTP}
              disabled={loading || otp.length < 6}
              style={{
                width: '100%', padding: '15px',
                borderRadius: 12, border: 'none',
                background: otp.length === 6 ? '#00e5ff' : '#0f0f1a',
                color: otp.length === 6 ? '#03030a' : '#334155',
                fontSize: 15, fontWeight: 700,
                cursor: loading || otp.length < 6 ? 'not-allowed' : 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                transition: 'all 0.2s',
                border: `1px solid ${otp.length === 6 ? 'transparent' : '#1a1a2e'}` as any,
              }}>
              {loading ? (
                <><div style={{ width: 16, height: 16, borderRadius: '50%', border: '2px solid rgba(3,3,10,0.3)', borderTopColor: '#03030a', animation: 'spin 0.8s linear infinite' }} />Verifying...</>
              ) : 'Verify Code →'}
            </button>

            {/* Resend */}
            <div style={{ textAlign: 'center', marginTop: 20 }}>
              {resendIn > 0 ? (
                <p style={{ fontSize: 13, color: '#334155' }}>
                  Resend code in {resendIn}s
                </p>
              ) : (
                <button
                  onClick={() => { setOtp(''); setError(''); handleRequestOTP() }}
                  style={{ background: 'none', border: 'none', color: '#00e5ff', fontSize: 13, cursor: 'pointer' }}>
                  Resend code
                </button>
              )}
            </div>

            <button
              onClick={() => { setStep('email'); setOtp(''); setError('') }}
              style={{ width: '100%', marginTop: 12, padding: '12px', borderRadius: 12, border: '1px solid #1a1a2e', background: 'transparent', color: '#64748b', fontSize: 13, cursor: 'pointer' }}>
              Change email
            </button>
          </div>
        )}

        {/* Step: Success */}
        {step === 'success' && (
          <div style={{ textAlign: 'center' }}>
            <div style={{
              width: 80, height: 80, borderRadius: '50%',
              background: 'rgba(16,185,129,0.12)',
              border: '2px solid rgba(16,185,129,0.3)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 20px', fontSize: 36, color: '#10b981',
            }}>✓</div>
            <p style={{ fontSize: 15, color: '#10b981', fontWeight: 600 }}>Logged in successfully</p>
            <p style={{ fontSize: 13, color: '#334155', marginTop: 8 }}>Redirecting to your wallet...</p>
          </div>
        )}

        <p style={{ textAlign: 'center', fontSize: 11, color: '#1a1a2e', marginTop: 32, fontFamily: 'monospace' }}>
          synthpay.io · Cross-device access
        </p>
      </div>
    </div>
  )
}
