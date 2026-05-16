import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { walletApi, api } from '../lib/api'
import { analytics } from '../lib/analytics'
import {
  Bot, BarChart2, BookOpen, Film, CreditCard, Heart, Zap,
  ArrowLeft, Search, CheckCircle, AlertCircle, Music, Newspaper,
  Lock, Play, ChevronRight, Send, Volume2, TrendingUp,
  ChevronDown, ChevronUp, X, Star,
} from 'lucide-react'

// ─── Types ────────────────────────────────────────────────────────────────────
interface Service {
  endpoint_id: string
  path: string
  price: number
  service_name: string
  description: string
  category: string
}
interface Merchant {
  merchant_id: string
  merchant_name: string
  services: Service[]
}
interface PayState {
  step: 'idle' | 'confirm' | 'paying' | 'success' | 'error'
  merchant: Merchant | null
  service: Service | null
  balanceBefore: number
  balanceAfter: number
  error: string
}

// ─── Design tokens ────────────────────────────────────────────────────────────
const T = {
  amber: '#F59B00', amberPale: 'rgba(245,155,0,0.08)', amberBd: 'rgba(245,155,0,0.2)',
  bg: '#F7F5F2', surface: '#FFFFFF', surface2: '#F3F1EE',
  border: '#E8E4DF', border2: '#D4CFC9',
  text1: '#0D0C0A', text2: '#4A4845', text3: '#9A958F', text4: '#C4BFB9',
  green: '#059669', red: '#DC2626', navy: '#111827',
}

// ─── Category helpers ─────────────────────────────────────────────────────────
const ALL_CATEGORIES = ['All', 'AI', 'Media', 'Education', 'Finance', 'Health', 'Music', 'News', 'General']

const CAT_GRADIENTS: Record<string, string> = {
  AI:        'linear-gradient(135deg, #7c3aed 0%, #4f46e5 100%)',
  Media:     'linear-gradient(135deg, #1a1a2e 0%, #e50914 100%)',
  Education: 'linear-gradient(135deg, #064e3b 0%, #059669 100%)',
  Finance:   'linear-gradient(135deg, #0f172a 0%, #0ea5e9 100%)',
  Health:    'linear-gradient(135deg, #831843 0%, #ec4899 100%)',
  Music:     'linear-gradient(135deg, #1a1a2e 0%, #22d3ee 100%)',
  News:      'linear-gradient(135deg, #111827 0%, #6b7280 100%)',
  General:   'linear-gradient(135deg, #1c1917 0%, #F59B00 100%)',
  Data:      'linear-gradient(135deg, #0f172a 0%, #0ea5e9 100%)',
}

const CAT_ACCENTS: Record<string, string> = {
  AI: '#7c3aed', Media: '#e50914', Education: '#059669', Finance: '#0ea5e9',
  Health: '#ec4899', Music: '#22d3ee', News: '#6b7280', General: '#F59B00',
  Data: '#0ea5e9',
}

const CAT_ICONS: Record<string, React.ReactNode> = {
  AI: <Bot size={16} />, Media: <Film size={16} />, Education: <BookOpen size={16} />,
  Finance: <CreditCard size={16} />, Health: <Heart size={16} />, Music: <Music size={16} />,
  News: <Newspaper size={16} />, General: <Zap size={16} />, Data: <BarChart2 size={16} />,
}

function getGradient(cat: string) { return CAT_GRADIENTS[cat] || CAT_GRADIENTS.General }
function getAccent(cat: string) { return CAT_ACCENTS[cat] || CAT_ACCENTS.General }
function getIcon(cat: string) { return CAT_ICONS[cat] || <Zap size={16} /> }

// Detect which template to use
function detectTemplate(cat: string, name: string, desc: string): string {
  const s = (cat + ' ' + name + ' ' + desc).toLowerCase()
  if (/\b(ai|chatbot|assistant|gpt|bot|llm|nlp)\b/.test(s)) return 'ai'
  if (/\b(streaming|stream|video|film|cinema|movie|watch|netflix|entertainment)\b/.test(s)) return 'streaming'
  if (/\b(music|audio|podcast|sound|radio|spotify|track|song|beat)\b/.test(s)) return 'music'
  if (/\b(news|press|article|journal|headline|media|newsletter)\b/.test(s)) return 'news'
  if (/\b(education|learning|course|tutorial|study|academy|lesson|class)\b/.test(s)) return 'education'
  if (/\b(finance|trading|market|stock|crypto|data|analytics|price|chart)\b/.test(s)) return 'finance'
  if (/\b(health|wellness|fitness|meditation|calm|mindful|breathe|yoga)\b/.test(s)) return 'health'
  return 'generic'
}

// ─── GLOBAL STYLES ────────────────────────────────────────────────────────────
const GLOBAL_STYLES = `
@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700;900&family=DM+Mono:wght@300;400;500&display=swap');
* { box-sizing: border-box; }
body { margin: 0; }
::-webkit-scrollbar { width: 6px; height: 6px; }
::-webkit-scrollbar-track { background: transparent; }
::-webkit-scrollbar-thumb { background: #D4CFC9; border-radius: 4px; }

@keyframes slideUp {
  from { transform: translateY(100%); opacity: 0; }
  to   { transform: translateY(0);    opacity: 1; }
}
@keyframes fadeIn {
  from { opacity: 0; }
  to   { opacity: 1; }
}
@keyframes pulse-dot {
  0%, 100% { opacity: 1; }
  50%       { opacity: 0.3; }
}
@keyframes wave1 { 0%,100%{height:8px} 50%{height:28px} }
@keyframes wave2 { 0%,100%{height:16px} 50%{height:8px} }
@keyframes wave3 { 0%,100%{height:24px} 50%{height:12px} }
@keyframes wave4 { 0%,100%{height:12px} 50%{height:32px} }
@keyframes wave5 { 0%,100%{height:20px} 50%{height:6px} }
@keyframes breatheExpand { 0%,100%{transform:scale(1)} 50%{transform:scale(1.4)} }
@keyframes spin { to { transform: rotate(360deg); } }
@keyframes toastIn {
  from { opacity: 0; transform: translateY(-20px); }
  to   { opacity: 1; transform: translateY(0); }
}
@keyframes numberFlicker {
  0%,100%{opacity:1} 50%{opacity:0.6}
}
.waveBar { display:inline-block; width:4px; border-radius:4px; background:#22d3ee; margin:0 2px; align-self:flex-end; }
.waveBar:nth-child(1){animation:wave1 0.9s ease-in-out infinite;}
.waveBar:nth-child(2){animation:wave2 0.9s ease-in-out infinite 0.1s;}
.waveBar:nth-child(3){animation:wave3 0.9s ease-in-out infinite 0.2s;}
.waveBar:nth-child(4){animation:wave4 0.9s ease-in-out infinite 0.3s;}
.waveBar:nth-child(5){animation:wave5 0.9s ease-in-out infinite 0.4s;}
`

// ══════════════════════════════════════════════════════════════════════════════
// MAIN EXPORT
// ══════════════════════════════════════════════════════════════════════════════
export default function Marketplace() {
  const { user, setUser } = useAuth() as any
  const navigate = useNavigate()
  const [balance, setBalance] = useState<number>(Number(user?.balance ?? 0))
  const [demoMode, setDemoMode] = useState(false)
  const [demoBalance, setDemoBalance] = useState(19.998)
  const [merchants, setMerchants] = useState<Merchant[]>([])
  const [loading, setLoading] = useState(true)
  const [history, setHistory] = useState<{ name: string; price: number; time: Date }[]>([])
  const [search, setSearch] = useState('')
  const [activeCategory, setActiveCategory] = useState('All')

  // Service viewer state
  const [viewerService, setViewerService] = useState<Service | null>(null)
  const [viewerMerchant, setViewerMerchant] = useState<Merchant | null>(null)
  const [viewerVisible, setViewerVisible] = useState(false)

  // Track unlocked per endpoint_id
  const [unlockedIds, setUnlockedIds] = useState<Set<string>>(new Set())

  // Pay state (inside service viewer)
  const [pay, setPay] = useState<PayState>({ step: 'idle', merchant: null, service: null, balanceBefore: 0, balanceAfter: 0, error: '' })
  const [showToast, setShowToast] = useState(false)

  const currentBalance = demoMode ? demoBalance : balance

  // ── Filtered merchants ──────────────────────────────────────────────────────
  const filteredMerchants = merchants.map(m => ({
    ...m,
    services: m.services.filter(s => {
      const matchCat = activeCategory === 'All' || s.category === activeCategory
      const q = search.toLowerCase().trim()
      const matchQ = !q || s.service_name.toLowerCase().includes(q) || s.description?.toLowerCase().includes(q) || m.merchant_name.toLowerCase().includes(q)
      return matchCat && matchQ
    }),
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

  // ── Open viewer ─────────────────────────────────────────────────────────────
  function openViewer(merchant: Merchant, service: Service) {
    setViewerMerchant(merchant)
    setViewerService(service)
    setPay({ step: 'idle', merchant, service, balanceBefore: currentBalance, balanceAfter: Math.max(0, currentBalance - service.price), error: '' })
    setViewerVisible(true)
    document.body.style.overflow = 'hidden'
  }

  function closeViewer() {
    setViewerVisible(false)
    setViewerService(null)
    setViewerMerchant(null)
    setPay({ step: 'idle', merchant: null, service: null, balanceBefore: 0, balanceAfter: 0, error: '' })
    document.body.style.overflow = ''
  }

  // ── Payment ─────────────────────────────────────────────────────────────────
  async function handlePay() {
    if (!viewerMerchant || !viewerService) return
    setPay(p => ({ ...p, step: 'paying' }))
    if (demoMode) {
      await new Promise(r => setTimeout(r, 900))
      const newBal = Math.max(0, demoBalance - viewerService.price)
      setDemoBalance(newBal)
      setHistory(h => [{ name: viewerService!.service_name, price: viewerService!.price, time: new Date() }, ...h.slice(0, 9)])
      setUnlockedIds(s => new Set([...s, viewerService!.endpoint_id]))
      setPay(p => ({ ...p, step: 'success', balanceAfter: newBal }))
      triggerToast()
    } else {
      try {
        const res = await walletApi.pay({
          user_id: user?.user_id,
          merchant_id: viewerMerchant.merchant_id,
          endpoint_id: viewerService.endpoint_id,
          amount: viewerService.price,
        })
        const newBal = Number(res.data.balance_after)
        setBalance(newBal)
        if (setUser) setUser({ ...user, balance: newBal })
        setHistory(h => [{ name: viewerService!.service_name, price: viewerService!.price, time: new Date() }, ...h.slice(0, 9)])
        setUnlockedIds(s => new Set([...s, viewerService!.endpoint_id]))
        analytics.track('service_purchased', {
          service_name: viewerService.service_name,
          merchant: viewerMerchant.merchant_name,
          category: viewerService.category,
          price: viewerService.price,
          balance_after: newBal,
        })
        setPay(p => ({ ...p, step: 'success', balanceAfter: newBal }))
        triggerToast()
      } catch (e: any) {
        setPay(p => ({ ...p, step: 'error', error: e?.response?.data?.error || 'Payment failed. Please try again.' }))
      }
    }
  }

  function triggerToast() {
    setShowToast(true)
    setTimeout(() => setShowToast(false), 3000)
  }

  const isUnlocked = viewerService ? unlockedIds.has(viewerService.endpoint_id) : false

  // ───────────────────────────────────────────────────────────────────────────
  return (
    <div style={{ minHeight: '100vh', background: T.bg, fontFamily: "'DM Sans', system-ui, sans-serif" }}>
      <style>{GLOBAL_STYLES}</style>

      {/* ── NAV ── */}
      <div style={{ position: 'sticky', top: 0, zIndex: 50, background: T.surface, borderBottom: `1px solid ${T.border}`, padding: '0 20px' }}>
        <div style={{ maxWidth: 1080, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 60 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <button onClick={() => navigate('/wallet')} style={{
              width: 36, height: 36, borderRadius: '50%', border: `1px solid ${T.border}`,
              background: T.surface2, display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', color: T.text2,
            }}>
              <ArrowLeft size={16} />
            </button>
            <span style={{ fontWeight: 700, fontSize: 16, color: T.text1 }}>Marketplace</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <button onClick={() => setDemoMode(d => !d)} style={{
              padding: '6px 14px', borderRadius: 20, fontSize: 12, cursor: 'pointer',
              fontFamily: "'DM Mono', monospace",
              background: demoMode ? T.amberPale : T.surface2,
              border: `1px solid ${demoMode ? T.amberBd : T.border}`,
              color: demoMode ? T.amber : T.text3,
            }}>
              {demoMode ? 'DEMO ON' : 'DEMO'}
            </button>
            <div style={{ background: T.surface2, border: `1px solid ${T.border}`, borderRadius: 10, padding: '6px 14px', display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 10, color: T.text3, letterSpacing: 1, fontFamily: "'DM Mono', monospace" }}>BAL</span>
              <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 14, fontWeight: 700, color: T.navy }}>${currentBalance.toFixed(4)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── HERO ── */}
      <div style={{ maxWidth: 1080, margin: '0 auto', padding: '40px 20px 0' }}>
        <p style={{ fontSize: 10, letterSpacing: 3, color: T.text3, marginBottom: 10, fontFamily: "'DM Mono', monospace" }}>
          {demoMode ? 'DEMO MODE' : 'SYNTHPAY ENABLED SERVICES'}
        </p>
        <h1 style={{ fontSize: 34, fontWeight: 800, margin: '0 0 10px', lineHeight: 1.2, color: T.text1 }}>
          Pay per use.<br /><span style={{ color: T.amber }}>Not per month.</span>
        </h1>
        <p style={{ marginTop: 0, marginBottom: 32, color: T.text3, fontSize: 14, maxWidth: 500 }}>
          Click any service to explore it. Pay only when you're ready — fractions of a cent, settled instantly.
        </p>

        {/* Search */}
        <div style={{ position: 'relative', marginBottom: 16 }}>
          <span style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: T.text3, pointerEvents: 'none' }}>
            <Search size={16} />
          </span>
          <input
            type="text" value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search services, providers..."
            style={{
              width: '100%', padding: '12px 14px 12px 42px', borderRadius: 12,
              border: `1px solid ${T.border}`, background: T.surface, color: T.text1,
              fontSize: 14, outline: 'none', fontFamily: "'DM Sans', system-ui, sans-serif",
            }}
          />
          {search && (
            <button onClick={() => setSearch('')} style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: T.text3, cursor: 'pointer', fontSize: 20, lineHeight: 1 }}>×</button>
          )}
        </div>

        {/* Category pills */}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 40, paddingBottom: 4 }}>
          {ALL_CATEGORIES.map(cat => {
            const active = activeCategory === cat
            const accent = cat !== 'All' ? getAccent(cat) : T.navy
            return (
              <button key={cat} onClick={() => setActiveCategory(cat)} style={{
                padding: '6px 16px', borderRadius: 20,
                border: `1px solid ${active ? (cat === 'All' ? T.navy : accent) : T.border}`,
                background: active ? (cat === 'All' ? T.navy : `${accent}18`) : T.surface,
                color: active ? (cat === 'All' ? '#FFFFFF' : accent) : T.text3,
                fontSize: 12, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap', transition: 'all 0.15s',
                display: 'flex', alignItems: 'center', gap: 6,
              }}>
                {cat !== 'All' && getIcon(cat)}
                {cat}
              </button>
            )
          })}
        </div>
      </div>

      {/* ── CONTENT ── */}
      <div style={{ maxWidth: 1080, margin: '0 auto', padding: '0 20px 60px' }}>
        {loading && (
          <div style={{ textAlign: 'center', padding: 80 }}>
            <p style={{ color: T.text3, fontFamily: "'DM Mono', monospace", letterSpacing: 2 }}>LOADING SERVICES...</p>
          </div>
        )}

        {!loading && merchants.length === 0 && (
          <div style={{ textAlign: 'center', padding: 80, background: T.surface, borderRadius: 16, border: `1px dashed ${T.border2}` }}>
            <p style={{ color: T.text3, fontSize: 14 }}>No services available yet.</p>
            <p style={{ color: T.text4, fontSize: 12, marginTop: 4 }}>Merchants register at synthpay-dashboard.vercel.app</p>
          </div>
        )}

        {!loading && merchants.length > 0 && filteredMerchants.length === 0 && (
          <div style={{ textAlign: 'center', padding: 60, background: T.surface, borderRadius: 16, border: `1px dashed ${T.border2}` }}>
            <Search size={28} color={T.text4} style={{ margin: '0 auto 12px', display: 'block' }} />
            <p style={{ color: T.text3, fontSize: 14 }}>No results for "{search || activeCategory}"</p>
            <button onClick={() => { setSearch(''); setActiveCategory('All') }} style={{ marginTop: 12, padding: '8px 20px', borderRadius: 8, border: `1px solid ${T.border}`, background: 'none', color: T.text2, cursor: 'pointer', fontSize: 13 }}>Clear filters</button>
          </div>
        )}

        {/* App-store grid */}
        {!loading && filteredMerchants.map(merchant => (
          <div key={merchant.merchant_id} style={{ marginBottom: 48 }}>
            {/* Merchant header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
              <div style={{ width: 40, height: 40, borderRadius: 10, background: T.surface2, border: `1px solid ${T.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: T.text2 }}>
                {getIcon(merchant.services[0]?.category || 'General')}
              </div>
              <div>
                <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: T.text1 }}>{merchant.merchant_name}</h2>
                <p style={{ margin: 0, fontSize: 12, color: T.text3 }}>{merchant.services.length} service{merchant.services.length !== 1 ? 's' : ''}</p>
              </div>
              <div style={{ marginLeft: 'auto', fontSize: 10, color: T.text3, fontFamily: "'DM Mono', monospace", background: T.surface2, padding: '4px 10px', borderRadius: 6, border: `1px solid ${T.border}`, letterSpacing: 1 }}>SYNTHPAY</div>
            </div>
            {/* Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 20 }}>
              {merchant.services.map((service, si) => (
                <AppStoreCard
                  key={service.endpoint_id}
                  merchant={merchant}
                  service={service}
                  unlocked={unlockedIds.has(service.endpoint_id)}
                  featured={si === 0 && filteredMerchants.indexOf(merchant) === 0}
                  onOpen={() => openViewer(merchant, service)}
                />
              ))}
            </div>
          </div>
        ))}

        {/* Recent transactions */}
        {history.length > 0 && (
          <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 12, padding: 24, boxShadow: '0 4px 16px rgba(0,0,0,0.06)', marginTop: 16 }}>
            <p style={{ fontSize: 10, letterSpacing: 3, color: T.text3, marginBottom: 16, fontFamily: "'DM Mono', monospace" }}>RECENT TRANSACTIONS</p>
            {history.map((tx, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: i < history.length - 1 ? `1px solid ${T.border}` : 'none' }}>
                <div>
                  <span style={{ fontSize: 14, color: T.text1 }}>{tx.name}</span>
                  <span style={{ fontSize: 12, color: T.text3, marginLeft: 12 }}>{tx.time.toLocaleTimeString()}</span>
                </div>
                <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 14, color: T.red }}>-${tx.price.toFixed(4)}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── SERVICE VIEWER OVERLAY ── */}
      {viewerVisible && viewerService && viewerMerchant && (
        <ServiceViewer
          service={viewerService}
          merchant={viewerMerchant}
          isUnlocked={isUnlocked}
          pay={pay}
          currentBalance={currentBalance}
          demoMode={demoMode}
          showToast={showToast}
          onPay={handlePay}
          onRetry={() => setPay(p => ({ ...p, step: 'idle', error: '' }))}
          onClose={closeViewer}
        />
      )}
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
// APP STORE CARD
// ══════════════════════════════════════════════════════════════════════════════
function AppStoreCard({ merchant, service, unlocked, featured, onOpen }: {
  merchant: Merchant; service: Service; unlocked: boolean; featured?: boolean; onOpen: () => void
}) {
  const [hovered, setHovered] = useState(false)
  const gradient = getGradient(service.category)
  const accent = getAccent(service.category)
  const icon = getIcon(service.category)
  const desc = service.description || 'Powered by SynthPay'
  const shortDesc = desc.length > 80 ? desc.slice(0, 78) + '…' : desc

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: T.surface,
        border: `1px solid ${hovered ? accent + '60' : featured ? accent + '30' : T.border}`,
        borderRadius: 20, overflow: 'hidden',
        transition: 'all 0.25s ease',
        transform: hovered ? 'translateY(-6px)' : 'none',
        boxShadow: hovered ? `0 16px 40px rgba(0,0,0,0.12)` : '0 2px 12px rgba(0,0,0,0.05)',
        cursor: 'pointer', position: 'relative',
      }}
      onClick={onOpen}
    >
      {/* Cover */}
      <div style={{ height: 140, background: gradient, position: 'relative', display: 'flex', alignItems: 'flex-end', padding: 16 }}>
        {/* Price badge */}
        <div style={{
          position: 'absolute', top: 12, right: 12,
          background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(6px)',
          borderRadius: 20, padding: '4px 10px',
          fontFamily: "'DM Mono', monospace", fontSize: 12, fontWeight: 700, color: '#FFFFFF',
          border: '1px solid rgba(255,255,255,0.15)',
        }}>
          ${service.price.toFixed(4)}
        </div>

        {/* Unlocked badge */}
        {unlocked && (
          <div style={{
            position: 'absolute', top: 12, left: 12,
            background: 'rgba(5,150,105,0.85)', backdropFilter: 'blur(6px)',
            borderRadius: 20, padding: '4px 10px',
            fontSize: 10, fontWeight: 700, color: '#FFFFFF', letterSpacing: 1,
            display: 'flex', alignItems: 'center', gap: 4,
          }}>
            <CheckCircle size={10} /> UNLOCKED
          </div>
        )}

        {/* Abstract art pattern on cover */}
        <div style={{
          position: 'absolute', inset: 0, opacity: 0.12,
          backgroundImage: 'radial-gradient(circle at 20% 80%, white 1px, transparent 1px), radial-gradient(circle at 80% 20%, white 1px, transparent 1px)',
          backgroundSize: '40px 40px',
        }} />
      </div>

      {/* Body */}
      <div style={{ padding: 18 }}>
        <h3 style={{ margin: '0 0 4px', fontSize: 16, fontWeight: 700, color: T.text1, lineHeight: 1.3 }}>{service.service_name}</h3>
        <p style={{ margin: '0 0 10px', fontSize: 12, color: T.text3 }}>{merchant.merchant_name}</p>
        <p style={{ margin: '0 0 16px', fontSize: 12, color: T.text2, lineHeight: 1.55, minHeight: 36 }}>{shortDesc}</p>

        {/* Footer row */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: accent }}>
            {icon}
            <span style={{ fontWeight: 600 }}>{service.category}</span>
          </div>
          <button
            onClick={e => { e.stopPropagation(); onOpen() }}
            style={{
              padding: '7px 14px', borderRadius: 10, border: 'none',
              background: T.navy, color: '#FFFFFF',
              fontSize: 12, fontWeight: 700, cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: 5,
              transition: 'background 0.15s',
            }}
          >
            Open <ChevronRight size={13} />
          </button>
        </div>
      </div>
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
// SERVICE VIEWER
// ══════════════════════════════════════════════════════════════════════════════
function ServiceViewer({ service, merchant, isUnlocked, pay, currentBalance, demoMode, showToast, onPay, onRetry, onClose }: {
  service: Service; merchant: Merchant; isUnlocked: boolean; pay: PayState
  currentBalance: number; demoMode: boolean; showToast: boolean
  onPay: () => void; onRetry: () => void; onClose: () => void
}) {
  const template = detectTemplate(service.category, service.service_name, service.description || '')
  const accent = getAccent(service.category)
  const isPaying = pay.step === 'paying'
  const hasError = pay.step === 'error'

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 200,
      display: 'flex', flexDirection: 'column',
      animation: 'slideUp 0.3s cubic-bezier(0.16,1,0.3,1) both',
    }}>
      {/* Toast */}
      {showToast && (
        <div style={{
          position: 'absolute', top: 72, left: '50%', transform: 'translateX(-50%)',
          background: '#065f46', color: '#fff', borderRadius: 12, padding: '10px 20px',
          fontSize: 13, fontWeight: 600, zIndex: 999, display: 'flex', alignItems: 'center', gap: 8,
          boxShadow: '0 8px 24px rgba(0,0,0,0.25)', animation: 'toastIn 0.3s ease both',
          fontFamily: "'DM Sans', sans-serif",
        }}>
          <CheckCircle size={15} /> Unlocked successfully!
        </div>
      )}

      {/* ── VIEWER TOP BAR (feels like you left SynthPay) ── */}
      <div style={{
        flexShrink: 0, height: 60, background: '#0D0C0A',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 20px', borderBottom: '1px solid rgba(255,255,255,0.08)',
      }}>
        <button onClick={onClose} style={{
          background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)',
          borderRadius: 8, padding: '6px 14px', cursor: 'pointer', color: '#fff',
          fontSize: 13, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6,
        }}>
          <ArrowLeft size={14} /> Back
        </button>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: '#FFFFFF' }}>{service.service_name}</div>
          <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', letterSpacing: 1, fontFamily: "'DM Mono', monospace" }}>
            {service.category.toUpperCase()}
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.7)' }}>{merchant.merchant_name}</div>
          <div style={{ fontSize: 10, color: accent, fontFamily: "'DM Mono', monospace", letterSpacing: 1 }}>PROVIDER</div>
        </div>
      </div>

      {/* ── SERVICE CONTENT ── */}
      <div style={{ flex: 1, overflow: 'hidden', position: 'relative' }}>
        {/* Blurred content layer */}
        <div style={{
          position: 'absolute', inset: 0,
          filter: isUnlocked ? 'none' : 'blur(6px)',
          transition: 'filter 0.4s ease',
          overflow: 'auto',
        }}>
          <ServiceTemplate template={template} service={service} merchant={merchant} isUnlocked={isUnlocked} />
        </div>

        {/* Lock overlay (shown when not unlocked) */}
        {!isUnlocked && (
          <div style={{
            position: 'absolute', inset: 0,
            background: 'rgba(0,0,0,0.55)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: 24, zIndex: 10,
          }}>
            <div style={{
              background: '#FFFFFF', borderRadius: 20, padding: 36,
              maxWidth: 400, width: '100%', textAlign: 'center',
              boxShadow: '0 32px 80px rgba(0,0,0,0.4)',
              border: `1px solid ${T.border}`,
            }}>
              <div style={{
                width: 56, height: 56, borderRadius: '50%',
                background: `${accent}18`, border: `2px solid ${accent}40`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                margin: '0 auto 20px', color: accent,
              }}>
                <Lock size={24} />
              </div>
              <h2 style={{ margin: '0 0 8px', fontSize: 22, fontWeight: 800, color: T.text1 }}>
                Access this service
              </h2>
              <p style={{ margin: '0 0 24px', fontSize: 13, color: T.text2, lineHeight: 1.6 }}>
                {service.description || 'Pay once to unlock full access to this service.'}
              </p>

              {/* Price / balance row */}
              <div style={{ background: T.surface2, borderRadius: 12, padding: '14px 18px', marginBottom: 20, border: `1px solid ${T.border}`, textAlign: 'left' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                  <span style={{ fontSize: 13, color: T.text3 }}>Price per use</span>
                  <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 13, fontWeight: 700, color: T.text1 }}>${service.price.toFixed(4)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: 13, color: T.text3 }}>Your balance</span>
                  <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 13, fontWeight: 700, color: currentBalance >= service.price ? T.green : T.red }}>
                    ${currentBalance.toFixed(4)}
                  </span>
                </div>
              </div>

              {hasError && (
                <div style={{ background: 'rgba(220,38,38,0.08)', border: '1px solid rgba(220,38,38,0.2)', borderRadius: 10, padding: '10px 14px', marginBottom: 16, display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                  <AlertCircle size={14} color={T.red} style={{ marginTop: 2, flexShrink: 0 }} />
                  <p style={{ margin: 0, fontSize: 12, color: T.red }}>{pay.error}</p>
                </div>
              )}

              {demoMode && (
                <p style={{ fontSize: 11, color: T.amber, marginBottom: 14, fontFamily: "'DM Mono', monospace", letterSpacing: 1 }}>
                  DEMO MODE — NO REAL TRANSACTION
                </p>
              )}

              <button
                onClick={hasError ? onRetry : onPay}
                disabled={isPaying || currentBalance < service.price}
                style={{
                  width: '100%', padding: '14px 0', borderRadius: 12, border: 'none',
                  background: isPaying ? '#6b7280' : (currentBalance < service.price ? T.surface2 : T.navy),
                  color: currentBalance < service.price ? T.text4 : '#FFFFFF',
                  fontSize: 15, fontWeight: 700, cursor: isPaying || currentBalance < service.price ? 'not-allowed' : 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                  transition: 'all 0.15s',
                  fontFamily: "'DM Sans', sans-serif",
                }}
              >
                {isPaying ? (
                  <>
                    <span style={{ display: 'inline-block', width: 16, height: 16, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
                    Processing…
                  </>
                ) : hasError ? 'Try again' : currentBalance < service.price ? 'Insufficient balance' : `Pay & Unlock — $${service.price.toFixed(4)}`}
              </button>

              <p style={{ fontSize: 11, color: T.text4, marginTop: 16, fontFamily: "'DM Mono', monospace", letterSpacing: 0.5 }}>
                Secured by SynthPay · Settled instantly
              </p>
            </div>
          </div>
        )}
      </div>

      {/* ── Powered by SynthPay footer ── */}
      <div style={{
        flexShrink: 0, height: 36, background: '#0D0C0A',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        borderTop: '1px solid rgba(255,255,255,0.06)',
      }}>
        <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', letterSpacing: 2, fontFamily: "'DM Mono', monospace" }}>
          POWERED BY SYNTHPAY
        </span>
      </div>
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
// SERVICE TEMPLATE ROUTER
// ══════════════════════════════════════════════════════════════════════════════
function ServiceTemplate({ template, service, merchant, isUnlocked }: {
  template: string; service: Service; merchant: Merchant; isUnlocked: boolean
}) {
  switch (template) {
    case 'streaming':  return <StreamingTemplate service={service} merchant={merchant} isUnlocked={isUnlocked} />
    case 'ai':         return <AITemplate service={service} merchant={merchant} isUnlocked={isUnlocked} />
    case 'news':       return <NewsTemplate service={service} merchant={merchant} isUnlocked={isUnlocked} />
    case 'education':  return <EducationTemplate service={service} merchant={merchant} isUnlocked={isUnlocked} />
    case 'music':      return <MusicTemplate service={service} merchant={merchant} isUnlocked={isUnlocked} />
    case 'finance':    return <FinanceTemplate service={service} merchant={merchant} isUnlocked={isUnlocked} />
    case 'health':     return <HealthTemplate service={service} merchant={merchant} isUnlocked={isUnlocked} />
    default:           return <GenericTemplate service={service} merchant={merchant} isUnlocked={isUnlocked} />
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// STREAMING TEMPLATE
// ══════════════════════════════════════════════════════════════════════════════
function StreamingTemplate({ service, isUnlocked }: { service: Service; merchant: Merchant; isUnlocked: boolean }) {
  const [showVideo, setShowVideo] = useState(false)

  const posters = [
    { title: 'Big Buck Bunny', year: '2008', rating: '★★★★', grad: 'linear-gradient(135deg,#f97316,#fbbf24)' },
    { title: 'Sintel', year: '2010', rating: '★★★★★', grad: 'linear-gradient(135deg,#6366f1,#8b5cf6)' },
    { title: 'Elephant Dream', year: '2006', rating: '★★★☆', grad: 'linear-gradient(135deg,#06b6d4,#3b82f6)' },
    { title: 'Cosmos Laundromat', year: '2015', rating: '★★★★', grad: 'linear-gradient(135deg,#10b981,#059669)' },
  ]
  const newReleases = [
    { title: 'Tears of Steel', year: '2012', rating: '★★★★', grad: 'linear-gradient(135deg,#374151,#1f2937)' },
    { title: 'Caminandes', year: '2013', rating: '★★★☆', grad: 'linear-gradient(135deg,#d946ef,#ec4899)' },
    { title: 'Agent 327', year: '2017', rating: '★★★★', grad: 'linear-gradient(135deg,#f43f5e,#e11d48)' },
    { title: 'Sprite Fright', year: '2021', rating: '★★★★★', grad: 'linear-gradient(135deg,#84cc16,#4ade80)' },
  ]

  return (
    <div style={{ minHeight: '100%', background: '#0a0a0f', color: '#ffffff', fontFamily: "'DM Sans', sans-serif", padding: '0 0 40px' }}>
      {/* Hero */}
      <div style={{ position: 'relative', height: 320, background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)', display: 'flex', alignItems: 'flex-end', padding: '0 40px 40px' }}>
        <div style={{ position: 'absolute', inset: 0, backgroundImage: 'radial-gradient(ellipse at 70% 50%, rgba(229,9,20,0.15) 0%, transparent 70%)' }} />
        <div style={{ position: 'relative', zIndex: 1 }}>
          <div style={{ fontSize: 11, letterSpacing: 3, color: '#e50914', fontFamily: "'DM Mono', monospace", marginBottom: 10 }}>FEATURED FILM</div>
          <h1 style={{ margin: '0 0 12px', fontSize: 42, fontWeight: 900, lineHeight: 1.1, textShadow: '0 2px 20px rgba(0,0,0,0.5)' }}>
            Open Source<br />Cinema
          </h1>
          <p style={{ margin: '0 0 24px', fontSize: 14, color: 'rgba(255,255,255,0.65)', maxWidth: 420 }}>
            Award-winning open-source films from the Blender Foundation. Watch the future of creative commons filmmaking.
          </p>
          <button
            onClick={() => isUnlocked && setShowVideo(true)}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 10,
              background: '#FFFFFF', color: '#000000',
              border: 'none', borderRadius: 6, padding: '12px 28px',
              fontSize: 16, fontWeight: 700, cursor: isUnlocked ? 'pointer' : 'default',
            }}
          >
            <Play size={18} fill="#000" /> Play
          </button>
        </div>
      </div>

      {/* Continue Watching */}
      <div style={{ padding: '32px 40px 0' }}>
        <h3 style={{ margin: '0 0 16px', fontSize: 18, fontWeight: 700 }}>Continue Watching</h3>
        <div style={{ display: 'flex', gap: 16, overflowX: 'auto', paddingBottom: 8 }}>
          {posters.map(p => (
            <div key={p.title} style={{ flexShrink: 0, width: 150, cursor: 'pointer' }}>
              <div style={{ height: 220, borderRadius: 8, background: p.grad, marginBottom: 10, display: 'flex', alignItems: 'flex-end', padding: 12 }}>
                <Play size={28} color="rgba(255,255,255,0.8)" />
              </div>
              <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 2 }}>{p.title}</div>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>{p.year} · {p.rating}</div>
            </div>
          ))}
        </div>
      </div>

      {/* New Releases */}
      <div style={{ padding: '32px 40px 0' }}>
        <h3 style={{ margin: '0 0 16px', fontSize: 18, fontWeight: 700 }}>New Releases</h3>
        <div style={{ display: 'flex', gap: 16, overflowX: 'auto', paddingBottom: 8 }}>
          {newReleases.map(p => (
            <div key={p.title} style={{ flexShrink: 0, width: 150, cursor: 'pointer' }}>
              <div style={{ height: 220, borderRadius: 8, background: p.grad, marginBottom: 10, display: 'flex', alignItems: 'flex-end', padding: 12 }}>
                <Play size={28} color="rgba(255,255,255,0.8)" />
              </div>
              <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 2 }}>{p.title}</div>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>{p.year} · {p.rating}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Video modal */}
      {showVideo && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.92)', zIndex: 500, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column' }}>
          <button onClick={() => setShowVideo(false)} style={{ position: 'absolute', top: 20, right: 20, background: 'rgba(255,255,255,0.1)', border: 'none', color: '#fff', fontSize: 24, width: 40, height: 40, borderRadius: '50%', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <X size={20} />
          </button>
          <iframe
            src="https://www.youtube.com/embed/YE7VzlLtp-4?autoplay=1"
            style={{ width: '90vw', maxWidth: 960, height: '54vw', maxHeight: 540, border: 'none', borderRadius: 12 }}
            loading="lazy"
            allowFullScreen
            allow="autoplay; encrypted-media"
          />
          <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12, marginTop: 16, fontFamily: "'DM Mono', monospace" }}>Big Buck Bunny — Blender Foundation · CC BY 3.0</p>
        </div>
      )}
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
// AI TEMPLATE
// ══════════════════════════════════════════════════════════════════════════════
const MOCK_RESPONSES = [
  "That's a great question! Based on the latest information, I can provide a comprehensive answer. The key factors to consider are context, accuracy, and relevance. Let me break it down for you step by step.",
  "Absolutely! Here's what you need to know: This topic involves several interconnected concepts. First, let's establish the foundation — the core principle is straightforward once you understand the underlying mechanics.",
  "I've analyzed your query thoroughly. The short answer is: it depends on your specific use case. For most scenarios, I'd recommend starting with the simplest approach and optimizing from there. Here's a detailed breakdown...",
  "Great point! The research on this is actually quite interesting. Recent studies suggest that the most effective approach combines multiple methodologies. Let me walk you through the evidence-based recommendations.",
  "That's something I can definitely help with! The solution involves three main steps: (1) Identifying the root cause, (2) Applying the appropriate methodology, and (3) Validating the outcome. Shall I elaborate on any of these?",
  "Excellent question! To give you the most accurate response, I should mention that there are two schools of thought here. The traditional view holds that X is optimal, while newer research suggests Y might be more effective in dynamic environments.",
]

function AITemplate({ service, merchant, isUnlocked }: { service: Service; merchant: Merchant; isUnlocked: boolean }) {
  const [messages, setMessages] = useState([
    { role: 'user', text: `Tell me about ${service.service_name}` },
    { role: 'ai', text: `Welcome to ${service.service_name} by ${merchant.merchant_name}! ${service.description || 'I\'m your AI assistant, ready to help with any questions you might have. My responses are powered by advanced language models and I\'m optimized for accuracy and clarity.'}` },
    { role: 'user', text: 'What can you help me with today?' },
    { role: 'ai', text: 'I can assist with a wide range of tasks including analysis, research, writing, coding questions, data interpretation, creative projects, and much more. Just type your question below and I\'ll provide a detailed, helpful response. What would you like to explore?' },
  ])
  const [input, setInput] = useState('')
  const [thinking, setThinking] = useState(false)
  const chatRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (chatRef.current) chatRef.current.scrollTop = chatRef.current.scrollHeight
  }, [messages, thinking])

  async function sendMessage() {
    if (!input.trim() || !isUnlocked) return
    const userMsg = input.trim()
    setInput('')
    setMessages(m => [...m, { role: 'user', text: userMsg }])
    setThinking(true)
    await new Promise(r => setTimeout(r, 900 + Math.random() * 600))
    const reply = MOCK_RESPONSES[Math.floor(Math.random() * MOCK_RESPONSES.length)]
    setMessages(m => [...m, { role: 'ai', text: reply }])
    setThinking(false)
  }

  return (
    <div style={{ height: '100%', background: '#ffffff', display: 'flex', flexDirection: 'column', fontFamily: "'DM Sans', sans-serif" }}>
      <div style={{ padding: '24px 32px 16px', borderBottom: '1px solid #f0f0f0' }}>
        <h2 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: '#0D0C0A' }}>{service.service_name} <span style={{ color: '#7c3aed' }}>AI</span></h2>
        <p style={{ margin: '4px 0 0', fontSize: 13, color: '#9A958F' }}>by {merchant.merchant_name}</p>
      </div>

      {/* Chat */}
      <div ref={chatRef} style={{ flex: 1, overflowY: 'auto', padding: '24px 32px', display: 'flex', flexDirection: 'column', gap: 20, background: '#fafafa' }}>
        {messages.map((m, i) => (
          <div key={i} style={{ display: 'flex', justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start', alignItems: 'flex-start', gap: 12 }}>
            {m.role === 'ai' && (
              <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'linear-gradient(135deg,#7c3aed,#4f46e5)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 2 }}>
                <Bot size={16} color="#fff" />
              </div>
            )}
            <div style={{
              maxWidth: '70%', padding: '12px 16px', borderRadius: m.role === 'user' ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
              background: m.role === 'user' ? '#111827' : '#FFFFFF',
              color: m.role === 'user' ? '#FFFFFF' : '#0D0C0A',
              fontSize: 14, lineHeight: 1.6,
              boxShadow: m.role === 'ai' ? '0 1px 4px rgba(0,0,0,0.06)' : 'none',
              border: m.role === 'ai' ? '1px solid #E8E4DF' : 'none',
            }}>
              {m.text}
            </div>
            {m.role === 'user' && (
              <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#E8E4DF', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 2, fontSize: 12, fontWeight: 700, color: '#4A4845' }}>
                U
              </div>
            )}
          </div>
        ))}
        {thinking && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'linear-gradient(135deg,#7c3aed,#4f46e5)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Bot size={16} color="#fff" />
            </div>
            <div style={{ padding: '12px 16px', background: '#FFFFFF', borderRadius: '18px 18px 18px 4px', border: '1px solid #E8E4DF', display: 'flex', gap: 4, alignItems: 'center' }}>
              {[0, 150, 300].map(d => (
                <span key={d} style={{ width: 7, height: 7, borderRadius: '50%', background: '#7c3aed', display: 'inline-block', animation: `pulse-dot 1s ease-in-out ${d}ms infinite` }} />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Input */}
      <div style={{ padding: '16px 32px 24px', background: '#FFFFFF', borderTop: '1px solid #E8E4DF' }}>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <input
            type="text" value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && sendMessage()}
            disabled={!isUnlocked}
            placeholder={isUnlocked ? 'Ask anything…' : 'Unlock to start chatting'}
            style={{
              flex: 1, padding: '12px 16px', borderRadius: 12,
              border: '1px solid #E8E4DF', fontSize: 14,
              outline: 'none', background: isUnlocked ? '#FFFFFF' : '#F3F1EE',
              color: '#0D0C0A', fontFamily: "'DM Sans', sans-serif",
            }}
          />
          <button
            onClick={sendMessage}
            disabled={!isUnlocked || !input.trim()}
            style={{
              width: 44, height: 44, borderRadius: 12, border: 'none',
              background: isUnlocked && input.trim() ? '#7c3aed' : '#E8E4DF',
              color: isUnlocked && input.trim() ? '#FFFFFF' : '#9A958F',
              cursor: isUnlocked && input.trim() ? 'pointer' : 'not-allowed',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <Send size={17} />
          </button>
        </div>
      </div>
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
// NEWS TEMPLATE
// ══════════════════════════════════════════════════════════════════════════════
function NewsTemplate({ service, isUnlocked }: { service: Service; merchant: Merchant; isUnlocked: boolean }) {
  const [expandedIdx, setExpandedIdx] = useState<number | null>(null)
  const today = new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })

  const articles = [
    {
      headline: 'Federal Reserve Signals Pause on Rate Hikes as Inflation Cools',
      excerpt: 'The Federal Reserve indicated it may hold interest rates steady in its next meeting after new data showed consumer prices rising at the slowest pace in three years, giving policymakers room to assess the impact of previous hikes.',
      full: 'The Federal Reserve indicated it may hold interest rates steady in its next meeting after new data showed consumer prices rising at the slowest pace in three years. Fed Chair Jerome Powell emphasized a "data-dependent" approach while acknowledging that credit conditions have tightened substantially. Wall Street responded positively, with major indices climbing 1.4% on the news. Economists now widely expect at least one rate cut before the end of the fiscal year, pending further labor market data. The Fed\'s preferred inflation gauge, the PCE index, came in at 2.3% year-over-year, edging closer to the 2% target. "We are committed to returning inflation to our 2% goal while supporting maximum employment," Powell said in a prepared statement.',
      author: 'Sarah Mitchell', time: '2h ago', tag: 'Finance',
    },
    {
      headline: 'AI Startup Raises $340M Series B to Expand Enterprise Language Models',
      excerpt: 'A Silicon Valley AI company has closed one of the largest Series B rounds of the year, with investors betting that demand for domain-specific language models will reshape how corporations handle internal knowledge management.',
      full: 'A Silicon Valley AI company has closed one of the largest Series B rounds of the year at $340 million, co-led by Sequoia Capital and Tiger Global Management. The startup specializes in fine-tuning large language models for regulated industries including healthcare, finance, and legal services. CEO Jana Patel said the capital will accelerate enterprise deployments and expand the company\'s safety and evaluation team, which currently numbers 85 researchers. The company reports over 200 enterprise customers and a $45M annual recurring revenue run rate, with a net revenue retention rate of 148%, suggesting strong expansion within existing accounts. "We are building the foundation for AI that institutions can actually trust," Patel said. The round values the company at $1.9 billion.',
      author: 'David Chen', time: '4h ago', tag: 'Technology',
    },
    {
      headline: 'Global Supply Chains Show Resilience Despite New Shipping Lane Disruptions',
      excerpt: 'Despite renewed pressure on key maritime routes, logistics firms report that diversified sourcing strategies adopted after the 2021 disruptions have substantially cushioned the impact on consumer goods availability.',
      full: 'Global supply chains have demonstrated remarkable resilience in the face of new maritime disruptions, according to a comprehensive report released by the World Trade Organization today. Companies that diversified their supplier networks following the COVID-era shortages are reporting 60% fewer stockouts than peers still reliant on single-source procurement. "The businesses that invested in supply chain redundancy are now reaping the dividends," said WTO chief economist Ralph Ossa. Container shipping rates on key Asia-Europe routes have risen 34% over the past eight weeks, but analysts note that this remains well below the 400%+ spikes seen in 2021. Technology investments in real-time logistics monitoring have also given firms unprecedented visibility into potential bottlenecks.',
      author: 'Amelia Torres', time: '6h ago', tag: 'Markets',
    },
  ]

  return (
    <div style={{ minHeight: '100%', background: '#FFFFFF', fontFamily: "'DM Sans', sans-serif" }}>
      {/* Masthead */}
      <div style={{ borderBottom: '3px solid #0D0C0A', padding: '24px 48px 16px', textAlign: 'center' }}>
        <h1 style={{ margin: '0 0 4px', fontSize: 36, fontWeight: 900, letterSpacing: -1, color: '#0D0C0A', fontFamily: 'Georgia, serif' }}>{service.service_name}</h1>
        <p style={{ margin: 0, fontSize: 12, color: '#9A958F', letterSpacing: 2, fontFamily: "'DM Mono', monospace" }}>
          {today.toUpperCase()} · INDEPENDENT JOURNALISM
        </p>
      </div>

      <div style={{ maxWidth: 820, margin: '0 auto', padding: '32px 32px 48px' }}>
        {articles.map((article, i) => (
          <div key={i} style={{ paddingBottom: 28, marginBottom: 28, borderBottom: i < articles.length - 1 ? '1px solid #E8E4DF' : 'none' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <span style={{ fontSize: 10, letterSpacing: 2, fontFamily: "'DM Mono', monospace", background: '#0D0C0A', color: '#FFFFFF', padding: '3px 8px', borderRadius: 4 }}>{article.tag}</span>
            </div>
            <h2
              onClick={() => isUnlocked && setExpandedIdx(expandedIdx === i ? null : i)}
              style={{ margin: '0 0 10px', fontSize: 22, fontWeight: 800, color: '#0D0C0A', lineHeight: 1.3, fontFamily: 'Georgia, serif', cursor: isUnlocked ? 'pointer' : 'default' }}
            >
              {article.headline}
            </h2>
            <p style={{
              margin: '0 0 12px', fontSize: 14, color: '#4A4845', lineHeight: 1.7,
              filter: isUnlocked ? 'none' : 'blur(4px)',
              userSelect: isUnlocked ? 'auto' : 'none',
            }}>
              {expandedIdx === i && isUnlocked ? article.full : article.excerpt}
            </p>
            {isUnlocked && expandedIdx !== i && (
              <button onClick={() => setExpandedIdx(i)} style={{ background: 'none', border: 'none', color: '#7c3aed', fontSize: 13, fontWeight: 600, cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center', gap: 4 }}>
                Read full article <ChevronDown size={13} />
              </button>
            )}
            {isUnlocked && expandedIdx === i && (
              <button onClick={() => setExpandedIdx(null)} style={{ background: 'none', border: 'none', color: '#9A958F', fontSize: 13, cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center', gap: 4 }}>
                Collapse <ChevronUp size={13} />
              </button>
            )}
            <div style={{ marginTop: 12, display: 'flex', gap: 16, fontSize: 12, color: '#9A958F', fontFamily: "'DM Mono', monospace" }}>
              <span>By {article.author}</span>
              <span>{article.time}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
// EDUCATION TEMPLATE
// ══════════════════════════════════════════════════════════════════════════════
function EducationTemplate({ service, merchant, isUnlocked }: { service: Service; merchant: Merchant; isUnlocked: boolean }) {
  const [expandedModule, setExpandedModule] = useState<number | null>(isUnlocked ? 1 : null)

  useEffect(() => { if (isUnlocked) setExpandedModule(1) }, [isUnlocked])

  const modules = [
    { title: 'Introduction & Fundamentals', duration: '18 min', lessons: 4, free: true },
    { title: 'Core Concepts Deep Dive', duration: '34 min', lessons: 7, free: false },
    { title: 'Practical Applications', duration: '45 min', lessons: 9, free: false },
    { title: 'Advanced Techniques', duration: '52 min', lessons: 11, free: false },
    { title: 'Capstone Project', duration: '60 min', lessons: 5, free: false },
  ]

  return (
    <div style={{ minHeight: '100%', background: '#1a1f2e', fontFamily: "'DM Sans', sans-serif", color: '#FFFFFF' }}>
      {/* Course header */}
      <div style={{ background: 'linear-gradient(135deg, #064e3b 0%, #059669 100%)', padding: '40px 48px' }}>
        <div style={{ fontSize: 11, letterSpacing: 3, color: 'rgba(255,255,255,0.6)', fontFamily: "'DM Mono', monospace", marginBottom: 10 }}>ONLINE COURSE</div>
        <h1 style={{ margin: '0 0 12px', fontSize: 32, fontWeight: 800 }}>{service.service_name}</h1>
        <p style={{ margin: '0 0 20px', fontSize: 14, color: 'rgba(255,255,255,0.8)', maxWidth: 560 }}>
          {service.description || 'A comprehensive course designed to take you from beginner to proficient. Learn at your own pace with hands-on projects and expert guidance.'}
        </p>
        <div style={{ display: 'flex', gap: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'rgba(255,255,255,0.7)' }}>
            <Star size={14} fill="rgba(255,255,255,0.7)" /> 4.8 rating
          </div>
          <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.7)' }}>by {merchant.merchant_name}</div>
          <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.7)' }}>5 modules · 36 lessons</div>
        </div>
        {/* Progress bar */}
        <div style={{ marginTop: 24 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontSize: 12, color: 'rgba(255,255,255,0.6)' }}>
            <span>Progress</span><span>0%</span>
          </div>
          <div style={{ height: 6, background: 'rgba(255,255,255,0.2)', borderRadius: 4 }}>
            <div style={{ width: '0%', height: '100%', background: '#FFFFFF', borderRadius: 4 }} />
          </div>
        </div>
      </div>

      {/* Modules */}
      <div style={{ padding: '32px 48px' }}>
        <h3 style={{ margin: '0 0 20px', fontSize: 16, fontWeight: 700, color: 'rgba(255,255,255,0.5)', letterSpacing: 2, fontFamily: "'DM Mono', monospace" }}>COURSE CONTENT</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {modules.map((mod, i) => {
            const accessible = mod.free || isUnlocked
            const isExpanded = expandedModule === i + 1
            return (
              <div key={i} style={{ background: 'rgba(255,255,255,0.06)', borderRadius: 12, overflow: 'hidden', border: '1px solid rgba(255,255,255,0.08)' }}>
                <div
                  onClick={() => accessible && setExpandedModule(isExpanded ? null : i + 1)}
                  style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 16, cursor: accessible ? 'pointer' : 'default' }}
                >
                  <div style={{ width: 32, height: 32, borderRadius: '50%', background: accessible ? '#059669' : 'rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    {accessible ? <span style={{ fontSize: 12, fontWeight: 700 }}>{i + 1}</span> : <Lock size={13} color="rgba(255,255,255,0.3)" />}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 14, fontWeight: 600, color: accessible ? '#FFFFFF' : 'rgba(255,255,255,0.4)' }}>{mod.title}</div>
                    <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', marginTop: 2 }}>{mod.lessons} lessons · {mod.duration}</div>
                  </div>
                  {mod.free && <span style={{ fontSize: 10, color: '#059669', fontFamily: "'DM Mono', monospace", border: '1px solid #059669', padding: '2px 8px', borderRadius: 4 }}>FREE</span>}
                  {accessible && <ChevronDown size={16} color="rgba(255,255,255,0.4)" style={{ transform: isExpanded ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />}
                </div>
                {isExpanded && i === 0 && (
                  <div style={{ padding: '0 20px 20px' }}>
                    <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)', marginBottom: 16, lineHeight: 1.6 }}>
                      This introductory module covers all the foundational concepts you need to get started. By the end, you'll have a solid understanding of the core principles.
                    </p>
                    <div style={{ borderRadius: 10, overflow: 'hidden', background: '#000', marginBottom: 12 }}>
                      <iframe
                        src="https://www.youtube.com/embed/rfscVS0vtbw"
                        style={{ width: '100%', height: 280, border: 'none', display: 'block' }}
                        loading="lazy"
                        allowFullScreen
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      />
                    </div>
                    <div style={{ background: 'rgba(255,255,255,0.04)', borderRadius: 8, padding: '12px 16px', border: '1px solid rgba(255,255,255,0.06)' }}>
                      <div style={{ fontSize: 11, letterSpacing: 2, color: 'rgba(255,255,255,0.4)', fontFamily: "'DM Mono', monospace", marginBottom: 8 }}>TRANSCRIPT PREVIEW</div>
                      <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', lineHeight: 1.7, margin: 0 }}>
                        "Welcome to this course! Today we'll start with the absolute basics. Don't worry if you've never encountered this topic before — by the end of this module you'll feel completely comfortable with the fundamentals…"
                      </p>
                    </div>
                  </div>
                )}
                {isExpanded && i > 0 && isUnlocked && (
                  <div style={{ padding: '0 20px 20px' }}>
                    <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', fontStyle: 'italic' }}>Module content coming soon — check back for updates.</p>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
// MUSIC TEMPLATE
// ══════════════════════════════════════════════════════════════════════════════
function MusicTemplate({ service, merchant, isUnlocked }: { service: Service; merchant: Merchant; isUnlocked: boolean }) {
  const [isPlaying, setIsPlaying] = useState(false)
  const [progress, setProgress] = useState(0)
  const [volume, setVolume] = useState(80)
  const [currentTrack, setCurrentTrack] = useState(0)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const tracks = [
    { title: 'Midnight Drive', duration: '3:42' },
    { title: 'Solar Winds', duration: '4:15' },
    { title: 'Neon Pulse', duration: '2:58' },
    { title: 'Crystal Echo', duration: '5:01' },
    { title: 'Horizon Call', duration: '3:33' },
  ]

  useEffect(() => {
    if (isUnlocked) {
      audioRef.current = new Audio('https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3')
      audioRef.current.volume = volume / 100
    }
    return () => {
      audioRef.current?.pause()
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [isUnlocked])

  function togglePlay() {
    if (!isUnlocked || !audioRef.current) return
    if (isPlaying) {
      audioRef.current.pause()
      if (intervalRef.current) clearInterval(intervalRef.current)
    } else {
      audioRef.current.play()
      intervalRef.current = setInterval(() => {
        setProgress(p => (p >= 100 ? 0 : p + 0.3))
      }, 300)
    }
    setIsPlaying(!isPlaying)
  }

  useEffect(() => {
    if (audioRef.current) audioRef.current.volume = volume / 100
  }, [volume])

  const coverGrad = 'linear-gradient(135deg, #1a1a2e 0%, #22d3ee 100%)'

  return (
    <div style={{ minHeight: '100%', background: '#111111', fontFamily: "'DM Sans', sans-serif", color: '#FFFFFF', display: 'flex', flexDirection: 'column' }}>
      {/* Main content */}
      <div style={{ flex: 1, padding: '40px 48px', display: 'flex', gap: 40, alignItems: 'flex-start' }}>
        {/* Album art */}
        <div style={{ flexShrink: 0 }}>
          <div style={{ width: 200, height: 200, borderRadius: 16, background: coverGrad, boxShadow: '0 24px 60px rgba(34,211,238,0.2)', position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {isPlaying && (
              <div style={{ display: 'flex', alignItems: 'flex-end', height: 48, gap: 0 }}>
                {[1, 2, 3, 4, 5].map(n => <span key={n} className="waveBar" />)}
              </div>
            )}
            {!isPlaying && <Music size={48} color="rgba(255,255,255,0.3)" />}
          </div>
          <div style={{ marginTop: 16, textAlign: 'center' }}>
            <div style={{ fontSize: 16, fontWeight: 700 }}>{tracks[currentTrack].title}</div>
            <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', marginTop: 4 }}>{merchant.merchant_name}</div>
          </div>
        </div>

        {/* Track list */}
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 11, letterSpacing: 3, color: 'rgba(255,255,255,0.4)', fontFamily: "'DM Mono', monospace", marginBottom: 16 }}>TRACKS</div>
          {tracks.map((t, i) => (
            <div key={i}
              onClick={() => isUnlocked && setCurrentTrack(i)}
              style={{
                display: 'flex', alignItems: 'center', gap: 16, padding: '12px 16px', borderRadius: 10, marginBottom: 4,
                background: currentTrack === i ? 'rgba(34,211,238,0.08)' : 'transparent',
                cursor: isUnlocked ? 'pointer' : 'default',
                filter: isUnlocked ? 'none' : 'blur(3px)',
                transition: 'background 0.15s',
              }}
            >
              <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 13, color: currentTrack === i ? '#22d3ee' : 'rgba(255,255,255,0.3)', width: 20, textAlign: 'center' }}>
                {currentTrack === i && isPlaying ? '▶' : i + 1}
              </span>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: currentTrack === i ? 700 : 400, color: currentTrack === i ? '#22d3ee' : '#FFFFFF' }}>{t.title}</div>
                <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', marginTop: 1 }}>{merchant.merchant_name}</div>
              </div>
              <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 12, color: 'rgba(255,255,255,0.35)' }}>{t.duration}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Player bar */}
      <div style={{ background: '#1a1a1a', borderTop: '1px solid rgba(255,255,255,0.06)', padding: '16px 48px' }}>
        {/* Progress */}
        <div style={{ marginBottom: 12, display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color: 'rgba(255,255,255,0.3)', width: 36 }}>0:00</span>
          <div style={{ flex: 1, height: 4, background: 'rgba(255,255,255,0.1)', borderRadius: 2, cursor: 'pointer' }}>
            <div style={{ width: `${progress}%`, height: '100%', background: '#22d3ee', borderRadius: 2, transition: 'width 0.3s linear' }} />
          </div>
          <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color: 'rgba(255,255,255,0.3)', width: 36 }}>{tracks[currentTrack].duration}</span>
        </div>

        {/* Controls */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
            <button onClick={() => isUnlocked && setCurrentTrack(t => Math.max(0, t - 1))} style={{ background: 'none', border: 'none', color: isUnlocked ? 'rgba(255,255,255,0.7)' : 'rgba(255,255,255,0.2)', cursor: isUnlocked ? 'pointer' : 'default', fontSize: 20, lineHeight: 1, padding: 0 }}>⏮</button>
            <button
              onClick={togglePlay}
              style={{ width: 48, height: 48, borderRadius: '50%', background: isUnlocked ? '#22d3ee' : 'rgba(255,255,255,0.1)', border: 'none', cursor: isUnlocked ? 'pointer' : 'not-allowed', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#000', flexShrink: 0 }}
            >
              {isUnlocked ? (isPlaying ? <span style={{ fontSize: 18 }}>⏸</span> : <Play size={20} fill="#000" />) : <Lock size={18} color="rgba(255,255,255,0.4)" />}
            </button>
            <button onClick={() => isUnlocked && setCurrentTrack(t => Math.min(tracks.length - 1, t + 1))} style={{ background: 'none', border: 'none', color: isUnlocked ? 'rgba(255,255,255,0.7)' : 'rgba(255,255,255,0.2)', cursor: isUnlocked ? 'pointer' : 'default', fontSize: 20, lineHeight: 1, padding: 0 }}>⏭</button>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Volume2 size={16} color="rgba(255,255,255,0.4)" />
            <input type="range" min={0} max={100} value={volume} onChange={e => setVolume(Number(e.target.value))}
              style={{ width: 80, accentColor: '#22d3ee' }} />
          </div>
        </div>
      </div>
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
// FINANCE TEMPLATE
// ══════════════════════════════════════════════════════════════════════════════
const BASE_PRICES: Record<string, number> = { BTC: 67842.50, ETH: 3421.80, SOL: 172.40, AAPL: 211.30, GOOGL: 178.90, TSLA: 248.60 }
const BASE_CHANGES: Record<string, number> = { BTC: 2.34, ETH: -1.12, SOL: 5.67, AAPL: 0.88, GOOGL: -0.43, TSLA: 3.21 }
const BASE_VOLUMES: Record<string, string> = { BTC: '28.4B', ETH: '14.2B', SOL: '3.8B', AAPL: '58.1M', GOOGL: '22.4M', TSLA: '91.7M' }

function FinanceTemplate({ isUnlocked }: { service: Service; merchant: Merchant; isUnlocked: boolean }) {
  const [prices, setPrices] = useState<Record<string, number>>({ ...BASE_PRICES })
  const [tick, setTick] = useState(0)

  useEffect(() => {
    if (!isUnlocked) return
    const id = setInterval(() => {
      setPrices(p => {
        const next = { ...p }
        Object.keys(next).forEach(k => { next[k] = next[k] * (1 + (Math.random() - 0.5) * 0.003) })
        return next
      })
      setTick(t => t + 1)
    }, 3000)
    return () => clearInterval(id)
  }, [isUnlocked])

  // Simple SVG sparkline
  const sparkPoints = Array.from({ length: 20 }, (_, i) => {
    const x = (i / 19) * 200
    const y = 40 - Math.sin(i * 0.5 + tick * 0.2) * 15 - Math.random() * 8
    return `${x},${y}`
  }).join(' ')

  const assets = Object.keys(BASE_PRICES)

  return (
    <div style={{ minHeight: '100%', background: '#0a0e1a', fontFamily: "'DM Mono', monospace", color: '#FFFFFF', padding: '32px 40px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 32 }}>
        <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#22c55e', animation: 'pulse-dot 1.5s ease-in-out infinite' }} />
        <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, letterSpacing: 3, color: '#22c55e' }}>LIVE MARKET DATA</h2>
        <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', marginLeft: 8 }}>
          {new Date().toLocaleTimeString()}
        </span>
      </div>

      {/* Sparkline */}
      <div style={{ background: 'rgba(34,197,94,0.05)', border: '1px solid rgba(34,197,94,0.15)', borderRadius: 12, padding: '16px 20px', marginBottom: 28 }}>
        <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginBottom: 8 }}>COMPOSITE INDEX</div>
        <svg width="100%" viewBox="0 0 200 50" preserveAspectRatio="none" style={{ height: 60, display: 'block' }}>
          <polyline points={sparkPoints} fill="none" stroke="#22c55e" strokeWidth="1.5" vectorEffect="non-scaling-stroke" />
          <polyline points={`0,50 ${sparkPoints} 200,50`} fill="rgba(34,197,94,0.08)" stroke="none" />
        </svg>
      </div>

      {/* Table */}
      <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 12, overflow: 'hidden', border: '1px solid rgba(255,255,255,0.06)' }}>
        {/* Header */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', padding: '12px 20px', background: 'rgba(255,255,255,0.04)', borderBottom: '1px solid rgba(255,255,255,0.06)', fontSize: 11, color: 'rgba(255,255,255,0.4)', letterSpacing: 2 }}>
          <span>ASSET</span><span style={{ textAlign: 'right' }}>PRICE</span><span style={{ textAlign: 'right' }}>24H %</span><span style={{ textAlign: 'right' }}>VOLUME</span>
        </div>
        {assets.map((asset, i) => {
          const price = prices[asset]
          const change = BASE_CHANGES[asset]
          const vol = BASE_VOLUMES[asset]
          const up = change >= 0
          return (
            <div key={asset} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', padding: '14px 20px', borderBottom: i < assets.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none', alignItems: 'center' }}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 700 }}>{asset}</div>
                <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', marginTop: 2 }}>{asset.length <= 3 ? 'Crypto' : 'Stock'}</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                {isUnlocked
                  ? <span style={{ fontSize: 14, fontWeight: 600, animation: isUnlocked ? 'numberFlicker 0.3s ease' : 'none' }}>${price.toFixed(2)}</span>
                  : <span style={{ background: 'rgba(255,255,255,0.1)', borderRadius: 4, padding: '2px 8px', fontSize: 12 }}>████</span>}
              </div>
              <div style={{ textAlign: 'right' }}>
                {isUnlocked
                  ? <span style={{ fontSize: 13, fontWeight: 600, color: up ? '#22c55e' : '#ef4444' }}>{up ? '+' : ''}{change.toFixed(2)}%</span>
                  : <span style={{ background: 'rgba(255,255,255,0.1)', borderRadius: 4, padding: '2px 6px', fontSize: 12 }}>███</span>}
              </div>
              <div style={{ textAlign: 'right' }}>
                {isUnlocked
                  ? <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)' }}>{vol}</span>
                  : <span style={{ background: 'rgba(255,255,255,0.1)', borderRadius: 4, padding: '2px 6px', fontSize: 12 }}>████</span>}
              </div>
            </div>
          )
        })}
      </div>

      {isUnlocked && (
        <p style={{ textAlign: 'center', fontSize: 10, color: 'rgba(255,255,255,0.2)', marginTop: 20, letterSpacing: 1 }}>
          DATA REFRESHES EVERY 3s · SIMULATED FOR DEMO PURPOSES
        </p>
      )}
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
// HEALTH TEMPLATE
// ══════════════════════════════════════════════════════════════════════════════
function HealthTemplate({ isUnlocked }: { service: Service; merchant: Merchant; isUnlocked: boolean }) {
  const [activeSession, setActiveSession] = useState<string | null>(null)
  const [breatheState, setBreatheState] = useState<'in' | 'out'>('in')
  const [breatheActive, setBreatheActive] = useState(false)
  const breatheRef = useRef<ReturnType<typeof setInterval> | null>(null)

  function startBreathe() {
    if (!isUnlocked) return
    setBreatheActive(true)
    setActiveSession('breathing')
    setBreatheState('in')
    breatheRef.current = setInterval(() => {
      setBreatheState(s => s === 'in' ? 'out' : 'in')
    }, 4000)
  }

  useEffect(() => {
    return () => { if (breatheRef.current) clearInterval(breatheRef.current) }
  }, [])

  const sessions = [
    { id: 'breathing', title: '5-min Breathing', subtitle: 'Box breathing for calm', icon: '🌬️', color: '#6366f1' },
    { id: 'focus', title: '10-min Focus', subtitle: 'Concentration boost', icon: '🎯', color: '#8b5cf6' },
    { id: 'sleep', title: 'Sleep Story', subtitle: 'Drift into deep sleep', icon: '🌙', color: '#4f46e5' },
    { id: 'body', title: 'Body Scan', subtitle: 'Full-body relaxation', icon: '✨', color: '#7c3aed' },
  ]

  return (
    <div style={{ minHeight: '100%', background: 'linear-gradient(135deg, #312e81 0%, #4c1d95 50%, #6b21a8 100%)', fontFamily: "'DM Sans', sans-serif", color: '#FFFFFF', padding: '40px 40px 60px' }}>
      <h2 style={{ margin: '0 0 6px', fontSize: 28, fontWeight: 800 }}>Today's Session</h2>
      <p style={{ margin: '0 0 40px', color: 'rgba(255,255,255,0.6)', fontSize: 14 }}>Take a moment for yourself. You deserve it.</p>

      {/* Breathing animation (active) */}
      {activeSession === 'breathing' && (
        <div style={{ textAlign: 'center', marginBottom: 48 }}>
          <div style={{
            width: 180, height: 180, borderRadius: '50%', margin: '0 auto 24px',
            background: 'rgba(99,102,241,0.25)',
            boxShadow: `0 0 0 ${breatheState === 'in' ? 40 : 0}px rgba(99,102,241,0.1), 0 0 0 ${breatheState === 'in' ? 20 : 0}px rgba(99,102,241,0.15)`,
            transform: breatheState === 'in' ? 'scale(1.4)' : 'scale(1)',
            transition: 'transform 4s ease-in-out, box-shadow 4s ease-in-out',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 32,
          }}>
            🌬️
          </div>
          <div style={{ fontSize: 24, fontWeight: 700, marginBottom: 8 }}>
            {breatheState === 'in' ? 'Breathe in…' : 'Breathe out…'}
          </div>
          <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.5)' }}>{breatheState === 'in' ? '4 seconds' : '4 seconds'}</div>
          <button onClick={() => { setBreatheActive(false); setActiveSession(null); if (breatheRef.current) clearInterval(breatheRef.current) }}
            style={{ marginTop: 20, background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: 8, padding: '8px 20px', color: '#fff', cursor: 'pointer', fontSize: 13 }}>
            Stop session
          </button>
        </div>
      )}

      {/* Session cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16 }}>
        {sessions.map(s => (
          <div key={s.id}
            onClick={() => { if (isUnlocked && s.id === 'breathing') startBreathe() }}
            style={{
              background: 'rgba(255,255,255,0.07)', borderRadius: 16,
              padding: '24px 20px', cursor: isUnlocked ? 'pointer' : 'default',
              border: '1px solid rgba(255,255,255,0.1)',
              filter: isUnlocked ? 'none' : 'blur(3px)',
              transition: 'all 0.2s',
              position: 'relative', overflow: 'hidden',
            }}
          >
            <div style={{ position: 'absolute', top: -20, right: -20, width: 80, height: 80, borderRadius: '50%', background: `${s.color}20` }} />
            <div style={{ fontSize: 28, marginBottom: 12 }}>{s.icon}</div>
            <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 4 }}>{s.title}</div>
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)' }}>{s.subtitle}</div>
            {isUnlocked && s.id === 'breathing' && (
              <div style={{ marginTop: 16, fontSize: 11, letterSpacing: 2, color: s.color, fontFamily: "'DM Mono', monospace" }}>TAP TO START →</div>
            )}
            {isUnlocked && s.id !== 'breathing' && (
              <div style={{ marginTop: 16, fontSize: 11, letterSpacing: 2, color: 'rgba(255,255,255,0.3)', fontFamily: "'DM Mono', monospace" }}>COMING SOON</div>
            )}
          </div>
        ))}
      </div>

      <div style={{ textAlign: 'center', marginTop: 40, fontSize: 12, color: 'rgba(255,255,255,0.3)' }}>
        Consistency is the key to lasting change.
      </div>
    </div>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
// GENERIC TEMPLATE
// ══════════════════════════════════════════════════════════════════════════════
function GenericTemplate({ service, merchant, isUnlocked }: { service: Service; merchant: Merchant; isUnlocked: boolean }) {
  const accent = getAccent(service.category)
  const icon = getIcon(service.category)

  const desc = service.description || 'A powerful API service'
  const bullets = [
    'Real-time processing with sub-100ms response times',
    'RESTful API with comprehensive documentation',
    'Enterprise-grade reliability with 99.9% uptime SLA',
  ]

  const mockResponse = JSON.stringify({
    status: 'success',
    service: service.service_name,
    provider: merchant.merchant_name,
    endpoint: service.path || '/api/v1/process',
    result: {
      processed: true,
      timestamp: new Date().toISOString(),
      data: { value: 'Sample output from ' + service.service_name, confidence: 0.98, tokens_used: 142 },
    },
    billing: { amount: service.price, currency: 'USD', settled: 'instant' },
  }, null, 2)

  return (
    <div style={{ minHeight: '100%', background: '#FFFFFF', fontFamily: "'DM Sans', sans-serif", padding: '48px 48px 60px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 20, marginBottom: 36 }}>
        <div style={{ width: 64, height: 64, borderRadius: 16, background: `${accent}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: accent, flexShrink: 0 }}>
          {icon}
        </div>
        <div>
          <div style={{ display: 'inline-block', fontSize: 10, letterSpacing: 2, color: accent, fontFamily: "'DM Mono', monospace", border: `1px solid ${accent}40`, padding: '3px 8px', borderRadius: 4, marginBottom: 8 }}>
            {service.category.toUpperCase()}
          </div>
          <h1 style={{ margin: '0 0 6px', fontSize: 28, fontWeight: 800, color: '#0D0C0A' }}>{service.service_name}</h1>
          <p style={{ margin: 0, fontSize: 14, color: '#9A958F' }}>by {merchant.merchant_name}</p>
        </div>
      </div>

      <p style={{ fontSize: 15, color: '#4A4845', lineHeight: 1.7, marginBottom: 32, maxWidth: 640 }}>{desc}</p>

      {/* Features */}
      <div style={{ marginBottom: 36 }}>
        <div style={{ fontSize: 11, letterSpacing: 2, color: '#9A958F', fontFamily: "'DM Mono', monospace", marginBottom: 16 }}>FEATURES</div>
        {bullets.map((b, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 12 }}>
            <div style={{ width: 20, height: 20, borderRadius: '50%', background: `${accent}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1 }}>
              <CheckCircle size={12} color={accent} />
            </div>
            <span style={{ fontSize: 14, color: '#4A4845', lineHeight: 1.5 }}>{b}</span>
          </div>
        ))}
      </div>

      {/* Code block */}
      <div>
        <div style={{ fontSize: 11, letterSpacing: 2, color: '#9A958F', fontFamily: "'DM Mono', monospace", marginBottom: 12 }}>SAMPLE API RESPONSE</div>
        <div style={{
          background: '#0D0C0A', borderRadius: 12, padding: '20px 24px',
          filter: isUnlocked ? 'none' : 'blur(5px)',
          userSelect: isUnlocked ? 'auto' : 'none',
          transition: 'filter 0.4s ease',
          position: 'relative', overflow: 'hidden',
        }}>
          <div style={{ display: 'flex', gap: 6, marginBottom: 16 }}>
            {['#ff5f57', '#febc2e', '#28c840'].map(c => <div key={c} style={{ width: 10, height: 10, borderRadius: '50%', background: c }} />)}
          </div>
          <pre style={{ margin: 0, fontFamily: "'DM Mono', monospace", fontSize: 12, color: '#e2e8f0', lineHeight: 1.7, overflowX: 'auto', whiteSpace: 'pre' }}>
            {mockResponse.split('\n').map((line, i) => {
              const isKey = /"[^"]+":/.test(line)
              const isStr = /: "/.test(line)
              const isNum = /: \d/.test(line) || /: true/.test(line) || /: false/.test(line)
              let color = '#e2e8f0'
              if (isKey) color = '#93c5fd'
              if (isStr) color = '#86efac'
              if (isNum && !isKey) color = '#fca5a5'
              return <span key={i} style={{ color, display: 'block' }}>{line}</span>
            })}
          </pre>
        </div>
      </div>
    </div>
  )
}
