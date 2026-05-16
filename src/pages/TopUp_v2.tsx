import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { walletApi } from '../lib/api'

const AMOUNTS = [5, 10, 20, 50]

// Generate idempotency key once per component mount
function useIdempotencyKey(userId: string) {
  const key = useRef(`topup_${userId}_${Date.now()}_${Math.random().toString(36).slice(2)}`)
  return key.current
}

export default function TopUp() {
  const [amount,  setAmount]  = useState(20)
  const [custom,  setCustom]  = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [newBal,  setNewBal]  = useState(0)
  const [error,   setError]   = useState('')
  const { user, setUser } = useAuth() as any
  const navigate = useNavigate()

  // Key is generated once — stays stable even if user taps Pay twice
  const idempotencyKey = useIdempotencyKey(user?.user_id || 'anon')

  const finalAmount    = custom ? Number(custom) : amount
  const currentBalance = Number(user?.balance || 0)

  const handleTopUp = async () => {
    if (!user) return
    if (finalAmount < 1)    { setError('Minimum top-up is $1'); return }
    if (finalAmount > 1000) { setError('Maximum top-up is $1,000'); return }
    if (isNaN(finalAmount)) { setError('Please enter a valid amount'); return }

    setLoading(true); setError('')

    try {
      // Pass idempotency key — server will deduplicate if tapped twice
      const res = await walletApi.createTopup(user.user_id, finalAmount, idempotencyKey)
      const newBalance = res.data.new_balance
      setNewBal(newBalance)
      if (setUser) setUser({ ...user, balance: newBalance })
      setSuccess(true)
    } catch (err: any) {
      setError(err.response?.data?.error || 'Top-up failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div style={{ minHeight:'100vh', background:'#03030a', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:'24px 20px' }}>
        <div style={{ width:'100%', maxWidth:360, textAlign:'center' }}>
          <div style={{ width:88, height:88, borderRadius:'50%', background:'rgba(16,185,129,0.12)', border:'2px solid rgba(16,185,129,0.3)', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 24px', fontSize:40 }}>✓</div>
          <h2 style={{ fontSize:26, fontWeight:800, color:'#10b981', marginBottom:8 }}>Account Loaded</h2>
          <p style={{ fontSize:14, color:'#64748b', marginBottom:20 }}>${finalAmount.toFixed(2)} added successfully</p>
          <div style={{ background:'#0f0f1a', border:'1px solid #1a1a2e', borderRadius:16, padding:'24px', marginBottom:28 }}>
            <p style={{ fontSize:11, color:'#334155', letterSpacing:3, marginBottom:10, fontFamily:'monospace' }}>NEW BALANCE</p>
            <p style={{ fontSize:44, fontWeight:800, color:'#00e5ff', fontFamily:'monospace', lineHeight:1 }}>${Number(newBal).toFixed(4)}</p>
          </div>
          <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
            <button onClick={() => navigate('/marketplace')} style={{ width:'100%', padding:'16px', borderRadius:14, border:'none', background:'#00e5ff', color:'#03030a', fontSize:15, fontWeight:700, cursor:'pointer' }}>Browse Marketplace →</button>
            <button onClick={() => navigate('/wallet')} style={{ width:'100%', padding:'16px', borderRadius:14, border:'1px solid #1a1a2e', background:'transparent', color:'#64748b', fontSize:14, cursor:'pointer' }}>Back to Account</button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div style={{ minHeight:'100vh', background:'#03030a', padding:'52px 20px 32px' }}>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>

      <button onClick={() => navigate('/wallet')} style={{ display:'flex', alignItems:'center', gap:8, background:'transparent', border:'none', color:'#64748b', fontSize:14, cursor:'pointer', marginBottom:32, padding:0 }}>← Back</button>

      <div style={{ maxWidth:400, margin:'0 auto' }}>
        <div style={{ marginBottom:28 }}>
          <p style={{ fontSize:11, color:'#334155', letterSpacing:3, fontFamily:'monospace', marginBottom:8 }}>ADD FUNDS</p>
          <h1 style={{ fontSize:28, fontWeight:800, color:'#e2e8f0', marginBottom:6 }}>Load your account</h1>
          <p style={{ fontSize:14, color:'#64748b' }}>Funds available instantly. Protected against double charges.</p>
        </div>

        <div style={{ background:'#0f0f1a', border:'1px solid #1a1a2e', borderRadius:14, padding:'16px 20px', marginBottom:24, display:'flex', justifyContent:'space-between', alignItems:'center' }}>
          <p style={{ fontSize:12, color:'#334155', fontFamily:'monospace', letterSpacing:2 }}>CURRENT BALANCE</p>
          <p style={{ fontSize:20, fontWeight:700, color:'#00e5ff', fontFamily:'monospace' }}>${currentBalance.toFixed(4)}</p>
        </div>

        <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:10, marginBottom:16 }}>
          {AMOUNTS.map(a => (
            <button key={a} onClick={() => { setAmount(a); setCustom('') }}
              style={{ padding:'14px 8px', borderRadius:12, border:`1px solid ${amount===a&&!custom?'#00e5ff':'#1a1a2e'}`, background:amount===a&&!custom?'rgba(0,229,255,0.1)':'#0f0f1a', color:amount===a&&!custom?'#00e5ff':'#64748b', fontSize:15, fontWeight:700, cursor:'pointer', transition:'all 0.15s' }}>
              ${a}
            </button>
          ))}
        </div>

        <div style={{ marginBottom:20 }}>
          <label style={{ display:'block', fontSize:11, color:'#64748b', letterSpacing:2, fontFamily:'monospace', marginBottom:8 }}>CUSTOM AMOUNT (USD)</label>
          <input type="number" value={custom} onChange={e => setCustom(e.target.value)} placeholder="Enter amount..." min="1" max="1000"
            style={{ width:'100%', padding:'14px 16px', borderRadius:12, border:`1px solid ${custom?'#00e5ff':'#1a1a2e'}`, background:'#0f0f1a', color:'#e2e8f0', fontSize:16, fontFamily:'monospace', outline:'none', boxSizing:'border-box' }} />
        </div>

        <div style={{ background:'#0f0f1a', border:'1px solid #1a1a2e', borderRadius:14, padding:'16px 20px', marginBottom:20 }}>
          <div style={{ display:'flex', justifyContent:'space-between', marginBottom:10 }}>
            <span style={{ fontSize:13, color:'#64748b' }}>Adding</span>
            <span style={{ fontSize:13, fontFamily:'monospace', color:'#e2e8f0' }}>${isNaN(finalAmount)?'0.00':finalAmount.toFixed(2)}</span>
          </div>
          <div style={{ display:'flex', justifyContent:'space-between' }}>
            <span style={{ fontSize:13, color:'#64748b' }}>Balance after</span>
            <span style={{ fontSize:13, fontFamily:'monospace', color:'#00e5ff', fontWeight:700 }}>${(currentBalance+(isNaN(finalAmount)?0:finalAmount)).toFixed(4)}</span>
          </div>
        </div>

        {error && (
          <div style={{ marginBottom:16, padding:'12px 16px', borderRadius:10, background:'rgba(239,68,68,0.08)', border:'1px solid rgba(239,68,68,0.2)' }}>
            <p style={{ fontSize:13, color:'#ef4444' }}>{error}</p>
          </div>
        )}

        <button onClick={handleTopUp} disabled={loading||isNaN(finalAmount)||finalAmount<1}
          style={{ width:'100%', padding:'16px', borderRadius:14, border:'none', background:'#00e5ff', color:'#03030a', fontSize:15, fontWeight:700, cursor:loading?'not-allowed':'pointer', opacity:loading||isNaN(finalAmount)||finalAmount<1?0.5:1, display:'flex', alignItems:'center', justifyContent:'center', gap:8 }}>
          {loading ? (
            <><div style={{ width:16, height:16, borderRadius:'50%', border:'2px solid rgba(3,3,10,0.3)', borderTopColor:'#03030a', animation:'spin 0.8s linear infinite' }} />Adding funds...</>
          ) : `Add $${isNaN(finalAmount)?'0.00':finalAmount.toFixed(2)} →`}
        </button>

        <p style={{ textAlign:'center', fontSize:11, color:'#1a2a3a', marginTop:16, fontFamily:'monospace' }}>
          Protected by idempotency · No double charges · Ever
        </p>
      </div>
    </div>
  )
}
