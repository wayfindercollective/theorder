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

const SECTIONS_PATH = 'content/sections.json'
const QUESTIONS_PATH = 'content/questions.json'

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
    const tasks = []
    if (body?.sections) {
      tasks.push(writeJsonFile(SECTIONS_PATH, body.sections, 'cms: update sections'))
    }
    if (body?.questions) {
      tasks.push(writeJsonFile(QUESTIONS_PATH, body.questions, 'cms: update questions'))
    }
    if (tasks.length === 0) {
      return res.status(400).json({ error: 'nothing to save' })
    }
    try {
      await Promise.all(tasks)
      return res.status(200).json({ ok: true })
    } catch (err) {
      return res.status(500).json({ error: err?.message || 'write failed' })
    }
  }

  res.setHeader('Allow', 'GET, POST')
  return res.status(405).json({ error: 'method not allowed' })
}
