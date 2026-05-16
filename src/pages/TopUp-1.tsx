import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { walletApi } from '../lib/api'

const AMOUNTS = [20, 50, 100, 200]

export default function TopUp() {
  const [amount,   setAmount]   = useState(20)
  const [custom,   setCustom]   = useState('')
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState('')
  const { user } = useAuth()
  const navigate  = useNavigate()

  const finalAmount = custom ? Number(custom) : amount

  const handleTopUp = async () => {
    if (!user) return
    if (finalAmount < 20) {
      setError('Minimum top-up is $20')
      return
    }
    if (finalAmount > 1000) {
      setError('Maximum top-up is $1,000')
      return
    }

    setLoading(true)
    setError('')

    try {
      const res = await walletApi.createTopup(user.user_id, finalAmount)
      const { client_secret, payment_intent_id } = res.data

      // In production this opens Stripe Payment Element
      // For now show the payment intent details
      alert(`Payment Intent created: ${payment_intent_id}\n\nIn production this opens the Stripe payment form.\n\nFor testing use the Stripe CLI to confirm this payment.`)

      navigate('/wallet')
    } catch (err: any) {
      setError(err.response?.data?.error || 'Top-up failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen px-6 pt-12" style={{ background: '#03030a' }}>

      {/* Back */}
      <button onClick={() => navigate('/wallet')}
              className="text-xs mb-8 flex items-center gap-2"
              style={{ color: '#64748b' }}>
        ← Back to account
      </button>

      <h1 className="text-xl font-bold text-white mb-2">Add Funds</h1>
      <p className="text-sm mb-8" style={{ color: '#64748b' }}>
        Minimum $20 · Maximum $1,000
      </p>

      {/* Preset Amounts */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        {AMOUNTS.map(a => (
          <button
            key={a}
            onClick={() => { setAmount(a); setCustom('') }}
            className="py-4 rounded-2xl font-semibold text-sm transition-all"
            style={{
              background: amount === a && !custom ? '#00e5ff' : '#0f0f1a',
              color:      amount === a && !custom ? '#03030a' : '#e2e8f0',
              border:     '1px solid #1a1a2e'
            }}>
            ${a}
          </button>
        ))}
      </div>

      {/* Custom Amount */}
      <div className="mb-8">
        <label className="block text-xs mb-2"
               style={{ color: '#64748b', letterSpacing: '2px' }}>
          CUSTOM AMOUNT
        </label>
        <div className="flex items-center rounded-2xl px-4"
             style={{ background: '#0f0f1a', border: '1px solid #1a1a2e' }}>
          <span style={{ color: '#64748b' }}>$</span>
          <input
            type="number"
            value={custom}
            onChange={(e) => setCustom(e.target.value)}
            placeholder="Enter amount"
            className="flex-1 py-4 px-2 bg-transparent outline-none text-sm"
            style={{ color: '#e2e8f0' }}
          />
        </div>
      </div>

      {/* Summary */}
      <div className="rounded-2xl p-5 mb-6"
           style={{ background: '#0f0f1a', border: '1px solid #1a1a2e' }}>
        <div className="flex justify-between text-sm mb-2">
          <span style={{ color: '#64748b' }}>Amount</span>
          <span style={{ color: '#e2e8f0', fontFamily: 'monospace' }}>
            ${finalAmount.toFixed(2)}
          </span>
        </div>
        <div className="flex justify-between text-sm mb-2">
          <span style={{ color: '#64748b' }}>Processing fee</span>
          <span style={{ color: '#e2e8f0', fontFamily: 'monospace' }}>$0.30</span>
        </div>
        <div className="h-px my-3" style={{ background: '#1a1a2e' }} />
        <div className="flex justify-between font-semibold">
          <span style={{ color: '#e2e8f0' }}>Account credit</span>
          <span style={{ color: '#00e5ff', fontFamily: 'monospace' }}>
            ${finalAmount.toFixed(2)}
          </span>
        </div>
        <p className="text-xs mt-2" style={{ color: '#334155' }}>
          Covers ~{Math.floor(finalAmount / 0.002).toLocaleString()} API calls at $0.002 each
        </p>
      </div>

      {error && (
        <p className="text-xs mb-4 text-center" style={{ color: '#ef4444' }}>
          {error}
        </p>
      )}

      {/* Pay Button */}
      <button
        onClick={handleTopUp}
        disabled={loading}
        className="w-full py-4 rounded-2xl font-semibold text-sm"
        style={{
          background: '#00e5ff',
          color:      '#03030a',
          opacity:    loading ? 0.5 : 1
        }}>
        {loading ? 'Processing...' : `Add $${finalAmount.toFixed(2)}`}
      </button>

    </div>
  )
}