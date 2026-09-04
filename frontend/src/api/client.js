const configuredBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'
export const API_BASE_URL = configuredBaseUrl.replace(/\/$/, '')

export class ApiError extends Error {
  constructor(message, status, data) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.data = data
  }
}

async function parseResponse(response) {
  const contentType = response.headers.get('content-type') || ''
  if (!contentType.includes('application/json')) return null
  return response.json()
}

async function request(path, { token, body, headers, ...options } = {}) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      ...(body instanceof FormData ? {} : body !== undefined ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
    body: body instanceof FormData || body === undefined ? body : JSON.stringify(body),
  })
  const data = await parseResponse(response)
  if (!response.ok) {
    throw new ApiError(data?.message || `Request failed with status ${response.status}.`, response.status, data)
  }
  return data
}

export const GOOGLE_SIGN_IN_URL = `${API_BASE_URL}/auth/google`

export const api = {
  signup: (details) => request('/auth/signup', { method: 'POST', body: details }),
  login: (credentials) => request('/auth/login', { method: 'POST', body: credentials }),
  me: (token) => request('/auth/me', { token }),
  providers: () => request('/auth/providers'),
  forgotPassword: (email) => request('/auth/forgot-password', { method: 'POST', body: { email } }),
  resetPassword: (token, password) => request('/auth/reset-password', {
    method: 'POST',
    body: { token, password },
  }),
  dashboard: (token) => request('/dashboard', { token }),
  customers: (token) => request('/customers', { token }),
  transactions: (token, type = '') => request(`/transactions${type ? `?type=${encodeURIComponent(type)}` : ''}`, { token }),
  upload: (token, file) => {
    const form = new FormData()
    form.append('image', file)
    return request('/upload', { method: 'POST', token, body: form })
  },
  structure: (token, ledgerId) => request('/structure', {
    method: 'POST',
    token,
    body: { ledger_id: ledgerId },
  }),
  score: (token) => request('/score', { method: 'POST', token }),
}
