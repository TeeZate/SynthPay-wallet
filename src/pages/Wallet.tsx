import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { walletApi } from '../lib/api'
import EmailLink from '../components/EmailLink'

function Skeleton({ w = '100%', h = 16, radius = 6 }: { w?: string | number; h?: number; radius?: number }) {
  return (
    <div style={{
      width: w, height: h, borderRadius: radius,
      background: 'linear-gradient(90deg, #0f0f1a, #1a1a2e, #0f0f1a)',
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
          walletApi.topupHistory(user.user_id)
        ])
        setUser({ ...user, balance: bal.data.balance })
        setHistory(hist.data.transactions || [])
        setTopups(tops.data.topups || [])
      } catch (err) {
        setError('Failed to load wallet. Pull to refresh.')
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [user?.user_id])

  const balance = Number(user?.balance || 0)

  return (
    <div style={{ minHeight: '100vh', background: '#03030a', paddingBottom: 32 }}>
      <style>{`
        @keyframes shimmer {
          0% { background-position: -200% 0 }
          100% { background-position: 200% 0 }
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(8px) }
          to { opacity: 1; transform: translateY(0) }
        }
      `}</style>

      {/* Header */}
      <div style={{
        padding: '52px 20px 28px',
        background: 'linear-gradient(180deg, #050510 0%, #03030a 100%)',
      }}>
        {/* Top row */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 32 }}>
          <div>
            <p style={{ fontSize: 10, color: '#334155', letterSpacing: 3, fontFamily: 'monospace', marginBottom: 4 }}>
              SYNTHPAY WALLET
            </p>
            <p style={{ fontSize: 11, color: '#1a1a2e', fontFamily: 'monospace' }}>
              {user?.user_id?.slice(0, 8)}...
            </p>
          </div>
          <button
            onClick={logout}
            style={{
              padding: '8px 16px',
              borderRadius: 10,
              border: '1px solid #1a1a2e',
              background: 'transparent',
              color: '#64748b',
              fontSize: 12,
              cursor: 'pointer',
            }}>
            Sign out
          </button>
        </div>

        {/* Balance */}
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <p style={{ fontSize: 11, color: '#334155', letterSpacing: 3, marginBottom: 12, fontFamily: 'monospace' }}>
            AVAILABLE BALANCE
          </p>
          {loading ? (
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 8 }}>
              <Skeleton w={200} h={52} radius={10} />
            </div>
          ) : (
            <p style={{
              fontSize: 52, fontWeight: 800,
              color: '#00e5ff', fontFamily: 'monospace',
              marginBottom: 4, lineHeight: 1,
              animation: 'fadeIn 0.4s ease',
            }}>
              ${balance.toFixed(4)}
            </p>
          )}
          <p style={{ fontSize: 11, color: '#334155' }}>USD</p>
        </div>

        {/* Action buttons */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <button
            onClick={() => navigate('/topup')}
            style={{
              width: '100%', padding: '16px',
              borderRadius: 14, border: 'none',
              background: '#00e5ff', color: '#03030a',
              fontSize: 15, fontWeight: 700, cursor: 'pointer',
            }}>
            + Add Funds
          </button>
          <div style={{ display: 'flex', gap: 10 }}>
            <button
              onClick={() => navigate('/marketplace')}
              style={{
                flex: 1, padding: '16px',
                borderRadius: 14,
                border: '1px solid rgba(0,229,255,0.2)',
                background: 'rgba(0,229,255,0.04)',
                color: '#00e5ff',
                fontSize: 13, fontWeight: 600, cursor: 'pointer',
                fontFamily: 'monospace', letterSpacing: 2,
              }}>
              MARKETPLACE →
            </button>
            <button
              onClick={() => navigate('/analytics')}
              style={{
                padding: '16px 18px',
                borderRadius: 14,
                border: '1px solid #1a1a2e',
                background: '#0f0f1a',
                color: '#64748b',
                fontSize: 13, cursor: 'pointer',
              }}
              title="Analytics"
            >
              📊
            </button>
          </div>
        </div>
      </div>

      {/* Error state */}
      {error && (
        <div style={{
          margin: '16px 20px',
          padding: '12px 16px',
          borderRadius: 10,
          background: 'rgba(239,68,68,0.08)',
          border: '1px solid rgba(239,68,68,0.2)',
        }}>
          <p style={{ fontSize: 13, color: '#ef4444' }}>{error}</p>
        </div>
      )}

      {/* Tabs */}
      <div style={{ padding: '20px 20px 0' }}>
        <div style={{ display: 'flex', gap: 24, marginBottom: 16, borderBottom: '1px solid #0d0d1e', paddingBottom: 0 }}>
          {(['transactions', 'topups'] as const).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              style={{
                padding: '0 0 12px',
                border: 'none',
                background: 'transparent',
                color: tab === t ? '#00e5ff' : '#334155',
                fontSize: 11,
                fontWeight: 700,
                cursor: 'pointer',
                letterSpacing: 2,
                borderBottom: tab === t ? '2px solid #00e5ff' : '2px solid transparent',
                marginBottom: -1,
                transition: 'all 0.2s',
              }}>
              {t === 'transactions' ? 'SPENDING' : 'DEPOSITS'}
            </button>
          ))}
        </div>

        {/* Skeletons while loading */}
        {loading && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {[1,2,3].map(i => (
              <div key={i} style={{
                padding: '14px 16px',
                borderRadius: 12,
                background: '#0f0f1a',
                border: '1px solid #0d0d1e',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <Skeleton w={120} h={12} />
                  <Skeleton w={80} h={10} />
                </div>
                <Skeleton w={70} h={14} />
              </div>
            ))}
          </div>
        )}

        {/* Transaction list */}
        {!loading && tab === 'transactions' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {history.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '52px 20px' }}>
                <div style={{ fontSize: 40, marginBottom: 12 }}>⚡</div>
                <p style={{ fontSize: 14, color: '#334155', marginBottom: 6 }}>No transactions yet</p>
                <p style={{ fontSize: 12, color: '#1a1a2e' }}>
                  Browse the marketplace to make your first payment
                </p>
              </div>
            ) : history.map((tx: any, i: number) => (
              <div key={i} style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '14px 16px', borderRadius: 12,
                background: '#0f0f1a', border: '1px solid #0d0d1e',
                animation: `fadeIn 0.3s ease ${i * 0.04}s both`,
              }}>
                <div>
                  <p style={{ fontSize: 13, color: '#e2e8f0', marginBottom: 3 }}>
                    {tx.merchant_name || 'API Call'}
                  </p>
                  <p style={{ fontSize: 11, color: '#334155' }}>
                    {new Date(tx.created_at).toLocaleString()}
                  </p>
                </div>
                <p style={{ fontSize: 14, color: '#ef4444', fontFamily: 'monospace', fontWeight: 600 }}>
                  -${Number(tx.amount).toFixed(6)}
                </p>
              </div>
            ))}
          </div>
        )}

        {/* Topup list */}
        {!loading && tab === 'topups' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {topups.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '52px 20px' }}>
                <div style={{ fontSize: 40, marginBottom: 12 }}>💳</div>
                <p style={{ fontSize: 14, color: '#334155', marginBottom: 6 }}>No deposits yet</p>
                <p style={{ fontSize: 12, color: '#1a1a2e' }}>
                  Add funds to start using SynthPay services
                </p>
              </div>
            ) : topups.map((t: any, i: number) => (
              <div key={i} style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '14px 16px', borderRadius: 12,
                background: '#0f0f1a', border: '1px solid #0d0d1e',
                animation: `fadeIn 0.3s ease ${i * 0.04}s both`,
              }}>
                <div>
                  <p style={{ fontSize: 13, color: '#e2e8f0', marginBottom: 3 }}>Deposit</p>
                  <p style={{ fontSize: 11, color: '#334155' }}>
                    {new Date(t.created_at).toLocaleString()}
                  </p>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <p style={{
                    fontSize: 14, fontFamily: 'monospace', fontWeight: 600,
                    color: t.status === 'completed' ? '#10b981' : '#f59e0b',
                  }}>
                    +${Number(t.amount).toFixed(2)}
                  </p>
                  <p style={{ fontSize: 11, color: '#334155', marginTop: 2 }}>{t.status}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      <div style={{ padding: '0 20px', marginTop: 24 }}>
        <EmailLink />
      </div>
    </div>
  )
}