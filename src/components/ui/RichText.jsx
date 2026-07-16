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
import { Plugin } from '@tiptap/pm/state'
import { canJoin } from '@tiptap/pm/transform'
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

// ── List behaviour fixes (slide bodies, withLists only) ─────────────────────
//
// 1. Typing "- " / "1. " no longer auto-converts into a list. The conversion
//    fired in plain paragraphs but not inside list items, so typed hyphens
//    survived in some lines and became • bullets in others — the "irregular
//    hyphens". Hyphens now always stay exactly as typed; bullets come from
//    the toolbar buttons.
const BulletListManual = BulletList.extend({ addInputRules: () => [] })
const OrderedListManual = OrderedList.extend({ addInputRules: () => [] })

const isListNode = (n) => !!n && (n.type.name === 'bulletList' || n.type.name === 'orderedList')

// 2. Deleting the FIRST bullet lifts it into an empty paragraph ABOVE the
//    list. At the top of the box, Backspace in that paragraph then did
//    nothing at all, forever — the line could never be removed ("stuck in a
//    loop"). Backspace/Delete in an empty top-level paragraph that touches a
//    list now removes the paragraph (the caret lands in the list).
// 3. Deleting a middle bullet splits one list into two adjacent lists —
//    identical-looking in the editor, but with doubled margins and restarted
//    numbering when presented. Adjacent same-type lists auto-join.
const ListFixes = Extension.create({
  name: 'rtListFixes',
  priority: 110, // ahead of ListKeymap (100) so these keys are seen first

  addKeyboardShortcuts() {
    const removeEmptyParaTouchingList = (editor, { needListOrEdgeAbove }) => {
      const { state } = editor
      const { $from, empty } = state.selection
      if (!empty || $from.depth !== 1) return false
      const para = $from.parent
      if (para.type.name !== 'paragraph' || para.childCount !== 0) return false
      const index = $from.index(0)
      const after = index + 1 < state.doc.childCount ? state.doc.child(index + 1) : null
      const before = index > 0 ? state.doc.child(index - 1) : null
      if (!isListNode(after)) return false
      if (needListOrEdgeAbove && before && !isListNode(before)) return false
      const pos = $from.before(1)
      return editor.chain().deleteRange({ from: pos, to: pos + para.nodeSize }).run()
    }
    return {
      // Backspace steps in only where the default did nothing (top of the
      // box) or sits between two lists; under a paragraph it joins normally.
      Backspace: ({ editor }) => removeEmptyParaTouchingList(editor, { needListOrEdgeAbove: true }),
      // Forward-delete from the empty line would unwrap the first bullet
      // into it; removing the line is what the key means here.
      Delete: ({ editor }) => removeEmptyParaTouchingList(editor, { needListOrEdgeAbove: false }),
    }
  },

  addProseMirrorPlugins() {
    return [
      new Plugin({
        appendTransaction: (transactions, _oldState, state) => {
          if (!transactions.some((t) => t.docChanged)) return null
          const { doc } = state
          const boundaries = []
          let pos = 0
          for (let i = 0; i < doc.childCount - 1; i++) {
            const child = doc.child(i)
            pos += child.nodeSize
            if (isListNode(child) && doc.child(i + 1).type === child.type) boundaries.push(pos)
          }
          if (!boundaries.length) return null
          // End-to-start so earlier boundary positions stay valid after joins.
          const tr = state.tr
          for (let i = boundaries.length - 1; i >= 0; i--) {
            if (canJoin(tr.doc, boundaries[i])) tr.join(boundaries[i])
          }
          return tr.steps.length ? tr : null
        },
      }),
    ]
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

// Legacy slide bodies wrote hard breaks (<br>) between lines, which made every
// line part of ONE paragraph — so toggling a bullet list swallowed the whole
// body into a single bullet. New content uses real paragraphs; this splits the
// old <br>-joined paragraphs into real ones on load (browser only), re-opening
// any inline marks (<strong>a<br>b</strong>) so no formatting is lost.
const splitLegacyBreaks = (html) => {
  const s = String(html || '')
  if (typeof document === 'undefined' || !/<br[\s/>]/i.test(s)) return s
  const src = document.createElement('div')
  src.innerHTML = s
  const out = document.createElement('div')
  for (const block of Array.from(src.childNodes)) {
    if (block.nodeName !== 'P') { out.appendChild(block.cloneNode(true)); continue }
    let p = document.createElement('p')
    out.appendChild(p)
    let insert = p
    const newParagraph = () => {
      const chain = []
      for (let el = insert; el !== p; el = el.parentNode) chain.unshift(el)
      p = document.createElement('p')
      out.appendChild(p)
      insert = p
      for (const w of chain) insert = insert.appendChild(w.cloneNode(false))
    }
    const walk = (node) => {
      for (const child of Array.from(node.childNodes)) {
        if (child.nodeName === 'BR') { newParagraph(); continue }
        if (child.nodeType === 3) { insert.appendChild(child.cloneNode()); continue }
        insert = insert.appendChild(child.cloneNode(false))
        walk(child)
        insert = insert.parentNode
      }
    }
    walk(block)
  }
  // drop mark shells left empty by a break at a run's edge (<strong></strong>);
  // never touch <br> — list items (cloned wholesale) may legitimately hold them
  for (const el of Array.from(out.querySelectorAll('p *'))) {
    if (el.nodeName !== 'BR' && !el.textContent && !el.querySelector('br')) el.remove()
  }
  return out.innerHTML
}

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

function toContent(value, mode, withLists) {
  if (mode === 'lines') {
    const arr = Array.isArray(value) ? value : []
    return arr.length ? arr.map((l) => `<p>${l || ''}</p>`).join('') : '<p></p>'
  }
  // Slide bodies (block + lists) migrate legacy <br> lines to real paragraphs so
  // list toggles work per line. Site block fields (code.intro) are left alone —
  // their public CSS gives paragraphs real margins, so a silent split would
  // change the live site's spacing.
  if (mode === 'block') return (withLists ? splitLegacyBreaks(value) : value) || '<p></p>'
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
      // block (with or without lists): default Enter — a real new paragraph
      // (tight-spaced by CSS in slides), and inside a list a new item. Real
      // paragraphs are what make "select three lines → bullet" give three
      // bullets instead of one. Shift+Enter still inserts a soft line break.
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
      // Lists (opt-in). ListKeymap makes Backspace/Delete at item edges behave;
      // ListFixes patches its gaps (stuck empty line, split lists) and the
      // manual variants drop the surprise "- " auto-conversion.
      ...(withLists ? [BulletListManual, OrderedListManual, ListItem, ListKeymap, ListFixes] : []),
      ...(withLink ? [Link.configure({ openOnClick: false, autolink: false })] : []),
      enterBehavior,
    ],
    // Keep runs of spaces exactly as typed. Without this, ProseMirror's HTML
    // parser collapses them on every load — which is what "reset" the manual
    // column spacing in slide bodies between sessions.
    parseOptions: { preserveWhitespace: true },
    content: toContent(value, mode, withLists),
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
    editor.commands.setContent(toContent(value, mode, withLists), {
      emitUpdate: false,
      parseOptions: { preserveWhitespace: true },
    })
  }, [value, editor, mode, withLists])

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
