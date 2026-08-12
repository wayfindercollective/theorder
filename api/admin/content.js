/**
 * /api/admin/content
 *
 * GET    → { sections, questions, variants } as they exist in the live repo.
 *          Variant pages are DERIVED from the content/variants/ directory —
 *          a page exists iff its file does. `_`-prefixed files are internal
 *          (the retired-slug tombstone) and never returned as pages; a file
 *          that fails to parse is skipped (it would have failed the deploy).
 *
 * POST   → body { sections?, questions?, variants?, createVariants? } →
 *          commits whichever files were sent. Vercel deploys per commit; the
 *          client only sends what changed, so a typical save is one file.
 *          `variants` UPDATES pages that must already exist (a save from a
 *          tab that missed a deletion fails rather than resurrecting the
 *          page). `createVariants` CREATES pages that must NOT exist — the
 *          sha-less GitHub write is the atomic precondition, so two tabs
 *          adding the same slug cannot silently overwrite each other.
 *          Returns the stored objects, `written`, and the last `commitSha`
 *          so the deploy badge can wait for THIS change's deployment.
 *
 * DELETE → ?variant=<slug> removes a page. Tombstone FIRST: the slug is
 *          committed to _retired.json (kept reserved by utm.js forever, so a
 *          removed page's old links never earn fabricated vanity-campaign
 *          attribution), THEN the page file is deleted. If the delete fails
 *          after the retire, the slug is reserved but the page still exists:
 *          harmless and retry-safe.
 *
 * Variant files are REBUILT from the VARIANT_FIELDS whitelist on every save
 * (merge first, then whitelist, then rich-text sanitise) so nothing outside
 * the allowed text fields — no image, video or layout key — can ever persist
 * in content/variants/*, regardless of payload or existing file contents.
 *
 * All methods require a valid JWT in Authorization: Bearer header.
 */

import { requireAuth } from '../_lib/auth.js'
import {
  createJsonFile,
  deleteJsonFile,
  readDir,
  readJsonFile,
  writeJsonFile,
} from '../_lib/github.js'
import { sanitizeRichSections } from '../_lib/sanitizeRich.js'
import { isValidVariantSlug, pickVariantFields } from '../../src/config/variantFields.js'

const SECTIONS_PATH = 'content/sections.json'
const QUESTIONS_PATH = 'content/questions.json'
const VARIANTS_DIR = 'content/variants'
const RETIRED_PATH = `${VARIANTS_DIR}/_retired.json`
const variantPath = (slug) => `${VARIANTS_DIR}/${slug}.json`

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

// The words-only write boundary for a variant page.
const cleanVariant = (data) => sanitizeRichSections(pickVariantFields(data))

export default async function handler(req, res) {
  const payload = await requireAuth(req, res)
  if (!payload) return

  if (req.method === 'GET') {
    try {
      const names = await readDir(VARIANTS_DIR)
      const slugs = names
        .filter((n) => n.endsWith('.json') && !n.startsWith('_'))
        .map((n) => n.replace(/\.json$/, ''))
      const [s, q, ...v] = await Promise.all([
        readJsonFile(SECTIONS_PATH),
        readJsonFile(QUESTIONS_PATH),
        ...slugs.map((slug) =>
          readJsonFile(variantPath(slug))
            .then((f) => JSON.parse(f.content))
            .catch(() => null)
        ),
      ])
      const variants = {}
      slugs.forEach((slug, i) => { if (v[i]) variants[slug] = v[i] })
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
    // HTML is ever committed. `written` reports what landed so a partial
    // failure is visible — the editor keeps the draft dirty on any error and
    // a retry re-sends (re-committing an identical file is harmless).
    const written = []
    let savedSections
    let savedQuestions
    const savedVariants = {}
    let commitSha = null
    try {
      if (body?.sections) {
        const r = await writeJsonFile(SECTIONS_PATH, (live) => {
          const merged = live ? mergeKeepingUnknown(live, body.sections) : body.sections
          savedSections = sanitizeRichSections(merged)
          return savedSections
        }, 'cms: update sections')
        commitSha = r.commitSha || commitSha
        written.push('sections')
      }
      if (body?.questions) {
        const r = await writeJsonFile(QUESTIONS_PATH, (live) => {
          savedQuestions = live ? mergeKeepingUnknown(live, body.questions) : body.questions
          return savedQuestions
        }, 'cms: update questions')
        commitSha = r.commitSha || commitSha
        written.push('questions')
      }
      for (const [slug, incoming] of Object.entries(body?.variants || {})) {
        if (!incoming || typeof incoming !== 'object') continue
        if (!isValidVariantSlug(slug)) {
          return res.status(400).json({ error: `invalid page slug: ${slug}`, written })
        }
        const r = await writeJsonFile(variantPath(slug), (live) => {
          if (!live) {
            // The page was removed by another tab; failing beats resurrecting.
            throw new Error('That page was removed. Reload the admin and try again.')
          }
          savedVariants[slug] = cleanVariant(mergeKeepingUnknown(live, incoming))
          return savedVariants[slug]
        }, `cms: update ${slug} page`)
        commitSha = r.commitSha || commitSha
        written.push(`variants.${slug}`)
      }
      for (const [slug, incoming] of Object.entries(body?.createVariants || {})) {
        if (!incoming || typeof incoming !== 'object') continue
        if (!isValidVariantSlug(slug)) {
          return res.status(400).json({ error: `invalid page slug: ${slug}`, written })
        }
        try {
          savedVariants[slug] = cleanVariant(incoming)
          const r = await createJsonFile(variantPath(slug), savedVariants[slug], `cms: create ${slug} page`)
          commitSha = r.commitSha || commitSha
          written.push(`variants.${slug}`)
        } catch (err) {
          // A sha-less write to an existing file is GitHub's 422 — the page
          // was created concurrently.
          if (err?.status === 422) {
            return res.status(409).json({
              error: 'That page already exists. Reload the admin to load it.',
              written,
            })
          }
          throw err
        }
      }
      if (written.length === 0) {
        return res.status(400).json({ error: 'nothing to save' })
      }
      return res.status(200).json({
        ok: true,
        written,
        commitSha,
        sections: savedSections,
        questions: savedQuestions,
        variants: Object.keys(savedVariants).length ? savedVariants : undefined,
      })
    } catch (err) {
      return res.status(500).json({ error: err?.message || 'write failed', written })
    }
  }

  if (req.method === 'DELETE') {
    const slug = String(req.query?.variant || '')
    if (!isValidVariantSlug(slug)) {
      return res.status(400).json({ error: `invalid page slug: ${slug}` })
    }
    try {
      // Tombstone first: if this write fails the page is untouched; if the
      // delete below fails the slug is merely reserved early. Both retry-safe.
      const retire = await writeJsonFile(RETIRED_PATH, (live) => {
        const arr = Array.isArray(live) ? live : []
        return arr.includes(slug) ? arr : [...arr, slug]
      }, `cms: retire ${slug} slug`)
      const del = await deleteJsonFile(variantPath(slug), `cms: remove ${slug} page`)
      return res.status(200).json({
        ok: true,
        existed: del.existed,
        commitSha: del.commitSha || retire.commitSha || null,
      })
    } catch (err) {
      return res.status(500).json({ error: err?.message || 'delete failed' })
    }
  }

  res.setHeader('Allow', 'GET, POST, DELETE')
  return res.status(405).json({ error: 'method not allowed' })
}
