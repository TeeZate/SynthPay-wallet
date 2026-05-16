import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { walletApi } from '../lib/api'
// @ts-ignore
import { startRegistration, startAuthentication } from '@simplewebauthn/browser'
import { Fingerprint, KeyRound, ArrowRight, Lock, Zap, Landmark, ArrowUpRight, RefreshCw } from 'lucide-react'

type Step = 'idle' | 'challenge' | 'biometric' | 'verifying' | 'migrating'

// Domains
const NEW_DOMAIN  = 'account.synthpay.tech'
const OLD_DOMAIN  = 'wallet.synthpay.tech'
const isNewDomain = typeof window !== 'undefined' && window.location.hostname === NEW_DOMAIN
const isOldDomain = typeof window !== 'undefined' && window.location.hostname === OLD_DOMAIN

export default function Welcome() {
  const [loading, setLoading]               = useState(false)
  const [step,    setStep]                  = useState<Step>('idle')
  const [error,   setError]                 = useState('')
  const [showMigrationPrompt, setShowMigrationPrompt] = useState(false)
  const { login, user } = useAuth() as any
  const navigate  = useNavigate()
  const [searchParams] = useSearchParams()
  const isMigrateMode = searchParams.get('migrate') === '1'

  // If user arrives at wallet.synthpay.tech?migrate=1 already logged in → auto-redirect
  useEffect(() => {
    if (isMigrateMode && user && isOldDomain) {
      handleAutoMigrate()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, isMigrateMode])

  const statusText: Record<Step, string> = {
    idle:      '',
    challenge: 'Preparing secure challenge...',
    biometric: 'Waiting for Face ID / fingerprint...',
    verifying: 'Verifying with server...',
    migrating: 'Preparing migration link...',
  }

  // Already logged in on wallet.synthpay.tech?migrate=1 → get token and bounce
  const handleAutoMigrate = async () => {
    setLoading(true); setStep('migrating')
    try {
      const res = await walletApi.migrationToken()
      window.location.href = `https://${NEW_DOMAIN}/migrate?token=${res.data.token}`
    } catch {
      setLoading(false); setStep('idle')
      window.location.href = `https://${NEW_DOMAIN}`
    }
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
    setLoading(true); setError(''); setShowMigrationPrompt(false)
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

      // If on wallet.synthpay.tech?migrate=1 — get migration token and bounce to new domain
      if (isMigrateMode && isOldDomain) {
        setStep('migrating')
        const migRes = await walletApi.migrationToken()
        window.location.href = `https://${NEW_DOMAIN}/migrate?token=${migRes.data.token}`
        return
      }

      navigate('/wallet')
    } catch (err: any) {
      const msg = err?.response?.data?.error || err?.message || 'Login failed. Please try again.'
      setError(msg)

      // On account.synthpay.tech, a "not allowed" / "timed out" error almost certainly
      // means the user's passkey is bound to wallet.synthpay.tech — guide them to migrate.
      if (isNewDomain) {
        const lower = msg.toLowerCase()
        if (
          lower.includes('not allowed') ||
          lower.includes('timed out') ||
          lower.includes('notallowederror') ||
          lower.includes('no credentials') ||
          lower.includes('no passkey') ||
          err?.name === 'NotAllowedError'
        ) {
          setShowMigrationPrompt(true)
        }
      }
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

        {/* Migration mode banner (wallet.synthpay.tech?migrate=1) */}
        {isMigrateMode && isOldDomain && (
          <div style={{
            background: 'rgba(245,155,0,0.08)', border: '1px solid rgba(245,155,0,0.25)',
            borderRadius: 12, padding: '12px 16px', marginBottom: 24,
            display: 'flex', alignItems: 'flex-start', gap: 10,
          }}>
            <RefreshCw size={16} color="#F59B00" style={{ marginTop: 2, flexShrink: 0 }} />
            <div>
              <p style={{ fontSize: 13, fontWeight: 600, color: '#0D0C0A', margin: 0, marginBottom: 2 }}>
                Migrating to account.synthpay.tech
              </p>
              <p style={{ fontSize: 12, color: '#9A958F', margin: 0, lineHeight: 1.5 }}>
                Sign in with your passkey below to complete the migration. Your balance and history are untouched.
              </p>
            </div>
          </div>
        )}

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
          No password. No email required. Your account, secured by your face.
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
            Create account — Face ID
          </button>

          {/* Divider */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '4px 0' }}>
            <div style={{ flex: 1, height: 1, background: '#E8E4DF' }} />
            <span style={{ fontSize: 12, color: '#9A958F' }}>already have an account?</span>
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

        {/* ── Migration prompt (appears on account.synthpay.tech after "not allowed") ── */}
        {showMigrationPrompt && (
          <div style={{
            marginTop: 20,
            background: '#FFFBF0', border: '1.5px solid rgba(245,155,0,0.35)',
            borderRadius: 16, padding: '20px 20px',
            animation: 'fadeUp 0.3s ease',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
              <RefreshCw size={16} color="#F59B00" />
              <p style={{ fontSize: 13, fontWeight: 700, color: '#0D0C0A', margin: 0 }}>
                Account on wallet.synthpay.tech?
              </p>
            </div>
            <p style={{ fontSize: 12, color: '#4A4845', lineHeight: 1.6, marginBottom: 16, margin: '0 0 16px' }}>
              Your passkey is bound to the old domain. Migrate in one tap — your balance and history are safe.
            </p>
            <button
              onClick={() => { window.location.href = `https://${OLD_DOMAIN}?migrate=1` }}
              style={{
                width: '100%', padding: '13px',
                borderRadius: 12, border: 'none',
                background: '#F59B00', color: '#FFFFFF',
                fontSize: 13, fontWeight: 700, cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                fontFamily: "'DM Sans', sans-serif",
                boxShadow: '0 4px 12px rgba(245,155,0,0.25)',
              }}>
              Migrate from wallet.synthpay.tech
              <ArrowUpRight size={15} />
            </button>
          </div>
        )}

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
