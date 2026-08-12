/**
 * POST /api/admin/refresh
 *
 * Swaps a still-valid JWT for a fresh 24h one — the sliding session that keeps
 * an editor who is sitting in /admin or /presentations signed in indefinitely.
 * An EXPIRED token cannot be refreshed (requireAuth rejects it), so being away
 * for more than a day still means signing in again.
 */

import { issueToken, requireAuth } from '../_lib/auth.js'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({ error: 'method not allowed' })
  }
  const payload = await requireAuth(req, res)
  if (!payload) return
  try {
    const token = await issueToken(payload.sub || 'admin')
    return res.status(200).json({ token })
  } catch (err) {
    return res.status(500).json({ error: err?.message || 'token issue failed' })
  }
}
