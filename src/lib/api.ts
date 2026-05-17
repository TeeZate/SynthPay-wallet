import axios from 'axios'

export const api = axios.create({
  baseURL: 'https://trustledger-production.up.railway.app',
  headers: { 'Content-Type': 'application/json' }
})

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('synthpay_user_token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

export const walletApi = {
  balance: (user_id: string) =>
    api.get(`/users/${user_id}/balance`),

  history: (user_id: string) =>
    api.get(`/users/${user_id}/history`),

  // createTopup: (user_id: string, amount: number) =>
  //   api.post('/wallet/topup/create', { user_id, amount }),
  createTopup: (user_id: string, amount: number, idempotency_key?: string) =>
    api.post('/wallet/topup/create', { user_id, amount, idempotency_key }),

  createTopupIntent: (user_id: string, amount: number) =>
    api.post('/wallet/topup/intent', { user_id, amount }),

  topupHistory: (user_id: string) =>
    api.get(`/wallet/topups/${user_id}`),

  linkEmail: (user_id: string, email: string) =>
    api.post('/auth/email/link', { user_id, email }),

  requestOTP: (email: string) =>
    api.post('/auth/email/request', { email }),

  verifyOTP: (email: string, otp: string) =>
    api.post('/auth/email/verify', { email, otp }),

  registerBegin: () =>
    api.post('/auth/register/begin', {}),

  registerComplete: (credential: any, temp_user_id: string) =>
    api.post('/auth/register/complete', {
      credential,
      temp_user_id,
      display_name: 'SynthPay User'
    }),

  loginBegin: () =>
    api.post('/auth/login/begin', {}),

  loginComplete: (credential: any) =>
    api.post('/auth/login/complete', { credential }),

  // ── Passkey migration (old domain → wallet.synthpay.tech) ────────────────
  migrationToken: () =>
    api.post('/auth/migration-token', {}),

  migrateBegin: (token: string) =>
    api.post('/auth/migrate/begin', { token }),

  migrateComplete: (token: string, credential: any) =>
    api.post('/auth/migrate/complete', { token, credential }),

  pay: (data: { user_id: string; merchant_id: string; endpoint_id: string; amount: number }) =>
    api.post('/users/pay', data),

  // ── Ziina (UAE) ───────────────────────────────────────────────────────────
  createZiinaTopup: (user_id: string, amount_usd: number) =>
    api.post('/wallet/topup/ziina', { user_id, amount_usd }),

  // ── Nardo Pay (Africa) ────────────────────────────────────────────────────
  createNardoTopup: (user_id: string, amount_usd: number, phone: string, currency: string) =>
    api.post('/wallet/topup/nardo', { user_id, amount_usd, phone, currency }),

  // ── Poll topup status (Ziina / Nardo) ─────────────────────────────────────
  topupStatus: (ref: string) =>
    api.get(`/wallet/topup/status/${ref}`),
}
