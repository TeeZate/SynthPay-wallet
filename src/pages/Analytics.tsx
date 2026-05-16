import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { walletApi } from '../lib/api'
import { ArrowLeft } from 'lucide-react'

const T = {
  amber: '#F59B00', amberPale: 'rgba(245,155,0,0.08)', amberBd: 'rgba(245,155,0,0.2)',
  bg: '#F7F5F2', surface: '#FFFFFF', surface2: '#F3F1EE',
  border: '#E8E4DF', border2: '#D4CFC9',
  text1: '#0D0C0A', text2: '#4A4845', text3: '#9A958F', text4: '#C4BFB9',
  green: '#059669', red: '#DC2626', navy: '#111827',
}

interface Tx {
  id: string
  amount: number
  merchant_name: string
  user_balance_after: number
  created_at: string
}

interface Topup {
  id: string
  amount: number
  status: string
  created_at: string
}

interface SpendByMerchant { name: string; total: number; count: number }

function Bar({ pct }: { pct: number }) {
  return (
    <div style={{ height: 6, background: T.surface2, borderRadius: 4, overflow: 'hidden', marginTop: 6 }}>
      <div style={{ height: '100%', width: `${Math.min(100, pct)}%`, background: T.amber, borderRadius: 4, transition: 'width 0.6s ease' }} />
    </div>
  )
}

function StatCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 14, padding: '20px 20px', boxShadow: '0 4px 16px rgba(0,0,0,0.06)' }}>
      <p style={{ margin: '0 0 6px', fontSize: 10, color: T.text3, letterSpacing: 3, fontFamily: "'DM Mono', monospace" }}>{label}</p>
      <p style={{ margin: 0, fontSize: 26, fontWeight: 800, color: T.amber, fontFamily: "'DM Mono', monospace" }}>{value}</p>
      {sub && <p style={{ margin: '4px 0 0', fontSize: 11, color: T.text3 }}>{sub}</p>}
    </div>
  )
}

// Build a simple 30-day spend sparkline from transaction history
function Sparkline({ txs }: { txs: Tx[] }) {
  const days = 30
  const buckets: number[] = Array(days).fill(0)
  const now = Date.now()

  txs.forEach(tx => {
    const age = Math.floor((now - new Date(tx.created_at).getTime()) / 86_400_000)
    if (age >= 0 && age < days) buckets[days - 1 - age] += Number(tx.amount)
  })

  const max = Math.max(...buckets, 0.0001)
  const w = 4
  const gap = 2
  const totalW = (w + gap) * days - gap
  const h = 48

  return (
    <svg width="100%" viewBox={`0 0 ${totalW} ${h}`} preserveAspectRatio="none" style={{ display: 'block' }}>
      {buckets.map((v, i) => {
        const barH = Math.max(2, (v / max) * h)
        return (
          <rect
            key={i}
            x={i * (w + gap)}
            y={h - barH}
            width={w}
            height={barH}
            rx={1}
            fill={v > 0 ? T.amber : T.surface2}
            opacity={v > 0 ? 0.85 : 1}
          />
        )
      })}
    </svg>
  )
}

export default function Analytics() {
  const { user } = useAuth() as any
  const navigate = useNavigate()
  const [txs,    setTxs]    = useState<Tx[]>([])
  const [topups, setTopups] = useState<Topup[]>([])
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState('')

  useEffect(() => {
    if (!user) return
    Promise.all([
      walletApi.history(user.user_id),
      walletApi.topupHistory(user.user_id),
    ])
      .then(([h, t]) => {
        setTxs(h.data.transactions || [])
        setTopups(t.data.topups || [])
      })
      .catch(() => setError('Failed to load analytics.'))
      .finally(() => setLoading(false))
  }, [user?.user_id])

  // ── Derived stats ─────────────────────────────────────────────────────────
  const totalSpend    = txs.reduce((s, t) => s + Number(t.amount), 0)
  const totalDeposits = topups.filter(t => t.status === 'completed').reduce((s, t) => s + Number(t.amount), 0)

  const now30     = Date.now() - 30 * 86_400_000
  const spend30   = txs.filter(t => new Date(t.created_at).getTime() > now30).reduce((s, t) => s + Number(t.amount), 0)
  const deposit30 = topups.filter(t => t.status === 'completed' && new Date(t.created_at).getTime() > now30).reduce((s, t) => s + Number(t.amount), 0)

  const merchantMap = new Map<string, SpendByMerchant>()
  txs.forEach(tx => {
    const name = tx.merchant_name || 'Unknown'
    const e = merchantMap.get(name) || { name, total: 0, count: 0 }
    e.total += Number(tx.amount)
    e.count += 1
    merchantMap.set(name, e)
  })
  const byMerchant = [...merchantMap.values()].sort((a, b) => b.total - a.total)
  const topMerchantTotal = byMerchant[0]?.total || 0.0001

  // Balance trend from last 10 transactions
  const balanceTrend = txs.slice(0, 10).reverse().map(tx => Number(tx.user_balance_after))

  return (
    <div style={{ minHeight: '100vh', background: T.bg, paddingBottom: 40, fontFamily: "'DM Sans', system-ui, sans-serif" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700;900&family=DM+Mono:wght@300;400;500&display=swap');`}</style>

      {/* Header */}
      <div style={{
        padding: '14px 20px',
        background: T.surface,
        borderBottom: `1px solid ${T.border}`,
        position: 'sticky', top: 0, zIndex: 50,
        display: 'flex', alignItems: 'center', gap: 12,
      }}>
        <button onClick={() => navigate('/wallet')} style={{
          width: 36, height: 36, borderRadius: '50%',
          border: `1px solid ${T.border}`, background: T.surface2,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: 'pointer', color: T.text2,
        }}>
          <ArrowLeft size={16} />
        </button>
        <div>
          <p style={{ fontSize: 10, color: T.text3, letterSpacing: 2, fontFamily: "'DM Mono', monospace", margin: 0 }}>ACCOUNT ANALYTICS</p>
          <h1 style={{ fontSize: 16, fontWeight: 800, color: T.text1, margin: 0 }}>Your spending</h1>
        </div>
      </div>

      {error && (
        <div style={{ margin: '16px 20px', padding: '12px 16px', borderRadius: 10, background: 'rgba(220,38,38,0.06)', border: '1px solid rgba(220,38,38,0.2)' }}>
          <p style={{ fontSize: 13, color: T.red }}>{error}</p>
        </div>
      )}

      {loading ? (
        <div style={{ textAlign: 'center', padding: 80 }}>
          <p style={{ color: T.text3, fontFamily: "'DM Mono', monospace", letterSpacing: 2, fontSize: 12 }}>LOADING...</p>
        </div>
      ) : (
        <div style={{ padding: '20px 20px 0' }}>

          {/* Stat cards */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}>
            <StatCard label="SPENT (30D)" value={`$${spend30.toFixed(4)}`} sub={`$${totalSpend.toFixed(4)} all time`} />
            <StatCard label="DEPOSITED (30D)" value={`$${deposit30.toFixed(2)}`} sub={`$${totalDeposits.toFixed(2)} all time`} />
            <StatCard label="TRANSACTIONS" value={String(txs.length)} sub="all time" />
            <StatCard label="AVG PER TX" value={txs.length ? `$${(totalSpend / txs.length).toFixed(4)}` : '—'} />
          </div>

          {/* 30-day sparkline */}
          {txs.length > 0 && (
            <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 14, padding: '20px 20px 16px', marginBottom: 20, boxShadow: '0 4px 16px rgba(0,0,0,0.06)' }}>
              <p style={{ margin: '0 0 16px', fontSize: 10, color: T.text3, letterSpacing: 3, fontFamily: "'DM Mono', monospace" }}>DAILY SPEND — LAST 30 DAYS</p>
              <Sparkline txs={txs} />
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8 }}>
                <span style={{ fontSize: 10, color: T.text4, fontFamily: "'DM Mono', monospace" }}>30d ago</span>
                <span style={{ fontSize: 10, color: T.text4, fontFamily: "'DM Mono', monospace" }}>today</span>
              </div>
            </div>
          )}

          {/* Balance trend */}
          {balanceTrend.length > 1 && (
            <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 14, padding: '20px 20px 16px', marginBottom: 20, boxShadow: '0 4px 16px rgba(0,0,0,0.06)' }}>
              <p style={{ margin: '0 0 16px', fontSize: 10, color: T.text3, letterSpacing: 3, fontFamily: "'DM Mono', monospace" }}>BALANCE AFTER LAST {balanceTrend.length} TRANSACTIONS</p>
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4, height: 48 }}>
                {(() => {
                  const min = Math.min(...balanceTrend)
                  const max = Math.max(...balanceTrend)
                  const range = max - min || 1
                  return balanceTrend.map((v, i) => (
                    <div key={i} style={{ flex: 1, background: T.amber, opacity: 0.4 + (i / balanceTrend.length) * 0.6, borderRadius: '2px 2px 0 0', height: `${Math.max(8, ((v - min) / range) * 48)}px` }} />
                  ))
                })()}
              </div>
            </div>
          )}

          {/* Spend by merchant */}
          {byMerchant.length > 0 && (
            <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 14, padding: '20px', marginBottom: 20, boxShadow: '0 4px 16px rgba(0,0,0,0.06)' }}>
              <p style={{ margin: '0 0 16px', fontSize: 10, color: T.text3, letterSpacing: 3, fontFamily: "'DM Mono', monospace" }}>SPEND BY SERVICE</p>
              {byMerchant.slice(0, 8).map(m => (
                <div key={m.name} style={{ marginBottom: 14 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
                    <span style={{ fontSize: 13, color: T.text1 }}>{m.name}</span>
                    <span style={{ fontSize: 13, fontFamily: "'DM Mono', monospace", color: T.amber }}>${m.total.toFixed(4)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
                    <span style={{ fontSize: 11, color: T.text3 }}>{m.count} transaction{m.count !== 1 ? 's' : ''}</span>
                    <span style={{ fontSize: 11, color: T.text3 }}>{((m.total / totalSpend) * 100).toFixed(1)}%</span>
                  </div>
                  <Bar pct={(m.total / topMerchantTotal) * 100} />
                </div>
              ))}
            </div>
          )}

          {txs.length === 0 && (
            <div style={{ textAlign: 'center', padding: '52px 20px', background: T.surface, borderRadius: 14, border: `1px dashed ${T.border2}` }}>
              <div style={{
                width: 56, height: 56, borderRadius: 16,
                background: T.amberPale, border: `1px solid ${T.amberBd}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                margin: '0 auto 16px',
              }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={T.amber} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
              </div>
              <p style={{ fontSize: 14, color: T.text2, fontWeight: 600, marginBottom: 4 }}>No transactions yet.</p>
              <p style={{ fontSize: 12, color: T.text3, marginTop: 4 }}>Analytics will appear after your first purchase.</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
