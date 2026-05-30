/**
 * GET /api/admin/diag — auth-gated. Returns which env vars the server can see,
 * without leaking their values. Used to debug missing/misnamed config.
 */

import { requireAuth } from '../_lib/auth.js'

const CHECKS = [
  'ADMIN_PASSWORD',
  'ADMIN_JWT_SECRET',
  'GITHUB_TOKEN',
  'GITHUB_REPO',
  'GITHUB_BRANCH',
  'BLOB_READ_WRITE_TOKEN',
  'IMAGES_BLOB_READ_WRITE_TOKEN',
]

export default async function handler(req, res) {
  const payload = await requireAuth(req, res)
  if (!payload) return

  const present = {}
  const previews = {}
  for (const name of CHECKS) {
    const val = process.env[name]
    present[name] = !!val
    if (val) {
      // Show only first 8 + last 4 chars so the user can confirm WHICH token is set
      // without leaking the secret.
      previews[name] = val.length > 16
        ? `${val.slice(0, 8)}…${val.slice(-4)} (len ${val.length})`
        : `*** (len ${val.length})`
    }
  }

  return res.status(200).json({
    runtime: 'vercel-node',
    nodeVersion: process.version,
    present,
    previews,
    blobTokenResolution: process.env.IMAGES_BLOB_READ_WRITE_TOKEN
      ? 'using IMAGES_BLOB_READ_WRITE_TOKEN'
      : process.env.BLOB_READ_WRITE_TOKEN
        ? 'using BLOB_READ_WRITE_TOKEN'
        : 'no blob token found',
  })
}
