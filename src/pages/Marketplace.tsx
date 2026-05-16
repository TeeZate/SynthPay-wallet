import { useState, useEffect, useRef, forwardRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { walletApi, api } from '../lib/api'
import { analytics } from '../lib/analytics'
import { Bot, BarChart2, BookOpen, Film, CreditCard, Heart, Zap, ArrowLeft, Search, CheckCircle, AlertCircle } from 'lucide-react'

const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  AI:        <Bot size={16} />,
  Data:      <BarChart2 size={16} />,
  Education: <BookOpen size={16} />,
  Media:     <Film size={16} />,
  Finance:   <CreditCard size={16} />,
  Health:    <Heart size={16} />,
  General:   <Zap size={16} />,
}

const CATEGORY_ACCENTS: Record<string, string> = {
  AI:        '#F59B00',
  Data:      '#a855f7',
  Education: '#F59B00',
  Media:     '#e50914',
  Finance:   '#059669',
  Health:    '#ec4899',
  General:   '#4A4845',
}

const CATEGORY_CONFIG: Record<string, { accent: string }> = {
  AI:        { accent: '#F59B00' },
  Data:      { accent: '#a855f7' },
  Education: { accent: '#F59B00' },
  Media:     { accent: '#e50914' },
  Finance:   { accent: '#059669' },
  Health:    { accent: '#ec4899' },
  General:   { accent: '#4A4845' },
}
const getConfig = (cat: string) => CATEGORY_CONFIG[cat] || CATEGORY_CONFIG['General']

interface Service { endpoint_id: string; path: string; price: number; service_name: string; description: string; category: string }
interface Merchant { merchant_id: string; merchant_name: string; services: Service[] }
interface PayState { step: 'idle'|'confirm'|'paying'|'success'|'error'; merchant: Merchant|null; service: Service|null; balanceBefore: number; balanceAfter: number; error: string }

const ALL_CATEGORIES = ['All', 'AI', 'Data', 'Education', 'Media', 'Finance', 'Health', 'General']

const T = {
  amber: '#F59B00', amberPale: 'rgba(245,155,0,0.08)', amberBd: 'rgba(245,155,0,0.2)',
  bg: '#F7F5F2', surface: '#FFFFFF', surface2: '#F3F1EE',
  border: '#E8E4DF', border2: '#D4CFC9',
  text1: '#0D0C0A', text2: '#4A4845', text3: '#9A958F', text4: '#C4BFB9',
  green: '#059669', red: '#DC2626', navy: '#111827',
}

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
  const [search, setSearch] = useState('')
  const [activeCategory, setActiveCategory] = useState('All')
  const overlayRef = useRef<HTMLDivElement>(null)
  const currentBalance = demoMode ? demoBalance : balance

  // ── Derived: filtered + searched merchant list ─────────────────────────────
  const filteredMerchants = merchants.map(m => ({
    ...m,
    services: m.services.filter(s => {
      const matchCat = activeCategory === 'All' || s.category === activeCategory
      const q        = search.toLowerCase().trim()
      const matchQ   = !q || s.service_name.toLowerCase().includes(q) || s.description?.toLowerCase().includes(q) || m.merchant_name.toLowerCase().includes(q)
      return matchCat && matchQ
    })
  })).filter(m => m.services.length > 0)

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
        analytics.track('service_purchased', {
          service_name: pay.service!.service_name,
          merchant:     pay.merchant!.merchant_name,
          category:     pay.service!.category,
          price:        pay.service!.price,
          balance_after: newBal,
        })
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
    <div style={{ minHeight:'100vh', background: T.bg, fontFamily:"'DM Sans', system-ui, sans-serif" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700;900&family=DM+Mono:wght@300;400;500&display=swap');`}</style>

      {/* Nav */}
      <div style={{ position:'sticky', top:0, zIndex:50, background: T.surface, borderBottom:`1px solid ${T.border}`, padding:'0 20px' }}>
        <div style={{ maxWidth:960, margin:'0 auto', display:'flex', alignItems:'center', justifyContent:'space-between', height:60 }}>
          <div style={{ display:'flex', alignItems:'center', gap:12 }}>
            <button onClick={() => navigate('/wallet')} style={{
              width: 36, height: 36, borderRadius: '50%',
              border: `1px solid ${T.border}`, background: T.surface2,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor:'pointer', color: T.text2,
            }}>
              <ArrowLeft size={16} />
            </button>
            <span style={{ fontWeight: 700, fontSize: 16, color: T.text1 }}>Marketplace</span>
          </div>
          <div style={{ display:'flex', alignItems:'center', gap:12 }}>
            <button onClick={() => setDemoMode(d => !d)} style={{
              padding:'6px 14px', borderRadius:20, fontSize:12, cursor:'pointer',
              fontFamily:"'DM Mono', monospace",
              background: demoMode ? T.amberPale : T.surface2,
              border:`1px solid ${demoMode ? T.amberBd : T.border}`,
              color: demoMode ? T.amber : T.text3,
            }}>
              {demoMode ? 'DEMO ON' : 'DEMO'}
            </button>
            <div style={{
              background: T.surface2, border:`1px solid ${T.border}`,
              borderRadius:10, padding:'6px 14px',
              display:'flex', alignItems:'center', gap:8,
            }}>
              <span style={{ fontSize:10, color: T.text3, letterSpacing:1, fontFamily:"'DM Mono', monospace" }}>BAL</span>
              <span style={{ fontFamily:"'DM Mono', monospace", fontSize:14, fontWeight:700, color: T.navy }}>${currentBalance.toFixed(4)}</span>
            </div>
          </div>
        </div>
      </div>

      <div style={{ maxWidth:960, margin:'0 auto', padding:'32px 20px' }}>
        <div style={{ marginBottom:28 }}>
          <p style={{ fontSize:10, letterSpacing:3, color: T.text3, marginBottom:10, fontFamily:"'DM Mono', monospace" }}>
            {demoMode ? 'DEMO MODE' : 'SYNTHPAY ENABLED SERVICES'}
          </p>
          <h1 style={{ fontSize:30, fontWeight:800, margin:0, lineHeight:1.2, color: T.text1 }}>
            Pay per use.<br/><span style={{ color: T.amber }}>Not per month.</span>
          </h1>
          <p style={{ marginTop:10, color: T.text3, fontSize:14, maxWidth:480 }}>Every service charges per use — fractions of a cent, settled instantly.</p>
        </div>

        {/* Search bar */}
        <div style={{ position:'relative', marginBottom:16 }}>
          <span style={{ position:'absolute', left:14, top:'50%', transform:'translateY(-50%)', color: T.text3 }}>
            <Search size={16} />
          </span>
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search services, providers..."
            style={{
              width:'100%', padding:'12px 14px 12px 42px',
              borderRadius:12, border:`1px solid ${T.border}`,
              background: T.surface, color: T.text1,
              fontSize:14, outline:'none', boxSizing:'border-box',
              fontFamily:"'DM Sans', system-ui, sans-serif",
            }}
          />
          {search && (
            <button onClick={() => setSearch('')} style={{
              position:'absolute', right:14, top:'50%', transform:'translateY(-50%)',
              background:'none', border:'none', color: T.text3, cursor:'pointer', fontSize:18, lineHeight:1,
            }}>×</button>
          )}
        </div>

        {/* Category pills */}
        <div style={{ display:'flex', gap:8, flexWrap:'wrap', marginBottom:32, overflowX:'auto', paddingBottom:4 }}>
          {ALL_CATEGORIES.map(cat => {
            const active = activeCategory === cat
            const accent = cat !== 'All' ? CATEGORY_ACCENTS[cat] : T.navy
            return (
              <button key={cat} onClick={() => setActiveCategory(cat)}
                style={{
                  padding:'6px 16px', borderRadius:20,
                  border:`1px solid ${active ? (cat === 'All' ? T.navy : accent) : T.border}`,
                  background: active ? (cat === 'All' ? T.navy : `${accent}18`) : T.surface,
                  color: active ? (cat === 'All' ? '#FFFFFF' : accent) : T.text3,
                  fontSize:12, fontWeight:600, cursor:'pointer', whiteSpace:'nowrap', transition:'all 0.15s',
                  display:'flex', alignItems:'center', gap:6,
                }}>
                {cat !== 'All' && CATEGORY_ICONS[cat]}
                {cat}
              </button>
            )
          })}
        </div>

        {loading && (
          <div style={{ textAlign:'center', padding:80 }}>
            <p style={{ color: T.text3, fontFamily:"'DM Mono', monospace", letterSpacing:2 }}>LOADING SERVICES...</p>
          </div>
        )}

        {!loading && merchants.length === 0 && (
          <div style={{ textAlign:'center', padding:80, background: T.surface, borderRadius:16, border:`1px dashed ${T.border2}` }}>
            <p style={{ color: T.text3, fontSize:14 }}>No services available yet.</p>
            <p style={{ color: T.text4, fontSize:12, marginTop:4 }}>Merchants register at synthpay-dashboard.vercel.app</p>
          </div>
        )}

        {!loading && merchants.length > 0 && filteredMerchants.length === 0 && (
          <div style={{ textAlign:'center', padding:60, background: T.surface, borderRadius:16, border:`1px dashed ${T.border2}` }}>
            <Search size={28} color={T.text4} style={{ margin:'0 auto 12px', display:'block' }} />
            <p style={{ color: T.text3, fontSize:14 }}>No results for "{search || activeCategory}"</p>
            <button onClick={() => { setSearch(''); setActiveCategory('All') }} style={{ marginTop:12, padding:'8px 20px', borderRadius:8, border:`1px solid ${T.border}`, background:'none', color: T.text2, cursor:'pointer', fontSize:13 }}>Clear filters</button>
          </div>
        )}

        {!loading && filteredMerchants.map(merchant => (
          <div key={merchant.merchant_id} style={{ marginBottom:40 }}>
            <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:16 }}>
              <div style={{
                width:40, height:40, borderRadius:10,
                background: T.surface2, border:`1px solid ${T.border}`,
                display:'flex', alignItems:'center', justifyContent:'center',
                color: T.text2,
              }}>
                {CATEGORY_ICONS[merchant.services[0]?.category || 'General'] || <Zap size={18} />}
              </div>
              <div>
                <h2 style={{ margin:0, fontSize:16, fontWeight:700, color: T.text1 }}>{merchant.merchant_name}</h2>
                <p style={{ margin:0, fontSize:12, color: T.text3 }}>{merchant.services.length} service{merchant.services.length !== 1 ? 's' : ''}</p>
              </div>
              <div style={{
                marginLeft:'auto', fontSize:10, color: T.text3,
                fontFamily:"'DM Mono', monospace",
                background: T.surface2, padding:'4px 10px',
                borderRadius:6, border:`1px solid ${T.border}`,
                letterSpacing:1,
              }}>SYNTHPAY</div>
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(280px, 1fr))', gap:16 }}>
              {merchant.services.map((service, si) => (
                <ServiceCard key={service.endpoint_id} merchant={merchant} service={service} balance={currentBalance} unlocked={unlocked === service.endpoint_id} onPay={() => openConfirm(merchant, service)} featured={si === 0 && filteredMerchants.indexOf(merchant) === 0} />
              ))}
            </div>
          </div>
        ))}

        {history.length > 0 && (
          <div style={{ background: T.surface, border:`1px solid ${T.border}`, borderRadius:12, padding:24, boxShadow:'0 4px 16px rgba(0,0,0,0.06)' }}>
            <p style={{ fontSize:10, letterSpacing:3, color: T.text3, marginBottom:16, fontFamily:"'DM Mono', monospace" }}>RECENT TRANSACTIONS</p>
            {history.map((tx, i) => (
              <div key={i} style={{ display:'flex', justifyContent:'space-between', padding:'10px 0', borderBottom: i < history.length-1 ? `1px solid ${T.border}` : 'none' }}>
                <div>
                  <span style={{ fontSize:14, color: T.text1 }}>{tx.name}</span>
                  <span style={{ fontSize:12, color: T.text3, marginLeft:12 }}>{tx.time.toLocaleTimeString()}</span>
                </div>
                <span style={{ fontFamily:"'DM Mono', monospace", fontSize:14, color: T.red }}>-${tx.price.toFixed(4)}</span>
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

function ServiceCard({ merchant, service, balance, unlocked, onPay, featured }: { merchant: Merchant; service: Service; balance: number; unlocked: boolean; onPay: () => void; featured?: boolean }) {
  const [hovered, setHovered] = useState(false)
  const config = getConfig(service.category)
  const canAfford = balance >= service.price
  return (
    <div onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}
         style={{
           background: T.surface,
           border:`1px solid ${hovered ? config.accent+'60' : featured ? config.accent+'30' : T.border}`,
           borderRadius:16, padding:24,
           transition:'all 0.25s ease',
           transform: hovered ? 'translateY(-4px)' : 'none',
           boxShadow: hovered ? `0 12px 32px rgba(0,0,0,0.08)` : '0 4px 16px rgba(0,0,0,0.06)',
           position:'relative', overflow:'hidden',
         }}>
      {(hovered || featured) && (
        <div style={{ position:'absolute', top:0, left:0, right:0, height:2, background:`linear-gradient(90deg, transparent, ${config.accent}, transparent)` }} />
      )}
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:14 }}>
        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
          <span style={{ fontSize:10, letterSpacing:2, color: config.accent, fontFamily:"'DM Mono', monospace", fontWeight:700 }}>
            {service.category.toUpperCase()}
          </span>
          {featured && (
            <span style={{ fontSize:9, letterSpacing:1, color: T.amber, fontFamily:"'DM Mono', monospace", background: T.amberPale, border:`1px solid ${T.amberBd}`, padding:'2px 6px', borderRadius:4 }}>
              FEATURED
            </span>
          )}
        </div>
        <div style={{ color: config.accent }}>
          {CATEGORY_ICONS[service.category] || <Zap size={16} />}
        </div>
      </div>
      <h3 style={{ margin:'0 0 8px', fontSize:16, fontWeight:700, color: T.text1 }}>{service.service_name}</h3>
      <p style={{ margin:'0 0 20px', fontSize:13, color: T.text3, lineHeight:1.5 }}>{service.description || 'API service'}</p>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
        <div>
          <span style={{
            fontFamily:"'DM Mono', monospace", fontSize:18, fontWeight:700,
            background: T.amberPale, color: T.amber,
            padding:'4px 10px', borderRadius:8,
          }}>${service.price.toFixed(4)}</span>
          <span style={{ fontSize:11, color: T.text3, marginLeft:6 }}>per use</span>
        </div>
        {unlocked ? (
          <div style={{
            fontSize:12, color: T.green, fontFamily:"'DM Mono', monospace",
            padding:'8px 14px', background:'rgba(5,150,105,0.08)',
            borderRadius:8, border:'1px solid rgba(5,150,105,0.2)',
            display:'flex', alignItems:'center', gap:6,
          }}>
            <CheckCircle size={14} />
            PAID
          </div>
        ) : (
          <button onClick={onPay} disabled={!canAfford} style={{
            padding:'10px 20px', borderRadius:8, border:'none',
            cursor: canAfford ? 'pointer' : 'not-allowed',
            background: canAfford ? T.navy : T.surface2,
            color: canAfford ? '#FFFFFF' : T.text4,
            fontSize:13, fontWeight:700,
            opacity: canAfford ? 1 : 0.7,
          }}>
            {canAfford ? 'Use API' : 'Low balance'}
          </button>
        )}
      </div>
    </div>
  )
}

const PaymentOverlay = forwardRef<HTMLDivElement, { pay: PayState; onConfirm: () => void; onClose: () => void; demoMode: boolean }>(({ pay, onConfirm, onClose, demoMode }, ref) => {
  const service = pay.service!; const merchant = pay.merchant!; const config = getConfig(service.category)
  return (
    <div ref={ref} style={{
      position:'fixed', inset:0, zIndex:100,
      background:'rgba(0,0,0,0.4)', backdropFilter:'blur(4px)',
      display:'flex', alignItems:'center', justifyContent:'center', padding:24,
    }}>
      <div style={{
        background: T.surface, border:`1px solid ${T.border}`,
        borderRadius:20, padding:32, width:'100%', maxWidth:420,
        position:'relative',
        boxShadow:'0 24px 80px rgba(0,0,0,0.12)',
      }}>
        <div style={{ position:'absolute', top:0, left:40, right:40, height:3, background:`linear-gradient(90deg, transparent, ${config.accent}, transparent)` }} />

        {pay.step === 'confirm' && (<>
          <div style={{ textAlign:'center', marginBottom:24 }}>
            <div style={{ color: config.accent, marginBottom:8, display:'flex', justifyContent:'center' }}>
              {CATEGORY_ICONS[service.category] || <Zap size={32} />}
            </div>
            <h2 style={{ margin:'10px 0 4px', fontSize:20, fontWeight:700, color: T.text1 }}>{service.service_name}</h2>
            <p style={{ margin:0, fontSize:13, color: T.text3 }}>{merchant.merchant_name}</p>
          </div>
          <div style={{ background: T.surface2, borderRadius:12, padding:20, marginBottom:20, border:`1px solid ${T.border}` }}>
            {([['Service', service.service_name, ''], ['Provider', merchant.merchant_name, ''], ['Price', `$${service.price.toFixed(4)}`, config.accent], ['---','',''], ['Current balance', `$${pay.balanceBefore.toFixed(4)}`, ''], ['Balance after', `$${pay.balanceAfter.toFixed(4)}`, T.green]] as [string,string,string][]).map(([l,v,c], i) =>
              l === '---' ? <div key={i} style={{ borderTop:`1px solid ${T.border}`, margin:'10px 0' }} /> :
              <div key={i} style={{ display:'flex', justifyContent:'space-between', marginBottom:8 }}>
                <span style={{ fontSize:13, color: T.text3 }}>{l}</span>
                <span style={{ fontSize:13, fontFamily:"'DM Mono', monospace", color: c || T.text1, fontWeight: l === 'Balance after' ? 700 : 400 }}>{v}</span>
              </div>
            )}
          </div>
          {demoMode && <p style={{ textAlign:'center', fontSize:11, color: T.amber, marginBottom:16, fontFamily:"'DM Mono', monospace" }}>DEMO MODE — NO REAL TRANSACTION</p>}
          <div style={{ display:'flex', gap:12 }}>
            <button onClick={onClose} style={{ flex:1, padding:14, borderRadius:10, border:`1px solid ${T.border}`, background: T.surface2, color: T.text2, cursor:'pointer', fontSize:14, fontWeight:600 }}>Cancel</button>
            <button onClick={onConfirm} style={{ flex:2, padding:14, borderRadius:10, border:'none', background: T.navy, color:'#FFFFFF', cursor:'pointer', fontSize:14, fontWeight:700 }}>Pay ${service.price.toFixed(4)}</button>
          </div>
          <p style={{ textAlign:'center', fontSize:11, color: T.text4, marginTop:16, fontFamily:"'DM Mono', monospace" }}>Secured by SynthPay · Funds held by Stripe</p>
        </>)}

        {pay.step === 'paying' && (
          <div style={{ textAlign:'center', padding:'20px 0' }}>
            <Zap size={40} color={T.amber} style={{ margin:'0 auto 16px', display:'block' }} />
            <h3 style={{ margin:'0 0 8px', fontSize:18, color: T.text1 }}>Processing…</h3>
            <p style={{ color: T.text3, fontSize:14 }}>Settling on ledger</p>
          </div>
        )}

        {pay.step === 'success' && (<>
          <div style={{ textAlign:'center', marginBottom:24 }}>
            <CheckCircle size={52} color={T.green} style={{ margin:'0 auto 12px', display:'block' }} />
            <h2 style={{ margin:'0 0 8px', fontSize:22, color: T.green }}>Payment confirmed</h2>
            <p style={{ color: T.text3, fontSize:14, margin:0 }}>{merchant.merchant_name} · {demoMode ? 'Demo' : 'Live'}</p>
          </div>
          <div style={{ background: T.surface2, border:`1px solid ${T.border}`, borderRadius:12, padding:20, marginBottom:20 }}>
            <p style={{ margin:'0 0 8px', fontSize:10, letterSpacing:2, color: config.accent, fontFamily:"'DM Mono', monospace" }}>ACCESS GRANTED</p>
            <h3 style={{ margin:'0 0 4px', fontSize:16, fontWeight:700, color: T.text1 }}>{service.service_name}</h3>
            <p style={{ margin:0, fontSize:13, color: T.text3 }}>{service.description}</p>
          </div>
          <div style={{ background: T.surface2, border:`1px solid ${T.border}`, borderRadius:10, padding:16, marginBottom:20 }}>
            <div style={{ display:'flex', justifyContent:'space-between', marginBottom:8 }}>
              <span style={{ fontSize:13, color: T.text3 }}>Charged</span>
              <span style={{ fontFamily:"'DM Mono', monospace", fontSize:13, color: T.red }}>−${service.price.toFixed(4)}</span>
            </div>
            <div style={{ display:'flex', justifyContent:'space-between' }}>
              <span style={{ fontSize:13, color: T.text3 }}>New balance</span>
              <span style={{ fontFamily:"'DM Mono', monospace", fontSize:13, color: T.green, fontWeight:700 }}>${pay.balanceAfter.toFixed(4)}</span>
            </div>
          </div>
          <button onClick={onClose} style={{ width:'100%', padding:14, borderRadius:10, border:`1px solid ${T.border}`, background: T.surface2, color: T.text1, cursor:'pointer', fontSize:14, fontWeight:600 }}>Back to marketplace</button>
        </>)}

        {pay.step === 'error' && (
          <div style={{ textAlign:'center', padding:'20px 0' }}>
            <AlertCircle size={40} color={T.red} style={{ margin:'0 auto 16px', display:'block' }} />
            <h3 style={{ margin:'0 0 8px', color: T.red, fontSize:18 }}>Payment failed</h3>
            <p style={{ color: T.text3, fontSize:14, marginBottom:24 }}>{pay.error}</p>
            <button onClick={onClose} style={{ padding:'12px 28px', borderRadius:8, border:`1px solid ${T.border}`, background: T.surface2, color: T.text1, cursor:'pointer' }}>Close</button>
          </div>
        )}
      </div>
    </div>
  )
})
