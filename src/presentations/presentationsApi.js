/**
 * Thin client for /api/presentations. Reuses the admin JWT (same password) from
 * adminApi so logging into /presentations and /admin share one token.
 */
import { getToken, humanizeError } from '../admin/adminApi.js'

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

export function deleteDeck(id) {
  return call(`/api/presentations?id=${encodeURIComponent(id)}`, { method: 'DELETE' })
}

export { humanizeError }
