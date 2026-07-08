/**
 * The black text box on a slide — one heading + body, each a rich-text field.
 *
 * ONE context-aware toolbar per box (no separate per-field bars): it always
 * shows the drag grip + Box position, and extends with the active field's
 * controls (B/i/U, size, alignment) when the cursor is in the heading or body.
 * Size follows Word's intuition: nothing selected → the whole field's base
 * size; text highlighted → just that run (a data-fs mark on the selection).
 *
 * Geometry is stored as % of the slide stage, and font sizes scale with the
 * stage width via container-query units (cqw), so a box lands identically on
 * the build screen and the screen-shared window.
 *
 * In Present mode: no controls; a box left entirely empty renders nothing;
 * content renders through DOMPurify (renderPresent).
 */
import { useRef, useState } from 'react'
import { useEditorState } from '@tiptap/react'
import { RichText, measureEffectiveSize } from '../components/ui/RichText.jsx'
import { isRichEmpty, FONT_SIZE_STEPS } from '../lib/richtext.js'
import { renderPresent } from './renderPresent.js'

const REF_W = 1280 // reference stage width at which *Px are literal pixels
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v))
const cqw = (px) => `calc(${px} * 100cqw / ${REF_W})`
const ALIGN_LABEL = { left: 'L', center: 'C', right: 'R' }
// Field base-size defaults (universal numbers = px at the reference width),
// matching the blank-slide defaults in siteImages.js.
const DEFAULT_BASE = { heading: 40, body: 20 }

/**
 * The active field's section of the box toolbar: B/i/U, size, alignment.
 * With the caret only (no selection) the size controls change the whole field's
 * base size; with a selection they mark just the highlighted run.
 */
function FieldControls({ editor, fieldKey, box, onBoxChange }) {
  const s = useEditorState({
    editor,
    selector: ({ editor }) =>
      editor
        ? {
            bold: editor.isActive('bold'),
            italic: editor.isActive('italic'),
            underline: editor.isActive('underline'),
            bulletList: editor.isActive('bulletList'),
            orderedList: editor.isActive('orderedList'),
            fsNum: editor.getAttributes('fsNum').size || '',
            collapsed: editor.state.selection.empty,
            // re-render (and re-measure) when the caret moves between runs
            caret: `${editor.state.selection.from}:${editor.state.selection.to}`,
          }
        : {},
  })

  const baseKey = fieldKey === 'heading' ? 'headingPx' : 'bodyPx'
  const alignKey = fieldKey === 'heading' ? 'headingAlign' : 'bodyAlign'
  const curAlign = box[alignKey] ?? box.textAlign ?? 'left'

  // What the dropdown shows: the field's base size when nothing is selected,
  // otherwise the selection's size (explicit mark, or measured).
  const shown = s.collapsed
    ? String(box[baseKey] ?? DEFAULT_BASE[fieldKey])
    : s.fsNum || measureEffectiveSize(editor)
  const sizeOptions = shown && !FONT_SIZE_STEPS.includes(Number(shown))
    ? [...FONT_SIZE_STEPS, Number(shown)].sort((x, y) => x - y)
    : FONT_SIZE_STEPS

  const applySize = (v) => {
    if (s.collapsed) {
      // whole field — its base size ('' / Default restores the original)
      onBoxChange({ [baseKey]: v ? clamp(Number(v), 8, 200) : DEFAULT_BASE[fieldKey] })
      return
    }
    const chain = editor.chain().focus().unsetFontSize()
    if (!v) chain.unsetMark('fsNum').run()
    else chain.setMark('fsNum', { size: String(v) }).run()
  }
  const stepSize = (delta) => {
    const curN = Number(shown) || DEFAULT_BASE[fieldKey]
    if (delta > 0) {
      const next = FONT_SIZE_STEPS.find((n) => n > curN)
      applySize(next ?? FONT_SIZE_STEPS[FONT_SIZE_STEPS.length - 1])
    } else {
      const smaller = FONT_SIZE_STEPS.filter((n) => n < curN)
      applySize(smaller.length ? smaller[smaller.length - 1] : FONT_SIZE_STEPS[0])
    }
  }

  return (
    <>
      <span className="pres-tb-group" title="Format — applies to the highlighted text">
        <em>{fieldKey === 'heading' ? 'Head' : 'Body'}</em>
        <button type="button" className={s.bold ? 'on' : ''} onClick={() => editor.chain().focus().toggleBold().run()} title="Bold (Ctrl+B)"><strong>B</strong></button>
        <button type="button" className={s.italic ? 'on' : ''} onClick={() => editor.chain().focus().toggleItalic().run()} title="Italic (Ctrl+I)"><em>i</em></button>
        <button type="button" className={s.underline ? 'on' : ''} onClick={() => editor.chain().focus().toggleUnderline().run()} title="Underline (Ctrl+U)"><u>U</u></button>
      </span>
      <span className="pres-tb-group" title="Size — nothing selected sizes the whole field; highlighted text sizes just that part">
        <button type="button" onClick={() => stepSize(-1)} title="Smaller">A−</button>
        <select
          className="rt-size"
          value={shown}
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
      </span>
      <span className="pres-tb-group" title={`${fieldKey === 'heading' ? 'Heading' : 'Body'} alignment`}>
        {['left', 'center', 'right'].map((a) => (
          <button key={a} type="button" className={curAlign === a ? 'on' : ''} onClick={() => onBoxChange({ [alignKey]: a })}>
            {ALIGN_LABEL[a]}
          </button>
        ))}
      </span>
      {/* Lists live on the body only — headings stay one line. */}
      {fieldKey === 'body' && (
        <span className="pres-tb-group" title="Bulleted / numbered list">
          <button type="button" className={s.bulletList ? 'on' : ''} onClick={() => editor.chain().focus().toggleBulletList().run()} title="Bullet list">•</button>
          <button type="button" className={s.orderedList ? 'on' : ''} onClick={() => editor.chain().focus().toggleOrderedList().run()} title="Numbered list">1.</button>
        </span>
      )}
    </>
  )
}

// `slide` is anything shaped { heading, body, box } — the main slide box or an
// extra text box. `onDelete` (extras only) adds a remove button to the toolbar.
export function TextBox({ slide, present, onChange, onBoxChange, onDelete }) {
  const ref = useRef(null)
  // Editor instances handed up by the two RichText fields; the toolbar drives
  // whichever field was focused last (sticky, so it survives toolbar clicks).
  const [headEd, setHeadEd] = useState(null)
  const [bodyEd, setBodyEd] = useState(null)
  const [activeField, setActiveField] = useState(null)
  // Toolbar visibility is tracked in React (not CSS :hover/:focus-within)
  // because the toolbar is a SIBLING of the box, anchored to the stage top —
  // that keeps it reachable wherever the box sits and however tall it grows.
  const [boxHover, setBoxHover] = useState(false)
  const [tbHover, setTbHover] = useState(false)
  const [focusCount, setFocusCount] = useState(0)

  const b = slide.box
  const empty = isRichEmpty(slide.heading) && isRichEmpty(slide.body)
  if (present && empty) return null

  const fieldFocus = (field) => (f) => {
    setFocusCount((n) => Math.max(0, n + (f ? 1 : -1)))
    if (f) setActiveField(field)
  }
  const toolbarOpen = !present && (boxHover || tbHover || focusCount > 0)

  const activeEd = activeField === 'heading' ? headEd : activeField === 'body' ? bodyEd : null

  const stageRect = () => ref.current?.parentElement?.getBoundingClientRect()

  const drag = (startEvt, apply) => {
    startEvt.preventDefault()
    const rect = stageRect()
    if (!rect) return
    const sx = startEvt.clientX
    const sy = startEvt.clientY
    const move = (e) => {
      const dx = ((e.clientX - sx) / rect.width) * 100
      const dy = ((e.clientY - sy) / rect.height) * 100
      apply(dx, dy)
    }
    const up = () => {
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
    }
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
  }

  const startMove = (e) => {
    const x0 = b.xPct
    const y0 = b.yPct
    drag(e, (dx, dy) =>
      onBoxChange({
        boxAlign: 'free',
        xPct: clamp(x0 + dx, 0, 100 - b.wPct),
        yPct: clamp(y0 + dy, 0, 100 - b.hPct),
      })
    )
  }

  const startResize = (e) => {
    e.stopPropagation()
    const w0 = b.wPct
    const h0 = b.hPct
    drag(e, (dx, dy) =>
      onBoxChange({
        wPct: clamp(w0 + dx, 12, 100 - b.xPct),
        hPct: clamp(h0 + dy, 8, 100 - b.yPct),
      })
    )
  }

  // Grab the box by its frame (the padding strip / the gap between fields) to
  // move it — clicks inside the text fields still just place the caret.
  const startFrameMove = (e) => {
    const t = e.target
    if (t !== e.currentTarget && !(t.classList && t.classList.contains('pres-box-content'))) return
    startMove(e)
  }

  const setBoxAlign = (a) => {
    let x = b.xPct
    if (a === 'left') x = 4
    else if (a === 'center') x = (100 - b.wPct) / 2
    else if (a === 'right') x = 100 - b.wPct - 4
    onBoxChange({ boxAlign: a, xPct: clamp(x, 0, 100 - b.wPct) })
  }

  // Heading and body align independently. Fall back to the old shared `textAlign`
  // for decks saved before the split.
  const headingAlign = b.headingAlign ?? b.textAlign ?? 'left'
  const bodyAlign = b.bodyAlign ?? b.textAlign ?? 'left'

  // minHeight, not height: the box grows with its text so nothing is ever
  // clipped, however much is typed in. hPct is the floor set by the resize handle.
  const style = { left: `${b.xPct}%`, top: `${b.yPct}%`, width: `${b.wPct}%`, minHeight: `${b.hPct}%` }
  const headStyle = { fontSize: cqw(b.headingPx), textAlign: headingAlign }
  const bodyStyle = { fontSize: cqw(b.bodyPx), textAlign: bodyAlign }

  return (
    <>
      {toolbarOpen && (
        <div
          className="pres-box-toolbar"
          onPointerEnter={() => setTbHover(true)}
          onPointerLeave={() => setTbHover(false)}
          onPointerDown={(e) => e.stopPropagation()}
          // keep the editor's selection while clicking toolbar buttons — but let
          // the <select> take its default so its native popup opens
          onMouseDown={(e) => { if (e.target.tagName !== 'SELECT') e.preventDefault() }}
        >
          <span className="pres-box-grip" onPointerDown={startMove} title="Drag to move">✛</span>
          <span className="pres-tb-group" title="Box position (left / centre / right)">
            <em>Box</em>
            {['left', 'center', 'right'].map((a) => (
              <button key={a} type="button" className={b.boxAlign === a ? 'on' : ''} onClick={() => setBoxAlign(a)}>
                {ALIGN_LABEL[a]}
              </button>
            ))}
          </span>
          {activeEd && (
            <FieldControls editor={activeEd} fieldKey={activeField} box={b} onBoxChange={onBoxChange} />
          )}
          {onDelete && (
            <span className="pres-tb-group">
              <button type="button" className="pres-tb-del" onClick={onDelete} title="Remove this text box">✕</button>
            </span>
          )}
        </div>
      )}

    <div
      ref={ref}
      className={`pres-box${present ? ' is-present' : ''}`}
      style={style}
      onPointerDown={present ? undefined : startFrameMove}
      onPointerEnter={present ? undefined : () => setBoxHover(true)}
      onPointerLeave={present ? undefined : () => setBoxHover(false)}
    >
      <div className="pres-box-content">
        {present ? (
          <>
            {!isRichEmpty(slide.heading) && <h2 className="pres-h display" style={headStyle} dangerouslySetInnerHTML={renderPresent(slide.heading)} />}
            {/* div, not p: the body can now hold block content (paragraphs, lists) */}
            {!isRichEmpty(slide.body) && <div className="pres-b" style={bodyStyle} dangerouslySetInnerHTML={renderPresent(slide.body)} />}
          </>
        ) : (
          <>
            <RichText
              mode="heading"
              value={slide.heading}
              baseStyle={headStyle}
              placeholder="Heading"
              className="pres-rt pres-rt-h display"
              onChange={(v) => onChange({ heading: v })}
              externalToolbar
              onEditorReady={setHeadEd}
              onFocusChange={fieldFocus('heading')}
            />
            <RichText
              mode="block"
              withLists
              value={slide.body}
              baseStyle={bodyStyle}
              placeholder="Body…"
              className="pres-rt pres-rt-b"
              onChange={(v) => onChange({ body: v })}
              externalToolbar
              onEditorReady={setBodyEd}
              onFocusChange={fieldFocus('body')}
            />
          </>
        )}
      </div>

      {!present && <span className="pres-box-resize" onPointerDown={startResize} title="Drag to resize" />}
    </div>
    </>
  )
}
