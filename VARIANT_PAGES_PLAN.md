# Variant Landing Pages Plan

Seven copies of the landing page, same design, same images, same flow, different words. Each lives at its own URL and each one's text is edited independently in /admin. The root page stays exactly as it is.

Status: BUILT (v1, 2026-08-12). Codex peer review: round 1 findings addressed in revision 2, round 2 returned no defect-level findings.
Build scope for v1: two variants only, `/physical` and `/financial`.

One deviation found during build: `declineScreen` moved from the variant allowlist to SHARED. Its text is edited in the Application tab alongside the questions and filter, and that whole flow is shared across pages; a per-variant copy would have been uneditable per variant.

## The seven focus areas

| Area | URL (proposed) | v1 |
|---|---|---|
| Physical / health / physique | `/physical` | YES |
| Financial / making money / wealth / abundance | `/financial` | YES |
| Relationships / social | `/relationships` | later |
| Primal / adventure | `/primal` | later |
| Mental / clarity / purpose | `/mental` | later |
| Emotional | `/emotional` | later |
| Spiritual | `/spiritual` | later |

Slugs are one word, lowercase, and become permanent once ads point at them. Alternatives if preferred: `/wealth` instead of `/financial`, `/body` instead of `/physical`.

## Single source of truth: the variant field allowlist

One new module, `src/config/variantFields.js`, holds:

- `VARIANT_SLUGS`: the slug allowlist.
- `VARIANT_FIELDS`: the literal list of field paths a variant may own.

This ONE list drives all four consumers, so they can never disagree:
1. the seed script that creates each variant file,
2. the runtime merge in `sectionContent.js`,
3. which fields the admin shows when a variant page is selected,
4. server-side validation: the API rebuilds the stored variant strictly from these paths, so nothing else can ever persist in a variant file, whether it arrived in a payload or was already sitting in the file.

It is plain JS with no JSX so both the Vite bundle and the serverless functions import it.

### The literal allowlist

Everything below is exactly the set of non-video fields SectionsTab exposes for these sections, no prose approximations:

```
hero:            eyebrow, headline, verseLine, cta, restraint, scrollLabel
truth:           eyebrow, provocation
code:            eyebrow, heading, intro, valuesLabel, values
principles:      eyebrow
become:          eyebrow, heading, offerings, offeringsSize, offeringsColumns, closing
considered:      eyebrow, heading, for_, not
faq:             eyebrow, heading, questions
howWeOperate:    eyebrow, heading, paragraphs[0..6], pullQuote
founder:         eyebrow, heading, placeholderMark, templatedLabel, videoLabel,
                 paragraphs[0..3], signature
closing:         wordmark, verses[0].text, verses[0].ref, verses[1].text, verses[1].ref
cta:             label
application:     eyebrow, stepLabel, backButton
qualifiedScreen: heading, sub, videoLabel, message, note, button
```

(`declineScreen` is shared, see the deviation note at the top.)

Notes:
- `offeringsSize` and `offeringsColumns` are presentation dropdowns, not prose, but they stay per variant on purpose: a variant's offerings list will differ in length and needs its own fit. They are constrained-value selects, so no asset risk.
- `qualifiedScreen.instagramHandle` and `instagramUrl` stay SHARED: one DM target for the whole funnel.
- Every image, video, poster, and mobile-video key (`image`, `portrait`, `video`, `videoMobile`, `poster`, `bgImage`, `frames`, `logo`, and any future sibling) is excluded by construction: the allowlist is a whitelist, there is no blacklist to keep in sync.

**Always shared with the main site:** all images and videos, testimonials (whole `evidence` section), application form questions and filter (`questions.json`), `brand`, `heroFilm`, `footer`, `consent`, `commitmentGate`, `finalScreen` (the private `/application` routes are shared by construction, reached after the Instagram DM), and `meta`. On `meta`: the live title/description/OG tags are hard-coded in `index.html` and the CMS `meta` block is not currently applied anywhere; that stays as is and is out of scope here.

## Content model

```
content/sections.json              <- main site, unchanged
content/variants/physical.json     <- allowlisted fields only, full copy
content/variants/financial.json
```

- Each variant file is seeded from the current live copy at creation (script: walk `VARIANT_FIELDS`, copy values from `sections.json`). From day one the variant reads identically to the root page; Nico then rewrites lines in /admin. Nothing ever looks broken while copy is in progress.
- Runtime merge in `sectionContent.js`, per section: `merged.hero = { ...base.hero, ...variant.hero }` etc. Variant values win where present; every non-allowlisted key (all assets) only ever exists on the base side.

## Routing and delivery

No router is added. Any unrecognised single-segment path already renders the landing page (that is how vanity links work), so `/physical` already serves the page; the only change is which content it reads.

- `sectionContent.js` reads `window.location.pathname` once at module load, normalises it (trim slashes, lowercase), and if it matches `VARIANT_SLUGS` and a variant file exists, merges it over base before exporting the same named exports as today. **Zero section components change.**
- Variant JSONs are bundled via `import.meta.glob('.../content/variants/*.json', { eager: true })`. Text-only files are ~3 KB gzipped each; all seven would cost under ~25 KB. Lazy chunks are a future option, not worth async risk now.
- `vercel.json` rewrite already sends every non-api path to `index.html`. No change.
- Acceptance criterion for the root page: behavioral and visual equivalence at `/` (the bundle necessarily changes; the rendered output and behavior must not).

## UTM and attribution (the part we must not break)

Current behavior: a clean single-segment path like `/some-video` is read as a vanity campaign slug (`utm_campaign=some-video`, source/medium defaulting to youtube/video) unless the path is in `RESERVED_PATHS` in `src/lib/utm.js`.

1. Add all seven slugs to `RESERVED_PATHS` in the v1 commit, including the five not yet built. Rationale: these are our own future page names; letting them attribute as vanity "campaigns" in the interim would contaminate campaign reporting with fake campaign names, and flipping a path's attribution meaning mid-flight later is exactly the instability we want to avoid. The five unbuilt slugs simply render the main site until their content ships.
2. Explicit `?utm_*` params on variant URLs keep working exactly as today; nothing in the capture path changes.
3. The Meta pixel PageView already carries the full URL, so Meta reports per landing path with no extra work from us.
4. `session_start` gains a `landing_variant` prop, derived fresh from the current pathname at event time (NOT read back from the first-touch attribution store, so a visitor who saw `/physical` last week and `/financial` today is labelled `financial` today). No separate first-touch variant field: nothing consumes it since the funnel stopped posting leads, and the write-once store should not grow speculative keys.
5. `landing_variant` is added to `META_BLOCKED_PROPS` in `analytics.js`. It flows to PostHog and GA4 only. Meta already sees the URL via PageView, but our own event props must not name health or wealth focus areas per the existing Business Tools guardrail.
6. One-time check before launch: confirm `/physical` and `/financial` were never used as vanity campaign links (they were not; vanity slugs are video names), since previously persisted first-touch `utm_campaign` values are write-once and would survive the reservation.

Rule for ads: links to variant pages carry explicit `utm_` params as usual, e.g. `theorder.global/physical?utm_source=ig&utm_campaign=physical-launch`. The path no longer doubles as a campaign name.

## Admin

- The Sections tab gets a **Page selector** at the top: `Main Site | Physical | Financial`. Same layout and jump chips, scoped to the selected page.
- When a variant is selected, SECTION_DEFS is filtered through `VARIANT_FIELDS`: only variant-owned sections appear, and within them only allowlisted fields. The two video fields (founder, qualified screen) and the shared Instagram fields render as a one-line note: "Shared with the main site, edit them there."
- Every other tab (Application, Testimonials, Images, Library, Logo, Signature) is untouched and always edits shared content.
- Draft state grows a `variants` key. Dirty tracking, the beforeunload guard, Ctrl+S, restore banner and deploy badge extend over it.
- The draft-restore fingerprint (currently JSON length + first 64 chars, collision-prone once variants push real differences past char 64) is upgraded to a proper full-content hash (djb2 over the serialized JSON). Same restore UX, sound comparison.

## API and save semantics

`/api/admin/content` extends, same auth, same GitHub commit flow:

- **GET** additionally returns `variants: { physical: {...}, financial: {...} }`. A variant file that is missing or unparseable returns `null` for that slug instead of failing the whole GET; the editor then seeds that variant's draft from the base sections filtered through `VARIANT_FIELDS` (clean, not dirty), and the file is created on first save. This is also the path by which variants 3 to 7 get added later: add the slug, done.
- **POST** accepts `variants: { slug: data }`. Slugs validate against `VARIANT_SLUGS`. Each file is written with the existing conflict-retry flow; the stored result is REBUILT from `VARIANT_FIELDS` applied over the merged content (merge first, then whitelist-rebuild), then passed through the existing rich-text sanitiser for the rich paths it contains. Nothing outside the allowlist can persist, regardless of what the payload or the existing file contained.
- **The client sends only changed files.** `AdminEditor` diffs each piece (sections, questions, each variant) against the loaded baseline and the save payload includes only the dirty ones. Today's client always posts both `sections` and `questions` (two commits per save even for a one-word edit); this change fixes that too. Typical save = one file = one commit = one deploy.
- **Partial failure:** writes run sequentially; the response reports per-file results (`written: [...]`, and on error, which file failed). The editor keeps the draft dirty on any failure, so retry re-sends; re-committing an already-saved identical file is harmless. No git-tree batching: with single-file saves being the overwhelmingly common case, that machinery is not warranted.
- Commit messages: `cms: update physical variant` etc.

## Copy

Per our working split: variants ship seeded with the current approved copy verbatim; Nathan/Nico rewrite the area-specific lines in /admin. No invented copy in the build.

## Edge cases covered

- A slug in `VARIANT_SLUGS` with no JSON file renders the plain main site (runtime) and seeds from base in the editor (admin).
- Trailing slashes and case: `/Physical/` matches `physical`, same normalisation the vanity reader uses.
- A variant save cannot touch `sections.json`, `questions.json`, or another variant (dirty-only payload + per-file writes).
- `mergeKeepingUnknown` still protects base saves; variant saves get the stronger whitelist-rebuild instead.
- Root page behavior at `/` is unchanged aside from a Set lookup during content module init.

## Build steps (one pass)

1. `src/config/variantFields.js`: `VARIANT_SLUGS` + `VARIANT_FIELDS` + helpers (pick fields from a sections object, merge variant over base).
2. Seed `content/variants/physical.json` and `financial.json` from current `sections.json` via the allowlist.
3. `sectionContent.js`: slug detection + merge.
4. `utm.js`: seven slugs into `RESERVED_PATHS`. `analytics.js`: `landing_variant` on `session_start`, added to `META_BLOCKED_PROPS`.
5. API: GET/POST variants in `api/admin/content.js` with whitelist-rebuild + sanitise; null-on-missing GET behavior.
6. Admin: page selector + field filtering in SectionsTab; dirty-per-file diffing, variant draft plumbing, hash fingerprint in AdminEditor; `saveContent` sends only changed files.
7. Smoke tests.

## Smoke tests

- `/` renders identically to production today (visual pass over every section).
- `/physical` and `/financial` render the seeded copy; `/Physical/` too.
- `/primal` (reserved, unbuilt) renders the main site, and neither it nor `/physical` writes a vanity `utm_campaign`.
- `/physical?utm_source=ig&utm_campaign=x` captures those params intact.
- Edit one field on Physical in /admin, save: commit touches ONLY `content/variants/physical.json`; deploy badge goes green; `/physical` shows the edit; `/` and `/financial` unchanged.
- Edit a main-site field, save: only `sections.json` committed; variants unchanged.
- Manually POST a variant payload containing `founder.video` and `truth.image`: neither survives in the stored file.
- A rich-text variant field (e.g. `code.intro`) round-trips through the sanitiser.
- `session_start` on `/physical` carries `landing_variant: "physical"` in PostHog/GA4 and the prop is absent from the Meta event.
- Visit `/physical` then `/financial`: second session event says `financial`.

## Open questions

1. Application questions shared across variants? (assumed yes)
2. Slug names locked as the table above? (`/financial` vs `/wealth` is the only real toss-up)
3. Testimonials shared? (assumed yes, edited once in the Testimonials tab)
4. Founder section: text per variant so Nico can angle his story per area, video shared. Right call, or fully shared?
