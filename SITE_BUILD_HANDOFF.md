# Handoff: Build a Wayfinder funnel site (the "The Order" pattern)

> Paste the body of this document into the new funnel project's Claude Code session,
> together with **ADMIN_CMS_HANDOFF.md** (the companion doc covering the /admin CMS in
> detail). This doc describes the proven overall stack and build process from
> **The Order** (theorder.global) — the third site in this lineage after Jeff Allen and
> Tobias & Abby Richter. **Replicate the mechanism exactly; adapt only the content,
> sections, and visual design to the new client.**

## What we're building

A single-page scrolling funnel site for a coach:

- Long-form sales page made of stacked full-width **sections** (hero → story/authority
  sections → evidence/testimonials → FAQ → application → closing → footer).
- An embedded **multi-step application form** whose scored answers post to the
  **Wayfinder OS** CRM webhook.
- A **/admin CMS** so the client edits every string and image themselves
  (see ADMIN_CMS_HANDOFF.md — build that too).
- No database, no external CMS, no backend beyond a handful of Vercel serverless
  functions. Content is JSON in the repo; saving in /admin is a GitHub commit that
  triggers a Vercel redeploy.

## Tech stack (use exactly this)

| Layer | Choice | Notes |
|---|---|---|
| Build | **Vite 5** | plain JS + JSX, **no TypeScript**, `"type": "module"` |
| UI | **React 18** | SPA, **no router** — route branching by `window.location.pathname` in `App.jsx` |
| Styling | **Tailwind CSS 4** (`@tailwindcss/postcss`) + one `src/styles/globals.css` | custom classes for the site's typography/texture live in globals.css |
| Smooth scroll | **lenis** | via a `useLenis` hook |
| Analytics | **posthog-js**, optional | thin wrapper `src/lib/analytics.js`; every call is a no-op unless `VITE_POSTHOG_KEY` is set; lazy-imported so it's not in the critical bundle |
| Hosting | **Vercel** | static build + serverless functions under `api/`; SPA rewrite in `vercel.json` |
| Images (runtime) | **Vercel Blob** | uploads from /admin, client-side WebP optimization first |
| Content storage | **GitHub Contents API** (`@octokit/rest`) | the repo IS the database; git history IS version history |
| Admin auth | **jose** (JWT, HS256) | single shared password → 24h token |
| Image tooling (build-time) | **sharp** in `scripts/*.mjs` | one-off processing scripts (crops, OG image, optimization), run by hand via npm scripts |

`vercel.json` (copy verbatim):
```json
{
  "functions": { "api/**/*.js": { "memory": 1024, "maxDuration": 15 } },
  "rewrites": [{ "source": "/((?!api/).*)", "destination": "/index.html" }]
}
```

## Repo layout

```
content/
  sections.json        ← every editable string/image URL, grouped by section
  questions.json       ← application questions + locked scoring values
src/
  main.jsx, App.jsx    ← App.jsx branches: /admin → AdminApp (lazy), else PublicSite
  components/
    sections/          ← ONE component per page section, composed in order in App.jsx
    ui/                ← shared pieces: CtaButton, QuestionSlide, FinalScreen,
                         SectionPainting (background art), PendingLeadsAdmin, …
  config/
    sectionContent.js  ← imports content/sections.json, re-exports named consts
                         (heroContent, faqContent, …). Components ONLY read from here.
    questions.js       ← re-exports questions.json
    design.js          ← layout tokens (e.g. which side the section art sits on)
    countryCodes.js    ← phone country picker data
  hooks/               ← useInView (scroll-reveal), useLenis, useScrollToForm,
                         usePendingLeadsSync (retry queue flush)
  lib/                 ← markdown.js (tiny safe renderer — see CMS doc),
                         analytics.js, utm.js, phone.js, submitLead.js,
                         pendingLeads.js
  admin/               ← the /admin CMS (see ADMIN_CMS_HANDOFF.md)
  styles/globals.css
api/                   ← Vercel functions (auth, content read/write, images,
                         deploy status — see ADMIN_CMS_HANDOFF.md)
scripts/               ← sharp-based one-off image scripts
public/                ← favicons, og image, robots.txt, sitemap.xml
```

## Architecture rules that made this work

1. **All copy lives in `content/sections.json`; all behavior lives in components.**
   Components never hard-code a visible string — they read named exports from
   `src/config/sectionContent.js`. This is what makes the /admin CMS possible, and it
   enforces the copy/layout split (see "Process" below).
2. **One component per section**, stacked in `App.jsx`. Hiding a section = commenting
   out one line. Each section is self-contained (its own content object, its own
   background art slot).
3. **Markdown-ish rich text** in content fields, rendered by the tiny escaping renderer
   in `src/lib/markdown.js` (bold/italic/links/line-breaks only; it doubles as the XSS
   guard). Same renderer on the public site and in the admin preview.
4. **Scroll-reveal via `useInView`** (IntersectionObserver), smooth scroll via Lenis,
   `useScrollToForm` for every CTA button → the application section.
5. **Admin and other tools are lazy-loaded routes** (`lazy(() => import(...))`) so the
   public bundle never includes them.

## The application form + Wayfinder OS lead wiring

This is the money path — build it exactly like this (full detail lives in the source
repo's `WAYFINDER_WIRING.md`; key points below):

- Multi-step slides (`QuestionSlide`), scored multiple-choice questions from
  `questions.json`, then contact details, then always advance to a `FinalScreen`
  confirmation **regardless of webhook success** (never strand a lead on an error).
- **POST to the Wayfinder funnel webhook** with `Authorization: Bearer <key>` from
  `VITE_WAYFINDER_API_KEY` (browser-side per-funnel key is acceptable — it can only
  create leads).
- **Send the scored answers in BOTH shapes**: flat top-level fields AND nested in a
  `responses` object. The two Wayfinder handler generations disagree; sending both is
  free and whichever the handler reads wins.
- **SMS consent → send all three fields**: `smsConsent`, `smsConsentMarketing`,
  `smsConsentOperational`.
- **`phone` must be a string** (never an object). Use `src/lib/phone.js`
  `normalizePhone(raw, country)` — handles pasted `+…` internationals, duplicated
  country codes, UK trunk-0. Copy it verbatim.
- **Offline resilience**: `pendingLeads.js` queues the payload in localStorage
  (namespaced key, e.g. `<site>_pending_leads`) with a `pendingId` generated once and
  reused on every retry; `usePendingLeadsSync` flushes the queue on load. Save-before-
  fetch ordering, 30s syncing lock. `?admin=pending-leads` shows a hidden queue viewer.
- **Honeypot**: an invisible `company` field; bots that fill it are dropped.
- **UTM capture-once** (`utm.js`) on first landing, attached to the payload.
- Env vars: `VITE_WAYFINDER_API_KEY`, `VITE_FUNNEL_SLUG`, `VITE_SITE_DOMAIN`.
- **Verify with a real scored test lead before launch** — wrong payload shape fails
  silently (200 OK, score 0, no HOT routing). Check the lead lands in Wayfinder with
  the right score, phone, and consent flags.

## Process (this is how we got a good result — follow it)

1. **Plan first, build second.** Write a thorough plan document
   (`THE_ORDER_PLAN.md`-style) covering section list, layout per section, content
   schema, and art direction. Iterate on the plan with me until locked, THEN build.
   The goal is to one-shot the build from the plan.
2. **I write the words; you build the frame.** Deliver layout, typography, spacing,
   and elegance with **bracketed placeholder slots** (`[HEADLINE — 6-10 words about X]`)
   wherever final copy doesn't exist yet. Do not invent finished marketing copy — the
   real copy comes from me/the client and goes in via /admin or a JSON edit.
3. **One consistent art direction**, decided up front, applied to every section — for
   The Order it was "one giant dark oil painting" as the background treatment. Pick the
   equivalent single visual language for this client and hold it everywhere.
4. **Every admin field gets a plain-English hint** for the non-technical client.
5. **Verify end-to-end before calling anything done**: real edit in /admin → commit →
   redeploy → change visible; real test lead → visible in Wayfinder with correct score.

## Gotchas (learned the hard way on The Order)

- **`VITE_*` env vars are baked at build time.** Setting one in Vercel does nothing
  until the next deployment, and it must be set for the environment being built
  (Production AND Preview). We lost days to a missing `Authorization` header because
  the key wasn't injected at build.
- **/admin saves overwrite `content/*.json` wholesale.** Any repo-side edit to
  `sections.json` that isn't ALSO in the client's current admin state gets silently
  reverted on their next save. Rule: structural/behavioral things go in components;
  only true content goes in JSON. If content must be edited repo-side, tell the client
  to reload /admin before their next save.
- **Locked scoring values**: option `value` strings in `questions.json` drive lead
  scoring — the admin may edit labels, never values.
- **Local dev**: `npm run dev` (Vite) does not run the `api/` functions — use
  `vercel dev` to exercise /admin locally.
- **Don't touch live infra** (DNS, registrar, mail) from the build. Deployment is
  Vercel + the domain's existing DNS; nothing in the site build should need to change
  them.
- Add the standard launch checklist: favicon set, OG image (`scripts/make-og.mjs`
  pattern), `robots.txt`, `sitemap.xml`, canonical URL, then register the domain
  property in Google Search Console after launch.

## Suggested build order

1. Plan doc → iterate → lock.
2. Scaffold: Vite + React + Tailwind 4 + `vercel.json`; `content/*.json` with the
   agreed schema + `src/config` re-exports; section components with bracketed slots.
3. Visual pass: globals.css, section art treatment, `useInView` reveals, Lenis.
4. Application form + Wayfinder wiring (dual-shape payload, phone helper, pending
   queue, honeypot, UTMs).
5. /admin CMS per ADMIN_CMS_HANDOFF.md.
6. Env vars in Vercel → deploy → end-to-end verification (admin edit + test lead).
