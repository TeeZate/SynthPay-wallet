import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { walletApi } from '../lib/api'

export default function Wallet() {
  const { user, logout, setUser } = useAuth()
  const [history,  setHistory]  = useState<any[]>([])
  const [topups,   setTopups]   = useState<any[]>([])
  const [loading,  setLoading]  = useState(true)
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
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [user?.user_id])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center"
           style={{ background: '#03030a' }}>
        <p style={{ color: '#334155' }}>Loading wallet...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen pb-8" style={{ background: '#03030a' }}>

      {/* Header */}
      <div className="px-6 pt-12 pb-8"
           style={{ background: 'linear-gradient(180deg, #050510 0%, #03030a 100%)' }}>
        <div className="flex justify-between items-start mb-8">
          <div>
            <p className="text-xs mb-1" style={{ color: '#334155', letterSpacing: '2px' }}>
              SYNTHPAY WALLET
            </p>
            <p className="text-xs font-mono" style={{ color: '#1a1a2e' }}>
              {user?.user_id.slice(0, 8)}...
            </p>
          </div>
          <button onClick={logout}
                  className="text-xs px-3 py-1 rounded-lg"
                  style={{ color: '#64748b', border: '1px solid #1a1a2e' }}>
            Sign out
          </button>
        </div>

        {/* Balance */}
        <div className="text-center">
          <p className="text-xs mb-2" style={{ color: '#334155', letterSpacing: '3px' }}>
            AVAILABLE BALANCE
          </p>
          <p className="text-5xl font-bold mb-1"
             style={{ color: '#00e5ff', fontFamily: 'monospace' }}>
            ${Number(user?.balance || 0).toFixed(4)}
          </p>
          <p className="text-xs" style={{ color: '#334155' }}>USD</p>
        </div>

        {/* Top Up Button */}
        <button
          onClick={() => navigate('/topup')}
          className="w-full mt-8 py-4 rounded-2xl font-semibold text-sm"
          style={{ background: '#00e5ff', color: '#03030a' }}>
          + Add Funds
        </button>
      </div>

      {/* Tabs */}
      <div className="px-6 mt-6">
        <div className="flex gap-4 mb-4">
          {(['transactions', 'topups'] as const).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className="text-xs font-semibold pb-2 transition-all"
              style={{
                color:        tab === t ? '#00e5ff' : '#334155',
                borderBottom: tab === t ? '2px solid #00e5ff' : '2px solid transparent',
                letterSpacing: '1px',
                textTransform: 'uppercase'
              }}>
              {t === 'transactions' ? 'Spending' : 'Deposits'}
            </button>
          ))}
        </div>

        {/* Transaction List */}
        {tab === 'transactions' && (
          <div className="space-y-2">
            {history.length === 0 ? (
              <div className="text-center py-12">
                <p style={{ color: '#334155', fontSize: 12 }}>
                  No transactions yet.
                </p>
                <p style={{ color: '#1a1a2e', fontSize: 11, marginTop: 4 }}>
                  Use your wallet to pay for API calls.
                </p>
              </div>
            ) : history.map((tx: any, i: number) => (
              <div key={i}
                   className="flex justify-between items-center py-3 px-4 rounded-xl"
                   style={{ background: '#0f0f1a', border: '1px solid #0d0d1a' }}>
                <div>
                  <p className="text-xs font-mono" style={{ color: '#e2e8f0' }}>
                    API Call
                  </p>
                  <p className="text-xs" style={{ color: '#334155' }}>
                    {new Date(tx.created_at).toLocaleString()}
                  </p>
                </div>
                <p className="text-sm font-mono" style={{ color: '#ef4444' }}>
                  -${Number(tx.amount).toFixed(6)}
                </p>
              </div>
            ))}
          </div>
        )}

        {/* Topup List */}
        {tab === 'topups' && (
          <div className="space-y-2">
            {topups.length === 0 ? (
              <div className="text-center py-12">
                <p style={{ color: '#334155', fontSize: 12 }}>
                  No deposits yet.
                </p>
              </div>
            ) : topups.map((t: any, i: number) => (
              <div key={i}
                   className="flex justify-between items-center py-3 px-4 rounded-xl"
                   style={{ background: '#0f0f1a', border: '1px solid #0d0d1a' }}>
                <div>
                  <p className="text-xs font-mono" style={{ color: '#e2e8f0' }}>
                    Deposit
                  </p>
                  <p className="text-xs" style={{ color: '#334155' }}>
                    {new Date(t.created_at).toLocaleString()}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-mono"
                     style={{ color: t.status === 'completed' ? '#10b981' : '#f59e0b' }}>
                    +${Number(t.amount).toFixed(2)}
                  </p>
                  <p className="text-xs" style={{ color: '#334155' }}>
                    {t.status}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}