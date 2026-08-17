# Hero Video Plan — Nico's "Who Am I" playable before any scroll

Status: BUILT (2026-08-17), live at /preview. Codex high-effort review: round 1 found 4 defects (incl. the missing video file live bug), round 2 found 3, round 3 clean.
Nico is curating the video as the first thing a visitor can play, zero
friction, no scrolling. He wants a TEST RUN on a separate public URL before it
goes live everywhere: "get it right there, then implement."

## Pre-existing LIVE BUG found during review (fix ships first, benefits prod now)

`founder.video` in sections.json points to `/videos/who-am-i.mp4`, which does
not exist — the real files are `who-am-i-720.mp4` / `who-am-i-540.mp4`. A CMS
save introduced the bad path. Desktop visitors clicking "Watch Nico's Story"
today get a player that cannot load (the SPA rewrite answers the missing URL
with index.html). Fix: correct the value to `/videos/who-am-i-720.mp4` in
sections.json (committed like a CMS save). Every hero-video feature below
reads the same field, so this is also a prerequisite.

## The preview URL

`theorder.global/preview` renders the MAIN site with the new hero layout.
Anyone with the link sees it; nothing else on the site changes.

- Mechanism: a `HERO_VIDEO` flag in `src/config/design.js`, true when the
  normalised path is exactly `preview` (via the existing `pathToSlug`).
  Hero and FounderSection read the flag. When Nico approves, rollout to every
  URL (main + /physical + /financial + future pages) is flipping that flag to
  always-true: ONE line, no other change. The flag mechanism is temporary by
  design.
- `preview` joins `SYSTEM_PATHS` in variantFields.js, which automatically
  (a) blocks anyone creating a variant page named "preview" and (b) keeps
  `/preview` out of vanity-campaign attribution via the existing spread into
  `RESERVED_PATHS`.
- `/preview` has no variant file so it renders main-site copy: correct, it is
  a preview of the main site's future layout. Not in the sitemap, so no SEO
  side effects; the SPA rewrite already serves it.

## Hero layout (the new part)

Desktop (the split layout, min-width 901px) — inline card over the film:
- The left half is UNTOUCHED: logo, headline, verse line, CTA, scroll cue.
- A new SIBLING layer inside `.hero-sticky`, rendered after `.hero-vignette`
  and before `.hero-content` (stacking spelled out per Codex finding 3):
  `.hero-video-slot { position: absolute; top: 0; bottom: 0; right: 0;
  width: 50%; display: flex; align-items: center; justify-content: center;
  z-index: 2; pointer-events: none; }` — same layer as the content column
  (film is z0 in the canvas, vignette z1), so the card renders above both and
  is clickable. The card inside re-enables `pointer-events: auto` and sets
  `isolation: isolate` so the founder card's internal z-indices (frame nails,
  player, trigger at z2-z4) stay contained instead of interleaving with the
  vignette.
- The card is the same `card nailed` framed treatment as the founder portrait,
  poster = founder portrait, play glyph + CMS `founder.videoLabel`. One click
  plays inline with native controls (the founder section interaction Nico
  already approved). Sizing `height: min(62vh, 560px); aspect-ratio: 3/4;
  width: auto`; the horseman stays visible around it.
- Hidden below 901px (`display: none` — and see preload note for why the
  video element does not cost mobile visitors anything).

Mobile (stacked hero) — play bar + fullscreen overlay, NOT an in-flow card
(Codex finding 2: the hero is a fixed 100vh with overflow hidden; logo +
headline + verse + CTA already consume it, a 300px card cannot fit and would
clip). Instead:
- A compact play BAR (one ~52px row: play glyph + "Watch Nico's Story")
  slots into the hero content column between the verse line and the CTA.
  ~52px + gap fits where a card could not.
- Tapping it opens a fullscreen OVERLAY player: `position: fixed; inset: 0;
  z-index: 300`, black ground, the video with native controls +
  autoplay-on-open (a user gesture, so it plays with sound), and a close
  button. The overlay's source comes from the SAME `pickVideoSource()` call
  as the card (Codex round 2: phones ≤700px get the 540p file, 701-900px
  tablets correctly get the 720p file — not hardcoded "mobile source").
  Body scroll locked while open. The overlay and its video mount only when
  opened, so the mobile hero downloads zero video bytes until the tap.
- The bar is hidden at ≥901px; the desktop slot is hidden below 901px.
- Short-landscape phones (Codex round 2): the existing short-height
  mitigation is desktop-only, so a `@media (max-width: 900px) and
  (max-height: 560px)` rule accompanies the bar — it hides the decorative
  scroll cue and lets the logo shrink (smaller min-height) so bar + CTA stay
  inside the clipped 100vh hero. Portrait phones, the overwhelming case for
  this funnel's ad traffic, fit without it.

Implementation: one new component file `HeroVideo.jsx` (ui/) exporting the
desktop card + mobile bar/overlay, reusing the founder section's video
mechanics: `pickVideoSource(video, videoMobile)`, `maxPreload`, poster,
`controls` once started, `playsInline`, rewind-and-reset on end. Content comes
from the existing CMS founder fields — no new admin fields.

Preload: the desktop card is the page's headline act, so it preloads via the
existing connection-aware `maxPreload()` — but ONLY when the desktop media
query actually matches at mount (`window.matchMedia('(min-width: 901px)')`,
read once): a `display: none` video still fetches, so on phones the card's
video element is simply not mounted at all. (A resize across the breakpoint
mid-visit falls back to click-to-load; acceptable.)

Bundle honesty (Codex finding 4): the component ships in the shared bundle (a
few KB of JS/CSS) — off `/preview` it renders nothing, so the page's DOM and
behavior are unchanged, but "byte-for-byte identical bundle" is not claimed.
No dynamic chunk: the code is small and becomes permanent at rollout anyway.

## Who Am I section (in the new layout)

The portrait/video card column is removed (the video now lives in the hero;
keeping a second copy mid-page is redundant). The text keeps its position in
the page order but spans the full section: `founder-grid--solo` modifier sets
the grid to one column with the text in the existing reading measure, centred
block, keeping the radial scrim and text shadows that make it legible over the
painting. Eyebrow, heading, signature and the CTA band stay exactly as they
are. The CMS founder fields all still apply (paragraphs, heading, signature);
the portrait and video fields simply stop rendering mid-page once the flag is
global (they still feed the hero card).

## What deliberately does NOT change

- No new admin fields, no API change. The ONLY content edit is the
  `founder.video` path correction described at the top (a bug fix that
  stands on its own).
- Variant pages, attribution, analytics, the application flow: untouched.
- The default hero everywhere except `/preview` is byte-for-byte the same
  markup as today while the flag is path-gated.

## Smoke tests

- Founder video plays again on `/` desktop (the path fix, today's live bug).
- `/` and `/physical` render exactly as today otherwise (flag off).
- `/preview` desktop: video card centred over the right half above film and
  vignette, one click plays with sound, controls appear, left column and CTA
  untouched, scroll cue intact.
- `/preview` mobile width: play bar sits between verse and CTA, everything
  fits a ~844px phone viewport; tap opens the fullscreen overlay, video plays
  with sound, close returns to the hero; no video bytes fetched before tap.
- `/preview` founder section: no portrait card, full-width text, scrim intact.
- `/preview?utm_source=x` attribution captured; `preview` never becomes a
  vanity campaign; Add Page rejects the name "preview".
- Build passes; off-preview DOM unchanged.

## Rollout after approval

Flip `HERO_VIDEO` to `true` (drop the path gate). `/preview` then renders
identically to `/` and the link can be retired or left; `preview` stays in
SYSTEM_PATHS either way.
