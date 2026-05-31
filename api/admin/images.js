/**
 * /api/admin/images
 *
 * GET    → list every uploaded image in the `images/` prefix of Vercel Blob.
 *          Returns [{ url, pathname, size, uploadedAt }].
 *
 * DELETE → ?url=<blob-url>  removes one image from blob storage.
 *
 * Both require a valid JWT.
 */

import { list, del } from '@vercel/blob'
import { requireAuth } from '../_lib/auth.js'

function getBlobToken() {
  return process.env.IMAGES_BLOB_READ_WRITE_TOKEN || process.env.BLOB_READ_WRITE_TOKEN || ''
}

export default async function handler(req, res) {
  const payload = await requireAuth(req, res)
  if (!payload) return

  const token = getBlobToken()
  if (!token) return res.status(500).json({ error: 'No Blob token configured' })

  if (req.method === 'GET') {
    try {
      const all = []
      let cursor
      do {
        const page = await list({ prefix: 'images/', cursor, limit: 1000, token })
        for (const blob of page.blobs || []) {
          all.push({
            url: blob.url,
            pathname: blob.pathname,
            size: blob.size,
            uploadedAt: blob.uploadedAt,
          })
        }
        cursor = page.cursor
      } while (cursor)

      all.sort((a, b) => String(b.uploadedAt).localeCompare(String(a.uploadedAt)))
      return res.status(200).json({ images: all })
    } catch (err) {
      return res.status(500).json({ error: err?.message || 'list failed' })
    }
  }

  if (req.method === 'DELETE') {
    const target = req.query?.url || ''
    if (!target || typeof target !== 'string') {
      return res.status(400).json({ error: 'missing url' })
    }
    try {
      await del(target, { token })
      return res.status(200).json({ ok: true })
    } catch (err) {
      return res.status(500).json({ error: err?.message || 'delete failed' })
    }
  }

  res.setHeader('Allow', 'GET, DELETE')
  return res.status(405).json({ error: 'method not allowed' })
}
