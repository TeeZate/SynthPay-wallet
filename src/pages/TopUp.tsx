import { useState, useEffect, useRef } from 'react'
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
import {
  ArrowLeft, Lock, CreditCard, CheckCircle,
  Smartphone, Globe, ChevronRight, RefreshCw,
} from 'lucide-react'

// ── Design tokens ─────────────────────────────────────────────────────────────
const T = {
  amber: '#F59B00', amberD: '#D98A00',
  amberPale: 'rgba(245,155,0,0.08)', amberBd: 'rgba(245,155,0,0.2)',
  bg: '#F7F5F2', surface: '#FFFFFF', surface2: '#F3F1EE',
  border: '#E8E4DF', border2: '#D4CFC9',
  text1: '#0D0C0A', text2: '#4A4845', text3: '#9A958F', text4: '#C4BFB9',
  green: '#059669', greenPale: 'rgba(5,150,105,0.08)', red: '#DC2626', navy: '#111827',
  teal: '#0891b2', tealPale: 'rgba(8,145,178,0.08)',
}

// ── Types ────────────────────────────────────────────────────────────────────
type Step   = 'method' | 'amount' | 'payment' | 'waiting' | 'success'
type Method = 'stripe' | 'ziina' | 'nardo'

const AMOUNTS = [5, 10, 20, 50]

// Nardo-supported currencies with display info
const NARDO_CURRENCIES = [
  { code: 'KES', flag: '🇰🇪', name: 'M-Pesa Kenya',        rate: 129.5  },
  { code: 'NGN', flag: '🇳🇬', name: 'Nigeria (bank/USSD)', rate: 1580   },
  { code: 'GHS', flag: '🇬🇭', name: 'MTN Ghana',           rate: 15.2   },
  { code: 'ZAR', flag: '🇿🇦', name: 'South Africa',        rate: 18.4   },
  { code: 'UGX', flag: '🇺🇬', name: 'MTN Uganda',          rate: 3720   },
  { code: 'TZS', flag: '🇹🇿', name: 'Tanzania',            rate: 2590   },
  { code: 'ZMW', flag: '🇿🇲', name: 'Zambia',              rate: 25.8   },
  { code: 'XOF', flag: '🌍', name: 'West Africa (BCEAO)', rate: 605    },
]

const fonts = `
  @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700;900&family=DM+Mono:wght@300;400;500&display=swap');
  @keyframes spin    { to { transform: rotate(360deg); } }
  @keyframes fadeUp  { from{opacity:0;transform:translateY(16px)} to{opacity:1;transform:none} }
  @keyframes scaleIn { from{opacity:0;transform:scale(0.85)} to{opacity:1;transform:scale(1)} }
  @keyframes pulse   { 0%,100%{opacity:1} 50%{opacity:0.35} }
  input[type=number]::-webkit-inner-spin-button,
  input[type=number]::-webkit-outer-spin-button { -webkit-appearance: none; }
  input[type=number] { -moz-appearance: textfield; }
`

const pageStyle: React.CSSProperties = {
  minHeight: '100vh',
  background: T.bg,
  padding: '0 0 48px',
  fontFamily: "'DM Sans', system-ui, sans-serif",
}

// ── Shared header ─────────────────────────────────────────────────────────────
function PageHeader({ label, sub, onBack }: { label: string; sub?: string; onBack: () => void }) {
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
        border: `1px solid ${T.border}`, background: T.surface2,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        cursor: 'pointer', flexShrink: 0,
      }}>
        <ArrowLeft size={16} color={T.text2} />
      </button>
      <div>
        <span style={{ fontSize: 14, fontWeight: 700, color: T.text1 }}>{label}</span>
        {sub && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 1 }}>
            <Lock size={10} color={T.text3} />
            <span style={{ fontSize: 10, color: T.text3 }}>{sub}</span>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Spinner ───────────────────────────────────────────────────────────────────
function Spinner({ color = '#FFFFFF' }: { color?: string }) {
  return (
    <div style={{
      width: 14, height: 14, borderRadius: '50%',
      border: `2px solid ${color}30`,
      borderTopColor: color,
      animation: 'spin 0.8s linear infinite',
    }} />
  )
}

// ══════════════════════════════════════════════════════════════════════════════
// STEP 1 — METHOD SELECTOR
// ══════════════════════════════════════════════════════════════════════════════
function MethodStep({ onSelect }: { onSelect: (m: Method) => void }) {
  const navigate = useNavigate()

  const methods: {
    id: Method
    icon: React.ReactNode
    title: string
    subtitle: string
    badge: string
    badgeColor: string
    borderColor: string
    desc: string
  }[] = [
    {
      id:          'stripe',
      icon:        <CreditCard size={22} color={T.amber} />,
      title:       'Card / Apple Pay',
      subtitle:    'Visa · Mastercard · Amex · Apple Pay',
      badge:       '🌍 Global',
      badgeColor:  T.amber,
      borderColor: T.amber,
      desc:        'Instant credit · Powered by Stripe · All major cards accepted',
    },
    {
      id:          'ziina',
      icon:        <Smartphone size={22} color={T.teal} />,
      title:       'Ziina',
      subtitle:    'UAE instant bank transfer',
      badge:       '🇦🇪 UAE',
      badgeColor:  T.teal,
      borderColor: T.teal,
      desc:        'Pay in AED · Instant transfer · No card needed',
    },
    {
      id:          'nardo',
      icon:        <Globe size={22} color={T.green} />,
      title:       'Nardo Pay',
      subtitle:    'Mobile money · Africa',
      badge:       '🌍 Africa',
      badgeColor:  T.green,
      borderColor: T.green,
      desc:        'M-Pesa · MTN · Airtel · Pay in local currency',
    },
  ]

  return (
    <div style={pageStyle}>
      <style>{fonts}</style>
      <PageHeader label="Add credits" onBack={() => navigate('/wallet')} />

      <div style={{ padding: '28px 20px 0' }}>
        <h2 style={{ fontSize: 26, fontWeight: 900, letterSpacing: -1, marginBottom: 6, color: T.text1 }}>
          Choose payment method
        </h2>
        <p style={{ fontSize: 13, color: T.text3, lineHeight: 1.7, marginBottom: 28 }}>
          Select how you'd like to top up your SynthPay account.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {methods.map((m, i) => (
            <button
              key={m.id}
              onClick={() => onSelect(m.id)}
              style={{
                width: '100%', textAlign: 'left',
                background: T.surface,
                border: `1.5px solid ${T.border}`,
                borderRadius: 16, padding: '18px 20px',
                cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: 16,
                transition: 'all 0.15s',
                animation: `fadeUp 0.3s ease ${i * 0.06}s both`,
                boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
              }}
              onMouseEnter={e => {
                const el = e.currentTarget
                el.style.border = `1.5px solid ${m.borderColor}`
                el.style.boxShadow = `0 4px 16px rgba(0,0,0,0.08)`
              }}
              onMouseLeave={e => {
                const el = e.currentTarget
                el.style.border = `1.5px solid ${T.border}`
                el.style.boxShadow = '0 2px 8px rgba(0,0,0,0.04)'
              }}
            >
              {/* Icon */}
              <div style={{
                width: 48, height: 48, borderRadius: 14, flexShrink: 0,
                background: `${m.badgeColor}12`,
                border: `1px solid ${m.badgeColor}30`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                {m.icon}
              </div>

              {/* Text */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
                  <span style={{ fontSize: 14, fontWeight: 700, color: T.text1 }}>{m.title}</span>
                  <span style={{
                    fontSize: 9, fontWeight: 700, letterSpacing: 1,
                    color: m.badgeColor,
                    background: `${m.badgeColor}12`,
                    border: `1px solid ${m.badgeColor}30`,
                    padding: '2px 7px', borderRadius: 20,
                    fontFamily: "'DM Mono', monospace",
                  }}>{m.badge}</span>
                </div>
                <p style={{ fontSize: 12, color: T.text2, marginBottom: 4 }}>{m.subtitle}</p>
                <p style={{ fontSize: 11, color: T.text3 }}>{m.desc}</p>
              </div>

              <ChevronRight size={16} color={T.text4} style={{ flexShrink: 0 }} />
            </button>
          ))}
        </div>

        <p style={{ textAlign: 'center', fontSize: 10, color: T.text4, marginTop: 20, fontFamily: "'DM Mono', monospace" }}>
          All payments are encrypted · Credits never expire
        </p>
      </div>
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
// STEP 2 — AMOUNT PICKER
// ══════════════════════════════════════════════════════════════════════════════
function AmountStep({
  method, onContinue, onBack,
}: {
  method: Method
  onContinue: (amount: number) => void
  onBack: () => void
}) {
  const { user }   = useAuth() as any
  const [amount,   setAmount]  = useState(20)
  const [custom,   setCustom]  = useState('')
  const [loading,  setLoading] = useState(false)
  const [error,    setError]   = useState('')

  const finalAmount    = custom ? Number(custom) : amount
  const currentBalance = Number(user?.balance || 0)

  // Currency context per method
  const currencyNote = method === 'ziina'
    ? `≈ AED ${(finalAmount * 3.67).toFixed(2)}`
    : method === 'nardo'
    ? 'Local currency shown at checkout'
    : null

  const handleContinue = async () => {
    if (isNaN(finalAmount) || finalAmount < 1) { setError('Minimum top-up is $1'); return }
    if (finalAmount > 1000) { setError('Maximum top-up is $1,000'); return }
    setLoading(true); setError('')
    try {
      await onContinue(finalAmount)
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Could not start checkout. Please try again.')
      setLoading(false)
    }
  }

  const methodLabel = method === 'stripe' ? 'Card / Apple Pay' : method === 'ziina' ? 'Ziina' : 'Nardo Pay'
  const methodColor = method === 'stripe' ? T.amber : method === 'ziina' ? T.teal : T.green

  return (
    <div style={pageStyle}>
      <style>{fonts}</style>
      <PageHeader label="Add credits" sub={`via ${methodLabel}`} onBack={onBack} />

      <div style={{ padding: '28px 20px 0' }}>
        <h2 style={{ fontSize: 26, fontWeight: 900, letterSpacing: -1, marginBottom: 6, color: T.text1 }}>
          How much?
        </h2>
        <p style={{ fontSize: 13, color: T.text3, lineHeight: 1.7, marginBottom: 28 }}>
          Credits are added to your account instantly after payment.
        </p>

        {/* Method badge */}
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 6,
          background: `${methodColor}10`, border: `1px solid ${methodColor}30`,
          borderRadius: 20, padding: '5px 12px', marginBottom: 20,
        }}>
          <div style={{ width: 6, height: 6, borderRadius: '50%', background: methodColor }} />
          <span style={{ fontSize: 11, color: methodColor, fontFamily: "'DM Mono', monospace", fontWeight: 600 }}>
            {methodLabel}
          </span>
        </div>

        {/* Current balance */}
        <div style={{
          background: T.surface2, border: `1px solid ${T.border}`,
          borderRadius: 14, padding: '14px 18px',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          marginBottom: 20,
        }}>
          <span style={{ fontSize: 11, color: T.text3, fontFamily: "'DM Mono', monospace", letterSpacing: 1 }}>
            CURRENT BALANCE
          </span>
          <span style={{ fontSize: 18, fontWeight: 700, color: T.amber, fontFamily: "'DM Mono', monospace" }}>
            ${currentBalance.toFixed(4)}
          </span>
        </div>

        {/* Preset amounts */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginBottom: 12 }}>
          {AMOUNTS.map(a => {
            const sel = amount === a && !custom
            return (
              <button key={a} onClick={() => { setAmount(a); setCustom('') }} style={{
                padding: '16px 8px', borderRadius: 14,
                border: `1.5px solid ${sel ? methodColor : T.border}`,
                background: sel ? `${methodColor}10` : T.surface,
                color: sel ? methodColor : T.text3,
                fontSize: 16, fontWeight: 700, cursor: 'pointer',
                transition: 'all 0.15s',
                fontFamily: "'DM Mono', monospace",
                boxShadow: sel ? `0 0 18px ${methodColor}20` : 'none',
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
              borderRadius: 14, border: `1.5px solid ${custom ? methodColor : T.border}`,
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
            ...(currencyNote ? [['Equivalent', currencyNote]] : []),
            ['Processed by', methodLabel],
            ['Balance after', `$${(currentBalance + (isNaN(finalAmount) ? 0 : finalAmount)).toFixed(4)}`],
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

        <button
          onClick={handleContinue}
          disabled={loading || isNaN(finalAmount) || finalAmount < 1}
          style={{
            width: '100%', padding: '16px', borderRadius: 14, border: 'none',
            background: loading || isNaN(finalAmount) || finalAmount < 1
              ? T.surface2 : methodColor,
            color: loading || isNaN(finalAmount) || finalAmount < 1 ? T.text4 : '#FFFFFF',
            cursor: loading || isNaN(finalAmount) || finalAmount < 1 ? 'not-allowed' : 'pointer',
            fontSize: 15, fontWeight: 700,
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            transition: 'all 0.2s',
            boxShadow: loading || isNaN(finalAmount) || finalAmount < 1
              ? 'none' : `0 4px 14px ${methodColor}40`,
          }}>
          {loading
            ? <><Spinner />&nbsp;Setting up checkout...</>
            : <>Continue — ${isNaN(finalAmount) ? '0.00' : finalAmount.toFixed(2)}</>}
        </button>

        <p style={{ textAlign: 'center', fontSize: 10, color: T.text4, marginTop: 14, fontFamily: "'DM Mono', monospace" }}>
          All transactions are encrypted · Credits never expire
        </p>
      </div>
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
// STEP 3a — STRIPE CHECKOUT (existing Elements flow)
// ══════════════════════════════════════════════════════════════════════════════
function StripeCheckoutForm({ amount, onSuccess, onBack }: {
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
        analytics.track('topup_completed', { amount, method: 'stripe', payment_intent: paymentIntent.id })
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
        .StripeElement { background:${T.surface2};border-radius:12px;padding:14px 16px;border:1px solid ${T.border}; }
        .StripeElement--focus { border-color:${T.amber};box-shadow:0 0 0 3px rgba(245,155,0,0.1); }
        .StripeElement--invalid { border-color:${T.red}; }
      `}</style>
      <PageHeader label={`Pay $${amount.toFixed(2)}`} sub="Secured by Stripe" onBack={onBack} />

      <div style={{ padding: '28px 20px 0' }}>
        <h2 style={{ fontSize: 26, fontWeight: 900, letterSpacing: -1, marginBottom: 6, color: T.text1 }}>
          Complete payment
        </h2>
        <p style={{ fontSize: 13, color: T.text3, lineHeight: 1.7, marginBottom: 28 }}>
          Powered by Stripe · Your card never touches our servers
        </p>

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
            border: 'none',
            background: !stripe || loading ? T.surface2 : T.amber,
            color: !stripe || loading ? T.text4 : '#FFFFFF',
            cursor: !stripe || loading ? 'not-allowed' : 'pointer',
            fontSize: 15, fontWeight: 700,
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            transition: 'all 0.2s',
            boxShadow: !stripe || loading ? 'none' : '0 4px 14px rgba(245,155,0,0.3)',
          }}>
            {loading ? <><Spinner />&nbsp;Processing...</> : `Pay $${amount.toFixed(2)}`}
          </button>
        </form>

        <p style={{ textAlign: 'center', fontSize: 10, color: T.text4, marginTop: 14, fontFamily: "'DM Mono', monospace" }}>
          Secured by Stripe · SSL encrypted
        </p>
      </div>
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
// STEP 3b — ZIINA CHECKOUT
// ══════════════════════════════════════════════════════════════════════════════
function ZiinaCheckout({ amount, paymentUrl, amountAed, ref: topupRef, onSuccess, onBack }: {
  amount:     number
  paymentUrl: string
  amountAed:  number
  ref:        string
  onSuccess:  (newBalance: number) => void
  onBack:     () => void
}) {
  const { user }  = useAuth() as any
  const [polling, setPolling]  = useState(false)
  const [opened,  setOpened]   = useState(false)
  const [error,   setError]    = useState('')
  const pollRef   = useRef<ReturnType<typeof setInterval> | null>(null)

  const startPolling = () => {
    if (polling) return
    setPolling(true)
    pollRef.current = setInterval(async () => {
      try {
        const res = await walletApi.topupStatus(topupRef)
        if (res.data.status === 'completed') {
          clearInterval(pollRef.current!)
          const bal = await walletApi.balance(user.user_id)
          analytics.track('topup_completed', { amount, method: 'ziina' })
          onSuccess(Number(bal.data.balance))
        }
      } catch { /* keep polling */ }
    }, 4000)
  }

  useEffect(() => () => { if (pollRef.current) clearInterval(pollRef.current) }, [])

  const handleOpenZiina = () => {
    window.open(paymentUrl, '_blank')
    setOpened(true)
    startPolling()
  }

  return (
    <div style={pageStyle}>
      <style>{fonts}</style>
      <PageHeader label="Pay with Ziina" sub="UAE instant transfer" onBack={onBack} />

      <div style={{ padding: '28px 20px 0' }}>
        <h2 style={{ fontSize: 26, fontWeight: 900, letterSpacing: -1, marginBottom: 6, color: T.text1 }}>
          Open Ziina to pay
        </h2>
        <p style={{ fontSize: 13, color: T.text3, lineHeight: 1.7, marginBottom: 28 }}>
          Tap the button below to open the Ziina payment page. Once you complete the payment, your credits will be added automatically.
        </p>

        {/* Amount card */}
        <div style={{
          background: T.surface, border: `1px solid ${T.border}`,
          borderRadius: 16, padding: '24px 20px', marginBottom: 20,
          boxShadow: '0 4px 16px rgba(0,0,0,0.06)', textAlign: 'center',
          position: 'relative', overflow: 'hidden',
        }}>
          <div style={{
            position: 'absolute', top: 0, left: 0, right: 0, height: 3,
            background: `linear-gradient(90deg, ${T.teal}, transparent)`,
          }} />
          <p style={{ fontSize: 11, color: T.text3, fontFamily: "'DM Mono', monospace", letterSpacing: 2, marginBottom: 8 }}>
            AMOUNT DUE
          </p>
          <p style={{ fontSize: 40, fontWeight: 900, color: T.navy, fontFamily: "'DM Mono', monospace", letterSpacing: -2, lineHeight: 1 }}>
            AED {amountAed.toFixed(2)}
          </p>
          <p style={{ fontSize: 13, color: T.text3, marginTop: 6 }}>
            ≈ ${amount.toFixed(2)} USD in credits
          </p>
        </div>

        {/* Steps */}
        <div style={{
          background: T.surface2, border: `1px solid ${T.border}`,
          borderRadius: 14, overflow: 'hidden', marginBottom: 24,
        }}>
          {[
            { n: '1', text: 'Tap "Open Ziina" below' },
            { n: '2', text: 'Complete payment in the Ziina app or browser' },
            { n: '3', text: 'Return here — credits added automatically' },
          ].map((s, i, arr) => (
            <div key={s.n} style={{
              display: 'flex', alignItems: 'center', gap: 14,
              padding: '13px 18px',
              borderBottom: i < arr.length - 1 ? `1px solid ${T.border}` : 'none',
            }}>
              <div style={{
                width: 24, height: 24, borderRadius: '50%', flexShrink: 0,
                background: T.tealPale, border: `1px solid ${T.teal}30`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: T.teal, fontFamily: "'DM Mono', monospace" }}>
                  {s.n}
                </span>
              </div>
              <span style={{ fontSize: 13, color: T.text2 }}>{s.text}</span>
            </div>
          ))}
        </div>

        {error && (
          <div style={{ marginBottom: 16, padding: '12px 16px', borderRadius: 12,
            background: 'rgba(220,38,38,0.06)', border: '1px solid rgba(220,38,38,0.18)' }}>
            <p style={{ fontSize: 13, color: T.red }}>{error}</p>
          </div>
        )}

        {!opened ? (
          <button onClick={handleOpenZiina} style={{
            width: '100%', padding: '16px', borderRadius: 14, border: 'none',
            background: T.teal, color: '#FFFFFF',
            fontSize: 15, fontWeight: 700, cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            boxShadow: `0 4px 14px ${T.teal}40`, transition: 'all 0.2s',
          }}>
            <Smartphone size={16} />
            Open Ziina — AED {amountAed.toFixed(2)}
          </button>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{
              padding: '14px 18px', borderRadius: 14,
              background: T.tealPale, border: `1px solid ${T.teal}30`,
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
            }}>
              <div style={{
                width: 8, height: 8, borderRadius: '50%', background: T.teal,
                animation: 'pulse 1.5s ease-in-out infinite',
              }} />
              <span style={{ fontSize: 13, color: T.teal, fontFamily: "'DM Mono', monospace" }}>
                Waiting for payment confirmation...
              </span>
            </div>
            <button onClick={handleOpenZiina} style={{
              width: '100%', padding: '14px', borderRadius: 14,
              border: `1px solid ${T.border}`, background: T.surface2,
              color: T.text2, fontSize: 13, fontWeight: 600, cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
            }}>
              <RefreshCw size={14} />
              Reopen Ziina
            </button>
          </div>
        )}

        <p style={{ textAlign: 'center', fontSize: 10, color: T.text4, marginTop: 14, fontFamily: "'DM Mono', monospace" }}>
          Ziina · Licensed by UAE Central Bank
        </p>
      </div>
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
// STEP 3c — NARDO PAY CHECKOUT
// ══════════════════════════════════════════════════════════════════════════════
function NardoCheckout({ amount, onSuccess, onBack }: {
  amount:    number
  onSuccess: (newBalance: number) => void
  onBack:    () => void
}) {
  const { user }     = useAuth() as any
  const [currency,   setCurrency]   = useState(NARDO_CURRENCIES[0].code)
  const [phone,      setPhone]      = useState('')
  const [loading,    setLoading]    = useState(false)
  const [error,      setError]      = useState('')
  const [waiting,    setWaiting]    = useState(false)
  const [topupRef,   setTopupRef]   = useState('')
  const [instructions, setInstructions] = useState('')
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const selectedCcy = NARDO_CURRENCIES.find(c => c.code === currency)!
  const localAmount = (amount * selectedCcy.rate).toFixed(2)

  const startPolling = (ref: string) => {
    pollRef.current = setInterval(async () => {
      try {
        const res = await walletApi.topupStatus(ref)
        if (res.data.status === 'completed') {
          clearInterval(pollRef.current!)
          const bal = await walletApi.balance(user.user_id)
          analytics.track('topup_completed', { amount, method: 'nardo', currency })
          onSuccess(Number(bal.data.balance))
        }
      } catch { /* keep polling */ }
    }, 5000)
  }

  useEffect(() => () => { if (pollRef.current) clearInterval(pollRef.current) }, [])

  const handleSend = async () => {
    if (!phone || phone.length < 6) { setError('Enter a valid phone number'); return }
    setLoading(true); setError('')
    try {
      const res = await walletApi.createNardoTopup(user.user_id, amount, phone, currency)
      const { ref, instructions: msg } = res.data
      setTopupRef(ref)
      setInstructions(msg)
      setWaiting(true)
      startPolling(ref)
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Could not initiate payment. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  // ── Waiting screen (after prompt sent) ────────────────────────────────────
  if (waiting) {
    return (
      <div style={pageStyle}>
        <style>{fonts}</style>
        <PageHeader label="Check your phone" sub="Nardo Pay · Mobile money" onBack={() => {}} />
        <div style={{ padding: '28px 20px 0' }}>
          <div style={{
            width: 72, height: 72, borderRadius: '50%',
            background: T.greenPale, border: '1.5px solid rgba(5,150,105,0.3)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 20px', animation: 'scaleIn 0.4s ease',
          }}>
            <Smartphone size={30} color={T.green} />
          </div>

          <h2 style={{ fontSize: 22, fontWeight: 900, color: T.text1, textAlign: 'center', marginBottom: 8 }}>
            Prompt sent to your phone
          </h2>
          <p style={{ fontSize: 13, color: T.text3, lineHeight: 1.7, textAlign: 'center', marginBottom: 28 }}>
            {instructions}
          </p>

          {/* Status */}
          <div style={{
            background: T.greenPale, border: '1px solid rgba(5,150,105,0.25)',
            borderRadius: 14, padding: '16px 18px', marginBottom: 20,
            display: 'flex', alignItems: 'center', gap: 12,
          }}>
            <div style={{
              width: 8, height: 8, borderRadius: '50%', background: T.green, flexShrink: 0,
              animation: 'pulse 1.5s ease-in-out infinite',
            }} />
            <span style={{ fontSize: 13, color: T.green, fontFamily: "'DM Mono', monospace" }}>
              Waiting for approval on {phone}
            </span>
          </div>

          {/* Summary */}
          <div style={{
            background: T.surface2, border: `1px solid ${T.border}`,
            borderRadius: 14, overflow: 'hidden', marginBottom: 24,
          }}>
            {[
              ['Amount', `${currency} ${Number(localAmount).toLocaleString()}`],
              ['USD credits', `$${amount.toFixed(2)}`],
              ['Method', selectedCcy.name],
              ['Phone', phone],
            ].map(([label, value], i, arr) => (
              <div key={label} style={{
                display: 'flex', justifyContent: 'space-between',
                padding: '12px 18px',
                borderBottom: i < arr.length - 1 ? `1px solid ${T.border}` : 'none',
              }}>
                <span style={{ fontSize: 12, color: T.text3 }}>{label}</span>
                <span style={{ fontSize: 12, fontWeight: 600, color: T.text1, fontFamily: "'DM Mono', monospace" }}>{value}</span>
              </div>
            ))}
          </div>

          <p style={{ textAlign: 'center', fontSize: 11, color: T.text4, fontFamily: "'DM Mono', monospace" }}>
            This page will update automatically once approved.
          </p>
        </div>
      </div>
    )
  }

  // ── Input screen ───────────────────────────────────────────────────────────
  return (
    <div style={pageStyle}>
      <style>{fonts}</style>
      <PageHeader label="Nardo Pay" sub="African mobile money" onBack={onBack} />

      <div style={{ padding: '28px 20px 0' }}>
        <h2 style={{ fontSize: 26, fontWeight: 900, letterSpacing: -1, marginBottom: 6, color: T.text1 }}>
          Mobile money
        </h2>
        <p style={{ fontSize: 13, color: T.text3, lineHeight: 1.7, marginBottom: 28 }}>
          Select your country and enter your mobile money number. You'll receive a payment prompt on your phone.
        </p>

        {/* Amount summary */}
        <div style={{
          background: T.surface, border: `1px solid ${T.border}`,
          borderRadius: 14, padding: '16px 18px', marginBottom: 20,
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
        }}>
          <div>
            <p style={{ fontSize: 11, color: T.text3, fontFamily: "'DM Mono', monospace", letterSpacing: 1, marginBottom: 4 }}>
              AMOUNT TO CREDIT
            </p>
            <p style={{ fontSize: 20, fontWeight: 700, color: T.amber, fontFamily: "'DM Mono', monospace" }}>
              ${amount.toFixed(2)}
            </p>
          </div>
          <div style={{ textAlign: 'right' }}>
            <p style={{ fontSize: 11, color: T.text3, fontFamily: "'DM Mono', monospace", letterSpacing: 1, marginBottom: 4 }}>
              YOU PAY
            </p>
            <p style={{ fontSize: 20, fontWeight: 700, color: T.green, fontFamily: "'DM Mono', monospace" }}>
              {currency} {Number(localAmount).toLocaleString()}
            </p>
          </div>
        </div>

        {/* Currency selector */}
        <p style={{ fontSize: 11, fontWeight: 700, color: T.text3, letterSpacing: 1.5, marginBottom: 8, fontFamily: "'DM Mono', monospace" }}>
          SELECT COUNTRY / METHOD
        </p>
        <div style={{
          display: 'grid', gridTemplateColumns: '1fr 1fr',
          gap: 8, marginBottom: 20,
        }}>
          {NARDO_CURRENCIES.map(c => {
            const sel = currency === c.code
            return (
              <button key={c.code} onClick={() => setCurrency(c.code)} style={{
                padding: '11px 12px', borderRadius: 12, cursor: 'pointer',
                border: `1.5px solid ${sel ? T.green : T.border}`,
                background: sel ? T.greenPale : T.surface,
                display: 'flex', alignItems: 'center', gap: 8,
                transition: 'all 0.15s',
              }}>
                <span style={{ fontSize: 16 }}>{c.flag}</span>
                <div style={{ textAlign: 'left', minWidth: 0 }}>
                  <p style={{ fontSize: 11, fontWeight: 700, color: sel ? T.green : T.text1, fontFamily: "'DM Mono', monospace" }}>
                    {c.code}
                  </p>
                  <p style={{ fontSize: 9, color: T.text3, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {c.name}
                  </p>
                </div>
              </button>
            )
          })}
        </div>

        {/* Phone input */}
        <p style={{ fontSize: 11, fontWeight: 700, color: T.text3, letterSpacing: 1.5, marginBottom: 8, fontFamily: "'DM Mono', monospace" }}>
          MOBILE NUMBER
        </p>
        <input
          type="tel"
          value={phone}
          onChange={e => setPhone(e.target.value)}
          placeholder="+254 700 000 000"
          style={{
            width: '100%', padding: '16px',
            borderRadius: 14, border: `1.5px solid ${phone ? T.green : T.border}`,
            background: T.surface2, color: T.text1,
            fontSize: 16, fontFamily: "'DM Mono', monospace",
            outline: 'none', marginBottom: 20, boxSizing: 'border-box',
            transition: 'border-color 0.2s',
          }}
        />

        {error && (
          <div style={{ marginBottom: 16, padding: '12px 16px', borderRadius: 12,
            background: 'rgba(220,38,38,0.06)', border: '1px solid rgba(220,38,38,0.18)' }}>
            <p style={{ fontSize: 13, color: T.red }}>{error}</p>
          </div>
        )}

        <button
          onClick={handleSend}
          disabled={loading || !phone}
          style={{
            width: '100%', padding: '16px', borderRadius: 14, border: 'none',
            background: loading || !phone ? T.surface2 : T.green,
            color: loading || !phone ? T.text4 : '#FFFFFF',
            cursor: loading || !phone ? 'not-allowed' : 'pointer',
            fontSize: 15, fontWeight: 700,
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            transition: 'all 0.2s',
            boxShadow: loading || !phone ? 'none' : `0 4px 14px ${T.green}40`,
          }}>
          {loading
            ? <><Spinner color={T.text4} />&nbsp;Sending prompt...</>
            : <>Send payment prompt — {currency} {Number(localAmount).toLocaleString()}</>}
        </button>

        <p style={{ textAlign: 'center', fontSize: 10, color: T.text4, marginTop: 14, fontFamily: "'DM Mono', monospace" }}>
          Nardo Pay · Regulated mobile money operator
        </p>
      </div>
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
// STEP 4 — SUCCESS (shared)
// ══════════════════════════════════════════════════════════════════════════════
function SuccessScreen({ amount, newBalance, method }: {
  amount: number; newBalance: number; method: Method
}) {
  const navigate = useNavigate()
  const methodLabel = method === 'stripe' ? 'Card payment' : method === 'ziina' ? 'Ziina transfer' : 'Mobile money'

  return (
    <div style={{
      ...pageStyle, background: T.surface,
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center', padding: '24px 20px',
    }}>
      <style>{fonts}</style>
      <div style={{ width: '100%', maxWidth: 360, textAlign: 'center', animation: 'fadeUp 0.5s ease' }}>

        <div style={{
          width: 72, height: 72, borderRadius: '50%',
          background: 'rgba(5,150,105,0.08)', border: '1.5px solid rgba(5,150,105,0.3)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 20px', animation: 'scaleIn 0.4s 0.1s ease both',
        }}>
          <CheckCircle size={32} color={T.green} />
        </div>

        <h2 style={{ fontSize: 26, fontWeight: 900, color: T.green, marginBottom: 6, letterSpacing: -0.5 }}>
          Credits Added!
        </h2>
        <p style={{ fontSize: 13, color: T.text3, marginBottom: 8, lineHeight: 1.6 }}>
          ${amount.toFixed(2)} loaded via {methodLabel}
        </p>

        {/* New balance card */}
        <div style={{
          background: T.surface, border: `1px solid ${T.border}`,
          borderRadius: 20, padding: '28px 24px', marginBottom: 24,
          position: 'relative', overflow: 'hidden',
          boxShadow: '0 4px 16px rgba(0,0,0,0.06)',
        }}>
          <div style={{
            position: 'absolute', top: 0, left: 0, right: 0, height: 3,
            background: `linear-gradient(90deg, ${T.amber}, transparent)`,
          }} />
          <p style={{
            fontSize: 9, color: T.text3, letterSpacing: 3, marginBottom: 10,
            fontFamily: "'DM Mono', monospace", textTransform: 'uppercase',
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

// ══════════════════════════════════════════════════════════════════════════════
// ROOT — orchestrates all steps
// ══════════════════════════════════════════════════════════════════════════════
export default function TopUp() {
  const { user, setUser } = useAuth() as any

  const [step,          setStep]          = useState<Step>('method')
  const [method,        setMethod]        = useState<Method>('stripe')
  const [amount,        setAmount]        = useState(0)
  const [newBalance,    setNewBalance]    = useState(0)

  // Stripe-specific state
  const [clientSecret,  setClientSecret]  = useState('')
  const [stripePromise, setStripePromise] = useState<ReturnType<typeof loadStripe> | null>(null)

  // Ziina-specific state
  const [ziinaUrl,      setZiinaUrl]      = useState('')
  const [ziinaAed,      setZiinaAed]      = useState(0)
  const [ziinaRef,      setZiinaRef]      = useState('')

  const handleMethodSelect = (m: Method) => {
    setMethod(m)
    setStep('amount')
  }

  const handleAmountContinue = async (selectedAmount: number) => {
    setAmount(selectedAmount)

    if (method === 'stripe') {
      const res = await walletApi.createTopupIntent(user.user_id, selectedAmount)
      const { client_secret, publishable_key } = res.data
      setClientSecret(client_secret)
      setStripePromise(loadStripe(publishable_key))
      setStep('payment')
    }

    if (method === 'ziina') {
      const res = await walletApi.createZiinaTopup(user.user_id, selectedAmount)
      const { payment_url, ref, amount_aed } = res.data
      setZiinaUrl(payment_url)
      setZiinaRef(ref)
      setZiinaAed(amount_aed)
      setStep('payment')
    }

    if (method === 'nardo') {
      // Nardo collects phone on its own screen — just move to payment step
      setStep('payment')
    }
  }

  const handleSuccess = (bal: number) => {
    if (setUser) setUser({ ...user, balance: bal })
    setNewBalance(bal)
    setStep('success')
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  if (step === 'success') {
    return <SuccessScreen amount={amount} newBalance={newBalance} method={method} />
  }

  if (step === 'method') {
    return <MethodStep onSelect={handleMethodSelect} />
  }

  if (step === 'amount') {
    return (
      <AmountStep
        method={method}
        onContinue={handleAmountContinue}
        onBack={() => setStep('method')}
      />
    )
  }

  if (step === 'payment' && method === 'stripe' && clientSecret && stripePromise) {
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
        <StripeCheckoutForm
          amount={amount}
          onSuccess={handleSuccess}
          onBack={() => setStep('amount')}
        />
      </Elements>
    )
  }

  if (step === 'payment' && method === 'ziina') {
    return (
      <ZiinaCheckout
        amount={amount}
        paymentUrl={ziinaUrl}
        amountAed={ziinaAed}
        ref={ziinaRef}
        onSuccess={handleSuccess}
        onBack={() => setStep('amount')}
      />
    )
  }

  if (step === 'payment' && method === 'nardo') {
    return (
      <NardoCheckout
        amount={amount}
        onSuccess={handleSuccess}
        onBack={() => setStep('amount')}
      />
    )
  }

  // Fallback — shouldn't hit this
  return <MethodStep onSelect={handleMethodSelect} />
}
