/**
 * One editable slide: a 16:9 stage whose background reuses the site's own
 * painting machinery (SectionPainting + the section-<key> class → the same oil
 * grade, canvas weave, vignette and per-section framing), with the main black
 * TextBox plus any number of extra text boxes and placed pictures on top.
 *
 * Slide tools (edit only): add picture, add text box, swap the background
 * painting, duplicate, reorder, delete. All content edits flow up through
 * onChange as partial-slide patches, so old decks (no extras/images) work
 * untouched.
 */
import { useState } from 'react'
import { SectionPainting } from '../components/ui/SectionPainting.jsx'
import { TextBox } from './TextBox.jsx'
import { SlideImage } from './SlideImage.jsx'
import { ImagePicker } from './ImagePicker.jsx'
import { imageForIndex } from './siteImages.js'

const newId = () => crypto.randomUUID()

export function Slide({ slide, index, total, present, onChange, onBoxChange, onDelete, onDuplicate, onMove, dragProps }) {
  const img = imageForIndex(slide.siteImageIndex)
  const [picker, setPicker] = useState(null) // 'image' | 'background' | null
  const extras = slide.extras || []
  const images = slide.images || []

  const patchExtra = (id, fn) =>
    onChange({ extras: extras.map((x) => (x.id === id ? fn(x) : x)) })

  // Stagger each new element a little so two adds never land exactly on top
  // of each other (a stack of identical boxes reads as "nothing happened").
  const addTextBox = () =>
    onChange({
      extras: [...extras, {
        id: newId(),
        heading: '',
        body: '',
        box: { xPct: 30 + (extras.length % 4) * 4, yPct: 14 + (extras.length % 4) * 6, wPct: 32, hPct: 16, boxAlign: 'center', headingAlign: 'left', bodyAlign: 'left', headingPx: 28, bodyPx: 20 },
      }],
    })

  const onPicked = (val) => {
    if (picker === 'background') {
      onChange({ siteImageIndex: val })
    } else {
      onChange({ images: [...images, { id: newId(), src: val, xPct: 33 + (images.length % 4) * 4, yPct: 18 + (images.length % 4) * 6, wPct: 34 }] })
    }
    setPicker(null)
  }

  return (
    <div className={`pres-stage section ${img.sectionClass}`}>
      <SectionPainting image={img.src} align={img.align} />

      {images.map((im) => (
        <SlideImage
          key={im.id}
          img={im}
          present={present}
          onChange={(ch) => onChange({ images: images.map((x) => (x.id === im.id ? { ...x, ...ch } : x)) })}
          onDelete={() => onChange({ images: images.filter((x) => x.id !== im.id) })}
        />
      ))}

      <TextBox slide={slide} present={present} onChange={onChange} onBoxChange={onBoxChange} />

      {extras.map((x) => (
        <TextBox
          key={x.id}
          slide={x}
          present={present}
          onChange={(ch) => patchExtra(x.id, (prev) => ({ ...prev, ...ch }))}
          onBoxChange={(bc) => patchExtra(x.id, (prev) => ({ ...prev, box: { ...prev.box, ...bc } }))}
          onDelete={() => onChange({ extras: extras.filter((e) => e.id !== x.id) })}
        />
      ))}

      {!present && (
        <div className="pres-slide-tools" onPointerDown={(e) => e.stopPropagation()}>
          <span className="pres-slide-num">{index + 2}</span>
          <button type="button" onClick={() => setPicker('image')} title="Add a picture to this slide">+ Picture</button>
          <button type="button" onClick={addTextBox} title="Add another text box">+ Text</button>
          <button type="button" onClick={() => setPicker('background')} title="Change the background painting">Background</button>
          <i className="pres-tools-sep" />
          <button type="button" onClick={onDuplicate} title="Duplicate this slide">⧉</button>
          <button type="button" onClick={() => onMove(-1)} disabled={index === 0} title="Move up">↑</button>
          <button type="button" onClick={() => onMove(1)} disabled={index === total - 1} title="Move down">↓</button>
          <button type="button" className="pres-slide-del" onClick={onDelete} title="Delete slide">✕</button>
          <span className="pres-slide-drag" draggable="true" {...dragProps} title="Drag to reorder">⠿</span>
        </div>
      )}

      {picker && !present && <ImagePicker mode={picker} onPick={onPicked} onClose={() => setPicker(null)} />}
    </div>
  )
}
