import { useState, useEffect, useRef, forwardRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { walletApi, api } from '../lib/api'

const CATEGORY_CONFIG: Record<string, { icon: string; accent: string; bg: string }> = {
  AI:        { icon: '🤖', accent: '#00e5ff', bg: '#001a1a' },
  Data:      { icon: '📊', accent: '#a855f7', bg: '#0d001a' },
  Education: { icon: '📚', accent: '#f59e0b', bg: '#1a1000' },
  Media:     { icon: '🎬', accent: '#e50914', bg: '#1a0000' },
  Finance:   { icon: '💳', accent: '#10b981', bg: '#001a0d' },
  Health:    { icon: '🏥', accent: '#ec4899', bg: '#1a0010' },
  General:   { icon: '⚡', accent: '#64748b', bg: '#0a0a14' },
}
const getConfig = (cat: string) => CATEGORY_CONFIG[cat] || CATEGORY_CONFIG['General']

interface Service { endpoint_id: string; path: string; price: number; service_name: string; description: string; category: string }
interface Merchant { merchant_id: string; merchant_name: string; services: Service[] }
interface PayState { step: 'idle'|'confirm'|'paying'|'success'|'error'; merchant: Merchant|null; service: Service|null; balanceBefore: number; balanceAfter: number; error: string }

export default function Marketplace() {
  const { user, setUser } = useAuth() as any
  const navigate = useNavigate()
  const [balance, setBalance] = useState<number>(Number(user?.balance ?? 0))
  const [demoMode, setDemoMode] = useState(false)
  const [demoBalance, setDemoBalance] = useState(19.998)
  const [merchants, setMerchants] = useState<Merchant[]>([])
  const [loading, setLoading] = useState(true)
  const [history, setHistory] = useState<{name:string;price:number;time:Date}[]>([])
  const [pay, setPay] = useState<PayState>({ step:'idle', merchant:null, service:null, balanceBefore:0, balanceAfter:0, error:'' })
  const [unlocked, setUnlocked] = useState<string|null>(null)
  const overlayRef = useRef<HTMLDivElement>(null)
  const currentBalance = demoMode ? demoBalance : balance

  useEffect(() => {
    api.get('/marketplace')
      .then(r => setMerchants(r.data.merchants || []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    if (!demoMode && user?.user_id) {
      walletApi.balance(user.user_id).then(r => setBalance(Number(r.data.balance))).catch(() => {})
    }
  }, [user, demoMode])

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (overlayRef.current && e.target === overlayRef.current && pay.step === 'confirm') closeOverlay()
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [pay.step])

  function openConfirm(merchant: Merchant, service: Service) {
    setPay({ step:'confirm', merchant, service, balanceBefore: currentBalance, balanceAfter: Math.max(0, currentBalance - service.price), error:'' })
  }

  async function confirmPay() {
    if (!pay.merchant || !pay.service) return
    setPay(p => ({ ...p, step: 'paying' }))
    if (demoMode) {
      await new Promise(r => setTimeout(r, 900))
      const newBal = Math.max(0, demoBalance - pay.service!.price)
      setDemoBalance(newBal)
      setHistory(h => [{ name: pay.service!.service_name, price: pay.service!.price, time: new Date() }, ...h.slice(0,9)])
      setUnlocked(pay.service!.endpoint_id)
      setPay(p => ({ ...p, step: 'success', balanceAfter: newBal }))
    } else {
      try {
        const res = await walletApi.pay({ user_id: user?.user_id, merchant_id: pay.merchant!.merchant_id, endpoint_id: pay.service!.endpoint_id, amount: pay.service!.price })
        const newBal = Number(res.data.balance_after)
        setBalance(newBal)
        if (setUser) setUser({ ...user, balance: newBal })
        setHistory(h => [{ name: pay.service!.service_name, price: pay.service!.price, time: new Date() }, ...h.slice(0,9)])
        setUnlocked(pay.service!.endpoint_id)
        setPay(p => ({ ...p, step: 'success', balanceAfter: newBal }))
      } catch (e: any) {
        setPay(p => ({ ...p, step: 'error', error: e?.response?.data?.error || 'Payment failed' }))
      }
    }
  }

  function closeOverlay() {
    setPay({ step:'idle', merchant:null, service:null, balanceBefore:0, balanceAfter:0, error:'' })
    setUnlocked(null)
  }

  return (
    <div style={{ minHeight:'100vh', background:'#03030a', color:'#e2e8f0', fontFamily:'system-ui,sans-serif' }}>
      <div style={{ position:'sticky', top:0, zIndex:50, background:'rgba(3,3,10,0.95)', backdropFilter:'blur(16px)', borderBottom:'1px solid #0d0d1e', padding:'0 24px' }}>
        <div style={{ maxWidth:960, margin:'0 auto', display:'flex', alignItems:'center', justifyContent:'space-between', height:60 }}>
          <div style={{ display:'flex', alignItems:'center', gap:16 }}>
            <button onClick={() => navigate('/wallet')} style={{ background:'none', border:'none', color:'#64748b', cursor:'pointer', fontSize:20 }}>←</button>
            <span style={{ fontFamily:'monospace', fontSize:14, color:'#00e5ff', letterSpacing:3, fontWeight:700 }}>SYNTHPAY</span>
            <span style={{ fontSize:12, color:'#334155', letterSpacing:2 }}>MARKETPLACE</span>
          </div>
          <div style={{ display:'flex', alignItems:'center', gap:12 }}>
            <button onClick={() => setDemoMode(d => !d)} style={{ padding:'6px 14px', borderRadius:6, fontSize:12, cursor:'pointer', fontFamily:'monospace', background: demoMode ? 'rgba(245,158,11,0.15)' : 'rgba(255,255,255,0.05)', border:`1px solid ${demoMode ? '#f59e0b' : '#1a1a2e'}`, color: demoMode ? '#f59e0b' : '#64748b' }}>
              {demoMode ? '⚡ DEMO MODE' : 'DEMO MODE'}
            </button>
            <div style={{ background:'#0f0f1a', border:'1px solid #1a1a2e', borderRadius:8, padding:'8px 16px', display:'flex', alignItems:'center', gap:10 }}>
              <span style={{ fontSize:11, color:'#334155', letterSpacing:2 }}>BALANCE</span>
              <span style={{ fontFamily:'monospace', fontSize:16, fontWeight:700, color:'#00e5ff' }}>${currentBalance.toFixed(4)}</span>
            </div>
          </div>
        </div>
      </div>

      <div style={{ maxWidth:960, margin:'0 auto', padding:'48px 24px' }}>
        <div style={{ marginBottom:48 }}>
          <p style={{ fontSize:11, letterSpacing:3, color:'#334155', marginBottom:12, fontFamily:'monospace' }}>
            {demoMode ? '⚡ DEMO MODE' : '// SYNTHPAY ENABLED SERVICES'}
          </p>
          <h1 style={{ fontSize:36, fontWeight:700, margin:0, lineHeight:1.2 }}>Pay per use.<br/><span style={{ color:'#00e5ff' }}>Not per month.</span></h1>
          <p style={{ marginTop:12, color:'#64748b', fontSize:15, maxWidth:480 }}>Every service charges per use — fractions of a cent, settled instantly.</p>
        </div>

        {loading && <div style={{ textAlign:'center', padding:80 }}><p style={{ color:'#334155', fontFamily:'monospace', letterSpacing:2 }}>LOADING SERVICES...</p></div>}
        {!loading && merchants.length === 0 && (
          <div style={{ textAlign:'center', padding:80, background:'#0f0f1a', borderRadius:16, border:'1px dashed #1a1a2e' }}>
            <p style={{ color:'#334155', fontSize:14 }}>No services available yet.</p>
            <p style={{ color:'#1a2a3a', fontSize:12, marginTop:4 }}>Merchants register at synthpay-dashboard.vercel.app</p>
          </div>
        )}

        {!loading && merchants.map(merchant => (
          <div key={merchant.merchant_id} style={{ marginBottom:48 }}>
            <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:20 }}>
              <div style={{ width:40, height:40, borderRadius:10, background:'#0f0f1a', border:'1px solid #1a1a2e', display:'flex', alignItems:'center', justifyContent:'center', fontSize:18 }}>
                {getConfig(merchant.services[0]?.category || 'General').icon}
              </div>
              <div>
                <h2 style={{ margin:0, fontSize:18, fontWeight:700, color:'#e2e8f0' }}>{merchant.merchant_name}</h2>
                <p style={{ margin:0, fontSize:12, color:'#334155' }}>{merchant.services.length} service{merchant.services.length !== 1 ? 's' : ''}</p>
              </div>
              <div style={{ marginLeft:'auto', fontSize:11, color:'#334155', fontFamily:'monospace', background:'#0f0f1a', padding:'4px 10px', borderRadius:6, border:'1px solid #1a1a2e' }}>SYNTHPAY ENABLED</div>
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(280px, 1fr))', gap:16 }}>
              {merchant.services.map(service => (
                <ServiceCard key={service.endpoint_id} merchant={merchant} service={service} balance={currentBalance} unlocked={unlocked === service.endpoint_id} onPay={() => openConfirm(merchant, service)} />
              ))}
            </div>
          </div>
        ))}

        {history.length > 0 && (
          <div style={{ background:'#0a0a14', border:'1px solid #0d0d1e', borderRadius:12, padding:24 }}>
            <p style={{ fontSize:11, letterSpacing:3, color:'#334155', marginBottom:16, fontFamily:'monospace' }}>RECENT TRANSACTIONS</p>
            {history.map((tx, i) => (
              <div key={i} style={{ display:'flex', justifyContent:'space-between', padding:'10px 0', borderBottom: i < history.length-1 ? '1px solid #0d0d1e' : 'none' }}>
                <div><span style={{ fontSize:14, color:'#e2e8f0' }}>{tx.name}</span><span style={{ fontSize:12, color:'#334155', marginLeft:12 }}>{tx.time.toLocaleTimeString()}</span></div>
                <span style={{ fontFamily:'monospace', fontSize:14, color:'#10b981' }}>-${tx.price.toFixed(4)}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {pay.step !== 'idle' && pay.service && (
        <PaymentOverlay ref={overlayRef} pay={pay} onConfirm={confirmPay} onClose={closeOverlay} demoMode={demoMode} />
      )}
    </div>
  )
}

function ServiceCard({ merchant, service, balance, unlocked, onPay }: { merchant: Merchant; service: Service; balance: number; unlocked: boolean; onPay: () => void }) {
  const [hovered, setHovered] = useState(false)
  const config = getConfig(service.category)
  const canAfford = balance >= service.price
  return (
    <div onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}
         style={{ background: hovered ? config.bg : '#0a0a14', border:`1px solid ${hovered ? config.accent+'40' : '#0d0d1e'}`, borderRadius:16, padding:24, transition:'all 0.25s ease', transform: hovered ? 'translateY(-4px)' : 'none', boxShadow: hovered ? `0 12px 40px ${config.accent}18` : 'none', position:'relative', overflow:'hidden' }}>
      {hovered && <div style={{ position:'absolute', top:0, left:0, right:0, height:2, background:`linear-gradient(90deg, transparent, ${config.accent}, transparent)` }} />}
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:14 }}>
        <span style={{ fontSize:10, letterSpacing:2, color:config.accent, fontFamily:'monospace', fontWeight:700 }}>{service.category.toUpperCase()}</span>
        <span style={{ fontSize:24 }}>{config.icon}</span>
      </div>
      <h3 style={{ margin:'0 0 8px', fontSize:17, fontWeight:700, color:'#e2e8f0' }}>{service.service_name}</h3>
      <p style={{ margin:'0 0 20px', fontSize:13, color:'#64748b', lineHeight:1.5 }}>{service.description || 'API service'}</p>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
        <div>
          <span style={{ fontFamily:'monospace', fontSize:22, fontWeight:700, color:config.accent }}>${service.price.toFixed(4)}</span>
          <span style={{ fontSize:11, color:'#334155', marginLeft:6 }}>per use</span>
        </div>
        {unlocked ? (
          <div style={{ fontSize:12, color:'#10b981', fontFamily:'monospace', padding:'8px 14px', background:'rgba(16,185,129,0.1)', borderRadius:8, border:'1px solid rgba(16,185,129,0.2)' }}>✓ PAID</div>
        ) : (
          <button onClick={onPay} disabled={!canAfford} style={{ padding:'10px 20px', borderRadius:8, border:'none', cursor: canAfford ? 'pointer' : 'not-allowed', background: canAfford ? config.accent : '#1a1a2e', color: canAfford ? '#fff' : '#334155', fontSize:13, fontWeight:700, opacity: canAfford ? 1 : 0.5 }}>
            {canAfford ? 'Pay now' : 'Low balance'}
          </button>
        )}
      </div>
    </div>
  )
}

const PaymentOverlay = forwardRef<HTMLDivElement, { pay: PayState; onConfirm: () => void; onClose: () => void; demoMode: boolean }>(({ pay, onConfirm, onClose, demoMode }, ref) => {
  const service = pay.service!; const merchant = pay.merchant!; const config = getConfig(service.category)
  return (
    <div ref={ref} style={{ position:'fixed', inset:0, zIndex:100, background:'rgba(0,0,0,0.85)', backdropFilter:'blur(8px)', display:'flex', alignItems:'center', justifyContent:'center', padding:24 }}>
      <div style={{ background:'#0a0a14', border:`1px solid ${config.accent}40`, borderRadius:20, padding:36, width:'100%', maxWidth:420, position:'relative', boxShadow:`0 24px 80px ${config.accent}20` }}>
        <div style={{ position:'absolute', top:0, left:40, right:40, height:2, background:`linear-gradient(90deg, transparent, ${config.accent}, transparent)` }} />
        {pay.step === 'confirm' && (<>
          <div style={{ textAlign:'center', marginBottom:24 }}>
            <span style={{ fontSize:40 }}>{config.icon}</span>
            <h2 style={{ margin:'10px 0 4px', fontSize:20, fontWeight:700 }}>{service.service_name}</h2>
            <p style={{ margin:0, fontSize:13, color:'#64748b' }}>{merchant.merchant_name}</p>
          </div>
          <div style={{ background:'#050510', borderRadius:12, padding:20, marginBottom:20 }}>
            {([['Service', service.service_name, ''], ['Provider', merchant.merchant_name, ''], ['Price', `$${service.price.toFixed(4)}`, config.accent], ['---','',''], ['Current balance', `$${pay.balanceBefore.toFixed(4)}`, ''], ['Balance after', `$${pay.balanceAfter.toFixed(4)}`, '#10b981']] as [string,string,string][]).map(([l,v,c], i) =>
              l === '---' ? <div key={i} style={{ borderTop:'1px solid #0d0d1e', margin:'10px 0' }} /> :
              <div key={i} style={{ display:'flex', justifyContent:'space-between', marginBottom:8 }}>
                <span style={{ fontSize:13, color:'#64748b' }}>{l}</span>
                <span style={{ fontSize:13, fontFamily:'monospace', color: c || '#e2e8f0', fontWeight: l === 'Balance after' ? 700 : 400 }}>{v}</span>
              </div>
            )}
          </div>
          {demoMode && <p style={{ textAlign:'center', fontSize:11, color:'#f59e0b', marginBottom:16, fontFamily:'monospace' }}>⚡ DEMO MODE — NO REAL TRANSACTION</p>}
          <div style={{ display:'flex', gap:12 }}>
            <button onClick={onClose} style={{ flex:1, padding:14, borderRadius:10, border:'1px solid #1a1a2e', background:'none', color:'#64748b', cursor:'pointer', fontSize:14, fontWeight:600 }}>Cancel</button>
            <button onClick={onConfirm} style={{ flex:2, padding:14, borderRadius:10, border:'none', background:config.accent, color:'#fff', cursor:'pointer', fontSize:14, fontWeight:700 }}>Pay ${service.price.toFixed(4)} →</button>
          </div>
          <p style={{ textAlign:'center', fontSize:11, color:'#1a2a3a', marginTop:16, fontFamily:'monospace' }}>Secured by SynthPay · Funds held by Stripe</p>
        </>)}
        {pay.step === 'paying' && <div style={{ textAlign:'center', padding:'20px 0' }}><div style={{ fontSize:40, marginBottom:16 }}>⚡</div><h3 style={{ margin:'0 0 8px', fontSize:18 }}>Processing…</h3><p style={{ color:'#64748b', fontSize:14 }}>Settling on ledger</p></div>}
        {pay.step === 'success' && (<>
          <div style={{ textAlign:'center', marginBottom:24 }}>
            <div style={{ fontSize:52, marginBottom:12 }}>✓</div>
            <h2 style={{ margin:'0 0 8px', fontSize:22, color:'#10b981' }}>Payment confirmed</h2>
            <p style={{ color:'#64748b', fontSize:14, margin:0 }}>{merchant.merchant_name} · {demoMode ? 'Demo' : 'Live'}</p>
          </div>
          <div style={{ background:'#050510', border:`1px solid ${config.accent}30`, borderRadius:12, padding:20, marginBottom:20 }}>
            <p style={{ margin:'0 0 8px', fontSize:11, letterSpacing:2, color:config.accent, fontFamily:'monospace' }}>ACCESS GRANTED</p>
            <h3 style={{ margin:'0 0 4px', fontSize:16, fontWeight:700 }}>{service.service_name}</h3>
            <p style={{ margin:0, fontSize:13, color:'#64748b' }}>{service.description}</p>
          </div>
          <div style={{ background:'#050510', borderRadius:10, padding:16, marginBottom:20 }}>
            <div style={{ display:'flex', justifyContent:'space-between', marginBottom:8 }}><span style={{ fontSize:13, color:'#64748b' }}>Charged</span><span style={{ fontFamily:'monospace', fontSize:13, color:config.accent }}>${service.price.toFixed(4)}</span></div>
            <div style={{ display:'flex', justifyContent:'space-between' }}><span style={{ fontSize:13, color:'#64748b' }}>New balance</span><span style={{ fontFamily:'monospace', fontSize:13, color:'#10b981', fontWeight:700 }}>${pay.balanceAfter.toFixed(4)}</span></div>
          </div>
          <button onClick={onClose} style={{ width:'100%', padding:14, borderRadius:10, border:'1px solid #1a1a2e', background:'none', color:'#e2e8f0', cursor:'pointer', fontSize:14, fontWeight:600 }}>Back to marketplace</button>
        </>)}
        {pay.step === 'error' && <div style={{ textAlign:'center', padding:'20px 0' }}><div style={{ fontSize:40, marginBottom:16 }}>⚠️</div><h3 style={{ margin:'0 0 8px', color:'#ef4444' }}>Payment failed</h3><p style={{ color:'#64748b', fontSize:14, marginBottom:24 }}>{pay.error}</p><button onClick={onClose} style={{ padding:'12px 28px', borderRadius:8, border:'1px solid #1a1a2e', background:'none', color:'#e2e8f0', cursor:'pointer' }}>Close</button></div>}
      </div>
    </div>
  )
})
