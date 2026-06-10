# Handoff: Build a JSON-driven `/admin` CMS (the "Wayfinder admin" pattern)

> Paste the body of this document into another funnel project's Claude Code session.
> It describes the proven admin/CMS architecture from **The Order** so the client can
> edit all page copy, questions, and images themselves — no code changes, no external CMS.
> **Replicate the mechanism exactly; adapt only the content schema to that site's sections.**

## What we're building (the model)

- **Content lives as JSON in the repo** (`content/sections.json`, `content/questions.json`). The public site imports these JSON files directly at build time (Vite bundles them — zero runtime fetch on the public site).
- **`/admin` is a lazy-loaded, password-protected editor** inside the same SPA. It reads/writes the JSON via a small set of Vercel serverless functions.
- **Saving = a GitHub commit.** The admin API writes the JSON back to the repo through the GitHub Contents API. Vercel auto-redeploys on the commit, so edits go live in ~30s. **Git history is the version history.** There is no database.
- **Images** go to Vercel Blob (client-optimized to WebP first); the returned CDN URL is stored in `sections.json`.
- The admin polls Vercel's deploy API to show a live "Building… / Live / Failed" badge after each save.

Why this shape: no DB, no CMS subscription, full version history, the public site stays a static bundle, and the client gets a friendly editor. The only moving parts are a few serverless functions + JSON files.

## Architecture / files to create

### Content (adapt the *shape* to this site; keep the *loading pattern*)
- `content/sections.json` — every editable string/image on the page, grouped by section.
- `content/questions.json` — questionnaire definitions + (locked) scoring values.
- `src/config/sectionContent.js` — `import data from '../../content/sections.json'` and re-export named consts (`heroContent`, etc.). Public components import from here.
- `src/config/questions.js` — `export const questions = data.questions`.
- **Public components render markdown fields** via `dangerouslySetInnerHTML={mdInline(text)}` (see renderer below).

### Markdown renderer — `src/lib/markdown.js`
A tiny, dependency-free, HTML-escaping inline renderer. Supports only `**bold**`, `*italic*`, `[text](url)`, line breaks/paragraphs — deliberately no headings/lists/code (they'd clash with prose and get typed by accident). **The exact same renderer is used by the public site and the admin preview, so preview is WYSIWYG.** Copy this file verbatim:

```js
function escapeHtml(s) {
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;').replace(/'/g,'&#39;')
}
function escapeAttr(s) { return String(s).replace(/"/g,'&quot;') }
function applyInlineTokens(escaped) {
  let html = escaped
  html = html.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (_, label, url) =>
    /^(https?:|mailto:)/i.test(url)
      ? `<a href="${escapeAttr(url)}" target="_blank" rel="noopener noreferrer">${label}</a>`
      : label)
  html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
  html = html.replace(/(^|[^*])\*([^*\n]+)\*/g, '$1<em>$2</em>')
  return html
}
export function renderInlineMarkdown(text){ if(text==null) return ''; return applyInlineTokens(escapeHtml(text)).replace(/\n/g,'<br>') }
export function renderMarkdown(text, pClass=''){
  if(text==null) return ''
  const open = pClass ? `<p class="${escapeAttr(pClass)}">` : '<p>'
  return String(text).split(/\n{2,}/).map(b => `${open}${applyInlineTokens(escapeHtml(b)).replace(/\n/g,'<br>')}</p>`).join('')
}
export function mdHtml(text,pClass=''){ return { __html: renderMarkdown(text,pClass) } }
export function mdInline(text){ return { __html: renderInlineMarkdown(text) } }
```

### Routing — `src/App.jsx`
Detect the admin route and lazy-load the admin bundle so public visitors never download it:
```js
const AdminApp = lazy(() => import('./admin/AdminApp.jsx'))
function isAdminRoute(){ return typeof window!=='undefined' && window.location.pathname.startsWith('/admin') }
// in render: if (isAdminRoute()) return <Suspense fallback={null}><AdminApp/></Suspense>
```

### Admin front-end — `src/admin/`
- **`adminApi.js`** — thin fetch client. Stores JWT in `localStorage`, attaches `Authorization: Bearer <token>` to every protected call. Exposes `login()`, `fetchContent()`, `saveContent({sections,questions})`, `uploadImage(file)`, `listImages()`, `deleteImage(url)`, `getDeployStatus()`, plus `getTokenExpiryMs()` (decodes JWT `exp` client-side for the session-expiry warning) and `humanizeError()` (maps raw errors → friendly admin-facing messages: offline, stale-SHA "someone else saved", 401 expired, blob misconfigured, file too large, 5xx). Copy this file's structure verbatim.
- **`AdminApp.jsx`** — owns auth state: token, load content on mount, schedule a "session expiring" warning ~5 min before `exp`, auto-logout on expiry. Renders `AdminLogin` or `AdminEditor`.
- **`AdminLogin.jsx`** — single password form → `login(password)`.
- **`AdminEditor.jsx`** — the shell: tab nav, **Save** button (disabled unless dirty), draft autosave to `localStorage` with a fingerprint so a draft can be restored on reload (and discarded if someone else saved in the meantime — compare against the baseline you loaded), `beforeunload` guard while dirty, and post-save deploy-status polling (every 5s) driving the Building/Live badge.
- **`MarkdownField.jsx`** — textarea + toolbar (Bold/Italic/Link, Ctrl+B/Ctrl+I) + a Preview toggle that renders with `renderMarkdown()` (same as public). Copy verbatim.
- **`tabs/SectionsTab.jsx`** — **THE HEART. This is the schema.** A `SECTION_DEFS` array declaratively lists every editable field; the component renders inputs from it. Generic `getAt(obj,path)` / `setAt(obj,path,value)` helpers (immutable, support array indices) read/write nested paths. **To add/remove an editable field, you only edit `SECTION_DEFS` — no other code.** Each field entry:
  ```js
  { path: ['hero','headline'], label: 'Headline', textarea: true, rows: 3,
    markdown: true,        // → render with MarkdownField (toolbar + preview)
    italic: true,          // → italic styling in the editor
    previewClass: 'founder-p',  // class applied inside markdown preview to match public CSS
    hint: 'Small grey caption explaining this field to the client.' }
  ```
  Field flavors: plain `<input>`, `textarea: true` (multiline), `markdown: true` (MarkdownField). **Write hints for the non-technical client on every non-obvious field** (this is high-value — e.g. "One value per line", "Leave blank to hide", "2–4 words, action verb").
- **`tabs/ApplicationTab.jsx`** — edits `questions.json`: question text + option *labels* are editable, but the option **`value` (the scoring key) is rendered read-only/locked** — changing it would silently break lead scoring. Keep that lock.
- **`tabs/ImagesTab.jsx`**, **`tabs/LibraryTab.jsx`**, **`tabs/LogoTab.jsx`** — image slots bound to `sections.json` paths, upload + "pick from library" + delete. Skip these in a first pass if the site has no editable images yet.
- **`imageOptimize.js`** — before upload, downscale (canvas) to ≤~2200px longest edge and re-encode WebP @85% (skip if <200KB or SVG, skip if result larger). Keeps blobs small.

### Admin back-end — Vercel functions in `api/`
- **`api/_lib/auth.js`** — JWT issue/verify with `jose` (HS256, 24h TTL), signed with `ADMIN_JWT_SECRET`. Exposes `issueToken()`, `verifyToken()`, `readBearer(req)`, `requireAuth(req,res)` (returns payload or sends 401), and `timingSafeEqualStr()`. Copy verbatim.
- **`api/_lib/github.js`** — `readJsonFile(path)` and `writeJsonFile(path, obj, message)` via `@octokit/rest`. Writes are conditional on the file SHA (optimistic lock); **on a 409/422 stale-SHA conflict it parses the real SHA from the error and retries once** (GitHub's CDN returns stale SHAs right after a commit). Copy verbatim. Needs `GITHUB_TOKEN`, `GITHUB_REPO` ("owner/repo"), `GITHUB_BRANCH` (default `main`).
- **`api/admin/login.js`** — POST `{password}` → timing-safe compare against `ADMIN_PASSWORD`, ~600ms delay on failure, returns `{token}` on success.
- **`api/admin/content.js`** — `requireAuth` first. GET → `{sections, questions}` read from the repo. POST `{sections?, questions?}` → write whichever were sent (each its own commit message), **serialized** (two concurrent commits to one branch race). Returns `{ok:true}`.
- **`api/admin/upload.js`** — `requireAuth`, read raw body, `put()` to Vercel Blob (`access:'public'`), return `{url, path}`.
- **`api/admin/images.js`** — GET list (newest first), DELETE by `?url=`.
- **`api/admin/deploy-status.js`** — query Vercel deployments API for the latest build state → drives the admin badge.

### `vercel.json`
```json
{
  "functions": { "api/**/*.js": { "memory": 1024, "maxDuration": 15 } },
  "rewrites": [{ "source": "/((?!api/).*)", "destination": "/index.html" }]
}
```
(SPA rewrite so `/admin` resolves to `index.html`; functions excluded from the rewrite.)

### Dependencies
`@octokit/rest`, `jose`, `@vercel/blob` (Blob only if doing images).

## Environment variables (set in Vercel → Production + Preview)
| Var | Purpose |
|---|---|
| `ADMIN_PASSWORD` | the one login password |
| `ADMIN_JWT_SECRET` | 32-byte hex, signs the session JWT |
| `GITHUB_TOKEN` | PAT with `repo` scope (fine-grained: Contents read/write on this repo) |
| `GITHUB_REPO` | `owner/repo` |
| `GITHUB_BRANCH` | usually `main` (defaults to `main`) |
| `VERCEL_API_TOKEN`, `VERCEL_PROJECT_ID`, `VERCEL_TEAM_ID` | for the deploy-status badge |
| `BLOB_READ_WRITE_TOKEN` | auto-set when you enable Vercel Blob (images only) |

## What to ADAPT vs. COPY
- **Copy verbatim** (mechanism, not content): `markdown.js`, `MarkdownField.jsx`, `adminApi.js`, `AdminApp.jsx`, `AdminEditor.jsx`, `AdminLogin.jsx`, all of `api/`, `vercel.json`, the `getAt/setAt` helpers and the render loop in `SectionsTab.jsx`.
- **Rewrite for this site:** the `SECTION_DEFS` array (to match *this* site's sections/fields), the shape of `content/sections.json` and `content/questions.json`, and the named re-exports in `src/config/`. Make `SECTION_DEFS` paths exactly match the JSON shape, and make sure every public component reads from `src/config/sectionContent.js` so edits actually surface.

## Gotchas (learned the hard way)
- **Locked scoring values:** never let the admin edit option `value`s in `questions.json` — only their display `label`s. Scoring depends on the exact value strings.
- **Serialize content writes** and keep the **stale-SHA retry** — concurrent/rapid saves to one branch conflict otherwise.
- **Same renderer both sides:** public site uses `mdInline`/`renderInlineMarkdown` (it already wraps text in `<p>`/`<span>`); admin preview uses block `renderMarkdown`. Don't introduce a second markdown lib or preview drifts from reality.
- **Markdown is HTML-escaped before tokenizing**, and links are scheme-validated (`http(s):`/`mailto:` only). Keep it — it's the XSS guard for `dangerouslySetInnerHTML`.
- **Local dev:** Vite dev server doesn't run the Vercel functions; use `vercel dev` to exercise `/admin` auth + save locally.
- **Don't break the live site infra.** This CMS only commits to `content/*.json` — verify the deployment infra (registrar/DNS/mail) is untouched by any of this.

## Suggested build order
1. JSON files + `src/config` re-exports, and point public components at them.
2. `markdown.js` + wire public rendering.
3. `api/_lib` + `api/admin/login` + `content`.
4. `adminApi` + `AdminApp` + `AdminLogin` + `AdminEditor` + `SectionsTab` + `MarkdownField`.
5. `ApplicationTab`.
6. Images (Blob) last.
7. Set env vars, deploy, smoke-test a real edit → commit → redeploy.
