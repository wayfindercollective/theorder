/**
 * One editable slide: a 16:9 stage whose background reuses the site's own
 * painting machinery (SectionPainting + the section-<key> class → the same oil
 * grade, canvas weave, vignette and per-section framing) with one black TextBox
 * on top. Generic by design — no CTA, no portrait tile, no section-specific text
 * styling — so every box shares one uniform look.
 */
import { SectionPainting } from '../components/ui/SectionPainting.jsx'
import { TextBox } from './TextBox.jsx'
import { imageForIndex } from './siteImages.js'

export function Slide({ slide, index, total, present, onChange, onBoxChange, onDelete, onMove, dragProps }) {
  const img = imageForIndex(slide.siteImageIndex)
  return (
    <div className={`pres-stage section ${img.sectionClass}`}>
      <SectionPainting image={img.src} align={img.align} />
      <TextBox slide={slide} present={present} onChange={onChange} onBoxChange={onBoxChange} />
      {!present && (
        <div className="pres-slide-tools" onPointerDown={(e) => e.stopPropagation()}>
          <span className="pres-slide-num">{index + 2}</span>
          <button type="button" onClick={() => onMove(-1)} disabled={index === 0} title="Move up">↑</button>
          <button type="button" onClick={() => onMove(1)} disabled={index === total - 1} title="Move down">↓</button>
          <button type="button" className="pres-slide-del" onClick={onDelete} title="Delete slide">✕</button>
          <span className="pres-slide-drag" draggable="true" {...dragProps} title="Drag to reorder">⠿</span>
        </div>
      )}
    </div>
  )
}
