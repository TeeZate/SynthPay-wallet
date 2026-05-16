import { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { walletApi } from '../lib/api'

export default function EmailLink() {
  const { user } = useAuth() as any
  const [email,   setEmail]   = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error,   setError]   = useState('')

  const handleLink = async () => {
    if (!email.trim())      { setError('Email required'); return }
    if (!email.includes('@')) { setError('Enter a valid email address'); return }
    setLoading(true); setError('')
    try {
      await walletApi.linkEmail(user.user_id, email.trim())
      setSuccess(true)
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to link email. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div style={{
        padding: '20px',
        borderRadius: 14,
        background: 'rgba(16,185,129,0.06)',
        border: '1px solid rgba(16,185,129,0.2)',
        display: 'flex', gap: 12, alignItems: 'flex-start',
      }}>
        <span style={{ fontSize: 20 }}>✓</span>
        <div>
          <p style={{ fontSize: 14, color: '#10b981', fontWeight: 600, marginBottom: 4 }}>Email linked</p>
          <p style={{ fontSize: 12, color: '#64748b' }}>
            You can now log in from any device using {email}
          </p>
        </div>
      </div>
    )
  }

  return (
    <div style={{
      padding: '20px',
      borderRadius: 14,
      background: '#0f0f1a',
      border: '1px solid #1a1a2e',
    }}>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>

      <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start', marginBottom: 16 }}>
        <span style={{ fontSize: 20 }}>📧</span>
        <div>
          <p style={{ fontSize: 14, color: '#e2e8f0', fontWeight: 600, marginBottom: 4 }}>
            Link email for cross-device access
          </p>
          <p style={{ fontSize: 12, color: '#64748b', lineHeight: 1.6 }}>
            Created this account on your phone? Link an email to access it from any device without needing your original passkey.
          </p>
        </div>
      </div>

      <input
        type="email"
        value={email}
        onChange={e => setEmail(e.target.value)}
        onKeyDown={e => e.key === 'Enter' && handleLink()}
        placeholder="you@example.com"
        style={{
          width: '100%', padding: '12px 14px',
          borderRadius: 10,
          border: `1px solid ${email ? '#00e5ff44' : '#1a1a2e'}`,
          background: '#03030a', color: '#e2e8f0',
          fontSize: 14, outline: 'none',
          boxSizing: 'border-box', marginBottom: 10,
          transition: 'border-color 0.2s',
        }}
      />

      {error && (
        <p style={{ fontSize: 12, color: '#ef4444', marginBottom: 10 }}>{error}</p>
      )}

      <button
        onClick={handleLink}
        disabled={loading}
        style={{
          width: '100%', padding: '12px',
          borderRadius: 10, border: 'none',
          background: '#00e5ff', color: '#03030a',
          fontSize: 13, fontWeight: 700,
          cursor: loading ? 'not-allowed' : 'pointer',
          opacity: loading ? 0.6 : 1,
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
        }}>
        {loading ? (
          <><div style={{ width: 14, height: 14, borderRadius: '50%', border: '2px solid rgba(3,3,10,0.3)', borderTopColor: '#03030a', animation: 'spin 0.8s linear infinite' }} />Linking...</>
        ) : 'Link Email →'}
      </button>
    </div>
  )
}
