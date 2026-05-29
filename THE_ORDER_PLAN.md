# THE ORDER — Site Plan

**Status:** v1 first draft BUILT. Iterating from here.

**Run locally:**
```
npm install
npm run dev
```
Then open http://localhost:5173

**Build for prod:**
```
npm run build
npm run preview
```

Edit this file as the spec. Code is in `src/`.

---

## 1. Brand summary

**Name:** The Order (sometimes referred to internally as "The Monastery")
**What it is:** Mentoring / mastermind for men, with in-person events as part of the vision (not yet defined in detail). Offer will be co-designed with the early cohort.
**Founder:** Named, but Order-first. Appears late, briefly, signs the manifesto. Not the face of the brand.
**Audience:** Men 23–33 (we don't say this on the site). Older accepted case-by-case. Internet-native, post-Tate/Jocko/Peterson saturation, allergic to clichéd "alpha" tropes, hungry for substance.
**Price:** ~$3k. Not public on the site.
**Application outcome:** Application → reviewed → vetting call **if approved.** Most won't hear back. Silence is the test.

## 2. Positioning

- **Identity, not benefits.** The page sells the man being recruited, not the deliverables.
- **Selection by character, not wealth.** *Implicit only* — never stated as a pull quote. Permeates copy.
- **Brotherhood + becoming = the value.** Surrounded by men who will not let you slip. The man you will be when this is done.
- **Founding-cohort frame = secondary thread.** One paragraph, mid-page, never repeated.
- **Anti-position by genre, not by name.** "Hustle culture." "Influencer masculinity." "Therapy without action." "Weekend retreats that change nothing." Never names individuals.

## 3. Voice

- Stoic / disciplined / spartan. Restrained. Short sentences. Periods.
- No exclamation marks. No emojis. Latin sparingly.
- Western / classical tradition lightly reverent — *the saints, the ancients, Christendom, Marcus Aurelius* are on-table. Never preachy.
- Founder's existing voice TBD — placeholder voice used until his material arrives, then re-voice flagged blocks.

## 4. Page architecture (v2)

Top to bottom:

| # | Section | Purpose |
|---|---|---|
| 0 | **Header** | Logo only. Fades in on scroll past hero. No nav. |
| 1 | **Hero** | Identity declaration. *The Round Table* showpiece (see §8). CTA: "Apply for Consideration." Restraint line below: *"Most who apply will not be considered."* |
| 2 | **The Truth** | Names the modern masculine condition. 3 short paragraphs max. Ends in a turn. Anti-position by implication, not naming. |
| 3 | **The Code** | Three principles. Roman numerals. One line each. Engraved typography. The most screenshottable thing on the site. |
| 4 | **What You Become** | Real value: brothers + becoming. Three blocks: *The brothers. The man. The order.* Founding-cohort whisper lives in block 3 — one paragraph, never repeated. |
| 5 | **Who Is Considered** | Short. One or two lines per type. "This is for the man who…" + "This is not for the man who…" Restrained — not a long list. |
| 6 | **The Application** | 5 steps. All choice-based except contact. Embedded inline, not a route. |
| 7 | **[ Founder — template slot ]** | Designed slot. Lorem-style placeholder. Two-column. Ready to receive founder copy + portrait when available. |
| 8 | **[ Evidence — template slot ]** | Designed quote grid, 3 cards. Each card *"Testimony pending."* Looks real, fills later. Removable via flag if launching without it. |
| 9 | **FAQ** | 5 questions max. Reframed as questions a serious applicant asks himself. Includes the cross/religion question and the cost question. |
| 10 | **Footer** | Minimal. Copyright. Privacy. One restraint line: *"The Order does not advertise. We do not chase. The right men find us."* |

**Dropped vs prior reference sites (Jeff / Tobias):**
- Testimonial carousel (no real testimonials)
- Social proof image strip
- Stats row
- Hero video
- Trust badges below hero CTA
- Calendly booking iframe (invite-only kills it)
- Bottom CTA bar with urgency theater
- Floating particles / btnShine / pulse-glow / ambient orbs (loud motion — wrong for stoic)
- "Personalized guidance / No obligation / Takes 2 minutes" trust line
- Sticky mobile bottom CTA

## 5. Section detail

### Hero
- Full-viewport. Dark.
- **Showpiece:** The Round Table (see §8).
- Headline: TBD — candidates in §11.
- Subhead: short.
- CTA: *Apply for Consideration* — scrolls to §6.
- Restraint line: *Most who apply will not be considered.*

### The Truth
- Three short paragraphs. Names the modern masculine condition by texture, not lecture.
- Reads in 20 seconds. Ends in a turn that points at the reader.
- Anti-positioning by implication: the genre of "men's content" the reader has already consumed and found wanting.

### The Code
- **Three principles.** One line each. Roman numerals.
- Engraved typography reveal — characters fill stroke-by-stroke as the section enters view.
- Candidates in §10.
- Background: parchment-grain texture, deep cordovan undertone.

### What You Become
Three blocks, not a checkmark grid:
1. **The brothers** — men around you who will not let you slip. Real council. Real consequences for breaking your word. Not a Discord. Not a forum.
2. **The man** — the body, the mind, the habits, the standard. The you that will be there in five years if you do not move now.
3. **The order** — *one paragraph only* — the founding-cohort whisper. The Order is being built. The first to be admitted will shape what it becomes. After them, no one will.

### Who Is Considered
Short. Two lines. No long bullet lists.
- *This is for the man who is willing to be tested.*
- *This is not for the man who wants results without sacrifice.*
(Final wording TBD — these are placeholders.)

### The Application
5 steps. See §6 below.

### Founder — template slot
Two-column. Left: image frame with the journaling/desk panel from the Saturday infographic as visual placeholder, labeled *"FOUNDER PORTRAIT — to be added."* Right: three short paragraph slots with lorem placeholder. Bottom: italic signature line *"— [Founder name], [Founding year]."*

### Evidence — template slot
Three quote cards in a row. Each card: a quote slot, attribution line *"[ Name — admitted [year] ]"*, and a faint italic *"Testimony pending."* Section unmounts via single flag if not wanted at launch.

### FAQ
5 questions max. Reframed as questions a serious applicant asks himself. Working list:
1. *How long will I be considered?* — answer: silence is the form of the answer. If you are to advance, you will be contacted.
2. *What if I am not accepted?* — answer: most are not. The application is itself a test.
3. *Is this a religious order?* — answer: the cross is the symbol of the Western tradition we draw from. It is not a requirement of faith.
4. *What does it cost?* — answer: cost is not discussed publicly. Cost is not the test.
5. *How is this different from other men's programs?* — answer: brief, restrained, by implication.

### Footer
- Logo (small)
- © The Order
- Privacy (links to wayfindercollective.io/privacy)
- One restraint line: *The Order does not advertise. We do not chase. The right men find us.*

## 6. The Application — 5 steps

| # | Field | Type | On-screen wording (placeholder) | Wayfinder value strings |
|---|---|---|---|---|
| 1 | `mainChallenge` | **Choice**, not scored | *"What brings you here?"* — 5 single-line options (e.g. *No direction. / No brothers. / I have grown soft. / I am stuck. / I am ready, and I do not know the way.*) | Stored as `rawResponses` — any string OK |
| 2 | `commitment` | Choice, scored | Reframed to integrity, not productivity | Wayfinder-required strings sent verbatim |
| 3 | `readiness` | Choice, scored | Reframed to urgency of becoming | Wayfinder-required strings sent verbatim |
| 4 | `income` | Choice, scored | *"What is your current monthly income?"* — direct, no dressing | `$100k+ Per Month` → `$0-1k Per Month` (six tiers, exact strings) |
| 5 | Contact | `fullName` / `email` / `phone` / `smsConsent` | International phone dropdown, US/CA/UK pinned. Email regex, per-country digit validation. | SMS consent line names "Wayfinder Coaching" (parent brand, TCPA-compliant). |

**Mechanics (verbatim from Jeff handoff):**
- One question per slide. Embedded inline, not a route.
- Progress bar with shimmer overlay at top.
- Choice questions auto-advance ~300ms after selection.
- Open text / contact require manual advance.
- Typewriter effect on question text (~12ms/char), subtitle (~9ms/char). Respects `prefers-reduced-motion`.
- Back button on every step except #1. Back clears selection.
- Keyboard: Enter advances, Shift+Enter next field within contact, Ctrl/Cmd+Enter submits.
- Smooth scroll to form on slide change (~900ms easeOutCubic).
- Slide transitions: manual fade-out → state change → fade-in (~480ms total). Not framer-motion.

## 7. Final screen (post-submit)

- Animated check + circle, slow choreography (slower than Jeff's — Order pacing).
- Headline: **"Your application is with the Council."**
- Sub: *"If you are to be considered further, you will be contacted."*
- Encouragement to begin alone: *"Until then, begin. Sit in silence each morning. Train. Read. Speak less."*
- **No booking widget. No Calendly. No timeline. No upsell. No FAQ. No social.**
- Footer minimal.

## 8. The Round Table (hero showpiece)

**Behavior:** Chairs assemble around a wooden round table **as the user scrolls** through the hero section. On first paint: empty wood floor, a few hanging brass lights. As the user scrolls, the table rises into place, then chairs slot into position one by one — first two or three on opposite sides, then the rest, then they pause with several still empty. Light moves across the wood. The camera tilts on scroll.

**Implementation:** `react-three-fiber` (Three.js wrapper). One scene, one camera, scroll-driven progress. Chairs are simple lathe-turned silhouettes. The table is a single wood disc with a turned edge. Brass pendant lights overhead. Single warm fill light.

**Asset cost:** ~150–250 kb gzipped. Acceptable for a showpiece.

**Why this works:**
- Equality among brothers (round, no head)
- Council
- Arthurian / templar tradition without being explicitly so
- The empty chairs visually communicate scarcity + founding-cohort framing without one word
- Slow, choreographed, "expensive" motion — the kind that signals craft

**Mobile fallback:** Single rendered still of the assembled table with a slow camera-pan video loop (10s, looping). React-three-fiber on mobile is workable but heavy — measure before committing.

## 9. Visual / material system — leather, metal, parchment

**Aesthetic anchors:** A. Lange & Söhne (watches), Berluti (leather), Hermès saddlery, Penguin Classics deluxe hardbacks, Filson heritage workwear. Premium luxury, honest, integrity. No chrome. No glassmorphism. No neon.

### Color tokens

| Token | Hex | Use |
|---|---|---|
| `--bg-deep` | `#0a0908` | Page background — near-black, warm undertone |
| `--surface` | `#171513` | Cards, sections lifted slightly from page |
| `--leather` | `#2a1f1a` | Deeper leather brown for textured panels |
| `--cordovan` | `#5c1f1c` | Cross red — used VERY sparingly, single accent |
| `--brass` | `#a6884a` | The gold — warmer/dirtier than chrome gold. Brass, not lacquer. |
| `--brass-light` | `#c4a45f` | Headlines, accents |
| `--parchment` | `#e8e0d0` | Body text — warm off-white, never pure white |
| `--ash` | `#7a7468` | De-emphasized text, dividers |
| `--steel` | `#3a3a3a` | Secondary borders |

### Typography

- **Display (chiseled, Roman caps):** Cinzel (free, Google Fonts). Backup: Cormorant Garamond if Cinzel reads too monumental for body-adjacent contexts.
- **Body (humanist serif, book feel):** EB Garamond (free). Alt: Crimson Pro.
- **System / monospace (form labels, FAQ counters, footer fine print):** IBM Plex Mono.
- **Tiny UI labels only (if absolutely needed):** Inter Tight at small sizes — micro and rare.
- **No sans-serif body.** No display script. No Google Sans defaults.

### Texture system

- **Leather grain** on important surfaces — applied via SVG noise overlay + multiply blend, very subtle.
- **Parchment grain** on the Code section background.
- **Brushed steel / blackened iron** for primary button surfaces.
- **Saddle-stitch dotted borders** on key cards (Berluti / Hermès reference).
- **Brass nail-head dots** at section corners — small, subtle, hand-placed feel.
- **Tooled headers** — chiseled type with embossed shadow on display headlines.

### Motion budget (revised — stoic = weighted, not absent)

- Easing: custom `cubic-bezier(0.16, 1, 0.3, 1)` — "easeOutExpo" feel, slow tail.
- Reveal duration: **800–1200ms** (vs Jeff's 400–600ms — twice as slow).
- Lenis smooth scroll site-wide.
- Page-load sigil construction over ~1.2s.
- The Code section: stroke-by-stroke engraving reveal.
- Section headers: slow light-sweep across the type.
- Section dividers: draw themselves.
- Sigil rotates ¼ turn and locks when the footer enters view.
- **Explicitly NOT shipping:** floating particles, button shimmer sweeps, pulsing CTAs, ambient orbs, marquee scrolls, hover bounces, parallax.

## 10. The Code — candidates

Pick **3** total. Strongest trio structure: one from each of the three themes below (self / brothers / oath), so the Code covers self-rule, brother-rule, and foundation. But pick freely.

### Theme A — Self / discipline
- A1. *Comfort is the slow rot.*
- A2. *Discipline is freedom.*
- A3. *What you tolerate, you become.*
- A4. *The work cannot be outsourced.*
- A5. *A man is what he does when no one watches.*

### Theme B — Brothers
- B1. *A man without brothers is a man at sea.*
- B2. *Show me your men. I will show you your future.*
- B3. *Brothers do not let brothers slip.*
- B4. *Speak less. Mean more.*

### Theme C — Oath / standard / foundation
- C1. *Your word is the foundation of your life.*
- C2. *Choose your standard. Hold it.*
- C3. *Without an oath, no man is free.*
- C4. *To bend is to break later.*

### Theme D — Classical pole (darker, optional)
- D1. *The unexamined man is owned by other men.*
- D2. *Most men live as if they will not die.*

**Default trio recommendation (if you want one):** A1 + B1 + C1.
*Comfort is the slow rot. A man without brothers is a man at sea. Your word is the foundation of your life.*

## 11. Hero headline — candidates

Pick **1.** Subhead and CTA already locked (CTA: *Apply for Consideration*. Restraint line: *Most who apply will not be considered.*). Subhead candidates listed after the headlines.

### A. Identity / posture (the man being recruited)
- A1. *Most men drift. We do not.*
- A2. *For the man who refuses to drift.*
- A3. *You know what you must become.*
- A4. *There are men. And there are men who are forged.*

### B. The table / the seat (works with the Round Table showpiece)
- B1. *Take your seat at the table.*
- B2. *A seat is being held. Earn it.*
- B3. *Most chairs at the table are still empty.*
- B4. *The chairs are not yet full.*

### C. The gate / restraint (anti-marketing)
- C1. *We do not chase. The right men find us.*
- C2. *The Order does not need you. You need the Order.*
- C3. *Apply. Be considered.*

### D. The oath / call
- D1. *You will be tested. You will be forged. You will not be alone.*
- D2. *Step out of the noise. Take the oath.*

### Subhead candidates (pair with any headline)
- S1. *A brotherhood of men committed to discipline, integrity, and becoming.*
- S2. *Discipline. Brotherhood. Purpose.* *(echoes the bottom line of the Saturday infographic)*
- S3. *An order being founded for the men who will not stay as they are.*
- S4. *(No subhead — just the headline and the restraint line.)*

**Default pick (if you want one):** B3 (*Most chairs at the table are still empty.*) paired with S2 (*Discipline. Brotherhood. Purpose.*). Reasons: B3 ties the headline to the showpiece, communicates founding-cohort scarcity without saying it, and the typography reveal hits hard. S2 echoes a piece of the brand the founder may already use.

## 12. Image plan (scatter, don't bunch)

Using current Saturday infographic panels as placeholders. One image per section, max. Upgrade to better AI gens later.

| Section | Image |
|---|---|
| Hero | Round Table 3D scene (no flat image) |
| The Truth | Man at window, dawn light (panel 1) |
| The Code | Texture only — no human image |
| What You Become — block 1 (Brothers) | Brothers at table eating (panel 5) |
| What You Become — block 2 (Man) | Boxing / sparring (panel 7) |
| What You Become — block 3 (Order) | (typography only, or library/reading panel) |
| Who Is Considered | (typography only) |
| Founder | Solo journaling at desk (panel 6) as portrait placeholder |
| Evidence | (typography only) |
| FAQ | (typography only) |
| Footer | Sigil only |

## 13. Engineering stack

- **Vite + React 18 + Tailwind v4** (Jeff's stack).
- `useInView` IntersectionObserver hook + CSS keyframes for section reveals.
- `react-three-fiber` + drei for the Round Table.
- `lenis` (Studio Freight) for smooth scroll.
- Offline-first localStorage submission pattern (Jeff's `pendingLeads.js` + `usePendingLeadsSync.js` verbatim).
- Honeypot field (silent fake-success on bot fill).
- UTM capture on mount, persist to sessionStorage.
- Last-CTA tracking via sessionStorage.
- PostHog (funnel events) + Vercel Analytics (pageviews).
- Wayfinder webhook from browser, funnel-scoped API key (Jeff pattern). **Open:** add a Vercel Edge Function as proxy to hide the key. Recommended.

## 14. Backend-less build approach (current phase)

Domain and Wayfinder funnel slug not yet provisioned. **Build proceeds without them.**

- Env vars use placeholder values (`VITE_WAYFINDER_WEBHOOK_URL=https://placeholder.invalid/replace-at-launch` etc.).
- Submit flow is fully wired — the fetch fails to a placeholder URL, falls into the offline-first retry path, saves to localStorage, advances to the success screen normally. End-user UX is identical to the live state.
- At launch: set the real env vars in Vercel. Any test leads accumulated in localStorage flush through automatically.
- PostHog also placeholder until provisioned — events fire to a no-op key, harmless.
- Admin recovery page at `?admin=pending-leads` works regardless — useful during testing.

## 15. Template slots — presentation-ready

The site is designed to be **handed to the founder for review** before everything is filled. Two placeholders are visibly templated:

- **Founder slot** — image frame says *"FOUNDER PORTRAIT — to be added."* Text says *"[Founder reflection — three short paragraphs]."* Signature line *"— [Founder name]."*
- **Evidence slot** — three quote cards say *"Testimony pending."*

Both slots use the same design language as the rest of the site so the founder sees exactly what it will become.

## 16. Still open — needed to complete the build

- **Domain** — needed only at launch / DNS step.
- **Wayfinder funnel slug** + webhook URL + API key — needed only at launch.
- **PostHog key** — needed only at launch.
- **Founder name + 1-paragraph bio** — slot is ready; insert when available.
- **Real testimonials** — slot is ready; insert when available.
- **Real photos** — current AI placeholders work; upgrade later.
- **Headline pick** — see §11.
- **Code principles pick** — see §10.
- **Final wording of Who Is Considered** — short, restrained.
- **Final wording of the application question copy** (specifically `commitment` and `readiness` framings).
- **Webhook proxy decision** — Vercel Edge Function or accept browser-side.

## 20. Image direction — Spartacus refresh (Peter feedback, 2026-05-29)

**Peter's direction:** elegant + masculine + dark; **fewer men per shot**; Spartacus-style simple attire; focus on **environments and symbolic objects**; specific iconography requested — **AK rifle, shield, sword, round wooden table, meat on a board, water in wooden cups**. "Some simple savage looking shit."

### Changes
- Reduce panel count from 10 → 6. **The Code** and **FAQ** lose their images entirely — let the Roman numerals and restraint do the work.
- New aesthetic boilerplate appended to every prompt:
  > *Cinematic dim warrior aesthetic. Stone walls, rough wood, candlelight, deep shadows. Primal, savage, masculine. Spartacus-era simplicity — no modern objects, no modern athletic gear. Warm low amber light, film grain. Realistic photography. No text, no logos. Single scene only. 16:9 aspect ratio.*
- **Start a new ChatGPT chat** for these — the previous one is style-locked to "modern athletic gym men" and will fight the new direction.

### 6 new panel prompts

Each saved as the filename in its heading. Append the boilerplate above.

**`panel-hero.jpg`** — Heavy round wooden table in a dim stone hall, lit only by candles. Three shirtless men with strong builds sit around it in shadow, eating roast meat from a wooden board, drinking water from rough wooden cups. A sword leans against the table leg. Steam rising from the meat. Primal brotherhood.

**`panel-truth.jpg`** — A lone shirtless man standing at a heavy stone window slit before dawn, looking out at misty mountains. Cold gray light. Bare stone cell behind him, no furniture beyond a wooden cot. He is alone.

**`panel-become.jpg`** — Three shirtless men running together along a misty dirt path through dark pine forest at first light. Primal silhouettes, strong builds, weighted determined expressions. Simple dark cloth wrapped at the waist — no modern athletic clothing.

**`panel-considered.jpg`** — A heavy old leather-bound book lying open on a rough wooden table, lit by a single candle. A short sword resting beside the book, blade catching the light. Stone wall in dim background. No man, no people — just the objects on the table.

**`panel-application.jpg`** — A wooden AK-47 rifle resting horizontally on a heavy rough wooden table. A single candle beside it casting amber light along the barrel. Dark stone wall behind. No man, no people — only the rifle and the candle. Disciplined stillness.

**`panel-founder.jpg`** — A lone shirtless muscular man sitting waist-deep in a heavy wooden barrel of ice water, inside a dim stone chamber. Head bowed, eyes closed. Single warm light source from a stone wall sconce. Primal, ritual.

### Wiring after Peter generates them
Save each at `public/images/[name].jpg`, then I'll update the section image refs to point at `panel-hero`, `panel-truth`, `panel-become`, `panel-considered`, `panel-application`, `panel-founder` and drop images from Code and FAQ sections.

---

## 21. CMS for Peter — single-password admin

**Goal:** Peter visits `theorder.com/admin`, logs in with a single password (no GitHub account required), edits any text or uploads any image, hits save, the site goes live in ~30 seconds.

### Architecture (Vite SPA + Vercel Functions)

```
theorder.com/                  ← public site (Vite SPA, what visitors see)
theorder.com/admin             ← editor SPA route (gated by JWT)
theorder.com/api/admin/*       ← Vercel Functions for auth, content, uploads
```

**No external CMS service.** No Decap, no Tina, no Sanity. We own the whole stack and Peter never sees GitHub.

### Content extraction (one-time refactor)

- `src/config/sectionContent.js` → `content/sections.json`
- `src/config/questions.js` → `content/questions.json`
- Section components import the JSON instead of the JS object (Vite handles JSON natively, hot reloads)
- This makes the content **a data file** that can be GET/POST'd by an API without parsing JavaScript

### API routes (Vercel Functions in `/api/`)

| Route | Method | What it does |
|---|---|---|
| `/api/admin/login` | POST | Verifies password against `ADMIN_PASSWORD` env var, returns short-lived JWT |
| `/api/admin/content` | GET | Returns current `sections.json` and `questions.json` |
| `/api/admin/content` | POST | Writes new content, commits to GitHub via Octokit, returns success |
| `/api/admin/upload` | POST | Uploads image to Vercel Blob, returns public URL |

### Auth model
- **Single password** stored in Vercel env var: `ADMIN_PASSWORD`
- POST `/api/admin/login` returns a JWT signed with `ADMIN_JWT_SECRET` (24h expiry)
- JWT stored in localStorage, sent in `Authorization: Bearer` header
- Each protected route verifies JWT before doing anything

### Image storage
- **Vercel Blob** (free tier: 1 GB) — fast object storage with public CDN URLs
- Uploaded images get a URL like `https://[hash].public.blob.vercel-storage.com/panel-hero-abc.jpg`
- That URL is written into `sections.json` instead of `/images/panel-hero.jpg`
- Old image paths (`/images/panel-*.jpg`) keep working — Blob URLs are the *new* path used after edits

### Env vars (set in Vercel)

| Name | Purpose |
|---|---|
| `ADMIN_PASSWORD` | Peter's single login password |
| `ADMIN_JWT_SECRET` | JWT signing secret (random 32-byte hex string) |
| `GITHUB_TOKEN` | Personal Access Token with `repo` scope, for committing content |
| `GITHUB_REPO` | `wayfindercollective/theorder` |
| `BLOB_READ_WRITE_TOKEN` | Vercel Blob token (auto-set when Blob is enabled) |

### Editor UI (what Peter sees at /admin)

Single-page editor with tabs:

1. **Sections** — every text slot rendered as a labeled input or textarea. Hero headline, Truth paragraphs, Code principles, Become blocks, Considered lines, FAQ Q&A, Founder paragraphs, Footer line.
2. **Application** — the 5 questions and their options. Option values (Wayfinder scoring strings) are read-only with a warning. Option labels are editable.
3. **Images** — every section image. Click thumbnail to upload a replacement.
4. **Logo** — the SVG sigil currently. If Peter uploads a logo image, we switch to render that instead.

Top of every tab: **"Save Changes"** button. After save: *"Saved. Live in ~30 seconds."*

### What's NOT in v1 of the CMS
- Multi-user / roles (single password, one editor at a time)
- Version history beyond Git's own log
- Preview-before-publish (every save is live)
- Rich text editor (plain text only — the brand is restrained, doesn't need bold/italic)

These can be added later if needed. v1 is "Peter can change anything text or visual without a developer."

### Build order
1. Refactor content into JSON files
2. Set up Vercel Functions stub (`/api/admin/login`, returns dummy success)
3. Build `/admin` login page
4. Wire login → JWT → protected routes
5. Build content editor for sections + questions
6. Add GitHub commit via Octokit
7. Add Vercel Blob image upload
8. Build images tab
9. Provision env vars in Vercel
10. Hand off password to Peter

### Time estimate
~1 day of focused work. Single dependency on Vercel Blob (free to enable in Vercel dashboard).

---

## 18. Hero film — the cinematic asset spec

The hero showpiece is now an image/video sequence, not a 3D scene. The 3D round table was killed in v1.2 — too brittle, looked crude without proper assets, and the audience would see "WebGL render" not "premium". A cinematic AI-generated film is the right vehicle.

### What the scene depicts

Camera at table-level, **horizontal**. Looking across a heavy round wooden table. **Back of an empty wooden chair fills the lower foreground.** Across the table: **5–6 muscular men already seated** — calm, weighted, dimly lit, some with arm tattoos, some smiling slightly, all engaged in the moment. Brass pendant lights hang above the table, throwing warm down-light. Deep shadows. Wood paneling. Aesthetic: closer to a low-key Peaky Blinders / Godfather / heritage members' club than a corporate boardroom. Cinematic film grain.

As the user scrolls through the hero, the camera **moves forward** toward the table. A man's silhouette enters the lower frame (back of head/shoulders), **sits down in the chair**, and **pulls the chair in** until he's at the table with the others.

Final composition: viewer is looking over the new man's shoulder at the brothers across the table.

### Three implementation paths (pick one)

#### Option 1 — Sora / Veo3 / Runway video (RECOMMENDED)
Single short MP4. Best quality, smoothest result.

- Length: **5–8 seconds**
- Resolution: **1920×1080**, h.264, ~2–4 MB
- Soundless. No music.
- Drop at `/public/hero/film.mp4`. Optionally poster at `/public/hero/poster.jpg`.
- Set in `src/config/sectionContent.js`:
  ```js
  export const heroFilm = {
    video: { src: '/hero/film.mp4', poster: '/hero/poster.jpg' },
    frames: [],
  }
  ```
- The site scroll-scrubs `currentTime` against scroll progress automatically.

**Sora prompt to start from (refine to taste):**
> *Cinematic first-person POV. A dimly lit, wood-paneled room with brass pendant lights hanging above a heavy round wooden table. Five muscular men sit at the table across from the camera — calm and weighted, some with arm tattoos, some with quiet half-smiles, all relaxed but present. The shot begins with the back of an empty wooden chair filling the lower foreground. Over six seconds, the camera glides forward toward the table; a man's silhouette enters from below — he sits in the chair and pulls it forward into position at the table. Final composition: over-the-shoulder of the seated man, the other men visible across the table. Warm low-key lighting, brass reflections on wood, deep shadows. Film grain. Soundless. No camera shake.*

#### Option 2 — Midjourney / DALL-E image sequence
4–8 stills crossfaded as user scrolls. More flexible than video — easy to swap one frame at a time. Continuity between frames is the hard part (same room, same men, same lighting).

- Aspect ratio: **16:9** (or 21:9 for more cinematic)
- Drop at `/public/hero/01.jpg`, `02.jpg`, etc.
- Set in `src/config/sectionContent.js`:
  ```js
  export const heroFilm = {
    video: null,
    frames: [
      { src: '/hero/01.jpg' },
      { src: '/hero/02.jpg' },
      { src: '/hero/03.jpg' },
      { src: '/hero/04.jpg' },
      { src: '/hero/05.jpg' },
      { src: '/hero/06.jpg' },
    ],
  }
  ```

**Frame-by-frame prompts (Midjourney v6/v7):**
- **Frame 01** (scroll 0%) — establishing: *Cinematic wide shot. Dimly lit wood-paneled room. Heavy round wooden table seen from chair height. Brass pendant lights overhead, warm down-light. The back of an empty wooden chair fills the lower foreground. Across the table, five muscular men sit calmly — some with arm tattoos, some half-smiling, all weighted and present. Deep shadows, film grain. --ar 16:9 --style raw*
- **Frame 02** (scroll 20%) — camera begins to move forward; chair starts to draw nearer to the table.
- **Frame 03** (scroll 40%) — a man's silhouette enters from below the chair; he is about to sit.
- **Frame 04** (scroll 60%) — man partially seated, hands gripping the chair seat.
- **Frame 05** (scroll 80%) — chair pulled most of the way in, the seated man's shoulders fill the lower foreground.
- **Frame 06** (scroll 100%) — final composition: over-the-shoulder of seated man, brothers visible across the table.

Use `--cref` or `--sref` on Midjourney v6/v7 to lock character & style across frames.

#### Option 3 — Hybrid: one strong still + slow Ken-Burns
If neither of the above is feasible quickly, ship with a SINGLE cinematic still (Frame 06 above) and apply a subtle CSS scale-in. Lower craft ceiling but presentable. Set `heroFilm.frames` with one image; the crossfade machinery handles a single frame as a static.

### What the site does today
With `heroFilm.video = null` and `heroFilm.frames = []`, the hero shows a clean dark placeholder labeled *"[ Hero film — to be added ]"* at the bottom. Headline and CTA layer on top. As soon as the asset arrives, drop it in `/public/hero/` and update `heroFilm` — no other code changes needed.

### Reference imagery
Original Saturday-at-the-Monastery infographic panels — particularly the "brothers at table eating" panel — establish the visual register: dim, warm, low-key, masculine, real-feeling. Use those as Midjourney style references via `--sref`.

## 19. Build sequence (when greenlit)

1. Scaffold Vite + React + Tailwind v4. Wire CSS tokens, fonts.
2. Build the Round Table scene in react-three-fiber. Confirm performance on mid-range Android. (Hardest single piece — do it first.)
3. Build the questionnaire (ApplicationSection). End-to-end submit → localStorage → success screen. Use placeholder Wayfinder URL.
4. Build sections top-down: Hero → Truth → Code → Become → Who → Application → Founder slot → Evidence slot → FAQ → Footer.
5. PostHog event wiring.
6. Honeypot, UTM, last-CTA capture.
7. Accessibility pass: `prefers-reduced-motion`, focus-visible, keyboard nav, axe scan.
8. Mobile pass on a real device.
9. Plan file gets updated with final wording for everything before final code commit.
10. Deploy to Vercel preview with placeholder env vars.
11. Launch: domain + Wayfinder env vars + PostHog key → live.
