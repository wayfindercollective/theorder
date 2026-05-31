/**
 * GET /api/admin/deploy-status
 *
 * Returns the state of the latest Vercel production deployment for this
 * project. Used by the admin editor to show a "Building… / Live" indicator
 * after a save.
 *
 * Env vars:
 *   VERCEL_API_TOKEN  — Vercel personal access token (Account → Tokens)
 *   VERCEL_PROJECT_ID — the project's id (Project → Settings → General)
 *   VERCEL_TEAM_ID    — optional, only if the project is under a team
 *
 * Response:
 *   { state, url, createdAt, name }
 *   state ∈ "READY" | "BUILDING" | "QUEUED" | "ERROR" | "CANCELED" | "INITIALIZING"
 *
 * If env vars are missing, returns { state: "UNKNOWN" } so the client can
 * gracefully fall back to its static message.
 */

import { requireAuth } from '../_lib/auth.js'

export default async function handler(req, res) {
  const payload = await requireAuth(req, res)
  if (!payload) return

  const token = process.env.VERCEL_API_TOKEN
  const projectId = process.env.VERCEL_PROJECT_ID
  const teamId = process.env.VERCEL_TEAM_ID

  if (!token || !projectId) {
    return res.status(200).json({ state: 'UNKNOWN', reason: 'missing VERCEL_API_TOKEN or VERCEL_PROJECT_ID' })
  }

  const params = new URLSearchParams({
    projectId,
    limit: '1',
    target: 'production',
  })
  if (teamId) params.set('teamId', teamId)

  const url = `https://api.vercel.com/v6/deployments?${params.toString()}`
  try {
    const r = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
    })
    if (!r.ok) {
      const text = await r.text().catch(() => '')
      return res.status(502).json({ state: 'UNKNOWN', reason: `vercel ${r.status}: ${text.slice(0, 200)}` })
    }
    const data = await r.json()
    const dep = data.deployments?.[0]
    if (!dep) return res.status(200).json({ state: 'UNKNOWN', reason: 'no deployments returned' })

    return res.status(200).json({
      state: dep.state || dep.readyState || 'UNKNOWN',
      url: dep.url ? `https://${dep.url}` : null,
      createdAt: dep.created || dep.createdAt || null,
      name: dep.name || null,
    })
  } catch (err) {
    return res.status(502).json({ state: 'UNKNOWN', reason: err?.message || 'fetch failed' })
  }
}
