import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { startRegistration } from '@simplewebauthn/browser'
import { walletApi } from '../lib/api'
import { useAuth } from '../contexts/AuthContext'
import { KeyRound, CheckCircle, AlertCircle } from 'lucide-react'

const T = {
  amber: '#F59B00', amberPale: 'rgba(245,155,0,0.08)', amberBd: 'rgba(245,155,0,0.2)',
  bg: '#FFFFFF', surface: '#FFFFFF', surface2: '#F3F1EE',
  border: '#E8E4DF', border2: '#D4CFC9',
  text1: '#0D0C0A', text2: '#4A4845', text3: '#9A958F', text4: '#C4BFB9',
  green: '#059669', red: '#DC2626', navy: '#111827',
}

type Step = 'idle' | 'registering' | 'done' | 'error' | 'invalid'

export default function Migrate() {
  const [searchParams]        = useSearchParams()
  const [step, setStep]       = useState<Step>('idle')
  const [error, setError]     = useState('')
  const [balance, setBalance] = useState<number | null>(null)
  const { login }             = useAuth()
  const navigate              = useNavigate()

  const token = searchParams.get('token')

  useEffect(() => {
    if (!token) setStep('invalid')
  }, [token])

  const handleMigrate = async () => {
    if (!token) return
    setStep('registering')
    setError('')

    try {
      // 1. Get registration options for account.synthpay.tech
      const beginRes = await walletApi.migrateBegin(token)
      const { options } = beginRes.data

      // 2. Trigger Face ID / Touch ID on this domain
      const credential = await startRegistration({ optionsJSON: options })

      // 3. Complete — adds passkey to existing account, returns new JWT
      const completeRes = await walletApi.migrateComplete(token, credential)
      const { user_id, balance: bal, token: newToken } = completeRes.data

      // 4. Log in with the new token (same account, new domain)
      login({ user_id, balance: bal, reputation: 'existing' }, newToken)
      setBalance(bal)
      setStep('done')
    } catch (err: any) {
      const msg = err?.response?.data?.error || err?.message || 'Something went wrong'
      if (msg.includes('expired') || msg.includes('Invalid')) {
        setStep('invalid')
      } else {
        setError(msg)
        setStep('error')
      }
    }
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: T.bg,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px 20px',
      fontFamily: "'DM Sans', system-ui, sans-serif",
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700;900&family=DM+Mono:wght@300;400;500&display=swap');
        @keyframes spin   { to { transform: rotate(360deg); } }
        @keyframes fadeUp { from{opacity:0;transform:translateY(20px)} to{opacity:1;transform:none} }
        @keyframes scaleIn { from{opacity:0;transform:scale(0.7)} to{opacity:1;transform:scale(1)} }
      `}</style>

      <div style={{ width: '100%', maxWidth: 400, animation: 'fadeUp 0.45s ease' }}>

        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 36 }}>
          <svg viewBox="0 0 130 40" height="28" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ display: 'block', margin: '0 auto 16px' }}>
            <text x="0" y="32" fontFamily="'DM Sans', sans-serif" fontWeight="900" fontSize="36" fill="#0D0C0A">S</text>
            <text x="24" y="34" fontFamily="'DM Sans', sans-serif" fontWeight="300" fontSize="38" fill="#F59B00">/</text>
            <text x="44" y="30" fontFamily="'DM Sans', sans-serif" fontWeight="800" fontSize="22" fill="#0D0C0A">YNTH</text>
            <text x="44" y="39" fontFamily="'DM Sans', sans-serif" fontWeight="400" fontSize="11" fill="#9A958F" letterSpacing="3">PAY</text>
            <circle cx="122" cy="14" r="5" fill="#F59B00"/>
          </svg>
          <p style={{ fontSize: 10, color: T.text4, fontFamily: "'DM Mono', monospace", letterSpacing: 3 }}>
            DOMAIN MIGRATION
          </p>
        </div>

        {/* Card */}
        <div style={{
          background: T.surface,
          border: `1px solid ${T.border}`,
          borderRadius: 20,
          padding: '32px 28px',
          boxShadow: '0 4px 16px rgba(0,0,0,0.06)',
          position: 'relative', overflow: 'hidden',
          textAlign: 'center',
        }}>
          <div style={{
            position: 'absolute', top: 0, left: 0, right: 0, height: 3,
            background: `linear-gradient(90deg, ${T.amber} 0%, transparent 70%)`,
          }} />

          {/* ── INVALID TOKEN ── */}
          {step === 'invalid' && (
            <>
              <AlertCircle size={40} color={T.amber} style={{ margin: '0 auto 16px', display: 'block' }} />
              <h2 style={{ fontSize: 18, fontWeight: 700, color: T.text1, marginBottom: 10 }}>
                Link expired or missing
              </h2>
              <p style={{ fontSize: 13, color: T.text3, lineHeight: 1.6, marginBottom: 24 }}>
                Migration links are valid for 10 minutes. Go back to your account on the old domain and generate a new link.
              </p>
              <a
                href="https://wallet.synthpay.tech?migrate=1"
                style={{
                  display: 'block', padding: '13px',
                  borderRadius: 12, border: `1px solid ${T.amberBd}`,
                  background: T.amberPale, color: T.amber,
                  fontSize: 13, fontWeight: 600, textDecoration: 'none',
                  transition: 'all 0.2s',
                }}>
                Back to account
              </a>
            </>
          )}

          {/* ── IDLE / READY ── */}
          {step === 'idle' && (
            <>
              <div style={{
                width: 60, height: 60, borderRadius: '50%',
                background: T.amberPale, border: `1.5px solid ${T.amberBd}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                margin: '0 auto 20px',
              }}>
                <KeyRound size={26} color={T.amber} />
              </div>
              <h2 style={{ fontSize: 18, fontWeight: 700, color: T.text1, marginBottom: 10 }}>
                Set up passkey on this device
              </h2>
              <p style={{ fontSize: 13, color: T.text3, lineHeight: 1.7, marginBottom: 8 }}>
                You're on <span style={{ color: T.amber, fontFamily: "'DM Mono', monospace", fontSize: 11 }}>account.synthpay.tech</span>
              </p>
              <p style={{ fontSize: 13, color: T.text3, lineHeight: 1.7, marginBottom: 28 }}>
                Tap the button below to register Face ID or fingerprint for this domain. Your balance and history are untouched.
              </p>

              <div style={{
                background: T.amberPale, border: `1px solid ${T.amberBd}`,
                borderRadius: 12, padding: '12px 16px',
                marginBottom: 24, textAlign: 'left',
              }}>
                <p style={{ fontSize: 12, color: T.text2, lineHeight: 1.8 }}>
                  Your account balance is safe<br />
                  All transaction history preserved<br />
                  One biometric tap — done in seconds
                </p>
              </div>

              <button
                onClick={handleMigrate}
                style={{
                  width: '100%', padding: '14px',
                  borderRadius: 12, border: 'none',
                  background: T.amber, color: '#FFFFFF',
                  fontSize: 14, fontWeight: 700,
                  cursor: 'pointer',
                  boxShadow: '0 4px 14px rgba(245,155,0,0.3)',
                  transition: 'all 0.2s',
                  fontFamily: "'DM Sans', sans-serif",
                }}>
                Register Face ID / Fingerprint
              </button>
            </>
          )}

          {/* ── REGISTERING ── */}
          {step === 'registering' && (
            <>
              <div style={{
                width: 56, height: 56, borderRadius: '50%',
                border: `3px solid ${T.amberBd}`,
                borderTopColor: T.amber,
                animation: 'spin 0.9s linear infinite',
                margin: '0 auto 24px',
              }} />
              <h2 style={{ fontSize: 17, fontWeight: 700, color: T.text1, marginBottom: 8 }}>
                Waiting for biometric…
              </h2>
              <p style={{ fontSize: 13, color: T.text3 }}>
                Approve the Face ID or fingerprint prompt on your device.
              </p>
            </>
          )}

          {/* ── ERROR ── */}
          {step === 'error' && (
            <>
              <AlertCircle size={38} color={T.red} style={{ margin: '0 auto 16px', display: 'block' }} />
              <h2 style={{ fontSize: 17, fontWeight: 700, color: T.text1, marginBottom: 8 }}>
                Registration failed
              </h2>
              <div style={{
                background: 'rgba(220,38,38,0.06)', border: '1px solid rgba(220,38,38,0.18)',
                borderRadius: 10, padding: '10px 14px', marginBottom: 24,
              }}>
                <p style={{ fontSize: 12, color: T.red }}>{error}</p>
              </div>
              <button
                onClick={() => { setStep('idle'); setError('') }}
                style={{
                  width: '100%', padding: '13px',
                  borderRadius: 12, border: `1px solid ${T.border}`,
                  background: T.surface2, color: T.text2,
                  fontSize: 13, fontWeight: 600, cursor: 'pointer',
                  fontFamily: "'DM Sans', sans-serif",
                }}>
                Try again
              </button>
            </>
          )}

          {/* ── SUCCESS ── */}
          {step === 'done' && (
            <>
              <div style={{
                width: 64, height: 64, borderRadius: '50%',
                background: 'rgba(5,150,105,0.08)',
                border: '1.5px solid rgba(5,150,105,0.3)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                margin: '0 auto 20px',
                animation: 'scaleIn 0.4s cubic-bezier(0.34,1.56,0.64,1)',
              }}>
                <CheckCircle size={32} color={T.green} />
              </div>
              <h2 style={{ fontSize: 18, fontWeight: 700, color: T.green, marginBottom: 8 }}>
                Passkey registered!
              </h2>
              <p style={{ fontSize: 13, color: T.text3, lineHeight: 1.6, marginBottom: 8 }}>
                You can now sign in at <span style={{ color: T.amber }}>account.synthpay.tech</span> with Face ID or fingerprint.
              </p>
              {balance !== null && (
                <p style={{
                  fontFamily: "'DM Mono', monospace", fontSize: 22,
                  fontWeight: 700, color: T.navy, margin: '16px 0',
                }}>
                  ${balance.toFixed(4)}
                </p>
              )}
              <button
                onClick={() => navigate('/wallet')}
                style={{
                  width: '100%', padding: '14px',
                  borderRadius: 12, border: 'none',
                  background: T.amber, color: '#FFFFFF',
                  fontSize: 14, fontWeight: 700,
                  cursor: 'pointer',
                  boxShadow: '0 4px 14px rgba(245,155,0,0.3)',
                  fontFamily: "'DM Sans', sans-serif",
                }}>
                Go to my account →
              </button>
            </>
          )}
        </div>

        <p style={{
          textAlign: 'center', fontSize: 10, color: T.text4,
          marginTop: 24, fontFamily: "'DM Mono', monospace", letterSpacing: 1,
        }}>
          SYNTHPAY · ABU DHABI, UAE · ADGM
        </p>
      </div>
    </div>
  )
}
