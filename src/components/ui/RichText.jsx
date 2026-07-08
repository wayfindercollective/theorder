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
 * Font size is a Word-style NUMBER (FONT_SIZE_STEPS) picked from a dropdown or
 * stepped with A−/A+, stored as <span data-fs="N">. CSS maps the number to the
 * same absolute px across the whole site, and to the stage-proportional size in
 * presentations — so "size 8" is identical wherever it's used. (Legacy em spans
 * from the first release still parse; the editor writes data-fs now.)
 * Output is normalised; the server re-sanitises everything against the allowlist.
 */
import { useEffect, useRef, useState } from 'react'
import { useEditor, EditorContent, useEditorState, Extension, Mark } from '@tiptap/react'
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
import { BulletList, OrderedList, ListItem, ListKeymap } from '@tiptap/extension-list'
import { FONT_SIZE_STEPS, isRichEmpty, richText } from '../../lib/richtext.js'

// Numeric font-size mark → <span data-fs="N">. The number's rendered size comes
// from CSS ([data-fs] rules), so the same number means the same size everywhere.
const FsNum = Mark.create({
  name: 'fsNum',
  addAttributes() {
    return {
      size: {
        default: null,
        parseHTML: (el) => el.getAttribute('data-fs'),
        renderHTML: (attrs) => (attrs.size ? { 'data-fs': String(attrs.size) } : {}),
      },
    }
  },
  parseHTML() {
    return [{ tag: 'span[data-fs]' }]
  },
  renderHTML({ HTMLAttributes }) {
    return ['span', HTMLAttributes, 0]
  },
})

// Anchor for the A−/A+ steppers when the selection has no explicit size yet.
const DEFAULT_STEP = FONT_SIZE_STEPS.indexOf(12)

// The rendered size at the caret, converted back to the universal number scale —
// dividing out the 16:9 stage scaling in presentations (numbers are px at the
// 1280 reference width), absolute px everywhere else. Exported so an external
// toolbar (the presentation box bar) can show the current size too.
export function measureEffectiveSize(editor) {
  try {
    const dom = editor.view.domAtPos(editor.state.selection.from)
    const el = dom.node.nodeType === 3 ? dom.node.parentElement : dom.node
    if (!el || !el.closest) return ''
    const px = parseFloat(getComputedStyle(el).fontSize)
    if (!px) return ''
    const stage = el.closest('.pres-stage')
    const n = stage && stage.clientWidth ? (px * 1280) / stage.clientWidth : px
    return String(Math.round(n))
  } catch {
    return ''
  }
}

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

export function RichText({
  value, onChange, mode = 'inline', baseStyle, placeholder, withLink = false, className = '',
  // withLists: enable bullet/numbered lists (needs a block mode — lists are
  // block nodes). Off for the site's inline/heading/lines fields; on for the
  // presentation slide body so it can hold, and paste in, bulleted points.
  withLists = false,
  // externalToolbar: skip the built-in floating toolbar; the parent renders one
  // instead (the presentation box bar), driving the editor it receives via
  // onEditorReady. onFocusChange tells the parent which field is active.
  externalToolbar = false, onEditorReady, onFocusChange,
}) {
  const lastEmitted = useRef(undefined)
  const onChangeRef = useRef(onChange)
  onChangeRef.current = onChange
  const onEditorReadyRef = useRef(onEditorReady)
  onEditorReadyRef.current = onEditorReady
  const onFocusChangeRef = useRef(onFocusChange)
  onFocusChangeRef.current = onFocusChange
  const [focused, setFocused] = useState(false)

  const enterBehavior = Extension.create({
    name: 'rtEnter',
    addKeyboardShortcuts() {
      if (mode === 'heading') return { Enter: () => true, 'Shift-Enter': () => true }
      if (mode === 'inline') {
        const br = () => this.editor.commands.setHardBreak()
        return { Enter: br, 'Shift-Enter': br }
      }
      if (mode === 'block' && withLists) {
        // Body with lists: keep the old tight line-break on Enter for ordinary
        // text, but hand Enter to the list extensions (new bullet / exit list)
        // when the caret is inside a list item.
        return {
          Enter: () => {
            if (this.editor.isActive('listItem')) return false
            return this.editor.commands.setHardBreak()
          },
        }
      }
      return {}
    },
  })

  const oneBlock = mode === 'heading' || mode === 'inline'
  const DocNode = oneBlock ? Document.extend({ content: 'block' }) : Document

  const editor = useEditor({
    extensions: [
      DocNode, Paragraph, Text, Bold, Italic, Underline, History, HardBreak,
      TextStyle, FontSize, // legacy em spans (first release) still parse
      FsNum,
      // Lists (opt-in). ListKeymap makes Backspace/Delete at item edges behave.
      ...(withLists ? [BulletList, OrderedList, ListItem, ListKeymap] : []),
      ...(withLink ? [Link.configure({ openOnClick: false, autolink: false })] : []),
      enterBehavior,
    ],
    content: toContent(value, mode),
    onUpdate: ({ editor }) => {
      const out = serialize(editor, mode)
      lastEmitted.current = out
      onChangeRef.current(out)
    },
    onFocus: () => { setFocused(true); onFocusChangeRef.current?.(true) },
    onBlur: () => { setFocused(false); onFocusChangeRef.current?.(false) },
  })

  // Hand the editor instance to an external toolbar (presentations).
  useEffect(() => {
    if (!editor) return
    onEditorReadyRef.current?.(editor)
    return () => onEditorReadyRef.current?.(null)
  }, [editor])

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
            bulletList: editor.isActive('bulletList'),
            orderedList: editor.isActive('orderedList'),
            fsNum: editor.getAttributes('fsNum').size || '',
            // selection position, so the toolbar re-renders (and re-measures the
            // effective size) whenever the caret moves between sized runs
            caret: `${editor.state.selection.from}:${editor.state.selection.to}`,
          }
        : {},
  })

  if (!editor) return null

  // Apply a numeric size to the selection (also clears any legacy em span so the
  // two systems can't stack). '' = back to the field's default size.
  const applySize = (v) => {
    const chain = editor.chain().focus().unsetFontSize()
    if (!v) chain.unsetMark('fsNum').run()
    else chain.setMark('fsNum', { size: String(v) }).run()
  }

  const shownSize = s.fsNum || measureEffectiveSize(editor)
  // If the current size isn't one of the standard steps (e.g. a field's default
  // lands on 40), list it anyway so the dropdown can display it truthfully.
  const sizeOptions = shownSize && !FONT_SIZE_STEPS.includes(Number(shownSize))
    ? [...FONT_SIZE_STEPS, Number(shownSize)].sort((a, b) => a - b)
    : FONT_SIZE_STEPS

  // Step relative to the size currently shown (Word-style): next step up/down
  // from the effective size, whether or not an explicit size is set yet.
  const stepSize = (delta) => {
    const curN = Number(shownSize) || FONT_SIZE_STEPS[DEFAULT_STEP]
    if (delta > 0) {
      const next = FONT_SIZE_STEPS.find((n) => n > curN)
      applySize(next ?? FONT_SIZE_STEPS[FONT_SIZE_STEPS.length - 1])
    } else {
      const smaller = FONT_SIZE_STEPS.filter((n) => n < curN)
      applySize(smaller.length ? smaller[smaller.length - 1] : FONT_SIZE_STEPS[0])
    }
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
      {/* preventDefault keeps the editor's selection while clicking buttons — but
          NOT on the <select>, which needs the default to open its native popup
          (the popup is OS-rendered, so it can never be clipped by a container). */}
      {!externalToolbar && (
      <div className="rt-toolbar" onMouseDown={(e) => { if (e.target.tagName !== 'SELECT') e.preventDefault() }}>
        <button type="button" className={s.bold ? 'on' : ''} onClick={() => editor.chain().focus().toggleBold().run()} title="Bold (Ctrl+B)"><strong>B</strong></button>
        <button type="button" className={s.italic ? 'on' : ''} onClick={() => editor.chain().focus().toggleItalic().run()} title="Italic (Ctrl+I)"><em>i</em></button>
        <button type="button" className={s.underline ? 'on' : ''} onClick={() => editor.chain().focus().toggleUnderline().run()} title="Underline (Ctrl+U)"><u>U</u></button>
        <i className="rt-sep" />
        <button type="button" onClick={() => stepSize(-1)} title="Smaller">A−</button>
        <select
          className="rt-size"
          value={shownSize}
          onChange={(e) => applySize(e.target.value)}
          title="Font size — the same number is the same size everywhere"
          aria-label="Font size"
        >
          <option value="">Default</option>
          {sizeOptions.map((n) => (
            <option key={n} value={String(n)}>{n}</option>
          ))}
        </select>
        <button type="button" onClick={() => stepSize(1)} title="Bigger">A+</button>
        {withLists && (
          <>
            <i className="rt-sep" />
            <button type="button" className={s.bulletList ? 'on' : ''} onClick={() => editor.chain().focus().toggleBulletList().run()} title="Bullet list">•</button>
            <button type="button" className={s.orderedList ? 'on' : ''} onClick={() => editor.chain().focus().toggleOrderedList().run()} title="Numbered list">1.</button>
          </>
        )}
        {withLink && (
          <>
            <i className="rt-sep" />
            <button type="button" className={s.link ? 'on' : ''} onClick={toggleLink} title="Link">link</button>
          </>
        )}
      </div>
      )}
      <div className="rt-content-wrap">
        {placeholder && isRichEmpty(value) && (
          <span className="rt-placeholder" aria-hidden="true" style={baseStyle}>{placeholder}</span>
        )}
        <EditorContent editor={editor} className="rt-content" style={baseStyle} />
      </div>
    </div>
  )
}
