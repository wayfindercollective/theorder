/**
 * Shared Vercel Blob helpers for /api/* routes.
 *
 * Token precedence matches the existing image routes so every route hits the
 * same store: IMAGES_BLOB_READ_WRITE_TOKEN (preferred, prefixed name some
 * projects use) falls back to the default BLOB_READ_WRITE_TOKEN.
 */
export function getBlobToken() {
  return process.env.IMAGES_BLOB_READ_WRITE_TOKEN || process.env.BLOB_READ_WRITE_TOKEN || ''
}
