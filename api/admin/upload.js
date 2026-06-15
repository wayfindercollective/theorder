/**
 * POST /api/admin/upload
 *
 * Body: multipart/form-data with field "file" (image)
 *       OR raw body with header X-Filename + Content-Type
 *
 * Auth: Bearer JWT.
 *
 * Uploads the file to Vercel Blob and returns { url, path }.
 * Use the returned URL as the image src in sections.json.
 *
 * Free Blob tier: 1 GB storage + 1 GB bandwidth/month. Plenty for a marketing
 * site with 10–20 images.
 */

import { put } from '@vercel/blob'
import { requireAuth } from '../_lib/auth.js'
import { getBlobToken } from '../_lib/blob.js'

export const config = {
  api: {
    bodyParser: false,
  },
}

function safeName(name) {
  return (name || 'upload')
    .replace(/[^a-zA-Z0-9._-]+/g, '-')
    .slice(-128)
}

async function readRawBody(req) {
  const chunks = []
  for await (const chunk of req) chunks.push(chunk)
  return Buffer.concat(chunks)
}

export default async function handler(req, res) {
  const payload = await requireAuth(req, res)
  if (!payload) return

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({ error: 'method not allowed' })
  }

  const token = getBlobToken()
  if (!token) {
    return res.status(500).json({ error: 'No Blob token found. Set IMAGES_BLOB_READ_WRITE_TOKEN (preferred) or BLOB_READ_WRITE_TOKEN.' })
  }

  const filename = safeName(req.headers['x-filename'] || `upload-${Date.now()}`)
  const contentType = req.headers['content-type'] || 'application/octet-stream'

  try {
    const body = await readRawBody(req)
    if (body.length === 0) return res.status(400).json({ error: 'empty body' })
    if (body.length > 8 * 1024 * 1024) {
      return res.status(413).json({ error: 'file too large (max 8 MB)' })
    }
    const blob = await put(`images/${Date.now()}-${filename}`, body, {
      access: 'public',
      contentType,
      addRandomSuffix: false,
      token,
    })
    return res.status(200).json({ url: blob.url, path: blob.pathname })
  } catch (err) {
    return res.status(500).json({ error: err?.message || 'upload failed' })
  }
}
