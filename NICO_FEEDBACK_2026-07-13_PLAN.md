# The Order — Nico feedback plan (2026-07-13)

> **BUILT 2026-07-13** (same session, post-review). All sections implemented; see git
> diff of this date. §D resolved: of the 9 files Nico provided, 8 were already in the
> presentation library — the only genuinely new image (Bible & rosary, IMG_1554) was
> added as `/images/pres-library/bible-rosary.jpg`. Round-2 decisions: decline screen
> gained a "your information has not been stored" line; email became REQUIRED with
> phone optional-but-unadvertised (supersedes §B5's email-OR-phone below). Testimonial
> videos: 74.7 → 43 MB re-encode (short-side 720, CRF 26, 30fps) + poster frames +
> preload="none"/in-view playback — initial page load now fetches ~120 KB of posters
> instead of ~75 MB of video. Originals: asset-sources/testimonials-originals/.

Plan only. No code written yet. Nine feedback items from Nico, mapped against the
current build. Grouped into five workstreams. Copy that Nico must finalise is shown
in **[ brackets ]**; his own draft wording is used as the default where he gave it.

## Decisions locked round 2 (from Nathan, 2026-07-13, supersedes conflicts below)
- **Finish-then-decline CONFIRMED.** The negation screen must additionally say the
  applicant's **information will not be stored** (new `declineScreen.notice` line).
- **Email is REQUIRED; phone is optional** — NOT email-or-phone. Submit needs name +
  valid email; phone may be left empty (not advertised anywhere). A non-empty phone must
  still be valid (≥7 digits) to submit, so junk numbers can't ship. This dissolves the
  review blocker: every lead carries the primary dedup key, no email-less handler
  verification needed.
- **§D images:** source = Nathan's recent Downloads (everything newer than the
  contract; the contract itself must NOT be uploaded). Check against the existing
  library/presentations before adding.

## Decisions locked (from Nathan, 2026-07-13)
- **Disqualified applicants: finish, THEN decline.** They answer every question
  including the contact step, then see the negation screen. The lead is **not** sent
  to the OS. (Contact details are entered but discarded — see risk note in §B.)
- **Testimonial video: compress + lazy-load.** Re-encode each clip small, only
  load/autoplay as it scrolls into view. Keeps the silent-autoplay-preview look.
- **Qualification filter: per-answer "Disqualifies" toggle in /admin.** Any answer on
  any question can be flagged as disqualifying. Fully CMS-editable.
- **"God Wills It": gild the existing line** on the thank-you screen (brand gold,
  more prominent). No new content field.

## Open item needing input
- **§D (repetitive images).** I need the image file Nico is referring to
  ("check images were uploaded from the file provided"). The 10 section backgrounds
  in `content/sections.json` are already 10 distinct oils, so I can't tell which
  images he means or where they should go. **Blocking §D only** — everything else can
  proceed. See §D for what I checked.

---

## §A — Performance & the testimonial carousel (items 1 + 2)

### Root cause (found)
The evidence/testimonials section is the culprit for both "slow loading" and the
"mobile scroll is inconsistent" bug — they're the same underlying problem.

`public/testimonials/` holds **~76 MB of video**:

| File | Size |
|---|---|
| Tony.mp4 | 29.8 MB |
| testimonial-2.mp4 | 21.3 MB |
| testimonial-4.mp4 | 15.0 MB |
| testimonial-3.mp4 | 10.4 MB |

In `EvidenceSection.jsx` every clip renders with `autoPlay muted loop preload="auto"`,
and the marquee **duplicates the whole set** (`loop = cards.concat(cards)`) → **8
`<video>` elements** (4 unique URLs; dupes cache-served, so ~4 large network downloads)
all eagerly fetching on load. On mobile data this is the slow load. `oil-knighting.png`
(3 MB) is dead weight but **unreferenced** — it doesn't cost page load, just delete it.

**⚠️ Corrected after review — the "sometimes static" scroll bug is a SEPARATE problem,
not the same root cause as slow load.** My first diagnosis (period mis-measured while
videos download) is **wrong**: the tiles are hard-fixed at `width:227px;
aspect-ratio:2/3` (`globals.css:1624-1634, 1681-1689`), so `period = tiles[n].offsetLeft
- tiles[0].offsetLeft` is deterministic on mount and independent of video load — the
`period <= 0` bail is effectively unreachable. Compression/lazy-load (A1/A2) fixes the
*slow load*, but will NOT fix the *scroll inconsistency*. That needs its own on-device
diagnosis (A3), leading candidates:
- **`prefers-reduced-motion` → `.evidence-rail { animation: none }`** (`globals.css:1690-1693`).
  iOS **Low Power Mode** and Android battery-saver report reduced-motion → the rail is
  intentionally frozen. This best fits "sometimes scrolls, sometimes doesn't."
- **`is-paused` stuck on:** `engagedCountRef` never returning to 0 (a video whose
  `pause`/`ended` didn't fire on mobile), or stacked `resumeSoon` timers from a
  page-scroll finger passing over the rail (`onTouchEnd={resumeSoon}` never clears the
  prior timer).
- animation-duration edge (very small/large period).

### Plan

**A1 — Compress the testimonial videos** (build-time, one-off)
- New script `scripts/optimize-videos.mjs` (ffmpeg): re-encode each clip to 720p,
  H.264 baseline/high, CRF ~24, faststart, stripped audio metadata → target ~2–4 MB
  each. Also emit a **poster JPG** (first frame) per clip.
- Output replaces the files in `public/testimonials/` (keep originals in
  `asset-sources/` in case we want to re-encode).
- Net: ~76 MB → ~10 MB.

**A2 — Lazy-load + only autoplay in view** (`EvidenceSection.jsx`)
- `<video>` → `preload="none"` (or `metadata`), add `poster={c.poster}`.
- Wrap each `EvidenceVideo` with an IntersectionObserver: only call `.play()` on the
  silent preview when the card is actually on screen; pause + release when it leaves.
- The **duplicated (aria-hidden) tiles should not fetch video at all** — render them as
  the poster image only, or share the same lazy gate. This alone removes 4 of the 8
  downloads.

**A3 — Diagnose the "sometimes static" scroll bug ON-DEVICE FIRST** (`EvidenceSection.jsx`)
- **Do not blind-fix.** Reproduce on a real iOS device: toggle **Low Power Mode** and
  re-check — if the rail freezes, the cause is `prefers-reduced-motion`
  (`globals.css:1690-1693`). Decision for Nico: honour reduced-motion (accessible, but
  the testimonials sit still for those users) vs. keep the drift regardless. A middle
  path: a slower, gentler drift under reduced-motion instead of a hard `animation:none`.
- If it's not reduced-motion, instrument `paused`/`engagedCountRef`/`period` and check:
  (a) clear the pending `resumeSoon` timer before setting a new one (currently stacks);
  (b) ensure `engagedCountRef` can't stick > 0 when a video's `pause`/`ended` doesn't
  fire on mobile; (c) `ResizeObserver` instead of the one-shot `resize` listener as
  cheap insurance. Only ship the fix that the repro points to.

**A4 — Fix the touch pause logic** (`EvidenceSection.jsx`)
- Distinguish a deliberate touch-drag on the rail from an incidental finger-pass while
  page-scrolling: only pause on `touchstart` that stays on the rail; clear any pending
  `resumeSoon` timer before setting a new one (currently it stacks timers); guarantee
  `engagedCountRef` can't get stuck > 0 on mobile (release on `pause`/`ended`, which the
  current code does but only after `activated` — verify on real iOS Safari).

**A5 — Image optimisation pass** (build-time, uses existing `scripts/` + sharp)
- Recompress the `oil-*.jpg` backgrounds to max ~1600px wide, quality ~72 → each ~1.4 MB
  down to ~300–500 KB. Convert `oil-knighting.png` (3 MB) to JPG/WebP **or delete it if
  unused** (it is not referenced in `sections.json` — audit first).
- Optional: `<link rel="preload">` the hero image only; leave the rest to lazy paint.

**Files:** `scripts/optimize-videos.mjs` (new), `scripts/` image script (extend existing),
`src/components/sections/EvidenceSection.jsx`, `public/testimonials/*`,
`public/images/oil-*`.
**Test:** Throttled "Fast 3G" mobile profile — first meaningful paint, total transfer
before the testimonials section, and that the rail scrolls smoothly on iOS Safari every
load (not "sometimes").

---

## §B — Application funnel: gate question, filter, negation, email-or-phone
### (items 3 + 4 + 5 + 6)

Current flow: `commitment` → `readiness` → `contact` (3 steps,
`content/questions.json`). Post-submit → `FinalScreen` (booking calendar).

### B1 — New gate question (item 3)
Add a 3rd choice question **before** the contact step in `content/questions.json`:

- **id:** `selfInvestment` · **type:** `choice` · **scored:** false (it's a local
  *gate*, not a CRM score — `scored:true` with no matching funnel rule just scores 0
  silently per `WAYFINDER_WIRING.md:37-38`; if Nico DOES want it scored, flip to true
  AND add the scoring rule + mirrored value strings to the Wayfinder-admin task list)
- **question:** "How do you value yourself?"
- **options** (label → default scoring `value`, and disqualify flag):
  1. "I have heavily invested time and resources in myself" — qualifies
  2. "I am willing to invest time and resources into myself" — qualifies
  3. "I wouldn't invest time and/or money in myself" — **disqualifies**
  4. "I cannot invest time and/or money in myself right now" — **disqualifies**

Ordering becomes `commitment → readiness → selfInvestment → contact` (4 steps).
The answer rides to Wayfinder for *qualified* leads automatically — `buildPayload`
already loops every choice question into `responses` (`ApplicationSection.jsx:42-44`).
Whether the CRM *scores* it is Nico's funnel-config choice; not required for this to work.

### B2 — Disqualification data model (item 5 — admin-configurable)
- Add an optional `disqualify: true` boolean to any **option** in `questions.json`
  (absent = qualifies). This is a business rule, **separate** from the CRM `value`
  contract, so it is **not** hidden behind the "unlock scoring" toggle.
- **Admin editor** (`src/admin/tabs/ApplicationTab.jsx`): add a small checkbox per
  option row — "Disqualifies application" — that writes `disqualify` onto the option.
  Add a one-line explainer at the top of the tab. Because the editor already saves the
  whole `questions` object wholesale, the new flag persists through save with no other
  plumbing.
- **⚠️ Guardrails (found in review) — a mis-click silently kills the funnel.** A declined
  applicant produces no lead, no error, and no telemetry Nico watches, and finish-then-
  decline hides the effect until after a full submit — so a bad config (every option on a
  question flagged, the *best* answer flagged, or a question left with zero qualifying
  paths) can decline up to 100% of traffic with nothing looking broken. Add: (a) an inline
  warning when a question has no non-disqualifying option left; (b) a visible "declines
  applicants" marker on each flagged answer; (c) never allow the contact step to be
  flagged.

### B3 — Negation / decline screen (items 4 + 5)
- **Copy** — new `declineScreen` block in `content/sections.json`, default seeded with
  Nico's wording (cleaned up), fully editable:
  - `heading`: **[ e.g. "Thank you for your enquiry." ]**
  - `body`: **[ "Please return when you have made progress and are willing to go all
    in." ]**
- **Editor:** surface `declineScreen` in the admin. Cleanest home is a block at the top
  of **ApplicationTab** ("Negation screen — shown when an applicant selects a
  disqualifying answer"), which means wiring the `sections.declineScreen` slice +
  its `onChange` into that tab (small AdminEditor change). Alternative: add it to
  SectionsTab. Recommend ApplicationTab so the gate + its message live together.
- **New component** `src/components/ui/DeclineScreen.jsx` — mirrors `FinalScreen`
  styling (logo, heading, sub) **minus the booking calendar**. Reads `declineScreen`.

### B4 — Wire the gate (items 4 + 5) — `src/components/sections/ApplicationSection.jsx`
- Helper `isDisqualified(formData, questions)`: for each answered choice question, find
  the selected option (`option.value === formData[q.id]`); if `option.disqualify` → true.
- In `handleSubmit` (finish-then-decline): after the honeypot + `contactValid` checks
  and **before the `track('form_submitted', …)` call**, if `isDisqualified(...)` →
  `track('application_declined', {...})`, set a `declined` state, show the decline
  screen, and **return before `form_submitted` / `buildPayload` / `submitLead`** — no
  lead reaches the OS.
- **⚠️ Ordering is load-bearing:** `form_submitted` maps to Meta's standard **`Lead`**
  conversion (`analytics.js`). If the gate returns *after* it, every rejected applicant
  fires a `Lead` and ad delivery optimises toward the exact people Nico is turning away,
  and GA4/PostHog conversion counts inflate. The gate MUST fire `application_declined`
  *instead of* `form_submitted`, never both. (The existing honeypot already returns
  before `form_submitted` — mirror that placement.)
- Render branch: `submitted && declined` → `<DeclineScreen/>`; `submitted && !declined`
  → `<FinalScreen/>` (unchanged).
- **⚠️ NEEDS NICO SIGN-OFF — requirement tension.** Nico's original words were "3rd
  question added before contact info is obtained" and "don't obtain contact info" from
  the unqualified. **Finish-then-decline inverts that** — the rejected applicant still
  types name/email/phone (it lives in React state, and PostHog autocapture is on) before
  the decline. Nathan chose finish-then-decline for the smoother UX. The
  requirement-honouring alternative is nearly free: evaluate `isDisqualified` on the
  disqualifying **click** (choice buttons already auto-advance via `handleChoice`), skip
  the contact step, and go straight to the decline screen — no contact obtained. **Confirm
  which Nico actually wants before building.** Either way, contact details on decline are
  discarded (no backend); a stored record of declined enquiries is a separate follow-up.

### B5 — Email OR phone, not both (item 6)
- `ApplicationSection.jsx` `contactValid` (line 143-154): change
  `nameOk && emailOk && phoneOk` → `nameOk && (emailOk || phoneOk)`.
- **🔴 BLOCKER (found in review) — validate each field independently in `buildPayload`.**
  `buildPayload` does **zero** validation today; it trusts `contactValid`. That's safe
  only while the gate requires BOTH. Under email-OR-phone, the un-required field ships
  garbage: name + valid email + phone typed as `"5"` → `normalizePhone("5")` returns
  `phone: "+15"` (it only early-returns on *empty* digits, `phone.js:14`); or valid phone
  + malformed email `"foo@bar"` → email sent raw (only `.trim().toLowerCase()`,
  `ApplicationSection.jsx:48`). **Fix:** in `buildPayload` include `email` only if it
  matches the regex else `''`; include `phone` only if digits ≥ 7 else `''`. Apply the
  **same** per-field guard to the `FinalScreen` contact prop (`ApplicationSection.jsx:236-245`)
  so the booking widget never gets a junk number/email.
- `QuestionSlide.jsx` `ContactFields`: keep **both** fields visible, **no** "only one
  required" helper text (per Nico). The `required` attributes are already inert (there's
  no `<form>`; submit is a `type="button"` onClick) — leaving them is harmless, but drop
  them on the two optional fields for a11y/autofill honesty. **Suppress the SMS-consent
  line/flag when the phone is empty** — an email-only lead with `smsConsent:true` and no
  number is TCPA/data-hygiene noise and the visible SMS line implies a phone is expected.
- **🔴 Wayfinder verification (ops, pre-relaxation).** Email is the **primary** dedup key
  (`WAYFINDER_WIRING.md:32`). Before relaxing the gate, **confirm the funnel handler
  accepts an email-less lead.** If it rejects (non-2xx): the hardened retry hook has *no
  give-up* → it re-POSTs a phone-only lead ~once/min forever while the user already saw
  the success screen (silent loss + noise); and the booking widget will make the
  applicant type an email → a phone-only lead **plus** an email-keyed booking contact
  that won't merge = split/duplicate record. Test a real phone-only lead end-to-end.

**Files:** `content/questions.json`, `content/sections.json` (declineScreen),
`src/admin/tabs/ApplicationTab.jsx`, `src/admin/AdminEditor.jsx` (pass declineScreen
slice), `src/components/sections/ApplicationSection.jsx`,
`src/components/ui/QuestionSlide.jsx`, `src/components/ui/DeclineScreen.jsx` (new),
`src/config/sectionContent.js` (export `declineScreen`).
**Test:** pick a disqualifying answer → finish → decline screen, **no** lead in
Wayfinder, `application_declined` fired (and **not** `form_submitted`/Meta `Lead`). Pick a
qualifying answer → lead lands with the `selfInvestment` response. Submit with only email
→ OK; only phone → lead **accepted by Wayfinder** (verify, not just UI success); neither →
submit stays disabled. With one channel filled and junk in the other → payload sends the
junk field as `''` (per-field validation). Toggle the disqualify flag in /admin →
behaviour changes **after the next content redeploy** (`questions.js` is a build-time
`import`, so a save alone doesn't hot-update the live bundle — don't test on prod before
the rebuild lands).

---

## §C — "God Wills It" in gold on the thank-you page (item 7)

The final screen already renders `finalScreenContent.sub` = "God Wills It" under
"THE ORDER" (`FinalScreen.jsx:30-32`, `sections.json` `finalScreen.sub`).

**Plan:** gild that line — add a `final-sub--gilded` treatment in `globals.css` using
the existing brand gold/brass (see `.brass-rule` / brass tokens already in the
stylesheet): warm gold fill, a touch more weight/letter-spacing, optional faint gold
text-shadow to read as gilt. No content change, no new CMS field. Purely
`FinalScreen.jsx` (class) + `globals.css`.

**Files:** `src/components/ui/FinalScreen.jsx`, `src/styles/globals.css`.
**Test:** thank-you screen shows "God Wills It" in gold; still legible in the reveal
animation and on mobile.

---

## §D — Repetitive images (item 8) — BLOCKED, need the file

Nico: *"check images were uploaded from the file provided on the order so it's not so
repetitive."*

What I checked: the 10 section backgrounds in `sections.json` are 10 **distinct** oils
(`truth-destruction`, `oil-offering`, `oil-principles`, `oil-become`, `oil-naval`,
`oil-founder`, `oil-testimony`, `oil-faq`, `oil-operate`, `oil-closing`) plus the hero.
So I can't identify what reads as "repetitive" or which images the "file provided"
contains.

**Need from Nathan/Nico:** the file/link of images he provided, and where they should
land (which sections, the presentation library, or replacing specific repeated ones).
Once I have it: optimise them (§A5 pipeline), place them via the CMS image fields, and
verify each section/library slot is unique. Until then this item is parked.

---

## §E — Presentation background alignment (item 9)

Nico wants each presentation slide's background image to be set **centre / left / right**,
with a faded ("blurred") centre edge when left/right — so a text box can sit on the
black side. **The mechanism already exists on the main site** and in the deck engine:
`SectionPainting`'s `align='left'|'right'` renders `.section-side-image-{left,right}`,
which masks the inner edge to a soft fade (`globals.css:216-238`). It's just not
per-slide adjustable today — a slide's alignment is fixed by the image it mirrors
(`siteImages.js` `DEFS[].align`, consumed in `Slide.jsx:53`).

### Plan
- **Data:** add an optional `bgAlign` to a slide: `'center' | 'left' | 'right'`
  (absent = the image's inherent alignment). `center` maps to the full-bleed treatment;
  `left`/`right` use the existing faded-edge side-image.
- **Render** (`src/presentations/Slide.jsx`): `align = slide.bgAlign ? map(slide.bgAlign)
  : img.align` where `map('center') = 'full'`; pass to `<SectionPainting>`.
- **Control:** add a background-alignment control to the slide tools (next to the
  existing "Background" button) — three small buttons or a cycle: **Centre / Left /
  Right**.
- **⚠️ CRITICAL — `sanitizeSlide`, with a NULLABLE sanitizer:** add `bgAlign` to
  `sanitizeSlide` in `api/presentations/index.js`. Per the presentations build rule, any
  new slide field not added here is silently dropped on save. **Do NOT reuse the existing
  `align()` helper** — it returns `'left'` for anything that isn't `'center'`/`'right'`
  (not nullable). Reusing it would stamp `bgAlign:'left'` onto every pre-existing slide on
  its next save, and since render is `slide.bgAlign ? map(slide.bgAlign) : img.align`, a
  truthy `'left'` overrides each image's inherent `'full'` → **every full-bleed background
  silently collapses to a left-half side-image.** Write a distinct sanitizer that returns
  one of the three values or **omits the key** when absent.
- **CSS:** the faded edge already works; verify it renders correctly inside `.pres-stage`
  and that the `@media (max-width:900px)` rule (which forces side-images full-width on
  the public site) doesn't misfire in the editor on narrow screens
  (`globals.css:266-278`) — scope it if needed.
- **Text box:** the user already drags text boxes freely, so no auto-move needed; when
  they choose left/right the opposite half is dark/blank and ready for a box. Optionally
  seed a sensible default box position on the black side.
- **"Blurred edge" note:** the existing effect is a soft **mask fade**, matching the main
  site ("similar to current left or right aligned images on the main site"). If Nico
  actually wants a true gaussian blur on the image edge, that's a bigger change (a
  pre-blurred layer or `backdrop-filter`); I'll match the site's fade unless he says
  otherwise.

**Files:** `src/presentations/Slide.jsx`, `api/presentations/index.js` (sanitizeSlide),
`src/presentations/presentations.css` (if scoping needed).
**Test:** set a slide to Left → image on the left with faded centre, black right half;
add a text box on the right; **save, reload** → alignment persists (proves sanitize
passthrough); Present mode renders it; old decks unaffected.

---

## Cross-cutting risks & sequencing
1. **CMS sync overwrites the whole file.** New fields in `sections.json`
   (`declineScreen`) and `questions.json` (`selfInvestment`, `disqualify`) load into
   /admin and save back wholesale, so they survive — *verified in review*:
   `mergeKeepingUnknown` (`api/admin/content.js:26-37`) keeps unknown keys, the rich
   sanitizer is path-based not a whitelist, and `questions` has no sanitizer at all.
   Two caveats: (a) `mergeKeepingUnknown` **replaces arrays wholesale**, so a *stale*
   /admin session saving over a freshly-deployed `selfInvestment` would drop it — deploy
   code + content together and have Nico open a **fresh** session (the draft fingerprint
   guards this); (b) `sectionContent.js` exports have **no fallback default**, so
   `declineScreen` MUST exist in the deployed `sections.json` or `DeclineScreen` throws on
   `.heading`. If `declineScreen.body` is ever rendered as rich HTML, add its path to
   `RICH_PATHS` (`api/_lib/sanitizeRich.js`) or it's stored unsanitised.
2. **Wayfinder scoring contract.** The new `selfInvestment` `value` strings are locked
   in admin like the others. They only need to match a funnel rule if Nico wants CRM
   scoring on that field; otherwise they ride along as raw responses. No launch blocker.
3. **Presentations sanitize.** Covered above — the single most likely silent failure in
   §E.
4. **Video re-encode** is destructive to the working copies — keep originals in
   `asset-sources/`.

## Suggested build order
1. **§A** performance (biggest user-visible win, self-contained).
2. **§B** funnel changes (gate + filter + negation + email-or-phone) — one coherent unit.
3. **§C** gold line (tiny).
4. **§E** presentation alignment (self-contained).
5. **§D** images — once Nico sends the file.

## Copy Nico should confirm before build
- Decline screen `heading` + `body` (defaults seeded from his draft).
- The four `selfInvestment` answer labels (as given) and their CRM `value` strings.
- Nothing else needs new copy — the gold line reuses the existing "God Wills It".
