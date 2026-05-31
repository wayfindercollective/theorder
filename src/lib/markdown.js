/**
 * Tiny inline-markdown renderer.
 *
 * Supports the only constructs that fit this design:
 *   **bold**   *italic*   [text](url)   \n line break   \n\n paragraph
 *
 * No headers, no lists, no code blocks — those would clash with the
 * paragraph-prose voice and we don't want them being typed by accident.
 *
 * Returns sanitized HTML — all input is HTML-escaped before any markdown
 * tokens are processed.
 *
 * Two flavors:
 *   renderMarkdown(text)        — block: \n\n → <p>, \n → <br>
 *   renderInlineMarkdown(text)  — inline only: \n → <br>, no <p>
 *
 * Public site components already wrap content in <p> / <span> elements,
 * so they use the inline flavor. The admin preview uses the block flavor.
 */

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function escapeAttr(s) {
  return String(s).replace(/"/g, '&quot;')
}

function applyInlineTokens(escaped) {
  let html = escaped
  html = html.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (_, label, url) => {
    if (!/^(https?:|mailto:)/i.test(url)) return label
    return `<a href="${escapeAttr(url)}" target="_blank" rel="noopener noreferrer">${label}</a>`
  })
  html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
  html = html.replace(/(^|[^*])\*([^*\n]+)\*/g, '$1<em>$2</em>')
  return html
}

export function renderInlineMarkdown(text) {
  if (text == null) return ''
  return applyInlineTokens(escapeHtml(text)).replace(/\n/g, '<br>')
}

export function renderMarkdown(text, pClass = '') {
  if (text == null) return ''
  const blocks = String(text).split(/\n{2,}/)
  const open = pClass ? `<p class="${escapeAttr(pClass)}">` : '<p>'
  return blocks
    .map((block) => {
      const inline = applyInlineTokens(escapeHtml(block)).replace(/\n/g, '<br>')
      return `${open}${inline}</p>`
    })
    .join('')
}

export function mdHtml(text, pClass = '') {
  return { __html: renderMarkdown(text, pClass) }
}

export function mdInline(text) {
  return { __html: renderInlineMarkdown(text) }
}
