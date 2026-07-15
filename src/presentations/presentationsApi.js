/**
 * Client for /api/presentations.
 *
 * Presentations keep their OWN session token under a separate localStorage key,
 * so the area is independently password-gated: being signed into /admin does
 * NOT grant access here — you must enter the password on /presentations. It is
 * the SAME password and the SAME login endpoint as admin; only the stored token
 * is kept separate so each area prompts on its own.
 */
import { humanizeError, getTokenPayload } from '../admin/adminApi.js'

const PRES_TOKEN_KEY = 'order_pres_token'

export function getToken() {
  try { return localStorage.getItem(PRES_TOKEN_KEY) } catch { return null }
}

function setToken(token) {
  try {
    if (token) localStorage.setItem(PRES_TOKEN_KEY, token)
    else localStorage.removeItem(PRES_TOKEN_KEY)
  } catch { /* noop */ }
}

export function clearToken() { setToken(null) }

export function getTokenExpiryMs() {
  const p = getTokenPayload(getToken())
  return p?.exp ? p.exp * 1000 : null
}

export async function login(password) {
  const res = await fetch('/api/admin/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password }),
  })
  const text = await res.text()
  let data
  try { data = JSON.parse(text) } catch { data = { error: text } }
  if (!res.ok) {
    const err = new Error(data?.error || `HTTP ${res.status}`)
    err.status = res.status
    throw err
  }
  setToken(data.token)
  return data.token
}

async function call(url, opts = {}) {
  const headers = { 'Content-Type': 'application/json', ...(opts.headers || {}) }
  const token = getToken()
  if (token) headers.Authorization = `Bearer ${token}`
  const res = await fetch(url, { ...opts, headers })
  const text = await res.text()
  let data
  try { data = JSON.parse(text) } catch { data = { error: text } }
  if (!res.ok) {
    const err = new Error(data?.error || `HTTP ${res.status}`)
    err.status = res.status
    throw err
  }
  return data
}

export function listDecks() {
  return call('/api/presentations', { method: 'GET' }).then((d) => d.decks || [])
}

export function getDeck(id) {
  return call(`/api/presentations?id=${encodeURIComponent(id)}`, { method: 'GET' }).then((d) => d.deck)
}

export function saveDeck(deck) {
  return call('/api/presentations', { method: 'POST', body: JSON.stringify(deck) }).then((d) => d.deck)
}

// Title-only update — the server rewrites the stored deck verbatim apart from
// title/updatedAt, so renaming can never touch slide content.
export function renameDeck(id, title) {
  return call(`/api/presentations?id=${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: JSON.stringify({ title }),
  }).then((d) => d.deck)
}

export function deleteDeck(id) {
  return call(`/api/presentations?id=${encodeURIComponent(id)}`, { method: 'DELETE' })
}

// The shared image store (same one the /admin Images tab manages).
export function listLibraryImages() {
  return call('/api/admin/images', { method: 'GET' }).then((d) => d.images || [])
}

// Raw-body upload (the endpoint reads X-Filename + Content-Type, not multipart).
export async function uploadImage(file) {
  const headers = {
    'X-Filename': file.name || 'image',
    'Content-Type': file.type || 'application/octet-stream',
  }
  const token = getToken()
  if (token) headers.Authorization = `Bearer ${token}`
  const res = await fetch('/api/admin/upload', { method: 'POST', headers, body: file })
  const text = await res.text()
  let data
  try { data = JSON.parse(text) } catch { data = { error: text } }
  if (!res.ok) {
    const err = new Error(data?.error || `HTTP ${res.status}`)
    err.status = res.status
    throw err
  }
  return data
}

export { humanizeError }
