/**
 * Thin client for the /api/admin/* routes.
 * Token is stored in localStorage. All protected calls include the Bearer header.
 */

import { optimizeImage } from './imageOptimize.js'

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

/**
 * Decode the JWT payload without verifying — we trust the server to verify.
 * Returns { exp } in seconds since epoch, or null on failure.
 */
export function getTokenPayload(token = getToken()) {
  if (!token) return null
  try {
    const part = token.split('.')[1]
    if (!part) return null
    const b64 = part.replace(/-/g, '+').replace(/_/g, '/')
    const pad = b64.length % 4 === 0 ? b64 : b64 + '='.repeat(4 - (b64.length % 4))
    const json = atob(pad)
    return JSON.parse(json)
  } catch {
    return null
  }
}

export function getTokenExpiryMs(token = getToken()) {
  const p = getTokenPayload(token)
  if (!p?.exp) return null
  return p.exp * 1000
}

/**
 * Map raw API / network errors into something a non-technical admin can act on.
 * Returns the input unchanged if no rule matches.
 */
export function humanizeError(err) {
  const msg = (err?.message || err || '').toString()
  if (!msg) return 'Something went wrong.'
  if (/Failed to fetch|NetworkError|offline/i.test(msg)) {
    return 'No connection. Your edits are safe — try again when you are back online.'
  }
  if (/expected.*([0-9a-f]{40}|sha)/i.test(msg)) {
    return 'Someone else just saved. Reload the admin to pick up their changes, then save again.'
  }
  if (/401|invalid token|missing.*token|expired/i.test(msg)) {
    return 'Your session expired. Sign in again.'
  }
  if (/Resource not accessible|permission/i.test(msg)) {
    return 'GitHub token is missing permissions. Tell Nathan.'
  }
  if (/blob token|public access on a private store/i.test(msg)) {
    return 'Image storage is misconfigured. Tell Nathan.'
  }
  if (/file too large/i.test(msg)) {
    return 'That image is too large. Try one under 8 MB.'
  }
  if (/^HTTP 5\d\d/.test(msg)) {
    return 'The server hiccuped. Try once more — if it keeps failing, tell Nathan.'
  }
  return msg
}

async function jsonFetch(url, opts = {}) {
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
  const optimized = await optimizeImage(file)
  const token = getToken()
  const res = await fetch('/api/admin/upload', {
    method: 'POST',
    headers: {
      Authorization: token ? `Bearer ${token}` : '',
      'X-Filename': optimized.name || file.name || 'upload',
      'Content-Type': optimized.type || file.type || 'application/octet-stream',
    },
    body: optimized,
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    const err = new Error(data?.error || `HTTP ${res.status}`)
    err.status = res.status
    throw err
  }
  return data
}

export async function listImages() {
  return await jsonFetch('/api/admin/images', { method: 'GET' })
}

export async function deleteImage(url) {
  return await jsonFetch(`/api/admin/images?url=${encodeURIComponent(url)}`, {
    method: 'DELETE',
  })
}

export async function getDeployStatus() {
  return await jsonFetch('/api/admin/deploy-status', { method: 'GET' })
}

/**
 * Every image URL referenced by saved presentation decks (custom backgrounds
 * and placed pictures), as a Map of url → [deck titles]. The presentations
 * endpoint accepts the same admin JWT. Used by the Library tab to block
 * deleting an upload a deck still needs.
 */
export async function listPresentationImageRefs() {
  const { decks } = await jsonFetch('/api/presentations', { method: 'GET' })
  const refs = new Map()
  const add = (src, title) => {
    if (!src || typeof src !== 'string') return
    const titles = refs.get(src) || []
    if (!titles.includes(title)) titles.push(title)
    refs.set(src, titles)
  }
  for (const deck of decks || []) {
    const title = deck?.title || 'Untitled Presentation'
    for (const s of deck?.slides || []) {
      add(s?.bgSrc, title)
      for (const im of s?.images || []) add(im?.src, title)
    }
  }
  return refs
}
