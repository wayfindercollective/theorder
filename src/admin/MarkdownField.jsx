/**
 * MarkdownField — textarea with an optional preview pane.
 *
 * Toolbar buttons insert markdown at the selection.
 * Preview uses the same renderer the public site uses, so what you see
 * in preview is exactly what visitors see.
 */

import { useRef, useState } from 'react'
import { renderMarkdown } from '../lib/markdown.js'

function wrapSelection(textarea, prefix, suffix = prefix) {
  const start = textarea.selectionStart
  const end = textarea.selectionEnd
  const value = textarea.value
  const before = value.slice(0, start)
  const sel = value.slice(start, end)
  const after = value.slice(end)
  const next = before + prefix + sel + suffix + after
  return {
    value: next,
    selStart: start + prefix.length,
    selEnd: start + prefix.length + sel.length,
  }
}

export function MarkdownField({ id, value, onChange, rows = 4, placeholder, label, hint }) {
  const taRef = useRef(null)
  const [preview, setPreview] = useState(false)

  const apply = (prefix, suffix) => {
    const ta = taRef.current
    if (!ta) return
    const { value: next, selStart, selEnd } = wrapSelection(ta, prefix, suffix)
    onChange(next)
    requestAnimationFrame(() => {
      ta.focus()
      ta.setSelectionRange(selStart, selEnd)
    })
  }

  const insertLink = () => {
    const ta = taRef.current
    if (!ta) return
    const sel = ta.value.slice(ta.selectionStart, ta.selectionEnd) || 'link text'
    const url = window.prompt('URL?', 'https://')
    if (!url) return
    const { value: next, selStart, selEnd } = wrapSelection(ta, '[', `](${url})`)
    // wrapSelection put empty selection markers around the original; rewrite the selected portion
    const before = next.slice(0, selStart)
    const after = next.slice(selEnd)
    const final = before + sel + after
    onChange(final)
    requestAnimationFrame(() => {
      ta.focus()
      ta.setSelectionRange(selStart, selStart + sel.length)
    })
  }

  return (
    <label className="admin-field admin-field-md" htmlFor={id}>
      {label && <span className="admin-field-label">{label}</span>}
      <div className="md-toolbar">
        <button type="button" className="md-toolbtn" onClick={() => apply('**', '**')} title="Bold (Ctrl+B)"><strong>B</strong></button>
        <button type="button" className="md-toolbtn" onClick={() => apply('*', '*')} title="Italic (Ctrl+I)"><em>i</em></button>
        <button type="button" className="md-toolbtn" onClick={insertLink} title="Link">link</button>
        <button
          type="button"
          className={'md-toolbtn md-toggle' + (preview ? ' active' : '')}
          onClick={() => setPreview((p) => !p)}
          title={preview ? 'Edit' : 'Preview'}
        >
          {preview ? 'Edit' : 'Preview'}
        </button>
      </div>
      {preview ? (
        <div
          className="md-preview"
          dangerouslySetInnerHTML={{ __html: renderMarkdown(value || '') }}
        />
      ) : (
        <textarea
          id={id}
          ref={taRef}
          className="input-field admin-textarea"
          rows={rows}
          value={value || ''}
          placeholder={placeholder}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.ctrlKey || e.metaKey) {
              if (e.key === 'b') { e.preventDefault(); apply('**', '**') }
              if (e.key === 'i') { e.preventDefault(); apply('*', '*') }
            }
          }}
        />
      )}
      {hint && <span className="admin-field-hint">{hint}</span>}
    </label>
  )
}
