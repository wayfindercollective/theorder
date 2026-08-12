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
 * Query:
 *   sha — optional git commit sha to wait for. When given, the latest
 *   deployment only counts if its meta.githubCommitSha matches; otherwise the
 *   response is { state: "BUILDING", pending: true } so the poller keeps
 *   waiting instead of trusting a PREVIOUS deploy's READY (a poll landing
 *   before Vercel registers the new build used to turn the badge green early).
 *
 * Response:
 *   { state, url, createdAt, name, pending? }
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

    const wantSha = String(req.query?.sha || '')
    const depSha = dep.meta?.githubCommitSha || ''
    if (wantSha && depSha && depSha !== wantSha) {
      // The commit we just made is not what Vercel lists as latest yet —
      // either its build hasn't registered, or something newer superseded it.
      // Report "still building"; the poller's timeout bounds the wait.
      return res.status(200).json({ state: 'BUILDING', pending: true, url: null, createdAt: null, name: dep.name || null })
    }

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
