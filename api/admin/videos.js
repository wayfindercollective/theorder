/**
 * /api/admin/videos
 *
 * GET    → every clip uploaded through the Testimonials tab (the `videos/`
 *          prefix in Vercel Blob). Returns [{ url, pathname, size, uploadedAt }].
 *
 * DELETE → ?url=<blob-url>  removes one clip from storage.
 *
 * The mirror of /api/admin/images, kept separate so neither route can reach
 * into the other's prefix. Both require a valid JWT.
 */

import { list, del } from '@vercel/blob'
import { requireAuth } from '../_lib/auth.js'
import { getBlobToken } from '../_lib/blob.js'

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
        const page = await list({ prefix: 'videos/', cursor, limit: 1000, token })
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
      return res.status(200).json({ videos: all })
    } catch (err) {
      return res.status(500).json({ error: err?.message || 'list failed' })
    }
  }

  if (req.method === 'DELETE') {
    const target = req.query?.url || ''
    if (!target || typeof target !== 'string') {
      return res.status(400).json({ error: 'missing url' })
    }
    // Only clips this endpoint's own upload path creates (videos/…) may be
    // deleted — never an image, and never anything else in the store.
    let parsed = null
    try { parsed = new URL(target) } catch { /* invalid URL */ }
    const isUploadedVideo = !!parsed
      && parsed.protocol === 'https:'
      && parsed.hostname.endsWith('.public.blob.vercel-storage.com')
      && parsed.pathname.startsWith('/videos/')
    if (!isUploadedVideo) {
      return res.status(400).json({ error: 'not an uploaded video URL' })
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
