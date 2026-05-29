/**
 * Thin client for the /api/admin/* routes.
 * Token is stored in localStorage. All protected calls include the Bearer header.
 */

const TOKEN_KEY = 'order_admin_token'

export function getToken() {
  try { return localStorage.getItem(TOKEN_KEY) } catch { return null }
}

export function setToken(token) {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token)
    else localStorage.removeItem(TOKEN_KEY)
  } catch { /* noop */ }
}

export function clearToken() { setToken(null) }

async function jsonFetch(url, opts = {}) {
  const headers = { 'Content-Type': 'application/json', ...(opts.headers || {}) }
  const token = getToken()
  if (token) headers.Authorization = `Bearer ${token}`
  const res = await fetch(url, { ...opts, headers })
  const text = await res.text()
  let data
  try { data = JSON.parse(text) } catch { data = { error: text } }
  if (!res.ok) throw new Error(data?.error || `HTTP ${res.status}`)
  return data
}

export async function login(password) {
  const r = await jsonFetch('/api/admin/login', {
    method: 'POST',
    body: JSON.stringify({ password }),
  })
  setToken(r.token)
  return r.token
}

export async function fetchContent() {
  return await jsonFetch('/api/admin/content', { method: 'GET' })
}

export async function saveContent({ sections, questions }) {
  return await jsonFetch('/api/admin/content', {
    method: 'POST',
    body: JSON.stringify({ sections, questions }),
  })
}

export async function uploadImage(file) {
  const token = getToken()
  const res = await fetch('/api/admin/upload', {
    method: 'POST',
    headers: {
      Authorization: token ? `Bearer ${token}` : '',
      'X-Filename': file.name || 'upload',
      'Content-Type': file.type || 'application/octet-stream',
    },
    body: file,
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data?.error || `HTTP ${res.status}`)
  return data
}
