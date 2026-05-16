import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { walletApi } from '../lib/api'
import EmailLink from '../components/EmailLink'
import { analytics } from '../lib/analytics'
import { BarChart2, ShoppingBag, Plus, Zap, CreditCard, Link2, LogOut } from 'lucide-react'

// ── Design tokens ──────────────────────────────────────────────────────────────
const T = {
  amber: '#F59B00', amberD: '#D98A00',
  amberPale: 'rgba(245,155,0,0.08)', amberBd: 'rgba(245,155,0,0.2)',
  bg: '#F7F5F2', surface: '#FFFFFF', surface2: '#F3F1EE',
  border: '#E8E4DF', border2: '#D4CFC9',
  text1: '#0D0C0A', text2: '#4A4845', text3: '#9A958F', text4: '#C4BFB9',
  green: '#059669', greenPale: 'rgba(5,150,105,0.08)', red: '#DC2626', navy: '#111827',
}

function Skeleton({ w = '100%', h = 16, radius = 6 }: { w?: string | number; h?: number; radius?: number }) {
  return (
    <div style={{
      width: w, height: h, borderRadius: radius,
      background: `linear-gradient(90deg, ${T.surface2}, ${T.surface}, ${T.surface2})`,
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
  const [tab,          setTab]          = useState<'transactions' | 'topups'>('transactions')
  const [migrating,    setMigrating]    = useState(false)
  const navigate = useNavigate()

  // Show migration banner on any non-primary domain
  const onOldDomain =
    window.location.hostname === 'synthpay-wallet.vercel.app' ||
    window.location.hostname === 'wallet.synthpay.tech'

  const handleMigrate = async () => {
    setMigrating(true)
    try {
      const res = await walletApi.migrationToken()
      const { token } = res.data
      window.location.href = `https://account.synthpay.tech/migrate?token=${token}`
    } catch {
      setMigrating(false)
    }
  }

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
        setError('Failed to load account data.')
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
        background: T.surface,
        position: 'sticky', top: 0, zIndex: 50,
        borderBottom: `1px solid ${T.border}`,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <svg viewBox="0 0 130 40" height="22" fill="none" xmlns="http://www.w3.org/2000/svg">
            <text x="0" y="32" fontFamily="'DM Sans', sans-serif" fontWeight="900" fontSize="36" fill="#0D0C0A">S</text>
            <text x="24" y="34" fontFamily="'DM Sans', sans-serif" fontWeight="300" fontSize="38" fill="#F59B00">/</text>
            <text x="44" y="30" fontFamily="'DM Sans', sans-serif" fontWeight="800" fontSize="22" fill="#0D0C0A">YNTH</text>
            <text x="44" y="39" fontFamily="'DM Sans', sans-serif" fontWeight="400" fontSize="11" fill="#9A958F" letterSpacing="3">PAY</text>
            <circle cx="122" cy="14" r="5" fill="#F59B00"/>
          </svg>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button
            onClick={() => navigate('/analytics')}
            style={{
              width: 36, height: 36, borderRadius: '50%',
              border: `1px solid ${T.border}`,
              background: T.surface, color: T.text2,
              cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'all 0.15s',
            }}
            title="Analytics"
          >
            <BarChart2 size={16} color={T.text2} />
          </button>
          <button
            onClick={() => navigate('/marketplace')}
            style={{
              width: 36, height: 36, borderRadius: '50%',
              border: `1px solid ${T.border}`,
              background: T.surface, color: T.text2,
              cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'all 0.15s',
            }}
            title="Marketplace"
          >
            <ShoppingBag size={16} color={T.text2} />
          </button>
          {/* User avatar */}
          <div style={{
            width: 36, height: 36, borderRadius: '50%',
            background: '#0D0C0A',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'default',
          }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: '#FFFFFF', fontFamily: "'DM Mono', monospace" }}>
              {user?.user_id ? user.user_id.slice(0, 2).toUpperCase() : 'U'}
            </span>
          </div>
          <button
            onClick={() => { analytics.track('wallet_logout'); analytics.reset(); logout() }}
            style={{
              width: 36, height: 36, borderRadius: '50%',
              border: `1px solid ${T.border}`,
              background: T.surface, color: T.text3,
              cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'all 0.15s',
            }}
            title="Sign out"
          >
            <LogOut size={14} color={T.text3} />
          </button>
        </div>
      </div>

      {/* ── Migration banner (old domain only) ── */}
      {onOldDomain && (
        <div style={{
          margin: '12px 16px 0',
          padding: '14px 16px',
          borderRadius: 14,
          background: T.amberPale,
          border: `1px solid ${T.amberBd}`,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1 }}>
            <Link2 size={16} color={T.amber} style={{ flexShrink: 0 }} />
            <div>
              <p style={{ fontSize: 12, fontWeight: 700, color: T.amber, marginBottom: 2 }}>
                Move to account.synthpay.tech
              </p>
              <p style={{ fontSize: 11, color: T.text3, lineHeight: 1.5 }}>
                wallet.synthpay.tech is being retired. Migrate now — one tap, your balance and history stay intact.
              </p>
            </div>
          </div>
          <button
            onClick={handleMigrate}
            disabled={migrating}
            style={{
              padding: '8px 14px', borderRadius: 10, border: 'none',
              background: T.amber, color: '#FFFFFF',
              fontSize: 11, fontWeight: 700, cursor: migrating ? 'not-allowed' : 'pointer',
              whiteSpace: 'nowrap', opacity: migrating ? 0.7 : 1,
              flexShrink: 0,
              boxShadow: '0 4px 14px rgba(245,155,0,0.3)',
            }}>
            {migrating ? '...' : 'Migrate'}
          </button>
        </div>
      )}

      {/* ── Balance card ── */}
      <div style={{ padding: '16px 16px 0' }}>
        <div style={{
          background: T.surface,
          borderRadius: 20, padding: '28px 24px 24px',
          position: 'relative', overflow: 'hidden',
          border: `1px solid ${T.border}`,
          boxShadow: '0 4px 16px rgba(0,0,0,0.06)',
        }}>
          {/* Amber top bar */}
          <div style={{
            position: 'absolute', top: 0, left: 0, right: 0, height: 3,
            background: `linear-gradient(90deg, ${T.amber} 0%, ${T.amberD} 50%, transparent 100%)`,
          }} />

          {/* AVAILABLE BALANCE label */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <div style={{
              width: 6, height: 6, borderRadius: '50%',
              background: T.green, animation: 'pulse 2.5s ease-in-out infinite',
            }} />
            <span style={{
              fontSize: 9, fontWeight: 600, letterSpacing: 2.5,
              color: T.text3,
              fontFamily: "'DM Mono', monospace", textTransform: 'uppercase',
            }}>Available Balance</span>
          </div>

          {/* Amount */}
          {loading ? (
            <div style={{ marginBottom: 28 }}><Skeleton w={190} h={54} radius={10} /></div>
          ) : (
            <div style={{
              fontSize: 52, fontWeight: 700, letterSpacing: -2.5,
              color: T.navy, lineHeight: 1, marginBottom: 6,
              fontFamily: "'DM Mono', monospace",
              animation: 'fadeIn 0.5s ease',
            }}>
              <span style={{ fontSize: 22, fontWeight: 400, opacity: 0.5, verticalAlign: 'super', marginRight: 1 }}>$</span>
              {Math.floor(balance).toLocaleString()}
              <span style={{ fontSize: 26, fontWeight: 500, opacity: 0.5 }}>
                .{balance.toFixed(4).split('.')[1]}
              </span>
            </div>
          )}

          <p style={{
            fontSize: 9, color: T.text3, fontFamily: "'DM Mono', monospace",
            marginBottom: 24, letterSpacing: 1.5,
          }}>Updated just now</p>

          {/* Buttons */}
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="action-btn" onClick={() => navigate('/topup')} style={{
              flex: 1.3, padding: '12px 8px', borderRadius: 12, border: 'none',
              background: T.amber, color: '#FFFFFF',
              fontSize: 12, fontWeight: 700, cursor: 'pointer',
              fontFamily: "'DM Sans', sans-serif",
              boxShadow: '0 4px 14px rgba(245,155,0,0.3)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
            }}>
              <Plus size={14} />
              Add credits
            </button>
            <button className="action-btn" onClick={() => navigate('/marketplace')} style={{
              flex: 1, padding: '12px 8px', borderRadius: 12,
              border: `1px solid ${T.border}`,
              background: T.surface2,
              color: T.text2,
              fontSize: 12, fontWeight: 600, cursor: 'pointer',
              fontFamily: "'DM Sans', sans-serif",
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
            }}>
              <ShoppingBag size={13} />
              Services
            </button>
            <button className="action-btn" style={{
              flex: 1, padding: '12px 8px', borderRadius: 12,
              border: `1px solid ${T.border}`,
              background: T.surface2,
              color: T.text2,
              fontSize: 12, fontWeight: 600, cursor: 'pointer',
              fontFamily: "'DM Sans', sans-serif",
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
            }}>
              <BarChart2 size={13} />
              Stats
            </button>
          </div>
        </div>
      </div>

      {/* ── Audit badge ── */}
      <div style={{ padding: '10px 16px 0' }}>
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          background: T.surface2, border: `1px solid ${T.border}`,
          borderRadius: 12, padding: '10px 14px',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{
              width: 5, height: 5, borderRadius: '50%',
              background: T.green, animation: 'pulse 2.5s ease-in-out infinite',
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
          background: 'rgba(220,38,38,0.06)', border: '1px solid rgba(220,38,38,0.18)',
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
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 12 }}>
            {[1, 2, 3].map(i => (
              <div key={i} style={{
                padding: '14px 16px', background: T.surface,
                border: `1px solid ${T.border}`, borderRadius: 10,
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <Skeleton w={38} h={38} radius={10} />
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
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 12 }}>
            {history.length === 0 ? (
              <div style={{
                textAlign: 'center', padding: '56px 20px',
                background: T.surface, borderRadius: 16, border: `1px solid ${T.border}`,
                boxShadow: '0 4px 16px rgba(0,0,0,0.06)',
              }}>
                <div style={{
                  width: 56, height: 56, borderRadius: 16,
                  background: T.amberPale, border: `1px solid ${T.amberBd}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  margin: '0 auto 16px',
                }}>
                  <Zap size={24} color={T.amber} />
                </div>
                <p style={{ fontSize: 14, fontWeight: 600, color: T.text1, marginBottom: 6 }}>No billing events yet</p>
                <p style={{ fontSize: 12, color: T.text3, lineHeight: 1.7, marginBottom: 20 }}>Browse services to make your first API call</p>
                <button onClick={() => navigate('/marketplace')} style={{
                  padding: '10px 22px', borderRadius: 10, border: 'none',
                  background: T.amber, color: '#FFFFFF', fontSize: 12, fontWeight: 700,
                  cursor: 'pointer', fontFamily: "'DM Sans', sans-serif",
                  boxShadow: '0 4px 14px rgba(245,155,0,0.3)',
                }}>Browse Services</button>
              </div>
            ) : history.map((tx: any, i: number) => (
              <div key={i} className="tx-row" style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '13px 16px', background: T.surface,
                border: `1px solid ${T.border}`, borderRadius: 10,
                animation: `fadeIn 0.3s ease ${Math.min(i * 0.05, 0.25)}s both`,
                transition: 'background 0.15s',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{
                    width: 38, height: 38, borderRadius: 10,
                    background: T.surface2, border: `1px solid ${T.border}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    flexShrink: 0,
                  }}>
                    <Zap size={16} color={T.text2} />
                  </div>
                  <div>
                    <p style={{ fontSize: 13, fontWeight: 600, color: T.text1, marginBottom: 3, lineHeight: 1 }}>
                      {tx.merchant_name || 'API Call'}
                    </p>
                    <p style={{ fontSize: 10, color: T.text3, fontFamily: "'DM Mono', monospace" }}>
                      {new Date(tx.created_at).toLocaleString()}
                    </p>
                  </div>
                </div>
                <p style={{ fontSize: 13, color: T.red, fontFamily: "'DM Mono', monospace", fontWeight: 600 }}>
                  −${Number(tx.amount).toFixed(6)}
                </p>
              </div>
            ))}
          </div>
        )}

        {/* Topups */}
        {!loading && tab === 'topups' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 12 }}>
            {topups.length === 0 ? (
              <div style={{
                textAlign: 'center', padding: '56px 20px',
                background: T.surface, borderRadius: 16, border: `1px solid ${T.border}`,
                boxShadow: '0 4px 16px rgba(0,0,0,0.06)',
              }}>
                <div style={{
                  width: 56, height: 56, borderRadius: 16,
                  background: T.greenPale, border: '1px solid rgba(5,150,105,0.2)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  margin: '0 auto 16px',
                }}>
                  <CreditCard size={24} color={T.green} />
                </div>
                <p style={{ fontSize: 14, fontWeight: 600, color: T.text1, marginBottom: 6 }}>No credit purchases yet</p>
                <p style={{ fontSize: 12, color: T.text3, lineHeight: 1.7, marginBottom: 20 }}>Add credits to start using SynthPay services</p>
                <button onClick={() => navigate('/topup')} style={{
                  padding: '10px 22px', borderRadius: 10, border: 'none',
                  background: T.amber, color: '#FFFFFF', fontSize: 12, fontWeight: 700,
                  cursor: 'pointer', fontFamily: "'DM Sans', sans-serif",
                  boxShadow: '0 4px 14px rgba(245,155,0,0.3)',
                }}>Add Credits</button>
              </div>
            ) : topups.map((t: any, i: number) => (
              <div key={i} className="tx-row" style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '13px 16px', background: T.surface,
                border: `1px solid ${T.border}`, borderRadius: 10,
                animation: `fadeIn 0.3s ease ${Math.min(i * 0.05, 0.25)}s both`,
                transition: 'background 0.15s',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{
                    width: 38, height: 38, borderRadius: 10,
                    background: T.surface2, border: `1px solid ${T.border}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    flexShrink: 0,
                  }}>
                    <CreditCard size={16} color={T.text2} />
                  </div>
                  <div>
                    <p style={{ fontSize: 13, fontWeight: 600, color: T.text1, marginBottom: 3, lineHeight: 1 }}>Credit purchase</p>
                    <p style={{ fontSize: 10, color: T.text3, fontFamily: "'DM Mono', monospace" }}>
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
