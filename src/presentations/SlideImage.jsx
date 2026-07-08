/**
 * A picture placed on a slide. Drag anywhere on it to move, corner handle to
 * resize (width — height always follows the picture's own proportions, so it
 * can never be squashed), ✕ to remove. Present mode renders just the image.
 *
 * Geometry is % of the 16:9 stage, like the text boxes, so it lands identically
 * on the build screen and the screen-shared window.
 */
import { useRef } from 'react'

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v))

export function SlideImage({ img, present, onChange, onDelete }) {
  const ref = useRef(null)

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
    if (present) return
    const x0 = img.xPct
    const y0 = img.yPct
    drag(e, (dx, dy) =>
      onChange({ xPct: clamp(x0 + dx, 0, 96), yPct: clamp(y0 + dy, 0, 96) })
    )
  }

  const startResize = (e) => {
    e.stopPropagation()
    const w0 = img.wPct
    drag(e, (dx) => onChange({ wPct: clamp(w0 + dx, 4, 100) }))
  }

  const style = { left: `${img.xPct}%`, top: `${img.yPct}%`, width: `${img.wPct}%` }

  return (
    <div
      ref={ref}
      className={`pres-img${present ? ' is-present' : ''}${img.yPct < 3 ? ' at-top' : ''}`}
      style={style}
      onPointerDown={present ? undefined : startMove}
    >
      <img src={img.src} alt="" draggable="false" />
      {!present && (
        <>
          <button
            type="button"
            className="pres-img-del"
            onClick={onDelete}
            onPointerDown={(e) => e.stopPropagation()}
            title="Remove this picture"
          >
            ✕
          </button>
          <span className="pres-box-resize" onPointerDown={startResize} title="Drag to resize" />
        </>
      )}
    </div>
  )
}
