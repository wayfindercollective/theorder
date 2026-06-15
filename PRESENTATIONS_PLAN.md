# `/presentations` — Build Plan

A password-protected presentation builder for the coach. He builds slide decks that
mirror the site's images, fills in black text boxes, then screen-shares and scrolls
through them on a Zoom call. Decks are saved server-side so he can build on one
machine and present from another.

> **Revision history:** v2 — incorporates codex review round 1 (alignment comes from
> `sectionAlign()`/`splitSides`, not raw JSON; correct Blob token env; monotonic append
> cursor; plain-text inputs not `contentEditable`; explicit per-section box presets;
> empty-box behaviour clarified; split-hero fidelity; tightened API validation).

---

## 1. Confirmed decisions (from Nathan)

| Decision | Choice |
|---|---|
| **Storage** | Server, cross-device → **Vercel Blob** (same store as images, new `presentations/` prefix). |
| **Slide text** | **Always blank** heading/body boxes, positioned where the section's text currently sits. |
| **Extra controls** | **Delete & reorder slides** + **drag & resize boxes**. (No multiple boxes per slide.) |
| **Image order** | **Auto from the live site, in DOM order.** Sequence runs image 1→end, then repeats 1→end — but on repeats the hero appears as a *plain blank slide* (no logo/text). Only the first page keeps the logo + hero text. |
| **Auth** | **Same password as `/admin`.** Reuse `/api/admin/login` + the existing JWT. |
| **Audience** | Author-only (screen-share). **No public client links.** |

---

## 2. Acceptance checklist (from the brief)

1. New route `/presentations`, gated by the admin password.
2. A deck = a "blank website": every site **painting** image, in site order, no text.
3. Each non-hero page has **one black text box (white text)** — a heading + body —
   placed where that section's text currently is. Same card style as the site.
4. Per-box controls: **increase/decrease font size**, **box alignment** (L/C/R), and
   **text alignment within the box** (L/C/R). Plus drag-to-move and resize.
5. **All boxes share one uniform style** — a normal heading + body. Section-specific
   text styling (e.g. the FAQ "questions" list look) is **not** reproduced.
6. **First page is fixed**: hero painting + logo + hero text, mirroring the site. Not
   editable, not deletable, not reorderable.
7. **No CTAs anywhere** in a deck.
8. **Founder ("Who Am I") page**: background image only — the portrait tile with
   Nico's picture is dropped.
9. **Side-aligned images**: where the site puts the painting left/right with text on the
   opposite side, keep that and place the box on the text side.
10. **Add slides**: appending past the last image wraps to the start of the sequence
    (hero image now blank), repeating indefinitely.
11. **Create, edit, save, delete, reorder** presentations.
12. A clean **Present mode** that hides all editor chrome for screen-sharing.

---

## 3. Architecture fit (verified against the code)

- **Static Vite/React SPA** on Vercel. `content/sections.json` is the build-time source
  of truth; section components import it via `src/config/sectionContent.js`.
- **Routing** is pathname branching in `src/App.jsx:25` (`/admin` → lazy `AdminApp`).
  `vercel.json:8` rewrites `/((?!api/).*)` → `/index.html`, so `/presentations` resolves
  on hard load. → Add a `/presentations` branch, lazy-loaded.
  *Note:* lazy-loading is a bundle-split optimisation, **not** a security boundary — the
  chunk is public static JS containing no secrets. **All access control is enforced by the
  API** (`requireAuth` on every route).
- **Auth** is centralized: `POST /api/admin/login` constant-time-checks `ADMIN_PASSWORD`
  and returns a 24h `HS256` JWT (`api/_lib/auth.js`). `requireAuth(req,res)` guards routes.
  → Reuse verbatim; the presentations API verifies the *same* JWT (`sub:'admin'`).
- **Blob** is wired via `@vercel/blob`. **Token precedence in the existing code is
  `IMAGES_BLOB_READ_WRITE_TOKEN || BLOB_READ_WRITE_TOKEN`** (`api/admin/images.js:15`,
  `api/admin/upload.js:44`). → The presentations route uses the **same precedence** (via a
  shared helper, below) so it hits the same store with **no new env var required**.
- **Client auth helpers** (`src/admin/adminApi.js`): `login`, `getToken`, `clearToken`,
  `getTokenExpiryMs`, `humanizeError`. → Import and reuse so the token is literally shared.
- **Session-expiry handling** currently lives inside `AdminApp` (`src/admin/AdminApp.jsx:37-70`).
  → Extract it into a small shared hook `src/lib/useSessionExpiry.js`, consumed by **both**
  `AdminApp` and the new `PresentationsApp` (mechanical refactor, no behaviour change).

**Key design choice:** the deck does **not** reuse the live section components for layout.
It renders generic slides (background painting + one text box). This makes requirements
4/5/7/8 true *by construction* — no CTAs, no portrait tile, no section-specific text
styling. **Backgrounds, however, are produced with the site's own painting machinery**
(see §7) so they look identical. Only the hero's overlay is mirrored explicitly.

---

## 4. The site image sequence (source of truth for slides)

New shared module **`src/presentations/siteImages.js`** derives the ordered list from
`content/sections.json`, mirroring the exact DOM order in `App.jsx` **and reusing the
real alignment logic** — `sectionAlign(key, fallback)` and `splitSides` from
`src/config/design.js` (since `DESIGN_V2 = true`, five sections pull the painting to one
side; the rest are `full`).

| # | key | section | `alignKey` (design.js) | `sectionClass` (CSS) | **effective align** | box side |
|---|------|---------|------|------|------|------|
| 0 | hero | Hero | hero | (hero overlay) | right (split) | hero overlay (special) |
| 1 | truth | The Truth | truth | section-truth | full | centred |
| 2 | code | Who We Are | code | section-code | **right** | **left** |
| 3 | principles | Principles | principles | section-principles | full | centred |
| 4 | evidence | Testimonials | evidence | section-evidence | full | centred |
| 5 | founder | Who Am I | founder | section-founder | full | centred (bg only) |
| 6 | become | We're Offering You | become | section-become | **left** | **right** |
| 7 | faq | Questions… | faq | section-faq | **right** | **left** |
| 8 | how | How We Operate | **howWeOperate** | **section-how** | **left** | **right** |
| 9 | application | Apply Now | application | section-application | full | centred |
| 10 | closing | Closing | closing | section-closing | full | centred |

`N = SITE_IMAGES.length` (11). Each entry:
`{ key, src, alignKey, sectionClass, align: sectionAlign(alignKey, content.imageAlign), defaultBox }`.
**Note the `how` row:** `splitSides` keys this section as `howWeOperate` (`design.js:26`) but its
CSS class is `section-how` (`HowWeOperateSection.jsx:16`) — so `alignKey` and `sectionClass` are
stored **separately** (they coincide for every other section). `sectionAlign` is always called
with `alignKey`, never the short `key`.

**Excluded images** (so "every site image" is unambiguous): header/closing/footer logos &
wordmarks, the founder **portrait tile** (req. 8), CTA background, final-screen assets.
The deck uses only the **section painting** for each page (and the hero painting for page 0).

Because images and alignment are read from bundled `sections.json` + `design.js`, a CMS
image swap flows into every deck on the next deploy ("mimics future changes"). Slides
store an **index**, not a URL, so resolution is always against the current image.

**Append sequence.** The deck holds a **monotonic `cursor`** (next page number to append).
A new slide's image index = `cursor % N`, then `cursor++`. Initial deck: hero (page 0) +
slides for pages 1…10, `cursor = 11`. So the **next** append → `11 % 11 = 0` (hero painting
as a blank slide), then 1, 2, …. **Deleting or reordering never rewinds `cursor`**, so the
"1→end, repeating" sequence keeps marching regardless of edits. Each slide also stores its
own `siteImageIndex`, fixed at creation, so its painting stays attached through reorder/delete.

---

## 5. Data model

The hero is **implicit** — always page 0, no editable state, **not** stored in `slides`.
This makes it structurally impossible to edit/delete/reorder. Stored slides are editable only.

```jsonc
// one Blob per deck: presentations/<id>.json
{
  "id": "uuid-v4",              // crypto.randomUUID() (browser); server validates the shape
  "title": "Untitled Presentation",
  "createdAt": "ISO-8601",      // server-owned
  "updatedAt": "ISO-8601",      // server-owned
  "cursor": 11,                 // monotonic append counter (see §4)
  "slides": [                   // editable slides only; hero is implicit page 0
    {
      "id": "uuid-v4",
      "siteImageIndex": 1,      // index into SITE_IMAGES; fixed at creation
      "heading": "",            // plain text
      "body": "",               // plain text (\n allowed)
      "box": {
        "xPct": 8, "yPct": 60,  // top-left, % of slide width/height
        "wPct": 46, "hPct": 30, // size, % of slide width/height
        "boxAlign": "left",     // 'left'|'center'|'right' — quick preset (snaps xPct)
        "textAlign": "left",    // 'left'|'center'|'right' — text-align inside the box
        "headingPx": 40,        // base px at reference slide width; scaled responsively (§7)
        "bodyPx": 20
      }
    }
  ]
}
```

**Defaults for a new deck:** hero (implicit) + 10 blank slides for `SITE_IMAGES[1..10]`
— a full blank mirror of the site. Each slide's default `box` comes from an **explicit
per-key preset** in `siteImages.js` (not a vague derivation), so the box starts roughly
where that section's text sits and on the correct side:

| key | default box (xPct,yPct,wPct,hPct) | rationale |
|---|---|---|
| truth | 27, 30, 46, 40 | centred provocation column |
| code | 6, 28, 42, 50 | image right → text left |
| principles | 27, 34, 46, 36 | centred |
| evidence | 22, 30, 56, 44 | centred card grid area |
| founder | 27, 34, 46, 40 | centred (background only) |
| become | 52, 28, 42, 50 | image left → text right |
| faq | 6, 24, 44, 56 | image right → text left |
| how | 52, 26, 42, 52 | image left → text right |
| application | 28, 30, 44, 44 | centred card |
| closing | 27, 36, 46, 32 | centred wordmark/verses |
| hero (repeat) | 27, 60, 46, 28 | centred lower third |

These are **starting positions** — the coach drags/resizes freely. (Exact px are tuned
during the build; the table fixes the intent: correct side + sensible footprint.)

---

## 6. Backend — `api/presentations/index.js` (→ `/api/presentations`)

Single handler, mirrors `api/admin/images.js`. **Every method calls `requireAuth`** (same JWT).
Blob token via a shared helper **`api/_lib/blob.js`** exporting
`getBlobToken()` = `process.env.IMAGES_BLOB_READ_WRITE_TOKEN || process.env.BLOB_READ_WRITE_TOKEN`
(the existing helpers in `images.js`/`upload.js` are refactored to import it — identical behaviour).

**Blob URL handling (verified against installed `@vercel/blob` 0.27.3):** `put` takes a
**pathname** and returns `{ url, pathname }`; `del` and reads operate on the **URL**, not the
pathname (`api/admin/images.js:56` deletes `blob.url`). So every read/delete first resolves the
URL via `list({ prefix:'presentations/' })`, matching `blob.pathname === 'presentations/<id>.json'`,
then `fetch(blob.url, { cache:'no-store' })` (read) or `del(blob.url, { token })` (delete).

| Method | Action |
|---|---|
| `GET /api/presentations` | `list({ prefix:'presentations/' })` → for each, `fetch(blob.url,{cache:'no-store'})` → return the **full decks** (volume is a handful) so the manager can open/rename without a second round-trip. |
| `GET /api/presentations?id=<id>` | Resolve URL for `presentations/<id>.json` via `list`, fetch it, return the deck. |
| `POST /api/presentations` | Body = deck. **Validate** (below). **Read-before-write:** if the deck already exists, fetch it and **preserve its `createdAt`**; set `updatedAt = now` (create stamps both). `put('presentations/<id>.json', json, { access:'public', contentType:'application/json', addRandomSuffix:false, cacheControlMaxAge:0, token })`. Returns `{ ok, deck }`. |
| `DELETE /api/presentations?id=<id>` | Validate `id`, resolve the URL via `list`, `del(blob.url, { token })`. Returns `{ ok }`. |

**Overwrite & cache (SDK specifics, confirmed in `node_modules/@vercel/blob/dist`):**
- `@vercel/blob` 0.27.3 has **no `allowOverwrite` option** — with `addRandomSuffix:false`, `put`
  to an existing pathname **overwrites by default**. (Do not pass `allowOverwrite`; it would be
  ignored / is not part of `CommonCreateBlobOptions`.)
- Deck JSON is mutable, but Blob defaults to a **1-year cache**. Set `cacheControlMaxAge: 0` on
  every `put` (authoritative fix — disables edge caching of the object) **and** read with
  `fetch(..., { cache:'no-store' })`, so saves are immediately visible on the next load.

**Validation (server-authoritative — the client is untrusted):**
- `id` must match a UUID-v4 regex; reject otherwise (also blocks path traversal in the
  blob pathname).
- `title`: coerce to string, trim, default `"Untitled Presentation"` if empty, truncate ≤ 120 chars.
- `cursor`: coerce to a non-negative integer; if absent/invalid default to `slides.length + 1`.
  On an existing deck, never let it go **below** the stored value (preserve the monotonic
  append counter so the wrap sequence can't rewind).
- Reject bodies over ~512 KB; `slides.length ≤ 200`.
- Per slide: `siteImageIndex` coerced to an integer in `[0, N)`; `heading ≤ 200` chars,
  `body ≤ 5000` chars (truncate); `box.*Pct` clamped to `[0,100]`; `box.*Px` clamped to
  `[12,200]`; `boxAlign`/`textAlign` whitelisted to `left|center|right` (default `left`).
- **Rebuild** each object from known keys only (drop unknown fields); server owns
  `createdAt`/`updatedAt` (ignore client values).

**Storage notes.**
- **Per-deck blobs** (not one shared file): saving deck A never clobbers deck B; delete is
  one `del`.
- **Reads are proxied** through this API (server fetches the blob and returns JSON); the
  public blob URL is never handed to the client.
- **Privacy tradeoff (flagged for Nathan):** `@vercel/blob` v0.27 `put` requires
  `access:'public'`, so a deck blob is technically reachable by anyone who knows its exact
  URL `…/presentations/<uuid-v4>.json`. Mitigations: unguessable v4 UUID pathname + the URL
  is never exposed (reads go through the password-gated API). Deck content is **presentation
  material the coach shows clients on screen-share**, not confidential notes, so this is
  acceptable. *If true confidentiality is ever required, migrate to a private store / signed
  URLs — noted as out-of-scope for now.*

`maxDuration`/`memory` are already covered by `vercel.json`'s `api/**/*.js` block.

---

## 7. Frontend

Lazy-loaded module tree under **`src/presentations/`** (own chunk; public visitors never
download it). CSS in `src/presentations/presentations.css`, imported by the entry so it
ships only in the lazy chunk.

```
src/presentations/
  PresentationsApp.jsx   // entry: auth gate → manager | editor
  presentationsApi.js    // client for /api/presentations (reuses adminApi token)
  siteImages.js          // ordered SITE_IMAGES + per-key default boxes (from sections.json + design.js)
  DeckManager.jsx        // list / create / open / rename / delete decks
  DeckEditor.jsx         // scroll-of-slides editor; toolbar; save; present toggle; add/delete/reorder
  Slide.jsx              // one slide: background (via SectionPainting) + (TextBox | PresHero)
  TextBox.jsx            // draggable/resizable black box, plain-text editing + per-box controls
  PresHero.jsx           // fixed first slide (split hero: logo + headline + verse), no CTA/cue
  presentations.css
src/lib/
  useSessionExpiry.js    // shared hook extracted from AdminApp (also rewired into AdminApp)
```

**Routing.** In `App.jsx`: `isPresentationsRoute()` = `pathname.startsWith('/presentations')`
→ render `<Suspense><PresentationsApp/></Suspense>` (lazy), mirroring the `/admin` branch.

**Auth gate.** `PresentationsApp` checks `getToken()`. If absent, render `AdminLogin`
(reused; add optional `eyebrow`/`title` props defaulting to the current copy so it can read
"Presentations") wired to `adminApi.login`. On success it stores the same token. Uses the
shared `useSessionExpiry` hook for the expiry warning + auto sign-out. Sign-out clears the
shared token.

**DeckManager.** Grid of saved decks (title, "updated …", Open / Rename / Delete) + a **New
presentation** button → builds a default deck in memory (hero + 10 blank slides, `cursor:11`)
and opens the editor; first Save persists it. **Rename** edits the title on the in-hand deck
object (the list returns full decks) and POSTs. Delete confirms first.

**DeckEditor.**
- Sticky top toolbar (hidden in Present mode): editable deck **title**, **Save** button
  (idle/dirty/saving/saved + error via `humanizeError`), **Present** toggle, **Back** to
  manager, **Sign out**.
- Body: vertical scroll, one **centred, letterboxed 16:9 "stage"** per page (chosen over
  full-viewport so a box lands identically on every screen — `xPct/yPct/wPct/hPct` are % of
  the **stage**, not the window). The stage is `width:min(100vw, 100svh*16/9)` with
  `aspect-ratio:16/9`; pages `scroll-snap`. Font sizes scale with stage width via container
  query units (`cqw`), so text keeps its proportion regardless of window size.
- Page 0 = `PresHero` (locked). Pages 1… = `Slide` + `TextBox`.
- Per non-hero slide (controls hidden in Present): **Delete slide** (confirm), **reorder**
  via **up/down buttons** (reliable primary) plus a **drag handle** (pointer-based, no new
  dependency). Hero is pinned (excluded from the reorderable set).
- **Add slide** button after the last slide → appends `SITE_IMAGES[cursor % N]`, bumps
  `cursor`, blank box from that image's preset.
- **Autosave draft to `localStorage`** (keyed by deck id) on every change as a crash/expiry
  backstop; explicit **Save** pushes to Blob. `beforeunload` warns on unsaved changes.

**Slide.jsx.** Renders `<section class="section section-<key> pres-slide [design-split img-<align>]">`
and reuses the site's **`SectionPainting`** component with the same `align` — so the existing
per-section oil grade, vignette, `background-position`, and split-fade CSS apply and the
backgrounds are pixel-identical to the site. `.pres-slide` adds full-viewport height +
scroll-snap and neutralises the default `.section` vertical padding. Child: the `TextBox`.
(The founder slide is thus background-only — no portrait tile — satisfying req. 8.)

**PresHero.jsx.** Mirrors the **split** hero (`DESIGN_V2`, side `right`): replicates the
`hero hero--split` → `hero-sticky` → `hero-canvas` → `hero-content shell` structure with the
logo-mark, `hero-headline`, and `hero-verse` using the existing classes. **CTA and scroll cue
omitted.** The hero background is the **single hero frame read from
`heroFilm.frames[0].src`** (exposed as `SITE_IMAGES[0].src`), **not** a hard-coded asset — so
a CMS swap of the hero image flows through to both the first slide and any repeat-hero blank
slide (which resolves `siteImageIndex 0` to the same source). The logo uses
`brandContent.logo || '/images/logo-mark.png'`, matching `Hero.jsx`. (We render the single
frame statically rather than mounting the scroll-coupled `HeroFilm`, which is visually
identical for today's one-frame hero and avoids importing public-site scroll machinery. If the
hero ever becomes a true multi-frame film, revisit.)

**TextBox.jsx.** The black box.
- Absolutely positioned in the slide via `xPct/yPct/wPct/hPct`.
- Dark panel matching the site card (dark fill, hairline border, white text); heading in
  the display face, body in the prose face — **one uniform style for every box** (req. 5).
- **Plain-text editing only** — heading is an `<input>`/single-line field, body is a
  `<textarea>`; values are plain strings rendered as React **text nodes** (never
  `dangerouslySetInnerHTML`, no `contentEditable`). This removes any HTML/XSS/paste concern
  — pasted content is automatically plain text. Placeholders show only in edit mode.
- **Controls** (toolbar on focus/hover, hidden in Present):
  - **Font size**: heading `A−/A+` and body `A−/A+` steppers (clamped 12–200).
  - **Box align** L/C/R: snaps the box left/centre/right (sets `xPct`, preserves `wPct`).
  - **Text align** L/C/R: sets `textAlign`.
- **Drag** to reposition (pointer events → `xPct/yPct`); **resize** via a corner handle
  (→ `wPct/hPct`). All values are **percentages of the slide**, so layout holds across the
  build screen and the screen-shared window.
- **Font scaling:** `headingPx/bodyPx` are relative to a reference slide width and scaled
  by actual slide width (a `--slide-scale` custom property / `clamp()`), so text keeps its
  proportion on differently sized screens.
- **Empty-box behaviour (resolves the review contradiction):** in **edit mode every
  non-hero slide always shows its box** (with placeholder) so the coach can always type
  (req. 3). In **Present mode**, a box whose heading **and** body are both empty renders
  nothing, so a slide the coach deliberately left blank shows the pure painting rather than
  an empty black rectangle. Any box with content always renders.

**presentationsApi.js.** `listDecks()`, `getDeck(id)`, `saveDeck(deck)`, `deleteDeck(id)`
— thin `fetch` wrappers adding `Authorization: Bearer <token>` from `adminApi.getToken()`,
reusing `humanizeError`.

---

## 8. Touch list

**New**
- `api/presentations/index.js`, `api/_lib/blob.js`
- `src/presentations/{PresentationsApp,DeckManager,DeckEditor,Slide,TextBox,PresHero}.jsx`
- `src/presentations/{presentationsApi,siteImages}.js`
- `src/presentations/presentations.css`
- `src/lib/useSessionExpiry.js`

**Edited (small, backward-compatible)**
- `src/App.jsx` — add the `/presentations` lazy branch.
- `src/admin/AdminLogin.jsx` — optional `eyebrow`/`title` props (defaults unchanged).
- `src/admin/AdminApp.jsx` — consume the extracted `useSessionExpiry` hook (no behaviour change).
- `api/admin/images.js`, `api/admin/upload.js` — import `getBlobToken` from `api/_lib/blob.js`
  (identical precedence; pure refactor).

**Untouched:** `content/sections.json`, every public **section** component, the `/admin`
editor logic, all other API routes. No change to the public site's bundle or behaviour.

---

## 9. Risks / open questions for review

1. **Full-viewport vs fixed 16:9 stage.** Full-viewport mimics the site but box %
   positions are relative to whatever window aspect he presents in, so the box can shift
   slightly against a painting's focal point between build and present screens. Alternative:
   a centred letterboxed **16:9 stage** → identical framing everywhere, more "slide deck",
   less "website". *Plan picks full-viewport; flag if the stage is safer.*
2. **Blob privacy.** Public blobs behind unguessable v4 UUIDs, reads proxied so URLs aren't
   exposed; content is screen-share material. Acceptable, or worth a private store now?
3. **Reorder UX.** Up/down buttons (reliable) + native pointer drag handle, no new
   dependency. Sufficient?
4. **Background fidelity via `SectionPainting`.** Reusing the section classes + component
   should pixel-match; the only risk is `.section` base CSS leaking layout into `.pres-slide`
   — mitigated by explicit overrides. Worth a visual check during build.
5. **Font scaling model.** `clamp()`/scale-factor vs absolute px. Plan scales with slide
   width to stay proportional.

---

## 10. Validation

- `npm run build` passes; `/presentations` is a separate lazy chunk (public bundle
  unaffected — verify in build output). No new env var required (reuses the images Blob token).
- Manual: load `/presentations` → login with the admin password → new deck shows the blank
  mirror (hero fixed, 10 blank slides, correct sides for code/become/faq/how) → edit text,
  font size, both alignments, drag, resize → Save → reload → state restored → add slides past
  the end (wrap to hero-as-blank, sequence keeps marching after deletes) → reorder → delete →
  Present mode hides all chrome, hides deliberately-empty boxes, scroll-snaps cleanly.
- Confirm: no CTAs anywhere; founder slide is background-only; split images put the box on
  the text side; every box shares the uniform heading/body style.

---

## 11. Out of scope (explicit)

- Public/client-facing share links (author screen-shares only).
- Per-slide image replacement or uploading new images into a deck.
- Multiple text boxes per slide.
- Rich text / HTML in boxes (plain text only).
- Transitions/animations beyond scroll-snap.
- A private Blob store / signed URLs (revisit only if confidentiality is later required).
- Editing the public site content (that stays in `/admin`).
