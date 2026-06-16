/**
 * /api/admin/content
 *
 * GET  → returns { sections, questions } as they exist in the live repo on
 *        the configured branch. Used to populate the editor on load.
 *
 * POST → body { sections?, questions? } → commits whichever files were sent
 *        to GitHub. Vercel deploys automatically on commit.
 *        Returns { ok: true, commitMessage }.
 *
 * Both methods require a valid JWT in Authorization: Bearer header.
 */

import { requireAuth } from '../_lib/auth.js'
import { readJsonFile, writeJsonFile } from '../_lib/github.js'
import { sanitizeRichSections } from '../_lib/sanitizeRich.js'

const SECTIONS_PATH = 'content/sections.json'
const QUESTIONS_PATH = 'content/questions.json'

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
      const [s, q] = await Promise.all([
        readJsonFile(SECTIONS_PATH),
        readJsonFile(QUESTIONS_PATH),
      ])
      return res.status(200).json({
        sections: JSON.parse(s.content),
        questions: JSON.parse(q.content),
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
    try {
      let wrote = 0
      let savedSections
      let savedQuestions
      if (body?.sections) {
        await writeJsonFile(SECTIONS_PATH, (live) => {
          const merged = live ? mergeKeepingUnknown(live, body.sections) : body.sections
          savedSections = sanitizeRichSections(merged)
          return savedSections
        }, 'cms: update sections')
        wrote++
      }
      if (body?.questions) {
        await writeJsonFile(QUESTIONS_PATH, (live) => {
          savedQuestions = live ? mergeKeepingUnknown(live, body.questions) : body.questions
          return savedQuestions
        }, 'cms: update questions')
        wrote++
      }
      if (wrote === 0) {
        return res.status(400).json({ error: 'nothing to save' })
      }
      return res.status(200).json({ ok: true, sections: savedSections, questions: savedQuestions })
    } catch (err) {
      return res.status(500).json({ error: err?.message || 'write failed' })
    }
  }

  res.setHeader('Allow', 'GET, POST')
  return res.status(405).json({ error: 'method not allowed' })
}
