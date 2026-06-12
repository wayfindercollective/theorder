import { readFileSync } from 'node:fs'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const SITE_ORIGIN = 'https://theorder.global'

/**
 * Inject the CMS-editable share metadata (content/sections.json → meta) into
 * index.html at build time. Link-preview scrapers (iMessage, WhatsApp,
 * Facebook, LinkedIn…) read the raw HTML and never run JS, so this is the
 * only way CMS edits can reach them. The values in index.html act as
 * fallbacks if the meta block is missing.
 */
function shareMetaPlugin() {
  return {
    name: 'inject-share-meta',
    transformIndexHtml(html) {
      let meta
      try {
        meta = JSON.parse(readFileSync('content/sections.json', 'utf8')).meta
      } catch {
        return html
      }
      if (!meta) return html

      const esc = (s) => String(s)
        .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;')
      // Use replacer functions — `$` in CMS text must not be treated as a
      // regex replacement pattern.
      const setAttr = (h, marker, value) =>
        h.replace(new RegExp(`(${marker} content=")[^"]*(")`), (_, a, b) => a + esc(value) + b)

      if (meta.title) {
        html = html.replace(/<title>[^<]*<\/title>/, () => `<title>${esc(meta.title)}</title>`)
        html = setAttr(html, 'property="og:title"', meta.title)
      }
      if (meta.description) {
        html = setAttr(html, 'name="description"', meta.description)
        html = setAttr(html, 'property="og:description"', meta.description)
      }
      if (meta.shareImage) {
        const abs = /^https?:\/\//.test(meta.shareImage)
          ? meta.shareImage
          : SITE_ORIGIN + meta.shareImage
        html = setAttr(html, 'property="og:image"', abs)
      }
      return html
    },
  }
}

export default defineConfig({
  plugins: [react(), shareMetaPlugin()],
  server: {
    port: 5173,
    host: true,
  },
})
