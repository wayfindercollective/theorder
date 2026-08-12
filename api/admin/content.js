/**
 * /api/admin/content
 *
 * GET  → returns { sections, questions, variants } as they exist in the live
 *        repo on the configured branch. Used to populate the editor on load.
 *        A variant file that is missing or unparseable comes back null — the
 *        editor seeds that page from base and creates it on first save.
 *
 * POST → body { sections?, questions?, variants? } → commits whichever files
 *        were sent to GitHub. Vercel deploys automatically on commit. The
 *        client only sends what changed, so a typical save is one file, one
 *        commit, one deploy. Returns the stored objects plus `written`.
 *
 * Variant files are REBUILT from the VARIANT_FIELDS whitelist on every save
 * (merge first, then whitelist, then rich-text sanitise) so nothing outside
 * the allowed text fields — no image, video or layout key — can ever persist
 * in content/variants/*, regardless of payload or existing file contents.
 *
 * Both methods require a valid JWT in Authorization: Bearer header.
 */

import { requireAuth } from '../_lib/auth.js'
import { readJsonFile, writeJsonFile } from '../_lib/github.js'
import { sanitizeRichSections } from '../_lib/sanitizeRich.js'
import { VARIANT_PAGES, pickVariantFields } from '../../src/config/variantFields.js'

const SECTIONS_PATH = 'content/sections.json'
const QUESTIONS_PATH = 'content/questions.json'
const variantPath = (slug) => `content/variants/${slug}.json`

// Deep-merge an editor payload over the live file so a save from an admin
// tab loaded before a deploy can't silently DELETE keys it never knew about
// (e.g. a new `meta` block or `footer.privacyLabel`). Objects merge
// recursively; arrays and scalars from the payload replace wholesale —
// the editor edits whole arrays (questions, paragraphs), never patches them.
function mergeKeepingUnknown(current, incoming) {
  if (
    !current || !incoming ||
    Array.isArray(current) || Array.isArray(incoming) ||
    typeof current !== 'object' || typeof incoming !== 'object'
  ) return incoming
  const out = { ...current }
  for (const k of Object.keys(incoming)) {
    out[k] = mergeKeepingUnknown(current[k], incoming[k])
  }
  return out
}

export default async function handler(req, res) {
  const payload = await requireAuth(req, res)
  if (!payload) return

  if (req.method === 'GET') {
    try {
      const [s, q, ...v] = await Promise.all([
        readJsonFile(SECTIONS_PATH),
        readJsonFile(QUESTIONS_PATH),
        // Missing or corrupt variant files must not fail the whole GET —
        // they resolve to null and the editor seeds that page from base.
        ...VARIANT_PAGES.map(({ slug }) =>
          readJsonFile(variantPath(slug))
            .then((f) => JSON.parse(f.content))
            .catch(() => null)
        ),
      ])
      const variants = {}
      VARIANT_PAGES.forEach(({ slug }, i) => { variants[slug] = v[i] })
      return res.status(200).json({
        sections: JSON.parse(s.content),
        questions: JSON.parse(q.content),
        variants,
      })
    } catch (err) {
      return res.status(500).json({ error: err?.message || 'read failed' })
    }
  }

  if (req.method === 'POST') {
    let body = req.body
    if (typeof body === 'string') {
      try { body = JSON.parse(body) } catch { body = {} }
    }
    // Serialize the writes — two concurrent commits to the same branch
    // race against each other and one will hit a stale-SHA conflict.
    // Resolvers merge against the freshest live JSON (re-invoked on conflict
    // retry); the sections resolver also sanitises rich fields so only clean
    // HTML is ever committed. We capture the final written objects to return
    // them — the editor then reflects exactly what was stored.
    // Writes run sequentially; `written` reports what landed so a partial
    // failure is visible — the editor keeps the draft dirty on any error and a
    // retry re-sends (re-committing an identical file is harmless).
    const written = []
    let savedSections
    let savedQuestions
    const savedVariants = {}
    try {
      if (body?.sections) {
        await writeJsonFile(SECTIONS_PATH, (live) => {
          const merged = live ? mergeKeepingUnknown(live, body.sections) : body.sections
          savedSections = sanitizeRichSections(merged)
          return savedSections
        }, 'cms: update sections')
        written.push('sections')
      }
      if (body?.questions) {
        await writeJsonFile(QUESTIONS_PATH, (live) => {
          savedQuestions = live ? mergeKeepingUnknown(live, body.questions) : body.questions
          return savedQuestions
        }, 'cms: update questions')
        written.push('questions')
      }
      for (const { slug } of VARIANT_PAGES) {
        const incoming = body?.variants?.[slug]
        if (!incoming || typeof incoming !== 'object') continue
        await writeJsonFile(variantPath(slug), (live) => {
          const merged = live ? mergeKeepingUnknown(live, incoming) : incoming
          // Merge, then rebuild from the whitelist, then sanitise rich text —
          // this is the boundary that keeps variant files words-only.
          savedVariants[slug] = sanitizeRichSections(pickVariantFields(merged))
          return savedVariants[slug]
        }, `cms: update ${slug} variant`)
        written.push(`variants.${slug}`)
      }
      if (written.length === 0) {
        return res.status(400).json({ error: 'nothing to save' })
      }
      return res.status(200).json({
        ok: true,
        written,
        sections: savedSections,
        questions: savedQuestions,
        variants: Object.keys(savedVariants).length ? savedVariants : undefined,
      })
    } catch (err) {
      return res.status(500).json({ error: err?.message || 'write failed', written })
    }
  }

  res.setHeader('Allow', 'GET, POST')
  return res.status(405).json({ error: 'method not allowed' })
}
