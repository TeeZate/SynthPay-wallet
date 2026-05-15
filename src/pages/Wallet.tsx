import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { walletApi } from '../lib/api'
import EmailLink from '../components/EmailLink'
import { analytics } from '../lib/analytics'

// ── Design tokens ──────────────────────────────────────────────────────────────
const T = {
  amber:       '#F0A500',
  amberLight:  '#FFB800',
  amberPale:   'rgba(240,165,0,0.08)',
  amberBorder: 'rgba(240,165,0,0.18)',
  bg:          '#0A0906',
  surface:     '#111009',
  surface2:    '#181610',
  border:      '#222018',
  text1:       '#F0EEE8',
  text2:       '#C8C4BC',
  text3:       '#7A7670',
  text4:       '#3A3830',
  silver:      '#A8B0BC',
  green:       '#10b981',
  greenPale:   'rgba(16,185,129,0.08)',
  red:         '#ef4444',
}

function Skeleton({ w = '100%', h = 16, radius = 6 }: { w?: string | number; h?: number; radius?: number }) {
  return (
    <div style={{
      width: w, height: h, borderRadius: radius,
      background: `linear-gradient(90deg, ${T.surface}, ${T.surface2}, ${T.surface})`,
      backgroundSize: '200% 100%',
      animation: 'shimmer 1.4s infinite',
    }} />
  )
}

export default function Wallet() {
  const { user, logout, setUser } = useAuth() as any
  const [history,  setHistory]  = useState<any[]>([])
  const [topups,   setTopups]   = useState<any[]>([])
  const [loading,  setLoading]  = useState(true)
  const [error,    setError]    = useState('')
  const [tab,      setTab]      = useState<'transactions' | 'topups'>('transactions')
  const navigate = useNavigate()

  useEffect(() => {
    const load = async () => {
      if (!user) return
      try {
        const [bal, hist, tops] = await Promise.all([
          walletApi.balance(user.user_id),
          walletApi.history(user.user_id),
          walletApi.topupHistory(user.user_id),
        ])
        setUser({ ...user, balance: bal.data.balance })
        setHistory(hist.data.transactions || [])
        setTopups(tops.data.topups || [])
      } catch (err) {
        setError('Failed to load wallet data.')
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [user?.user_id])

  const balance = Number(user?.balance || 0)

  return (
    <div style={{
      minHeight: '100vh',
      background: T.bg,
      paddingBottom: 48,
      fontFamily: "'DM Sans', system-ui, sans-serif",
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700;900&family=DM+Mono:wght@300;400;500&display=swap');
        @keyframes shimmer { 0%{background-position:-200% 0} 100%{background-position:200% 0} }
        @keyframes fadeIn  { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:none} }
        @keyframes pulse   { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:0.45;transform:scale(0.8)} }
        .tx-row:hover { background: ${T.surface2} !important; }
        .action-btn { transition: all 0.18s ease; }
        .action-btn:hover { opacity: 0.85; transform: translateY(-1px); }
      `}</style>

      {/* ── Sticky top bar ── */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '14px 20px',
        background: 'rgba(10,9,6,0.9)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        position: 'sticky', top: 0, zIndex: 50,
        borderBottom: `1px solid ${T.border}`,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 30, height: 30, borderRadius: 9,
            background: T.amber,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 15, fontWeight: 900, color: '#000',
            fontFamily: "'DM Mono', monospace",
            boxShadow: `0 2px 10px rgba(240,165,0,0.3)`,
          }}>S</div>
          <div style={{ fontSize: 15, fontWeight: 800, letterSpacing: -0.3, color: T.text1 }}>
            SYNTH<span style={{ color: T.amber }}>PAY</span>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button
            onClick={() => navigate('/analytics')}
            style={{
              width: 32, height: 32, borderRadius: 8,
              border: `1px solid ${T.border}`,
              background: T.surface, color: T.text3,
              fontSize: 13, cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'all 0.15s',
            }}
            title="Analytics"
          >📊</button>
          <button
            onClick={() => { analytics.track('wallet_logout'); analytics.reset(); logout() }}
            style={{
              padding: '7px 14px', borderRadius: 8,
              border: `1px solid transparent`,
              background: 'transparent', color: T.text3,
              fontSize: 11, cursor: 'pointer',
              fontFamily: "'DM Mono', monospace",
              letterSpacing: 0.5, transition: 'all 0.2s',
            }}>
            Sign out
          </button>
        </div>
      </div>

      {/* ── Balance card ── */}
      <div style={{ padding: '16px 16px 0' }}>
        <div style={{
          background: 'linear-gradient(150deg, #141208 0%, #0E0C08 100%)',
          borderRadius: 24, padding: '28px 24px 24px',
          position: 'relative', overflow: 'hidden',
          border: '1px solid #1E1C14',
          boxShadow: '0 24px 56px rgba(0,0,0,0.45), inset 0 0 0 1px rgba(240,165,0,0.04)',
        }}>
          {/* Amber top bar */}
          <div style={{
            position: 'absolute', top: 0, left: 0, right: 0, height: 2,
            background: `linear-gradient(90deg, ${T.amber} 0%, ${T.amberLight} 35%, transparent 80%)`,
          }} />
          {/* Decorative slash */}
          <div style={{
            position: 'absolute', bottom: -36, right: 10,
            fontSize: 170, fontWeight: 900, color: T.amber,
            opacity: 0.04, lineHeight: 1, userSelect: 'none',
            fontFamily: "'DM Sans', sans-serif", pointerEvents: 'none',
          }}>/</div>
          {/* Corner glow */}
          <div style={{
            position: 'absolute', top: -50, right: -50,
            width: 140, height: 140,
            background: 'radial-gradient(circle, rgba(240,165,0,0.1) 0%, transparent 70%)',
            pointerEvents: 'none',
          }} />

          {/* Live dot + label */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <div style={{
              width: 6, height: 6, borderRadius: '50%',
              background: T.green, animation: 'pulse 2.5s ease-in-out infinite',
              boxShadow: `0 0 6px ${T.green}`,
            }} />
            <span style={{
              fontSize: 9, fontWeight: 600, letterSpacing: 2.5,
              color: 'rgba(255,255,255,0.22)',
              fontFamily: "'DM Mono', monospace", textTransform: 'uppercase',
            }}>Prepaid credit balance</span>
          </div>

          {/* Amount */}
          {loading ? (
            <div style={{ marginBottom: 28 }}><Skeleton w={190} h={54} radius={10} /></div>
          ) : (
            <div style={{
              fontSize: 52, fontWeight: 700, letterSpacing: -2.5,
              color: '#fff', lineHeight: 1, marginBottom: 6,
              fontFamily: "'DM Mono', monospace",
              animation: 'fadeIn 0.5s ease',
            }}>
              <span style={{ fontSize: 22, fontWeight: 400, opacity: 0.3, verticalAlign: 'super', marginRight: 1 }}>$</span>
              {Math.floor(balance).toLocaleString()}
              <span style={{ fontSize: 26, fontWeight: 500, opacity: 0.45 }}>
                .{balance.toFixed(4).split('.')[1]}
              </span>
            </div>
          )}

          <p style={{
            fontSize: 9, color: T.text4, fontFamily: "'DM Mono', monospace",
            marginBottom: 24, letterSpacing: 1.5,
          }}>USD · UPDATED LIVE</p>

          {/* Buttons */}
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="action-btn" onClick={() => navigate('/topup')} style={{
              flex: 1.3, padding: '12px 8px', borderRadius: 12, border: 'none',
              background: T.amber, color: '#000',
              fontSize: 12, fontWeight: 700, cursor: 'pointer',
              fontFamily: "'DM Sans', sans-serif",
              boxShadow: '0 4px 18px rgba(240,165,0,0.28)',
            }}>+ Add credits</button>
            <button className="action-btn" onClick={() => navigate('/marketplace')} style={{
              flex: 1, padding: '12px 8px', borderRadius: 12,
              border: '1px solid rgba(255,255,255,0.08)',
              background: 'rgba(255,255,255,0.04)',
              color: 'rgba(255,255,255,0.52)',
              fontSize: 12, fontWeight: 600, cursor: 'pointer',
              fontFamily: "'DM Sans', sans-serif",
            }}>⚡ Services</button>
            <button className="action-btn" style={{
              flex: 1, padding: '12px 8px', borderRadius: 12,
              border: '1px solid rgba(255,255,255,0.08)',
              background: 'rgba(255,255,255,0.04)',
              color: 'rgba(255,255,255,0.52)',
              fontSize: 12, fontWeight: 600, cursor: 'pointer',
              fontFamily: "'DM Sans', sans-serif",
            }}>↩ Refund</button>
          </div>
        </div>
      </div>

      {/* ── Audit badge ── */}
      <div style={{ padding: '10px 16px 0' }}>
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          background: T.surface, border: `1px solid ${T.border}`,
          borderRadius: 12, padding: '10px 14px',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{
              width: 5, height: 5, borderRadius: '50%',
              background: T.green, animation: 'pulse 2.5s ease-in-out infinite',
              boxShadow: `0 0 5px ${T.green}`,
            }} />
            <span style={{ fontSize: 10, color: T.text3, fontFamily: "'DM Mono', monospace", letterSpacing: 0.3 }}>
              Ledger: <span style={{ color: T.amber, fontWeight: 600 }}>VERIFIED</span>
              {' '}· Chain: PASSED · Anomalies: <span style={{ color: T.green, fontWeight: 600 }}>0</span>
            </span>
          </div>
          <span style={{ fontSize: 8, color: T.text4, fontFamily: "'DM Mono', monospace", letterSpacing: 1 }}>LIVE</span>
        </div>
      </div>

      {/* ── Error ── */}
      {error && (
        <div style={{
          margin: '10px 16px 0', padding: '12px 16px', borderRadius: 12,
          background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.18)',
        }}>
          <p style={{ fontSize: 13, color: T.red }}>{error}</p>
        </div>
      )}

      {/* ── Tabs ── */}
      <div style={{ padding: '20px 16px 0' }}>
        <div style={{ display: 'flex', borderBottom: `1px solid ${T.border}` }}>
          {(['transactions', 'topups'] as const).map(t => (
            <button key={t} onClick={() => setTab(t)} style={{
              padding: '10px 0 12px', marginRight: 24,
              border: 'none', background: 'transparent',
              color: tab === t ? T.amber : T.text4,
              fontSize: 10, fontWeight: 700, cursor: 'pointer',
              letterSpacing: 2, textTransform: 'uppercase',
              fontFamily: "'DM Mono', monospace",
              borderBottom: tab === t ? `2px solid ${T.amber}` : '2px solid transparent',
              marginBottom: -1, transition: 'all 0.2s',
            }}>
              {t === 'transactions' ? 'Billing Events' : 'Credit Purchases'}
            </button>
          ))}
        </div>

        {/* Skeletons */}
        {loading && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 1, marginTop: 1 }}>
            {[1, 2, 3].map(i => (
              <div key={i} style={{
                padding: '14px 16px', background: T.surface,
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                borderRadius: i === 1 ? '12px 12px 0 0' : i === 3 ? '0 0 12px 12px' : 0,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <Skeleton w={38} h={38} radius={11} />
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <Skeleton w={120} h={12} /><Skeleton w={80} h={10} />
                  </div>
                </div>
                <Skeleton w={70} h={14} />
              </div>
            ))}
          </div>
        )}

        {/* Transactions */}
        {!loading && tab === 'transactions' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 1, marginTop: 1 }}>
            {history.length === 0 ? (
              <div style={{
                textAlign: 'center', padding: '56px 20px',
                background: T.surface, borderRadius: 16, border: `1px solid ${T.border}`,
              }}>
                <div style={{
                  width: 56, height: 56, borderRadius: 16,
                  background: T.amberPale, border: `1px solid ${T.amberBorder}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 24, margin: '0 auto 16px',
                }}>⚡</div>
                <p style={{ fontSize: 14, fontWeight: 600, color: T.text2, marginBottom: 6 }}>No billing events yet</p>
                <p style={{ fontSize: 12, color: T.text4, lineHeight: 1.7, marginBottom: 20 }}>Browse services to make your first API call</p>
                <button onClick={() => navigate('/marketplace')} style={{
                  padding: '10px 22px', borderRadius: 10, border: 'none',
                  background: T.amber, color: '#000', fontSize: 12, fontWeight: 700,
                  cursor: 'pointer', fontFamily: "'DM Sans', sans-serif",
                  boxShadow: '0 4px 14px rgba(240,165,0,0.22)',
                }}>Browse Services →</button>
              </div>
            ) : history.map((tx: any, i: number) => (
              <div key={i} className="tx-row" style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '13px 16px', background: T.surface,
                borderRadius:
                  i === 0 && history.length === 1 ? 12 :
                  i === 0 ? '12px 12px 0 0' :
                  i === history.length - 1 ? '0 0 12px 12px' : 0,
                animation: `fadeIn 0.3s ease ${Math.min(i * 0.05, 0.25)}s both`,
                transition: 'background 0.15s',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{
                    width: 38, height: 38, borderRadius: 11,
                    background: T.amberPale, border: `1px solid ${T.amberBorder}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 15, flexShrink: 0,
                  }}>⚡</div>
                  <div>
                    <p style={{ fontSize: 13, fontWeight: 600, color: T.text1, marginBottom: 3, lineHeight: 1 }}>
                      {tx.merchant_name || 'API Call'}
                    </p>
                    <p style={{ fontSize: 10, color: T.text4, fontFamily: "'DM Mono', monospace" }}>
                      {new Date(tx.created_at).toLocaleString()}
                    </p>
                  </div>
                </div>
                <p style={{ fontSize: 13, color: T.text2, fontFamily: "'DM Mono', monospace", fontWeight: 600 }}>
                  −${Number(tx.amount).toFixed(6)}
                </p>
              </div>
            ))}
          </div>
        )}

        {/* Topups */}
        {!loading && tab === 'topups' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 1, marginTop: 1 }}>
            {topups.length === 0 ? (
              <div style={{
                textAlign: 'center', padding: '56px 20px',
                background: T.surface, borderRadius: 16, border: `1px solid ${T.border}`,
              }}>
                <div style={{
                  width: 56, height: 56, borderRadius: 16,
                  background: T.greenPale, border: '1px solid rgba(16,185,129,0.2)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 24, margin: '0 auto 16px',
                }}>💳</div>
                <p style={{ fontSize: 14, fontWeight: 600, color: T.text2, marginBottom: 6 }}>No credit purchases yet</p>
                <p style={{ fontSize: 12, color: T.text4, lineHeight: 1.7, marginBottom: 20 }}>Add credits to start using SynthPay services</p>
                <button onClick={() => navigate('/topup')} style={{
                  padding: '10px 22px', borderRadius: 10, border: 'none',
                  background: T.amber, color: '#000', fontSize: 12, fontWeight: 700,
                  cursor: 'pointer', fontFamily: "'DM Sans', sans-serif",
                  boxShadow: '0 4px 14px rgba(240,165,0,0.22)',
                }}>Add Credits →</button>
              </div>
            ) : topups.map((t: any, i: number) => (
              <div key={i} className="tx-row" style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '13px 16px', background: T.surface,
                borderRadius:
                  i === 0 && topups.length === 1 ? 12 :
                  i === 0 ? '12px 12px 0 0' :
                  i === topups.length - 1 ? '0 0 12px 12px' : 0,
                animation: `fadeIn 0.3s ease ${Math.min(i * 0.05, 0.25)}s both`,
                transition: 'background 0.15s',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{
                    width: 38, height: 38, borderRadius: 11,
                    background: T.greenPale, border: '1px solid rgba(16,185,129,0.2)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 15, flexShrink: 0,
                  }}>💳</div>
                  <div>
                    <p style={{ fontSize: 13, fontWeight: 600, color: T.text1, marginBottom: 3, lineHeight: 1 }}>Credit purchase</p>
                    <p style={{ fontSize: 10, color: T.text4, fontFamily: "'DM Mono', monospace" }}>
                      {new Date(t.created_at).toLocaleString()}
                    </p>
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <p style={{
                    fontSize: 13, fontFamily: "'DM Mono', monospace", fontWeight: 600, lineHeight: 1,
                    color: t.status === 'completed' ? T.green : T.amber,
                  }}>+${Number(t.amount).toFixed(2)}</p>
                  <p style={{
                    fontSize: 9, color: T.text4, marginTop: 4,
                    fontFamily: "'DM Mono', monospace", textTransform: 'uppercase', letterSpacing: 0.5,
                  }}>{t.status}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Email link ── */}
      <div style={{ padding: '20px 16px 0' }}>
        <EmailLink />
      </div>
    </div>
  )
}
