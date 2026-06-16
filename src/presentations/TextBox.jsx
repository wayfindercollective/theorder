/**
 * The black text box on a slide — one heading + body. Heading and body each have
 * their OWN size and alignment (independent of each other); the box itself has a
 * position (L/C/R + free drag) and resize. Plain text only (inputs/textareas →
 * React text nodes; no contentEditable/HTML, so no XSS or rich-paste).
 *
 * Geometry is stored as % of the slide stage, and font sizes scale with the
 * stage width via container-query units (cqw), so a box lands identically on the
 * build screen and the screen-shared window.
 *
 * In Present mode: no controls/handles; a box left entirely empty renders nothing.
 */
import { useRef } from 'react'

const REF_W = 1280 // reference stage width at which *Px are literal pixels
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v))
const cqw = (px) => `calc(${px} * 100cqw / ${REF_W})`
const ALIGN_LABEL = { left: 'L', center: 'C', right: 'R' }

export function TextBox({ slide, present, onChange, onBoxChange }) {
  const ref = useRef(null)
  const b = slide.box
  const empty = !slide.heading.trim() && !slide.body.trim()
  if (present && empty) return null

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

  const setBoxAlign = (a) => {
    let x = b.xPct
    if (a === 'left') x = 4
    else if (a === 'center') x = (100 - b.wPct) / 2
    else if (a === 'right') x = 100 - b.wPct - 4
    onBoxChange({ boxAlign: a, xPct: clamp(x, 0, 100 - b.wPct) })
  }

  const bumpFont = (key, delta) => onBoxChange({ [key]: clamp(b[key] + delta, 12, 200) })

  // Heading and body align independently. Fall back to the old shared `textAlign`
  // for decks saved before the split.
  const headingAlign = b.headingAlign ?? b.textAlign ?? 'left'
  const bodyAlign = b.bodyAlign ?? b.textAlign ?? 'left'

  const style = { left: `${b.xPct}%`, top: `${b.yPct}%`, width: `${b.wPct}%`, height: `${b.hPct}%` }
  const headStyle = { fontSize: cqw(b.headingPx), textAlign: headingAlign }
  const bodyStyle = { fontSize: cqw(b.bodyPx), textAlign: bodyAlign }

  return (
    <div ref={ref} className={`pres-box${present ? ' is-present' : ''}`} style={style}>
      {!present && (
        <div className="pres-box-toolbar" onPointerDown={(e) => e.stopPropagation()}>
          <span className="pres-box-grip" onPointerDown={startMove} title="Drag to move">✛</span>
          <span className="pres-tb-group" title="Heading — size & alignment">
            <em>Head</em>
            <button type="button" onClick={() => bumpFont('headingPx', -2)} title="Smaller">A−</button>
            <button type="button" onClick={() => bumpFont('headingPx', 2)} title="Bigger">A+</button>
            <i className="pres-tb-sep" />
            {['left', 'center', 'right'].map((a) => (
              <button key={a} type="button" className={headingAlign === a ? 'on' : ''} onClick={() => onBoxChange({ headingAlign: a })}>
                {ALIGN_LABEL[a]}
              </button>
            ))}
          </span>
          <span className="pres-tb-group" title="Body — size & alignment">
            <em>Body</em>
            <button type="button" onClick={() => bumpFont('bodyPx', -2)} title="Smaller">A−</button>
            <button type="button" onClick={() => bumpFont('bodyPx', 2)} title="Bigger">A+</button>
            <i className="pres-tb-sep" />
            {['left', 'center', 'right'].map((a) => (
              <button key={a} type="button" className={bodyAlign === a ? 'on' : ''} onClick={() => onBoxChange({ bodyAlign: a })}>
                {ALIGN_LABEL[a]}
              </button>
            ))}
          </span>
          <span className="pres-tb-group" title="Box position (left / centre / right)">
            <em>Box</em>
            {['left', 'center', 'right'].map((a) => (
              <button key={a} type="button" className={b.boxAlign === a ? 'on' : ''} onClick={() => setBoxAlign(a)}>
                {ALIGN_LABEL[a]}
              </button>
            ))}
          </span>
        </div>
      )}

      <div className="pres-box-content">
        {present ? (
          <>
            {slide.heading.trim() && <h2 className="pres-h display" style={headStyle}>{slide.heading}</h2>}
            {slide.body.trim() && <p className="pres-b" style={bodyStyle}>{slide.body}</p>}
          </>
        ) : (
          <>
            <textarea
              className="pres-h pres-h-input display"
              style={headStyle}
              value={slide.heading}
              placeholder="Heading"
              rows={1}
              onChange={(e) => onChange({ heading: e.target.value })}
            />
            <textarea
              className="pres-b pres-b-input"
              style={bodyStyle}
              value={slide.body}
              placeholder="Body…"
              onChange={(e) => onChange({ body: e.target.value })}
            />
          </>
        )}
      </div>

      {!present && <span className="pres-box-resize" onPointerDown={startResize} title="Drag to resize" />}
    </div>
  )
}
