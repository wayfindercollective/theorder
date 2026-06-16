# Rich-text editing — Build Plan (v2)

Add Word/Google-Docs-style inline formatting — **bold, italic, underline, and
per-selection font size** — to headings and prose in both `/admin` (site content)
and `/presentations` (decks). Formatting applies to any selected run (a letter, a
word, or the whole field).

> Locked with Nathan: **proven editor library**; **plan + codex review before
> building**. `/admin` alignment unchanged. `/presentations` keeps its L/C/R
> box/heading/body alignment and per-field base size, and gains inline formatting.
>
> v2 — rewritten after codex round 1. Fixes: explicit field map (headings render
> as plain text today and must change); **inline HTML output** so it doesn't nest
> illegally inside existing `<p>`; deep-merge-aware server sanitisation that
> returns the cleaned content; presentation limits by **text length**, not HTML
> length; empty normalised to `''`; shared allowlist module with no TipTap /
> sanitize-html in the public bundle; concrete TipTap modes + paste handling.

---

## 1. Acceptance criteria

1. Select text → **Bold / Italic / Underline** toggles that exact run, WYSIWYG.
2. **Per-selection font size** (A−/A+) changes only the selected run.
3. Works in **headings and prose bodies** across sections and in deck slides.
4. `/admin`: alignment unchanged; existing bold/italic keep working; underline +
   size are new; the editor is visual (no `**` tokens).
5. `/presentations`: keeps box position + heading/body **L/C/R** + per-field base
   size; adds inline bold/italic/underline/size.
6. Public site renders the formatting wherever admin content uses it.
7. No XSS — stored & rendered HTML is a strict allowlist.
8. Existing content keeps working (markdown migrated to HTML).

---

## 2. Library & architecture

**TipTap v2** (ProseMirror), loaded ONLY inside the `/admin` and `/presentations`
lazy chunks. Extensions (explicit, no StarterKit): `document, paragraph, text,
bold, italic, underline, history, hard-break, link` (admin only), `text-style`,
plus a small custom **FontSize** mark on `TextStyle`.

**Three plain modules with strict separation so weight lands in the right place:**

| Module | Imports | Used by |
|---|---|---|
| `src/lib/richtext.js` | **none** (plain JS) — exports `ALLOWED_INLINE` & `ALLOWED_BLOCK` (allowlist configs), `FONT_SIZES` (em buckets), `RICH_PATHS` (each entry `{path, mode}` where `mode: 'inline'\|'block'`), `renderRich(html,{block})`, `richText(html)` (strip tags → text, for empty/length checks) | public site components **and** server |
| `src/components/ui/RichText.jsx` | TipTap | `/admin` + `/presentations` editors only |
| `api/_lib/sanitizeRich.js` | `sanitize-html` + `ALLOWED` from `richtext.js` | the two write APIs only |

`richtext.js` is plain ES that both the Vite client and the Vercel Node API can
import (no Vite-only or Node-only deps), so the **allowlist + rich-path list live
in one place** and can't drift. `renderRich` simply returns `{ __html }` from the
already-server-sanitised storage (see §5) — no sanitiser shipped to visitors.

---

## 3. Storage format

- **Inline HTML** for every rich field by default — marks + `<br>`, **no block
  tags** — so it drops into the existing `<h2>…</h2>`, `<p>…</p>`, `<span>…</span>`
  wrappers without illegal `<p>` nesting. Example:
  `Are you <strong>sick?</strong> and <span style="font-size:1.25em"><u>tired?</u></span>`
- **One exception — `code.intro`** is genuinely multi-paragraph and renders its own
  `<p>` (CSS targets `.values-intro p`). It uses **block mode** → TipTap `<p>` HTML.
- **`truth.provocation` becomes a structured array** of inline-HTML strings — one
  per line, an empty string marking a stanza gap. The editor (mode `lines`) splits at
  the **ProseMirror document level** (on hard-break nodes) and serialises each segment
  independently, so inline marks are always balanced **within** each line (no
  unsafe `<br>` string-splitting; "bold the whole field" stays correct). The
  component maps the array → its existing per-line `.truth-line` / `.truth-gap` render.
  *(This is the only data-shape change; everything else keeps its existing shape.)*
- **Arrays stay arrays** (`founder.paragraphs[]`, `howWeOperate.paragraphs[]`): each
  element is its own inline-HTML rich field; the component renders each in its `<p>`.
- **Empty is normalised to `''`** at the editor boundary (TipTap emits `<p></p>` for
  empty; `RichText` returns `''` when `richText(html)` is blank). Simplifies dirty
  checks, length limits, and the presentation empty-box rule.

---

## 4. Field map (single source of truth: a `rich` flag on the admin field defs)

`SECTION_DEFS` in `SectionsTab.jsx` gains a `rich: 'inline' | 'block'` flag; those
fields render `<RichText>` in that mode. The **same paths + modes** are exported as
`RICH_PATHS` from `richtext.js` (one source of truth) so the server sanitises each
field at the **same mode** the editor produced it. Everything else stays plain.

| Field (path) | Mode | Public renderer change |
|---|---|---|
| `truth.provocation` | **lines** (array of inline) | `TheTruthSection` maps the array → `.truth-line` per non-empty entry, `.truth-gap` per empty |
| `code.heading` | inline | `TheCodeSection` `<h2>` → `renderRich` |
| `code.intro` | **block** | `TheCodeSection` keeps block render via `renderRich(…,{block:true})` (replaces `mdHtml`) |
| `become.heading` | inline | `WhatYouBecomeSection` `<h2>` |
| `become.closing` | inline | closing line |
| `evidence.heading` | inline | `EvidenceSection` `<h2>` |
| `evidence.intro` | inline | intro line |
| `founder.heading` | inline | `FounderSection` `<h2>` |
| `founder.paragraphs[0..3]` | inline | each `<p>` (already `mdInline`) |
| `faq.heading` | inline | `FAQSection` `<h2>` |
| `howWeOperate.heading` | inline | `HowWeOperateSection` `<h2>` |
| `howWeOperate.paragraphs[0..6]` | inline | each `<p>` |
| `howWeOperate.pullQuote` | inline | pull-quote |

**Stays plain (not rich):** all eyebrows/numerals, labels, `hero.*`, the
values/offerings/questions **lists** (bespoke grids), form labels, footer, CTA,
closing wordmark/verses, finalScreen, considered (hidden). *(Scoping call — flag in
§10 if Nathan wants any of these too.)*

Headings are the biggest delta: they render as plain React text nodes today
(`<h2>{x.heading}</h2>`), so each listed `<h2>` becomes
`<h2 className="…" dangerouslySetInnerHTML={renderRich(x.heading)} />`.

---

## 5. Sanitisation & security (server-authoritative)

- **Mode-aware sanitisation.** `sanitizeRich` is driven by `RICH_PATHS` and picks the
  allowlist **per field mode**:
  - **inline** fields → `ALLOWED_INLINE` (**no `<p>`** — they render inside existing
    `<h2>/<p>/<span>` wrappers). Pre-normalise any `</p><p>` → `<br>` and any stray
    `<p>`/`</p>` → stripped, so a submitted/pasted block can never nest illegally.
  - **block** field (`code.intro` only) → `ALLOWED_BLOCK` (= inline set **plus
    `<p>`**), since it renders its own paragraphs (`.values-intro p`).
  - **lines** field (`truth.provocation` only) → the value is an **array**; coerce to
    an array, cap its length, and sanitise each element with `ALLOWED_INLINE`.
- **`api/admin/content.js`** deep-merges the incoming payload over live JSON, then —
  **before commit** — runs `sanitizeRich(merged)` over every `RICH_PATHS` entry
  (array wildcards for `paragraphs[]`) at its declared mode. So storage is always
  clean regardless of what the client sent. The POST **returns the sanitised
  `{sections, questions}`**; `adminApi.saveContent` returns it and `AdminApp` does
  `setContent(returned)` — the UI reflects exactly what was stored (fixes the
  "marked saved but stripped on server" gap).
- **`api/presentations/index.js`** sanitises each slide `heading` (inline) and
  `body` (inline) with `ALLOWED_INLINE`. **Length is enforced on stripped text**
  (`richText(html).length`), not raw HTML, so a cap never cuts a tag; oversize is
  rejected, not truncated. Empty (`richText` blank) is stored as `''`.
- **Allowlist contents:** `ALLOWED_INLINE` tags `b,strong,i,em,u,a,span,br`;
  `ALLOWED_BLOCK` adds `p`. `a[href]` limited to `http(s):`/`mailto:` with forced
  `rel="noopener noreferrer" target="_blank"`; `span[style]` permitting **only**
  `font-size` and **only** values from `FONT_SIZES` (bounded em set, e.g.
  `0.7,0.85,1,1.15,1.3,1.5,1.75,2,2.5em`). Everything else (scripts, handlers,
  `style:position`, classes, ids, other tags) stripped.
- Public render trusts this clean storage (no sanitiser in the public bundle). The
  only non-API writer is a direct git commit to `sections.json` — a trusted-dev
  action, same trust the site already places in that file.

---

## 6. `RichText.jsx` (the editor)

```
<RichText value={html} onChange={html=>…}
          mode="inline" | "block" | "heading"   // heading = inline + Enter disabled
          baseStyle={{fontSize, textAlign}}      // applied to the editor container
          toolbar={['bold','italic','underline','size','link'?]}
          placeholder="…" />
```

- `mode`:
  - `heading` — schema allows one block, **Enter/paste-of-blocks suppressed**,
    `getHTML()` unwrapped to inline (strip the single `<p>`).
  - `inline` — hard breaks allowed (`<br>`), output unwrapped to inline.
  - `block` — normal paragraph HTML (only `code.intro`).
  - `lines` — value is an **array** of inline-HTML strings; Enter inserts a hard
    break; `onChange` walks the doc, splits on hard-break nodes, and serialises each
    segment via ProseMirror's `DOMSerializer` so marks are balanced per line (empty
    segment → `''`). Loads an array back into the doc with hard breaks between lines.
    (Only `truth.provocation`.)
- **Toolbar** on focus: B / i / U (toggle, highlighted when the selection has the
  mark — using `editor.isActive`), **A− / A+** stepping the selection through
  `FONT_SIZES` (shows the current size, or blank when the selection is mixed),
  Link (admin). Ctrl/Cmd+B/I/U.
- **Font size = relative em** so it scales with the field's base size (the cqw base
  in `/presentations`, the section CSS on the public site). The FontSize mark writes
  `style="font-size:<bucket>em"`.
- **Paste** (`transformPastedHTML`): strip to `ALLOWED`; map any `pt/px` font-size to
  the nearest `FONT_SIZES` bucket; plain-text paste otherwise. Guards against Word/
  Docs block dumps.
- `onChange` emits `''` when empty (per §3).

---

## 7. `/presentations` specifics

- `TextBox.jsx`: heading/body `<textarea>` → `<RichText mode="heading|inline">`,
  `baseStyle` = the cqw font size + the field's L/C/R alignment. Slides store HTML.
- Present mode + manager render via `renderRich`; empty-box check uses
  `richText(heading)||richText(body)`.
- Box position L/C/R, heading/body alignment L/C/R, and base A−/A+ size all stay;
  per-selection size rides on top as em.

---

## 8. Migration (one-time, committed as a content change)

Convert every `RICH_PATHS` value in `content/sections.json` from markdown to HTML
using the existing `markdown.js` logic (`**b**`→`<strong>`, `*i*`→`<em>`,
`[t](u)`→`<a>`), preserving structure per mode: inline fields → inline HTML; founder
paragraphs → inline; `code.intro` → block `<p>` HTML; **`truth.provocation` → an
array** (split the current `\n`-joined string into lines, each converted to inline
HTML, blank lines → `''`). A throwaway Node script does this; output reviewed in the
diff. `markdown.js` then remains only as the migration helper / is removed.

---

## 9. Touch list

**New:** `src/components/ui/RichText.jsx`, `src/lib/richtext.js`,
`api/_lib/sanitizeRich.js`, `src/extensions/fontSize.js` (or colocated).
**Edited:** `SectionsTab.jsx` (add `rich` flags + render RichText), `AdminApp.jsx`
(use returned sanitised content), `adminApi.js` (return saved content),
`api/admin/content.js` (sanitise merged + return it), `api/presentations/index.js`
(sanitise + text-length limits), `TextBox.jsx`, presentation render in
`DeckEditor`/`Slide`, the six section components
(`TheTruth, TheCode, WhatYouBecome, Evidence, Founder, FAQ, HowWeOperate`),
`content/sections.json` (migration), `package.json` (TipTap + sanitize-html),
admin + presentations CSS (toolbar). `vite.config.js` only if a manualChunks guard
is needed.
**Untouched:** public bundle stays free of TipTap/sanitize-html (verified in build).

---

## 10. Risks / open questions for review

1. **Scope of "rich" fields** (§4) — headings + main prose, lists/labels stay
   plain. Confirm that's the right line, or extend to lists/hero.
2. **Server-only sanitisation** (public render trusts clean storage, no public-bundle
   sanitiser). Acceptable, or also sanitise on render?
3. **Truth `<br>` split** replacing the `\n` split — preserves per-line + stanza-gap
   render; confirm.
4. **`sanitize-html` in the Vercel Node runtime** (size/cold-start) — small, but
   confirm vs a hand-rolled allowlist in `richtext.js` (shared) instead.
5. **Cross-import of `src/lib/richtext.js` by `api/`** — must stay plain ES so the
   Vercel function bundler is happy; verify it builds.
6. **Single source of truth for RICH_PATHS** across the admin defs and the server —
   plan exports one list; confirm the array-wildcard handling for `paragraphs[]`.

---

## 11. Validation

- `npm run build`; assert TipTap & sanitize-html are absent from the public `index`
  chunk (only in `admin`/`presentations`/function bundles).
- Admin: bold a word in a heading + size a phrase in a body independently → save →
  reload → persists → public site shows it.
- Presentation: same + alignment/base-size still work, per-selection size scales
  with the stage, present mode renders, empty boxes hide.
- Security: saving `<script>`, `onclick`, `style:position`, a `javascript:` link, or
  an out-of-set font-size → all stripped server-side; POST returns the cleaned copy.
- Migration: Truth bold words intact; no raw `**`; `.values-intro p` still styled.
