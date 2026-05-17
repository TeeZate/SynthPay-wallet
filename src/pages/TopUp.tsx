import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { loadStripe } from '@stripe/stripe-js'
import {
  Elements,
  PaymentElement,
  useStripe,
  useElements,
} from '@stripe/react-stripe-js'
import { useAuth } from '../contexts/AuthContext'
import { walletApi } from '../lib/api'
import { analytics } from '../lib/analytics'
import { ArrowLeft, Lock, CreditCard, CheckCircle } from 'lucide-react'

// ── Design tokens ──────────────────────────────────────────────────────────────
const T = {
  amber: '#F59B00', amberD: '#D98A00',
  amberPale: 'rgba(245,155,0,0.08)', amberBd: 'rgba(245,155,0,0.2)',
  bg: '#F7F5F2', surface: '#FFFFFF', surface2: '#F3F1EE',
  border: '#E8E4DF', border2: '#D4CFC9',
  text1: '#0D0C0A', text2: '#4A4845', text3: '#9A958F', text4: '#C4BFB9',
  green: '#059669', greenPale: 'rgba(5,150,105,0.08)', red: '#DC2626', navy: '#111827',
}

const AMOUNTS = [5, 10, 20, 50]

const pageStyle: any = {
  minHeight: '100vh',
  background: T.bg,
  padding: '0 0 48px',
  fontFamily: "'DM Sans', system-ui, sans-serif",
}

const fonts = `
  @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700;900&family=DM+Mono:wght@300;400;500&display=swap');
  @keyframes spin     { to { transform: rotate(360deg); } }
  @keyframes fadeUp   { from{opacity:0;transform:translateY(16px)} to{opacity:1;transform:none} }
  @keyframes scaleIn  { from{opacity:0;transform:scale(0.85)} to{opacity:1;transform:scale(1)} }
  @keyframes pulse    { 0%,100%{opacity:1} 50%{opacity:0.4} }
  input[type=number]::-webkit-inner-spin-button,
  input[type=number]::-webkit-outer-spin-button { -webkit-appearance: none; }
  input[type=number] { -moz-appearance: textfield; }
`

// ── Shared header ─────────────────────────────────────────────────────────────
function PageHeader({ label, onBack }: { label: string; onBack: () => void }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 12,
      padding: '14px 20px',
      borderBottom: `1px solid ${T.border}`,
      position: 'sticky', top: 0, zIndex: 50,
      background: T.surface,
    }}>
      <button onClick={onBack} style={{
        width: 36, height: 36, borderRadius: '50%',
        border: `1px solid ${T.border}`,
        background: T.surface2,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        cursor: 'pointer', color: T.text2,
        transition: 'all 0.15s',
      }}>
        <ArrowLeft size={16} />
      </button>
      <div>
        <span style={{ fontSize: 14, fontWeight: 700, color: T.text1 }}>{label}</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 1 }}>
          <Lock size={10} color={T.text3} />
          <span style={{ fontSize: 10, color: T.text3 }}>Secured by Stripe</span>
        </div>
      </div>
    </div>
  )
}

// ── Amount picker ─────────────────────────────────────────────────────────────
function AmountStep({ onContinue }: { onContinue: (amount: number) => void }) {
  const { user }    = useAuth() as any
  const navigate    = useNavigate()
  const [amount,  setAmount]  = useState(20)
  const [custom,  setCustom]  = useState('')
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState('')

  const finalAmount    = custom ? Number(custom) : amount
  const currentBalance = Number(user?.balance || 0)

  const handleContinue = async () => {
    if (isNaN(finalAmount) || finalAmount < 1) { setError('Minimum top-up is $1'); return }
    if (finalAmount > 1000) { setError('Maximum top-up is $1,000'); return }
    setLoading(true); setError('')
    try {
      await onContinue(finalAmount)
    } catch {
      setError('Could not start checkout. Please try again.')
      setLoading(false)
    }
  }

  return (
    <div style={pageStyle}>
      <style>{fonts}</style>
      <PageHeader label="Add credits" onBack={() => navigate('/wallet')} />

      <div style={{ padding: '28px 20px 0' }}>
        <h2 style={{ fontSize: 26, fontWeight: 900, letterSpacing: -1, marginBottom: 6, color: T.text1 }}>
          Add prepaid credits
        </h2>
        <p style={{ fontSize: 13, color: T.text3, lineHeight: 1.7, marginBottom: 28 }}>
          Purchased via Stripe · Available instantly · Credits never expire
        </p>

        {/* Current balance */}
        <div style={{
          background: T.surface2, border: `1px solid ${T.border}`,
          borderRadius: 14, padding: '14px 18px',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          marginBottom: 24,
        }}>
          <span style={{ fontSize: 11, color: T.text3, fontFamily: "'DM Mono', monospace", letterSpacing: 1 }}>
            CURRENT BALANCE
          </span>
          <span style={{ fontSize: 18, fontWeight: 700, color: T.amber, fontFamily: "'DM Mono', monospace" }}>
            ${currentBalance.toFixed(4)}
          </span>
        </div>

        {/* Amount grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginBottom: 12 }}>
          {AMOUNTS.map(a => {
            const sel = amount === a && !custom
            return (
              <button key={a} onClick={() => { setAmount(a); setCustom('') }} style={{
                padding: '16px 8px', borderRadius: 14,
                border: `1.5px solid ${sel ? T.amber : T.border}`,
                background: sel ? T.amberPale : T.surface,
                color: sel ? T.amber : T.text3,
                fontSize: 16, fontWeight: 700, cursor: 'pointer',
                transition: 'all 0.15s',
                fontFamily: "'DM Mono', monospace",
                boxShadow: sel ? '0 0 18px rgba(245,155,0,0.14)' : 'none',
              }}>${a}</button>
            )
          })}
        </div>

        {/* Custom amount */}
        <div style={{ position: 'relative', marginBottom: 20 }}>
          <span style={{
            position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)',
            fontSize: 18, fontWeight: 700, color: T.text3,
            fontFamily: "'DM Mono', monospace", pointerEvents: 'none',
          }}>$</span>
          <input
            type="number" value={custom} onChange={e => setCustom(e.target.value)}
            placeholder="Custom amount" min="1" max="1000"
            style={{
              width: '100%', padding: '16px 16px 16px 36px',
              borderRadius: 14, border: `1.5px solid ${custom ? T.amber : T.border}`,
              background: T.surface2, color: T.text1,
              fontSize: 16, fontFamily: "'DM Mono', monospace",
              outline: 'none', transition: 'border-color 0.2s', boxSizing: 'border-box',
            }}
          />
        </div>

        {/* Summary */}
        <div style={{
          background: T.surface2, border: `1px solid ${T.border}`,
          borderRadius: 14, overflow: 'hidden', marginBottom: 20,
        }}>
          {[
            ['Adding credits', `$${isNaN(finalAmount) ? '0.00' : finalAmount.toFixed(2)}`],
            ['Processed by',   'Stripe (secure)'],
            ['Balance after',  `$${(currentBalance + (isNaN(finalAmount) ? 0 : finalAmount)).toFixed(4)}`],
          ].map(([label, value], i, arr) => (
            <div key={label} style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              padding: '13px 18px',
              borderBottom: i < arr.length - 1 ? `1px solid ${T.border}` : 'none',
            }}>
              <span style={{ fontSize: 12, color: T.text3 }}>{label}</span>
              <span style={{
                fontSize: 13, fontWeight: 600,
                color: i === arr.length - 1 ? T.amber : T.text1,
                fontFamily: "'DM Mono', monospace",
              }}>{value}</span>
            </div>
          ))}
        </div>

        {error && (
          <div style={{ marginBottom: 16, padding: '12px 16px', borderRadius: 12,
            background: 'rgba(220,38,38,0.06)', border: '1px solid rgba(220,38,38,0.18)' }}>
            <p style={{ fontSize: 13, color: T.red }}>{error}</p>
          </div>
        )}

        <button onClick={handleContinue}
          disabled={loading || isNaN(finalAmount) || finalAmount < 1}
          style={{
            width: '100%', padding: '16px', borderRadius: 14,
            border: `1px solid ${loading || isNaN(finalAmount) || finalAmount < 1 ? T.border : 'transparent'}`,
            background: loading || isNaN(finalAmount) || finalAmount < 1 ? T.surface2 : T.amber,
            color:  loading || isNaN(finalAmount) || finalAmount < 1 ? T.text4 : '#FFFFFF',
            cursor: loading || isNaN(finalAmount) || finalAmount < 1 ? 'not-allowed' : 'pointer',
            fontSize: 15, fontWeight: 700,
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            transition: 'all 0.2s',
            boxShadow: loading || isNaN(finalAmount) || finalAmount < 1 ? 'none' : '0 4px 14px rgba(245,155,0,0.3)',
          }}>
          {loading
            ? <><div style={{ width: 14, height: 14, borderRadius: '50%', border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#FFFFFF', animation: 'spin 0.8s linear infinite' }} />Setting up checkout...</>
            : <><CreditCard size={16} />Continue to payment — ${isNaN(finalAmount) ? '0.00' : finalAmount.toFixed(2)}</>}
        </button>

        <p style={{ textAlign: 'center', fontSize: 10, color: T.text4, marginTop: 14, fontFamily: "'DM Mono', monospace" }}>
          Stripe · SSL encrypted · Idempotency guaranteed
        </p>
      </div>
    </div>
  )
}

// ── Stripe checkout form ──────────────────────────────────────────────────────
function CheckoutForm({ amount, onSuccess, onBack }: {
  amount: number
  onSuccess: (newBalance: number) => void
  onBack: () => void
}) {
  const stripe   = useStripe()
  const elements = useElements()
  const { user } = useAuth() as any
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!stripe || !elements) return
    setLoading(true); setError('')

    const { error: stripeError, paymentIntent } = await stripe.confirmPayment({
      elements,
      redirect: 'if_required',
    })

    if (stripeError) {
      setError(stripeError.message || 'Payment failed.')
      setLoading(false)
      return
    }

    if (paymentIntent?.status === 'succeeded') {
      try {
        const res = await walletApi.balance(user.user_id)
        analytics.track('topup_completed', { amount, payment_intent: paymentIntent.id })
        onSuccess(Number(res.data.balance))
      } catch {
        onSuccess(Number(user?.balance || 0) + amount)
      }
    } else {
      setError('Payment did not complete. Please try again.')
      setLoading(false)
    }
  }

  return (
    <div style={pageStyle}>
      <style>{fonts + `
        .StripeElement { background: ${T.surface2}; border-radius: 12px; padding: 14px 16px; border: 1px solid ${T.border}; }
        .StripeElement--focus { border-color: ${T.amber}; box-shadow: 0 0 0 3px rgba(245,155,0,0.1); }
        .StripeElement--invalid { border-color: ${T.red}; }
      `}</style>
      <PageHeader label={`Pay $${amount.toFixed(2)}`} onBack={onBack} />

      <div style={{ padding: '28px 20px 0' }}>
        <h2 style={{ fontSize: 26, fontWeight: 900, letterSpacing: -1, marginBottom: 6, color: T.text1 }}>
          Complete payment
        </h2>
        <p style={{ fontSize: 13, color: T.text3, lineHeight: 1.7, marginBottom: 28 }}>
          Powered by Stripe · Your card never touches our servers
        </p>

        {/* Amount chip */}
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 8,
          background: T.amberPale, border: `1px solid ${T.amberBd}`,
          borderRadius: 10, padding: '8px 14px', marginBottom: 24,
        }}>
          <span style={{ fontSize: 11, color: T.text3, fontFamily: "'DM Mono', monospace" }}>PAYING</span>
          <span style={{ fontSize: 16, fontWeight: 700, color: T.amber, fontFamily: "'DM Mono', monospace" }}>
            ${amount.toFixed(2)}
          </span>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{
            background: T.surface, border: `1px solid ${T.border}`,
            borderRadius: 16, padding: 20, marginBottom: 20,
            boxShadow: '0 4px 16px rgba(0,0,0,0.06)',
          }}>
            <PaymentElement options={{ layout: 'tabs' }} />
          </div>

          {error && (
            <div style={{ marginBottom: 16, padding: '12px 16px', borderRadius: 12,
              background: 'rgba(220,38,38,0.06)', border: '1px solid rgba(220,38,38,0.18)' }}>
              <p style={{ fontSize: 13, color: T.red }}>{error}</p>
            </div>
          )}

          <button type="submit" disabled={!stripe || loading} style={{
            width: '100%', padding: '16px', borderRadius: 14,
            border: `1px solid ${!stripe || loading ? T.border : 'transparent'}`,
            background: !stripe || loading ? T.surface2 : T.amber,
            color: !stripe || loading ? T.text4 : '#FFFFFF',
            cursor: !stripe || loading ? 'not-allowed' : 'pointer',
            fontSize: 15, fontWeight: 700,
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            transition: 'all 0.2s',
            boxShadow: !stripe || loading ? 'none' : '0 4px 14px rgba(245,155,0,0.3)',
          }}>
            {loading
              ? <><div style={{ width: 14, height: 14, borderRadius: '50%', border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#FFFFFF', animation: 'spin 0.8s linear infinite' }} />Processing...</>
              : `Pay $${amount.toFixed(2)}`}
          </button>
        </form>

        <p style={{ textAlign: 'center', fontSize: 10, color: T.text4, marginTop: 14, fontFamily: "'DM Mono', monospace" }}>
          Secured by Stripe · SSL encrypted
        </p>
      </div>
    </div>
  )
}

// ── Success screen ────────────────────────────────────────────────────────────
function SuccessScreen({ amount, newBalance }: { amount: number; newBalance: number }) {
  const navigate = useNavigate()
  return (
    <div style={{
      ...pageStyle,
      background: T.surface,
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center', padding: '24px 20px',
    }}>
      <style>{fonts}</style>
      <div style={{ width: '100%', maxWidth: 360, textAlign: 'center', animation: 'fadeUp 0.5s ease' }}>

        {/* Check icon */}
        <div style={{
          width: 72, height: 72, borderRadius: '50%',
          background: 'rgba(5,150,105,0.08)', border: '1.5px solid rgba(5,150,105,0.3)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 20px',
          animation: 'scaleIn 0.4s 0.1s ease both',
        }}>
          <CheckCircle size={32} color={T.green} />
        </div>

        <h2 style={{ fontSize: 26, fontWeight: 900, color: T.green, marginBottom: 6, letterSpacing: -0.5 }}>
          Credits Added
        </h2>
        <p style={{ fontSize: 13, color: T.text3, marginBottom: 32, lineHeight: 1.6 }}>
          ${amount.toFixed(2)} loaded successfully to your account
        </p>

        {/* New balance card */}
        <div style={{
          background: T.surface,
          border: `1px solid ${T.border}`, borderRadius: 20,
          padding: '28px 24px', marginBottom: 24,
          position: 'relative', overflow: 'hidden',
          boxShadow: '0 4px 16px rgba(0,0,0,0.06)',
        }}>
          <div style={{
            position: 'absolute', top: 0, left: 0, right: 0, height: 3,
            background: `linear-gradient(90deg, ${T.amber}, transparent)`,
          }} />
          <p style={{
            fontSize: 9, color: T.text3, letterSpacing: 3,
            marginBottom: 10, fontFamily: "'DM Mono', monospace", textTransform: 'uppercase',
          }}>New Balance</p>
          <p style={{
            fontSize: 46, fontWeight: 700, color: T.navy,
            fontFamily: "'DM Mono', monospace", lineHeight: 1, letterSpacing: -2,
          }}>
            <span style={{ fontSize: 20, opacity: 0.4, verticalAlign: 'super' }}>$</span>
            {Number(newBalance).toFixed(4)}
          </p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <button onClick={() => navigate('/marketplace')} style={{
            width: '100%', padding: '14px', borderRadius: 12, border: 'none',
            background: T.amber, color: '#FFFFFF',
            fontSize: 14, fontWeight: 700, cursor: 'pointer',
            fontFamily: "'DM Sans', sans-serif",
            boxShadow: '0 4px 14px rgba(245,155,0,0.3)',
          }}>Browse Services</button>
          <button onClick={() => navigate('/wallet')} style={{
            width: '100%', padding: '14px', borderRadius: 12,
            border: `1px solid ${T.border}`, background: T.surface2,
            color: T.text2, fontSize: 14, fontWeight: 600, cursor: 'pointer',
            fontFamily: "'DM Sans', sans-serif",
          }}>Back to account</button>
        </div>
      </div>
    </div>
  )
}

// ── Root: amount → payment → success ─────────────────────────────────────────
type Step = 'amount' | 'payment' | 'success'

export default function TopUp() {
  const { user, setUser } = useAuth() as any
  const [step,          setStep]          = useState<Step>('amount')
  const [amount,        setAmount]        = useState(0)
  const [clientSecret,  setClientSecret]  = useState('')
  const [stripePromise, setStripePromise] = useState<ReturnType<typeof loadStripe> | null>(null)
  const [newBalance,    setNewBalance]    = useState(0)

  const handleAmountContinue = async (selectedAmount: number) => {
    const res = await walletApi.createTopupIntent(user.user_id, selectedAmount)
    const { client_secret, publishable_key } = res.data
    setAmount(selectedAmount)
    setClientSecret(client_secret)
    setStripePromise(loadStripe(publishable_key))
    setStep('payment')
  }

  const handleSuccess = (bal: number) => {
    if (setUser) setUser({ ...user, balance: bal })
    setNewBalance(bal)
    setStep('success')
  }

  if (step === 'success') {
    return <SuccessScreen amount={amount} newBalance={newBalance} />
  }

  if (step === 'payment' && clientSecret && stripePromise) {
    return (
      <Elements
        stripe={stripePromise}
        options={{
          clientSecret,
          appearance: {
            theme: 'stripe',
            variables: {
              colorPrimary:    '#F59B00',
              colorBackground: '#FFFFFF',
              colorText:       '#0D0C0A',
              colorDanger:     '#DC2626',
              fontFamily:      "'DM Mono', monospace",
              borderRadius:    '12px',
            },
          },
        }}
      >
        <CheckoutForm
          amount={amount}
          onSuccess={handleSuccess}
          onBack={() => setStep('amount')}
        />
      </Elements>
    )
  }

  return <AmountStep onContinue={handleAmountContinue} />
}
