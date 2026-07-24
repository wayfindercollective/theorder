/**
 * POST /api/admin/upload-video
 *
 * Client-upload token broker for testimonial clips. The browser talks to this
 * route via `upload()` from @vercel/blob/client: it asks here for a short-lived
 * client token, then PUTs the file STRAIGHT to Vercel Blob.
 *
 * Why not /api/admin/upload (the image route)? That one streams the file
 * through the function, and a serverless request body is capped near 4.5 MB.
 * Testimonial clips are 6–20 MB, so they can only arrive by client upload.
 *
 * Auth: the SDK's token handshake is a plain JSON POST with no Authorization
 * header of ours, so the admin JWT rides in `clientPayload` and is verified
 * here before any token is minted. An unauthenticated caller gets nothing.
 *
 * Clips land under the `videos/` prefix — the image library lists and deletes
 * `images/` only, so the two never tread on each other.
 */

import { handleUpload } from '@vercel/blob/client'
import { verifyToken } from '../_lib/auth.js'
import { getBlobToken } from '../_lib/blob.js'

// 500 MB ceiling — a hard stop on a runaway upload, not a recommendation. The
// admin UI warns well below this (a big clip is the site's slowest asset).
const MAX_BYTES = 500 * 1024 * 1024

const ALLOWED_CONTENT_TYPES = [
  'video/mp4',
  'video/quicktime',
  'video/webm',
  'video/x-m4v',
  'video/mpeg',
]

// Only the shape our client asks for: videos/<timestamp>-<safe name>.
const PATHNAME_RE = /^videos\/[A-Za-z0-9][A-Za-z0-9._-]{0,160}$/

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({ error: 'method not allowed' })
  }

  const token = getBlobToken()
  if (!token) {
    return res.status(500).json({ error: 'No Blob token found. Set IMAGES_BLOB_READ_WRITE_TOKEN (preferred) or BLOB_READ_WRITE_TOKEN.' })
  }

  let body = req.body
  if (typeof body === 'string') {
    try { body = JSON.parse(body) } catch { body = {} }
  }

  try {
    const result = await handleUpload({
      body,
      request: req,
      token,
      onBeforeGenerateToken: async (pathname, clientPayload) => {
        const v = await verifyToken(String(clientPayload || ''))
        if (!v.ok) throw new Error('invalid token')
        if (!PATHNAME_RE.test(String(pathname || ''))) {
          throw new Error('videos must upload to videos/<name>')
        }
        return {
          allowedContentTypes: ALLOWED_CONTENT_TYPES,
          maximumSizeInBytes: MAX_BYTES,
          addRandomSuffix: false,
          // Don't echo the JWT back through Blob's completion callback.
          tokenPayload: '',
        }
      },
      // Nothing to record — sections.json is written by the normal Save. The
      // callback only fires in deployed environments (Blob can't reach a dev
      // machine), so no logic may depend on it.
      onUploadCompleted: async () => {},
    })
    return res.status(200).json(result)
  } catch (err) {
    const message = err?.message || 'upload failed'
    return res.status(/invalid token/i.test(message) ? 401 : 400).json({ error: message })
  }
}
