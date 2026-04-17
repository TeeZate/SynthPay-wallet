import axios from 'axios'

export const api = axios.create({
  baseURL: '/api',
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

  createTopup: (user_id: string, amount: number) =>
    api.post('/wallet/topup/create', { user_id, amount }),

  topupHistory: (user_id: string) =>
    api.get(`/wallet/topups/${user_id}`),

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
    api.post('/auth/login/complete', { credential })
}