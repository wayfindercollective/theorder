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
import { sanitizeInline, sanitizeRich } from '../_lib/sanitizeRich.js'
import { richText } from '../../src/lib/richtext.js'

const MAX_HEADING_TEXT = 200
const MAX_BODY_TEXT = 5000

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
// Background alignment override is OPTIONAL — absent means "use the painting's
// own alignment". Unlike align() this MUST stay nullable: defaulting it (e.g.
// to 'left') would stamp an override onto every pre-existing slide on its next
// save and silently collapse full-bleed backgrounds to side-images.
function bgAlign(v) {
  return v === 'center' || v === 'left' || v === 'right' ? v : undefined
}

// Extra text boxes and placed pictures per slide (both additive — old decks
// simply have empty arrays after their next save).
const MAX_EXTRAS = 12
const MAX_SLIDE_IMAGES = 12
// A slide picture may only point at a bundled site asset or this project's own
// public Blob store — never an arbitrary origin (and never a javascript: URL).
const LOCAL_SRC_RE = /^\/images\/[A-Za-z0-9][A-Za-z0-9._/-]*$/
const BLOB_SRC_RE = /^https:\/\/[a-z0-9-]+\.public\.blob\.vercel-storage\.com\/[!-~]+$/i

function imageSrc(v) {
  const s = typeof v === 'string' ? v.trim() : ''
  if (s.length > 600 || s.includes('..')) return ''
  return LOCAL_SRC_RE.test(s) || BLOB_SRC_RE.test(s) ? s : ''
}

function sanitizeBox(b) {
  return {
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
  }
}

function sanitizeSlide(s) {
  const extras = Array.isArray(s?.extras) ? s.extras.slice(0, MAX_EXTRAS) : []
  const images = Array.isArray(s?.images) ? s.images.slice(0, MAX_SLIDE_IMAGES) : []
  return {
    id: typeof s?.id === 'string' && s.id ? s.id.slice(0, 64) : randomUUID(),
    siteImageIndex: clampInt(s?.siteImageIndex, 0, MAX_IMAGE_INDEX, 0),
    // key omitted entirely when unset — see bgAlign() note
    ...(bgAlign(s?.bgAlign) ? { bgAlign: bgAlign(s.bgAlign) } : {}),
    // Custom background (a library/uploaded image overriding the painting
    // cycle) — OPTIONAL and nullable like bgAlign: absent means "use the
    // siteImageIndex painting". Same src allowlist as placed pictures.
    ...(imageSrc(s?.bgSrc) ? { bgSrc: imageSrc(s.bgSrc) } : {}),
    // heading stays inline (one line); body allows block + bullet lists
    heading: sanitizeInline(s?.heading),
    body: sanitizeRich(s?.body),
    box: sanitizeBox((s && s.box) || {}),
    extras: extras.map((x) => ({
      id: typeof x?.id === 'string' && x.id ? x.id.slice(0, 64) : randomUUID(),
      heading: sanitizeInline(x?.heading),
      body: sanitizeRich(x?.body),
      box: sanitizeBox((x && x.box) || {}),
    })),
    images: images
      .map((im) => ({
        id: typeof im?.id === 'string' && im.id ? im.id.slice(0, 64) : randomUUID(),
        src: imageSrc(im?.src),
        xPct: clampNum(im?.xPct, 0, 100, 33),
        yPct: clampNum(im?.yPct, 0, 100, 20),
        wPct: clampNum(im?.wPct, 2, 100, 34),
      }))
      .filter((im) => im.src),
  }
}

// Sanitise rich fields on the way OUT too, so any pre-rich deck or out-of-band
// Blob edit can never reach present mode's dangerouslySetInnerHTML unsanitised.
function sanitizeDeckForRead(deck) {
  if (!deck || !Array.isArray(deck.slides)) return deck
  return {
    ...deck,
    slides: deck.slides.map((s) => ({
      ...s,
      heading: sanitizeInline(s?.heading),
      body: sanitizeRich(s?.body),
      ...(Array.isArray(s?.extras) && {
        extras: s.extras.map((x) => ({ ...x, heading: sanitizeInline(x?.heading), body: sanitizeRich(x?.body) })),
      }),
    })),
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
        return res.status(200).json({ deck: sanitizeDeckForRead(await fetchDeck(blob)) })
      }
      const decks = []
      let cursor
      do {
        const page = await list({ prefix: PREFIX, cursor, limit: 1000, token })
        for (const b of page.blobs || []) {
          try { decks.push(sanitizeDeckForRead(await fetchDeck(b))) } catch { /* skip unreadable */ }
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
    // Limit by visible text length (never truncate HTML — that would cut a tag).
    for (const s of slides) {
      for (const t of [s, ...s.extras]) {
        if (richText(t.heading).length > MAX_HEADING_TEXT || richText(t.body).length > MAX_BODY_TEXT) {
          return res.status(400).json({ error: 'slide text too long' })
        }
      }
    }
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
