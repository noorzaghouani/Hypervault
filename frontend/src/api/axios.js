import axios from 'axios'

let csrfToken = null

const api = axios.create({
  baseURL: '/api',
  withCredentials: true,
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' }
})

export async function initCsrf() {
  try {
    const { data } = await api.get('/csrf-token')
    csrfToken = data.csrfToken
  } catch {}
}

api.interceptors.request.use(config => {
  if (['post', 'put', 'delete', 'patch'].includes(config.method?.toLowerCase())) {
    config.headers['X-CSRF-Token'] = csrfToken || ''
  }
  return config
})

api.interceptors.response.use(
  res => res,
  async err => {
    if (err.response?.status === 401) {
      await initCsrf().catch(() => {})
      if (window.location.pathname !== '/login') {
        window.location.href = '/login'
      }
    }
    return Promise.reject(err)
  }
)

export default api
