# Wayfinder OS Wiring — The Order

Reconciles two source docs against the current build:
- **Doc 1 ("from the OS")** — the canonical Wayfinder OS funnel-mailbox spec (cites live source: `convex/http.ts`, `convex/crm/funnelLeads.ts`). Scored answers via a `responses` object; consent via `smsConsentMarketing` / `smsConsentOperational`.
- **Doc 2 ("the other funnel")** — the battle-tested Jeff handoff. Flat top-level scored fields; single `smsConsent`. The current Order build was derived from this.

**The two docs disagree on payload shape.** This plan resolves every disagreement by **sending both shapes** (zero cost, covers either handler version) and verifying with a real scored test lead before launch.

## Decisions locked
- **TCPA/SMS consent copy → "Wayfinder Coaching"** (parent brand). Already in `content/sections.json` — no change.
- **No booking page.** `FinalScreen` stays a confirmation screen. No calendar step.
- **Browser-side API key** (no Edge Function proxy for v1) — per-funnel key can only POST leads to one funnel; acceptable per Doc 2.
- Commit changes on a **branch** (not `main`) — the wiring must not go live until the Wayfinder funnel + Vercel env vars exist, or it posts to `placeholder.invalid`.

---

## Already correct — not touching
- `Authorization: Bearer` header (Doc 2's correction over the deprecated `X-API-Key`)
- Save-before-fetch ordering + 30s syncing lock
- `pendingId` generated once, reused on every retry
- Always advance to FinalScreen regardless of webhook result
- Honeypot (`company` field)
- Canonical `income` strings (exact match to Doc 2 §7)
- localStorage key namespaced (`order_pending_leads`)
- UTM capture-once

---

## P0 — code changes (must fix)

### 1. `phone` sent as an object → must be a string  ⚠️ real bug
`buildPayload` currently sends `phone: { phone, country, dial, consent }`. Both docs require a **string** Wayfinder can normalize to E.164. An object → dropped / stored as `[object Object]` → power-dialer gets no number AND phone-based dedup (Doc 1 secondary key, ≥7 digits) breaks.

### 2. SMS consent field-name mismatch
Current sends only `smsConsent`. Doc 1 (the OS) reads `smsConsentMarketing` + `smsConsentOperational`. If the funnel handler reads the two-field form, consent never registers → all outreach gated. Send all three.

### 3. Scored answers: flat vs `responses` (highest-stakes silent failure)
Current sends scored answers flat. Doc 1 reads them from a `responses` object. Wrong shape → `200 OK` with score `0` → no HOT routing → sales never paged, nothing looks broken. Send both flat **and** nested.

### Shared phone helper — new file `src/lib/phone.js`
One source of truth for phone normalization, used by both the form (`buildPayload`) and the legacy-payload migration (`submitLead`). Guards common paste mistakes without a full phone library (Wayfinder normalizes again server-side; we only need to avoid sending obviously-broken strings).
```js
// Returns { phone, phoneCountry }. `country` is a countryCodes entry
// ({ code, dial }) or { code, dial } reconstructed from a legacy payload.
export function normalizePhone(rawPhone, country) {
  const raw = (rawPhone || '').trim()
  const digits = raw.replace(/\D/g, '')
  if (!digits) return { phone: '', phoneCountry: '' }
  // Explicit international "+…" → honor as-is; the selected flag is unreliable.
  if (raw.startsWith('+')) return { phone: `+${digits}`, phoneCountry: '' }
  const dialDigits = (country?.dial || '').replace(/\D/g, '')
  let national = digits
  if (dialDigits) {
    // Country code typed WITHOUT "+" (e.g. "1 555…", "44 7…") — drop the
    // duplicate. The length threshold keeps short local numbers that merely
    // start with the same digit (e.g. a 7-digit "1234567") from being mangled.
    if (national.startsWith(dialDigits) && national.length - dialDigits.length >= 7) {
      national = national.slice(dialDigits.length)
    }
    // National trunk "0" (e.g. UK "07700…" → "7700…"). NANP (+1) has no trunk 0.
    if (dialDigits !== '1' && national.startsWith('0')) {
      national = national.replace(/^0+/, '')
    }
  }
  const phone = dialDigits ? `+${dialDigits} ${national}` : national
  return { phone, phoneCountry: country?.code || '' }
}
```

### Proposed `buildPayload` + form_submitted (ApplicationSection.jsx)
> Add `import { countryCodes } from '../../config/countryCodes.js'` to the imports (and `normalizePhone` — shown in the code block).
> Also: in `QuestionSlide.jsx`, the phone input strips `+`. Allow a leading `+` so pasted international numbers survive: change the onChange regex `/[^\d\s()-]/g` → `/[^\d\s()+-]/g`.

```js
import { normalizePhone } from '../../lib/phone.js'

const FUNNEL_SLUG = import.meta.env.VITE_FUNNEL_SLUG || 'the-order'
const SOURCE = import.meta.env.VITE_SITE_DOMAIN || 'theorder.global'

function buildPayload(formData) {
  const contact = formData.contact || {}
  const fullName = (contact.fullName || '').trim()
  const [firstName, ...rest] = fullName.split(/\s+/)
  const lastName = rest.join(' ')
  // `country` is only written to formData once the user opens the picker; the
  // input itself defaults to countryCodes[0] (US). Mirror that default here so
  // default-country submits still get a dial code + phoneCountry.
  const country = contact.country || countryCodes[0]
  const consent = !!contact.smsConsent
  const { phone, phoneCountry } = normalizePhone(contact.phone, country)

  // Scored answers — sent BOTH flat (Jeff-funnel handler) AND nested in
  // `responses` (current Wayfinder OS handler). Whichever the funnel reads
  // wins; the other is harmless rawResponses noise. See WAYFINDER_WIRING.md.
  const responses = {
    mainChallenge: formData.mainChallenge || '',
    commitment: formData.commitment || '',
    readiness: formData.readiness || '',
    income: formData.income || '',
  }

  return {
    pendingId: newPendingId(),
    email: (contact.email || '').trim().toLowerCase(),
    firstName: firstName || '',
    lastName: lastName || '',
    name: fullName,
    fullName,
    phone,
    phoneCountry,
    // Consent — all three keys to satisfy both handler versions.
    smsConsent: consent,
    smsConsentMarketing: consent,
    smsConsentOperational: consent,
    // Scored answers — flat …
    ...responses,
    // … and nested.
    responses,
    source: SOURCE,
    funnel: FUNNEL_SLUG,
    submittedAt: new Date().toISOString(),
    timestamp: Date.now(),
    lastCTA: getLastCTA(),
    ...getUTMs(),
  }
}
```

`handleSubmit` analytics — replace the `payload_keys` blob with the Doc 2 taxonomy:
```js
track('form_submitted', {
  income_bracket: formData.income || '',
  life_area: formData.mainChallenge || '',
  last_cta_location: getLastCTA(),
})
```

> **Deliberately not doing:** strict per-country phone-length validation. The existing `>= 7` digit floor stays. Variable-length international numbering means strict length checks reject valid numbers, and Wayfinder normalizes/drops server-side (Doc 1: bare 10-digit US assumed +1, <10 digits dropped). We avoid sending obviously-broken strings via `normalizePhone`; we don't try to be libphonenumber.

---

## P1 — hardening (recommended)

### 4. UTM capture also grabs click IDs (utm.js)
Doc 1 lists `gclid` / `fbclid` as attribution. The Order will run paid traffic. Capture them alongside UTMs.
```js
const KEY = 'order_utm'
const FIELDS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content']
const CLICK_IDS = ['gclid', 'fbclid']

export function captureUTMs() {
  try {
    const params = new URLSearchParams(window.location.search)
    const stored = JSON.parse(sessionStorage.getItem(KEY) || '{}')
    const fromUrl = {}
    ;[...FIELDS, ...CLICK_IDS].forEach((f) => {
      const v = params.get(f)
      if (v) fromUrl[f] = v
    })
    // Merge — a later page that carries only gclid must not erase the
    // utm_* captured on first touch. New present values win; absent keys kept.
    const merged = { ...stored, ...fromUrl }
    sessionStorage.setItem(KEY, JSON.stringify(merged))
    return merged
  } catch {
    return {}
  }
}

export function getUTMs() {
  try {
    const raw = sessionStorage.getItem(KEY)
    const stored = raw ? JSON.parse(raw) : {}
    return {
      utm_source: stored.utm_source ?? '',
      utm_medium: stored.utm_medium ?? '',
      utm_campaign: stored.utm_campaign ?? '',
      ...(stored.utm_term ? { utm_term: stored.utm_term } : {}),
      ...(stored.utm_content ? { utm_content: stored.utm_content } : {}),
      ...(stored.gclid ? { gclid: stored.gclid } : {}),
      ...(stored.fbclid ? { fbclid: stored.fbclid } : {}),
    }
  } catch {
    return { utm_source: '', utm_medium: '', utm_campaign: '' }
  }
}
```
(`recordCTA` / `getLastCTA` unchanged.)

### 5. Retry queue hardening (pendingLeads.js + submitLead.js + usePendingLeadsSync.js)
Current retry hook re-flushes the whole queue on every mount/online/focus with no backoff, jitter, cap, or debounce — Doc 2's gotcha table flags exactly this ("hammers the server during an outage"). Add `retryCount`, exponential backoff + ±25% jitter (capped at 60s, **no hard give-up** so leads never strand), focus debounce, 2s mount delay, 200ms inter-lead gap. Wire retry-path analytics (`wayfinder_lead_sent {source:'retry'}`, `pending_lead_sync_failed`).

**pendingLeads.js** — `write` reports success, `savePendingLead` returns whether the lead actually persisted (so the caller can tell a true loss from a safe queue), preserve `retryCount` on re-save, add `recordFailure`:
```js
// Session-only safety net: if localStorage is unavailable (Safari private mode,
// quota exceeded), leads still live here so the retry hook can resend them this
// session. They don't survive a reload — but combined with the immediate POST
// always being attempted, this closes the "storage AND webhook both fail" gap.
let memFallback = {}

function read() {
  let stored = {}
  try {
    stored = JSON.parse(localStorage.getItem(KEY) || '{}')
  } catch {
    stored = {}
  }
  // memFallback is authoritative for IDs it holds: it only ever contains leads
  // whose write to localStorage FAILED, so it carries the live lock/retry state
  // while localStorage is frozen at a stale snapshot. It is empty whenever
  // localStorage is healthy (write() clears it on success).
  return { ...stored, ...memFallback }
}

function write(map) {
  try {
    localStorage.setItem(KEY, JSON.stringify(map))
    // The whole map (which read() already merged memFallback into) is now
    // persisted — the memory copy is redundant, so drop it.
    memFallback = {}
    return true
  } catch {
    return false   // quota / private mode — caller falls back to memory
  }
}

export function savePendingLead(payload) {
  const map = read()
  const existing = map[payload.pendingId]
  const rec = {
    payload,
    savedAt: existing?.savedAt || Date.now(),
    lastTriedAt: existing?.lastTriedAt || 0,
    retryCount: existing?.retryCount || 0,
    lastError: null,
    syncing: false,
  }
  map[payload.pendingId] = rec
  const ok = write(map)
  if (!ok) memFallback[payload.pendingId] = rec   // keep it somewhere
  return ok || !!memFallback[payload.pendingId]   // true if persisted OR held in memory
}

export function removePendingLead(pendingId) {
  delete memFallback[pendingId]
  const map = read()
  delete map[pendingId]
  write(map)
}

// An attempt failed: release the lock, count it, record the error.
export function recordFailure(pendingId, errMsg) {
  const map = read()
  if (!map[pendingId]) return
  map[pendingId].syncing = false
  map[pendingId].retryCount = (map[pendingId].retryCount || 0) + 1
  if (errMsg) map[pendingId].lastError = errMsg
  if (!write(map)) memFallback[pendingId] = map[pendingId]
}
```
(`listPendingLeads`, `markLeadSyncing`, `clearLeadSyncingLock`, `newPendingId` unchanged — they already go through `read()`/`write()`, so memory-held leads flow through them automatically. `markLeadSyncing` should also mirror to `memFallback` on write failure; mirror the `if (!write(map)) memFallback[pendingId] = map[pendingId]` line there too.)

**submitLead.js** — failures call `recordFailure`; retry path emits analytics:
```js
import {
  savePendingLead,
  removePendingLead,
  markLeadSyncing,
  recordFailure,
} from './pendingLeads.js'
import { normalizePhone } from './phone.js'
import { track } from './analytics.js'

const WEBHOOK_URL = import.meta.env.VITE_WAYFINDER_WEBHOOK_URL || 'https://placeholder.invalid/replace-at-launch'
const API_KEY = import.meta.env.VITE_WAYFINDER_API_KEY || ''

function headers() {
  return {
    'Content-Type': 'application/json',
    ...(API_KEY ? { Authorization: `Bearer ${API_KEY}` } : {}),
  }
}

// Upgrade any payload to the current contract right before sending. Protects
// leads that were queued by an OLDER build (phone-as-object, no `responses`,
// single `smsConsent`) and are only now being retried. No-op for fresh payloads.
function normalizePayload(p) {
  const out = { ...p }
  if (out.phone && typeof out.phone === 'object') {
    const o = out.phone
    const { phone, phoneCountry } = normalizePhone(o.phone, { dial: o.dial, code: o.country })
    out.phone = phone
    if (!out.phoneCountry) out.phoneCountry = phoneCountry || o.country || ''
  }
  const consent = !!(out.smsConsent ?? out.smsConsentMarketing ?? out.smsConsentOperational)
  if (out.smsConsent === undefined) out.smsConsent = consent
  if (out.smsConsentMarketing === undefined) out.smsConsentMarketing = consent
  if (out.smsConsentOperational === undefined) out.smsConsentOperational = consent
  if (!out.responses) {
    out.responses = {
      mainChallenge: out.mainChallenge || '',
      commitment: out.commitment || '',
      readiness: out.readiness || '',
      income: out.income || '',
    }
  }
  return out
}

export async function submitLead(payload) {
  // Save FIRST (best-effort). `saved` is false in private mode / quota cases.
  const saved = savePendingLead(payload)
  // Best-effort lock so the retry hook doesn't double-send — but NEVER gate the
  // immediate POST on it. If save failed there's no map entry and the lock
  // would be false; we must still attempt delivery or the lead is lost.
  markLeadSyncing(payload.pendingId)
  try {
    const res = await fetch(WEBHOOK_URL, { method: 'POST', headers: headers(), body: JSON.stringify(normalizePayload(payload)) })
    if (!res.ok) {
      const text = await res.text().catch(() => '')
      recordFailure(payload.pendingId, `HTTP ${res.status} ${text.slice(0, 200)}`)
      return { ok: false, queued: saved, status: res.status }
    }
    const result = await res.json().catch(() => ({}))
    removePendingLead(payload.pendingId)
    return { ok: true, result }
  } catch (err) {
    recordFailure(payload.pendingId, err?.message || String(err))
    return { ok: false, queued: saved, error: err?.message || 'network' }
  }
}

export async function retryPendingLead(record) {
  const got = markLeadSyncing(record.pendingId)
  if (!got) return { ok: false, skipped: true }
  try {
    const res = await fetch(WEBHOOK_URL, { method: 'POST', headers: headers(), body: JSON.stringify(normalizePayload(record.payload)) })
    if (!res.ok) {
      const text = await res.text().catch(() => '')
      recordFailure(record.pendingId, `HTTP ${res.status} ${text.slice(0, 200)}`)
      track('pending_lead_sync_failed', { pendingId: record.pendingId, status: res.status })
      return { ok: false, status: res.status }
    }
    removePendingLead(record.pendingId)
    track('wayfinder_lead_sent', { source: 'retry' })
    return { ok: true }
  } catch (err) {
    recordFailure(record.pendingId, err?.message || String(err))
    track('pending_lead_sync_failed', { pendingId: record.pendingId, error: err?.message })
    return { ok: false, error: err?.message || 'network' }
  }
}
```

**usePendingLeadsSync.js** — backoff, cap, debounce, gaps:
```js
import { useEffect } from 'react'
import { listPendingLeads } from '../lib/pendingLeads.js'
import { retryPendingLead } from '../lib/submitLead.js'

const BASE_DELAY = 1000
const MAX_DELAY = 60_000
const MOUNT_DELAY = 2000
const FOCUS_DEBOUNCE = 5000
const GAP = 200

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

// Due if never tried, else after exponential backoff (±25% jitter) since last try.
// No hard retry cap: a long outage / temporarily-bad key must not permanently
// strand a real lead. Backoff is clamped at MAX_DELAY, so a stuck lead just
// retries politely (~once/min) until it lands or a human clears it via the
// recovery page. retryCount still grows (used only for backoff + display).
function isDue(rec) {
  if (!rec.lastTriedAt) return true
  const base = Math.min(BASE_DELAY * 2 ** Math.min(rec.retryCount || 0, 16), MAX_DELAY)
  const threshold = base * (0.75 + Math.random() * 0.5)
  return Date.now() - rec.lastTriedAt >= threshold
}

export function usePendingLeadsSync() {
  useEffect(() => {
    let cancelled = false
    let lastFlush = 0

    async function flush() {
      for (const rec of listPendingLeads()) {
        if (cancelled) return
        if (!isDue(rec)) continue
        await retryPendingLead(rec)
        await sleep(GAP)
      }
    }

    const debounced = () => {
      const now = Date.now()
      if (now - lastFlush < FOCUS_DEBOUNCE) return
      lastFlush = now
      flush()
    }

    const mountTimer = setTimeout(() => { lastFlush = Date.now(); flush() }, MOUNT_DELAY)
    const onOnline = () => flush()
    window.addEventListener('online', onOnline)
    window.addEventListener('focus', debounced)
    document.addEventListener('visibilitychange', debounced)
    return () => {
      cancelled = true
      clearTimeout(mountTimer)
      window.removeEventListener('online', onOnline)
      window.removeEventListener('focus', debounced)
      document.removeEventListener('visibilitychange', debounced)
    }
  }, [])
}
```

### 6. Admin recovery page (`/?admin=pending-leads`)
`THE_ORDER_PLAN.md` claims this exists; it does not. `listPendingLeads()` exists but nothing surfaces it. Add a self-contained, dependency-free panel: count, per-lead detail (pendingId / email / retryCount / lastError / savedAt), and Re-fire one / Re-fire all / Export JSON / Clear all. Unauthenticated by design — it only reads the visitor's own localStorage (Doc 2 §9).

**New file `src/components/ui/PendingLeadsAdmin.jsx`:**
```jsx
import { useState } from 'react'
import { listPendingLeads, removePendingLead } from '../../lib/pendingLeads.js'
import { retryPendingLead } from '../../lib/submitLead.js'

export function PendingLeadsAdmin() {
  const [leads, setLeads] = useState(() => listPendingLeads())
  const [busy, setBusy] = useState(false)
  const refresh = () => setLeads(listPendingLeads())

  const fireOne = async (rec) => {
    setBusy(true)
    await retryPendingLead(rec)
    refresh()
    setBusy(false)
  }

  const fireAll = async () => {
    setBusy(true)
    for (const rec of listPendingLeads()) {
      await retryPendingLead(rec)
      await new Promise((r) => setTimeout(r, 200))
    }
    refresh()
    setBusy(false)
  }

  const exportJson = () => {
    const blob = new Blob([JSON.stringify(leads, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'order-pending-leads.json'
    a.click()
    URL.revokeObjectURL(url)
  }

  const clearAll = () => {
    if (!window.confirm('Delete all locally-queued leads? This cannot be undone.')) return
    leads.forEach((l) => removePendingLead(l.pendingId))
    refresh()
  }

  const box = { fontFamily: 'monospace', maxWidth: 760, margin: '40px auto', padding: 24, color: '#e8e3d8', background: '#14110d' }
  const btn = { marginRight: 8, padding: '6px 12px', cursor: 'pointer' }

  return (
    <div style={box}>
      <h1 style={{ fontSize: 18 }}>The Order — pending leads ({leads.length})</h1>
      <p style={{ opacity: 0.7, fontSize: 13 }}>
        Leads queued in this browser that have not confirmed delivery to Wayfinder. Re-fire to retry now.
      </p>
      <div style={{ margin: '16px 0' }}>
        <button style={btn} onClick={fireAll} disabled={busy || !leads.length}>Re-fire all</button>
        <button style={btn} onClick={exportJson} disabled={!leads.length}>Export JSON</button>
        <button style={btn} onClick={clearAll} disabled={!leads.length}>Clear all</button>
        <button style={btn} onClick={refresh} disabled={busy}>Refresh</button>
      </div>
      {!leads.length && <p>No pending leads. ✓</p>}
      {leads.map((l) => (
        <div key={l.pendingId} style={{ borderTop: '1px solid #3a342a', padding: '12px 0', fontSize: 13 }}>
          <div><strong>{l.payload?.email || '(no email)'}</strong> — {l.payload?.name || ''}</div>
          <div style={{ opacity: 0.7 }}>id: {l.pendingId}</div>
          <div style={{ opacity: 0.7 }}>retries: {l.retryCount || 0} · saved: {l.savedAt ? new Date(l.savedAt).toLocaleString() : '—'}</div>
          {l.lastError && <div style={{ color: '#c98' }}>last error: {l.lastError}</div>}
          <button style={{ ...btn, marginTop: 8 }} onClick={() => fireOne(l)} disabled={busy}>Re-fire this lead</button>
        </div>
      ))}
    </div>
  )
}
```

**App.jsx** — route the recovery page (public path, query-param gated):
```jsx
import { PendingLeadsAdmin } from './components/ui/PendingLeadsAdmin.jsx'

function isPendingLeadsAdmin() {
  return typeof window !== 'undefined' &&
    new URLSearchParams(window.location.search).get('admin') === 'pending-leads'
}

export default function App() {
  if (isAdminRoute()) return <AdminRoot />
  if (isPendingLeadsAdmin()) return <PendingLeadsAdmin />
  return <PublicSite />
}
```

### 7. `.env.example` — real domain + clearer webhook note
- `VITE_SITE_DOMAIN=theorder.global` (was `theorder.placeholder`)
- Clarify `VITE_WAYFINDER_WEBHOOK_URL` is the full direct Convex URL: `https://{deployment}.convex.site/api/funnel/the-order/lead` (Vite app → no Next.js proxy; use Doc 2's direct `.convex.site` form).

---

## Ops / Wayfinder-admin tasks (no code — blocks launch)
1. Create org **The Order** + funnel → get `slug` + `fnl_…` webhookSecret. **Set funnel Active.** Open pipeline once to seed stages. Assign coach/owner + product (deal value/owner auto-fill).
2. **Configure scoring rules to match the answer strings.** `income` already matches Doc 2 canonical. `commitment` / `readiness` value strings in `content/questions.json` are placeholders — enter identically on both sides (copy *from* Wayfinder admin *into* questions.json; don't retype). Confirm scoring keys `mainChallenge/commitment/readiness/income`.
3. **CORS allowlist:** add `theorder.global`, `www.theorder.global`, and the Vercel `*.vercel.app` preview pattern to the funnel.
4. **Vercel env vars** (Production + Preview; use a *separate* funnel slug/key for Preview so QA never hits prod CRM): `VITE_WAYFINDER_WEBHOOK_URL`, `VITE_WAYFINDER_API_KEY`, `VITE_FUNNEL_SLUG=the-order`, `VITE_SITE_DOMAIN=theorder.global`.

## Pre-launch test plan (Doc 2 §12, condensed)
1. Happy path — lead lands in Wayfinder **with the correct score** (check the score, not just existence).
2. Vary each scored answer — confirm scores differ as expected (proves `responses`/flat shape is being read).
3. All 6 income strings echo back identically.
4. Wrong API key → UI still advances, lead in localStorage, retry hook pushes it after key restored.
5. Offline submit → advances → syncs on focus/online.
6. Honeypot → success UI, no lead, no `form_submitted`.
7. UTM + gclid/fbclid appear on the lead.
8. `/?admin=pending-leads` lists a forced-failure lead; re-fire delivers it.
9. HOT vs COLD lead → sales channel pages on HOT only (routing automation live).

## Changed files (build manifest)
- `src/lib/phone.js` — **new** shared `normalizePhone` helper
- `src/components/sections/ApplicationSection.jsx` — buildPayload + form_submitted + SOURCE default + countryCodes/normalizePhone imports
- `src/components/ui/QuestionSlide.jsx` — allow leading `+` in phone input
- `src/lib/utm.js` — gclid/fbclid capture
- `src/lib/pendingLeads.js` — retryCount + recordFailure
- `src/lib/submitLead.js` — recordFailure + retry analytics
- `src/hooks/usePendingLeadsSync.js` — backoff/jitter/cap/debounce
- `src/components/ui/PendingLeadsAdmin.jsx` — **new** recovery page
- `src/App.jsx` — route recovery page
- `.env.example` — domain + webhook note
