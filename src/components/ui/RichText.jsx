/**
 * RichText — the shared WYSIWYG editor (TipTap v3) for /admin and /presentations.
 * Select text → Bold / Italic / Underline / A−·A+ font size applies to that run.
 *
 * Lives in lazy chunks only (admin + presentations); never in the public bundle.
 *
 * Modes:
 *   heading — one line, Enter disabled, emits inline HTML (or '')
 *   inline  — one block, Enter = <br>, emits inline HTML (or '')
 *   block   — paragraphs, emits <p>… HTML (or '')   [code.intro]
 *   lines   — paragraphs, value is an ARRAY of inline-HTML lines [truth.provocation]
 *
 * Font size is relative em (FONT_SIZES) so it scales with the field's base size.
 * Output is normalised; the server re-sanitises everything against the allowlist.
 */
import { useEffect, useRef, useState } from 'react'
import { useEditor, EditorContent, useEditorState, Extension } from '@tiptap/react'
import Document from '@tiptap/extension-document'
import Paragraph from '@tiptap/extension-paragraph'
import Text from '@tiptap/extension-text'
import Bold from '@tiptap/extension-bold'
import Italic from '@tiptap/extension-italic'
import Underline from '@tiptap/extension-underline'
import History from '@tiptap/extension-history'
import HardBreak from '@tiptap/extension-hard-break'
import Link from '@tiptap/extension-link'
import { TextStyle, FontSize } from '@tiptap/extension-text-style'
import { FONT_SIZES, isRichEmpty, richText } from '../../lib/richtext.js'

const ALIGN = { left: 'L', center: 'C', right: 'R' } // (presentation passes alignment via baseStyle)

// --- serialisation helpers ---
const toInline = (html) =>
  String(html || '')
    .replace(/<\/p>\s*<p[^>]*>/gi, '<br>')
    .replace(/^\s*<p[^>]*>/i, '')
    .replace(/<\/p>\s*$/i, '')
    .trim()

// paragraphs never nest and marks never cross a paragraph boundary, so matching
// each <p>…</p> inner is a safe split into lines.
const toLines = (html) => {
  const out = []
  const re = /<p[^>]*>([\s\S]*?)<\/p>/gi
  let m
  while ((m = re.exec(String(html || '')))) out.push(richText(m[1]) ? m[1].trim() : '')
  while (out.length && out[out.length - 1] === '') out.pop() // trim trailing gaps
  return out
}

function serialize(editor, mode) {
  const html = editor.getHTML()
  if (mode === 'lines') return toLines(html)
  if (mode === 'block') return isRichEmpty(html) ? '' : html
  const inline = toInline(html)
  return isRichEmpty(inline) ? '' : inline
}

function toContent(value, mode) {
  if (mode === 'lines') {
    const arr = Array.isArray(value) ? value : []
    return arr.length ? arr.map((l) => `<p>${l || ''}</p>`).join('') : '<p></p>'
  }
  if (mode === 'block') return value || '<p></p>'
  return value ? `<p>${value}</p>` : '<p></p>'
}

const sameValue = (a, b, mode) =>
  mode === 'lines'
    ? JSON.stringify(a || []) === JSON.stringify(b || [])
    : (a || '') === (b || '')

export function RichText({ value, onChange, mode = 'inline', baseStyle, placeholder, withLink = false, className = '' }) {
  const lastEmitted = useRef(undefined)
  const onChangeRef = useRef(onChange)
  onChangeRef.current = onChange
  const [focused, setFocused] = useState(false)

  const enterBehavior = Extension.create({
    name: 'rtEnter',
    addKeyboardShortcuts() {
      if (mode === 'heading') return { Enter: () => true, 'Shift-Enter': () => true }
      if (mode === 'inline') {
        const br = () => this.editor.commands.setHardBreak()
        return { Enter: br, 'Shift-Enter': br }
      }
      return {}
    },
  })

  const oneBlock = mode === 'heading' || mode === 'inline'
  const DocNode = oneBlock ? Document.extend({ content: 'block' }) : Document

  const editor = useEditor({
    extensions: [
      DocNode, Paragraph, Text, Bold, Italic, Underline, History, HardBreak,
      TextStyle, FontSize,
      ...(withLink ? [Link.configure({ openOnClick: false, autolink: false })] : []),
      enterBehavior,
    ],
    content: toContent(value, mode),
    onUpdate: ({ editor }) => {
      const out = serialize(editor, mode)
      lastEmitted.current = out
      onChangeRef.current(out)
    },
    onFocus: () => setFocused(true),
    onBlur: () => setFocused(false),
  })

  // External value change → load it without emitting (so loading never marks dirty).
  useEffect(() => {
    if (!editor) return
    if (sameValue(value, lastEmitted.current, mode)) return
    lastEmitted.current = value
    editor.commands.setContent(toContent(value, mode), { emitUpdate: false })
  }, [value, editor, mode])

  const s = useEditorState({
    editor,
    selector: ({ editor }) =>
      editor
        ? {
            bold: editor.isActive('bold'),
            italic: editor.isActive('italic'),
            underline: editor.isActive('underline'),
            link: editor.isActive('link'),
            fontSize: editor.getAttributes('textStyle').fontSize || '1em',
          }
        : {},
  })

  if (!editor) return null

  const cur = () => {
    const i = FONT_SIZES.indexOf(s.fontSize)
    return i === -1 ? FONT_SIZES.indexOf('1em') : i
  }
  const stepSize = (delta) => {
    const i = Math.min(FONT_SIZES.length - 1, Math.max(0, cur() + delta))
    const next = FONT_SIZES[i]
    if (next === '1em') editor.chain().focus().unsetFontSize().run()
    else editor.chain().focus().setFontSize(next).run()
  }
  const toggleLink = () => {
    const prev = editor.getAttributes('link').href
    const url = window.prompt('Link URL (blank to remove)', prev || 'https://')
    if (url === null) return
    if (url.trim() === '') editor.chain().focus().unsetLink().run()
    else editor.chain().focus().extendMarkRange('link').setLink({ href: url.trim() }).run()
  }

  return (
    <div className={`rt ${focused ? 'is-focused' : ''} ${className}`}>
      <div className="rt-toolbar" onMouseDown={(e) => e.preventDefault()}>
        <button type="button" className={s.bold ? 'on' : ''} onClick={() => editor.chain().focus().toggleBold().run()} title="Bold (Ctrl+B)"><strong>B</strong></button>
        <button type="button" className={s.italic ? 'on' : ''} onClick={() => editor.chain().focus().toggleItalic().run()} title="Italic (Ctrl+I)"><em>i</em></button>
        <button type="button" className={s.underline ? 'on' : ''} onClick={() => editor.chain().focus().toggleUnderline().run()} title="Underline (Ctrl+U)"><u>U</u></button>
        <i className="rt-sep" />
        <button type="button" onClick={() => stepSize(-1)} title="Smaller">A−</button>
        <button type="button" onClick={() => stepSize(1)} title="Bigger">A+</button>
        {withLink && (
          <>
            <i className="rt-sep" />
            <button type="button" className={s.link ? 'on' : ''} onClick={toggleLink} title="Link">link</button>
          </>
        )}
      </div>
      <div className="rt-content-wrap">
        {placeholder && isRichEmpty(value) && (
          <span className="rt-placeholder" aria-hidden="true" style={baseStyle}>{placeholder}</span>
        )}
        <EditorContent editor={editor} className="rt-content" style={baseStyle} />
      </div>
    </div>
  )
}
