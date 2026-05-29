/**
 * POST /api/admin/login
 *
 * Body: { password: string }
 * Returns: { token: string }  (24h JWT)
 *
 * Verifies the submitted password against the ADMIN_PASSWORD env var using a
 * constant-time comparison, then issues a JWT signed with ADMIN_JWT_SECRET.
 */

import { issueToken, timingSafeEqualStr } from '../_lib/auth.js'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({ error: 'method not allowed' })
  }

  const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD
  if (!ADMIN_PASSWORD) {
    return res.status(500).json({ error: 'ADMIN_PASSWORD not configured' })
  }

  let body = req.body
  if (typeof body === 'string') {
    try { body = JSON.parse(body) } catch { body = {} }
  }
  const password = body?.password || ''
  if (!timingSafeEqualStr(password, ADMIN_PASSWORD)) {
    // Small fixed delay to make brute-force unappealing
    await new Promise((r) => setTimeout(r, 600))
    return res.status(401).json({ error: 'incorrect password' })
  }

  try {
    const token = await issueToken('admin')
    return res.status(200).json({ token })
  } catch (err) {
    return res.status(500).json({ error: err?.message || 'token issue failed' })
  }
}
