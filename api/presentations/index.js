/**
 * /api/presentations
 *
 * Password-protected store for the coach's slide decks (the /presentations
 * builder). Each deck is one JSON blob at `presentations/<id>.json` in the same
 * Vercel Blob store as the images (different prefix). All methods require the
 * same admin JWT as /api/admin/*.
 *
 *   GET    /api/presentations            → { decks: [full deck, ...] }
 *   GET    /api/presentations?id=<uuid>  → { deck }
 *   POST   /api/presentations  body=deck → validates, preserves createdAt, { ok, deck }
 *   DELETE /api/presentations?id=<uuid>  → { ok }
 *
 * Blob notes (verified against @vercel/blob 0.27.3):
 *  - `put` takes a pathname and overwrites by default when addRandomSuffix:false
 *    (there is no `allowOverwrite` option in this version).
 *  - `del` and reads operate on the blob URL, not the pathname, so we resolve
 *    the URL via `list({ prefix })` first.
 *  - Deck JSON is mutable, so we write with cacheControlMaxAge:0 and read with
 *    cache:'no-store' to avoid the default 1-year Blob cache serving stale data.
 */

import { randomUUID } from 'node:crypto'
import { list, put, del } from '@vercel/blob'
import { requireAuth } from '../_lib/auth.js'
import { getBlobToken } from '../_lib/blob.js'

const PREFIX = 'presentations/'
// Upper bound for the siteImageIndex clamp. Mirrors SITE_IMAGES.length in
// src/presentations/siteImages.js; only a defensive guard, the client sends the
// real index. Kept generous so adding sections never rejects valid decks.
const MAX_IMAGE_INDEX = 64
const MAX_SLIDES = 200
const MAX_BODY_BYTES = 512 * 1024
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

const pathFor = (id) => `${PREFIX}${id}.json`

function clampInt(v, lo, hi, dflt) {
  const n = Math.round(Number(v))
  if (!Number.isFinite(n)) return dflt
  return Math.min(hi, Math.max(lo, n))
}
function clampNum(v, lo, hi, dflt) {
  const n = Number(v)
  if (!Number.isFinite(n)) return dflt
  return Math.min(hi, Math.max(lo, n))
}
function str(v, max) {
  return (typeof v === 'string' ? v : '').slice(0, max)
}
function align(v) {
  return v === 'center' || v === 'right' ? v : 'left'
}

function sanitizeSlide(s) {
  const b = (s && s.box) || {}
  return {
    id: typeof s?.id === 'string' && s.id ? s.id.slice(0, 64) : randomUUID(),
    siteImageIndex: clampInt(s?.siteImageIndex, 0, MAX_IMAGE_INDEX, 0),
    heading: str(s?.heading, 200),
    body: str(s?.body, 5000),
    box: {
      xPct: clampNum(b.xPct, 0, 100, 8),
      yPct: clampNum(b.yPct, 0, 100, 60),
      wPct: clampNum(b.wPct, 5, 100, 46),
      hPct: clampNum(b.hPct, 5, 100, 30),
      boxAlign: align(b.boxAlign),
      // Heading and body align independently; migrate old shared `textAlign`.
      headingAlign: align(b.headingAlign ?? b.textAlign),
      bodyAlign: align(b.bodyAlign ?? b.textAlign),
      headingPx: clampInt(b.headingPx, 12, 200, 40),
      bodyPx: clampInt(b.bodyPx, 12, 200, 20),
    },
  }
}

async function resolveBlob(token, id) {
  const path = pathFor(id)
  let cursor
  do {
    const page = await list({ prefix: PREFIX, cursor, limit: 1000, token })
    const hit = (page.blobs || []).find((b) => b.pathname === path)
    if (hit) return hit
    cursor = page.cursor
  } while (cursor)
  return null
}

async function fetchDeck(blob) {
  const res = await fetch(blob.url, { cache: 'no-store' })
  if (!res.ok) throw new Error(`blob fetch ${res.status}`)
  return await res.json()
}

export default async function handler(req, res) {
  const payload = await requireAuth(req, res)
  if (!payload) return

  const token = getBlobToken()
  if (!token) return res.status(500).json({ error: 'No Blob token configured' })

  // ---- GET (list or single) ----
  if (req.method === 'GET') {
    const id = req.query?.id
    try {
      if (id) {
        if (!UUID_RE.test(String(id))) return res.status(400).json({ error: 'bad id' })
        const blob = await resolveBlob(token, id)
        if (!blob) return res.status(404).json({ error: 'not found' })
        return res.status(200).json({ deck: await fetchDeck(blob) })
      }
      const decks = []
      let cursor
      do {
        const page = await list({ prefix: PREFIX, cursor, limit: 1000, token })
        for (const b of page.blobs || []) {
          try { decks.push(await fetchDeck(b)) } catch { /* skip unreadable */ }
        }
        cursor = page.cursor
      } while (cursor)
      decks.sort((a, b) => String(b.updatedAt).localeCompare(String(a.updatedAt)))
      return res.status(200).json({ decks })
    } catch (err) {
      return res.status(500).json({ error: err?.message || 'read failed' })
    }
  }

  // ---- POST (create / update) ----
  if (req.method === 'POST') {
    let body = req.body
    if (typeof body === 'string') {
      if (body.length > MAX_BODY_BYTES) return res.status(413).json({ error: 'deck too large' })
      try { body = JSON.parse(body) } catch { body = {} }
    }
    const id = body?.id
    if (!UUID_RE.test(String(id || ''))) return res.status(400).json({ error: 'bad id' })

    const slides = Array.isArray(body?.slides)
      ? body.slides.slice(0, MAX_SLIDES).map(sanitizeSlide)
      : []
    const title = str(body?.title, 120).trim() || 'Untitled Presentation'
    let cursor = clampInt(body?.cursor, 0, 1e9, slides.length + 1)
    const now = new Date().toISOString()
    let createdAt = now

    try {
      const existing = await resolveBlob(token, id)
      if (existing) {
        try {
          const prev = await fetchDeck(existing)
          if (prev?.createdAt) createdAt = prev.createdAt
          // keep the append counter monotonic across saves
          if (Number.isFinite(prev?.cursor)) cursor = Math.max(cursor, prev.cursor)
        } catch { /* corrupt previous; treat as create */ }
      }

      const deck = { id, title, createdAt, updatedAt: now, cursor, slides }
      await put(pathFor(id), JSON.stringify(deck), {
        access: 'public',
        contentType: 'application/json',
        addRandomSuffix: false,
        cacheControlMaxAge: 0,
        token,
      })
      return res.status(200).json({ ok: true, deck })
    } catch (err) {
      return res.status(500).json({ error: err?.message || 'write failed' })
    }
  }

  // ---- DELETE ----
  if (req.method === 'DELETE') {
    const id = req.query?.id
    if (!UUID_RE.test(String(id || ''))) return res.status(400).json({ error: 'bad id' })
    try {
      const blob = await resolveBlob(token, id)
      if (blob) await del(blob.url, { token })
      return res.status(200).json({ ok: true })
    } catch (err) {
      return res.status(500).json({ error: err?.message || 'delete failed' })
    }
  }

  res.setHeader('Allow', 'GET, POST, DELETE')
  return res.status(405).json({ error: 'method not allowed' })
}
