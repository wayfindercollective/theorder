import { useInView } from '../../hooks/useInView.js'
import { truthContent } from '../../config/sectionContent.js'
import { renderRich, richText } from '../../lib/richtext.js'
import { DeferredBackground } from '../ui/DeferredBackground.jsx'

export function TheTruthSection() {
  const { ref, inView } = useInView()
  const lines = Array.isArray(truthContent.provocation)
    ? truthContent.provocation
    : String(truthContent.provocation || '').split('\n')
  const isFull = truthContent.imageAlign === 'full'
  return (
    <section className="section section-truth" ref={ref}>
      {truthContent.image && (
        <DeferredBackground
          image={truthContent.image}
          className={isFull
            ? 'section-bg-image'
            : `section-side-image section-side-image-${truthContent.imageAlign || 'right'}`}
        />
      )}
      <div className="shell">
        <div className={'reveal ' + (inView ? 'in-view' : '')}>
          <div className="eyebrow truth-eyebrow">
            <span className="brass-rule" /> {truthContent.eyebrow} <span className="brass-rule" />
          </div>
        </div>

        <div className={'stagger truth-provocation ' + (inView ? 'in-view' : '')}>
          {lines.map((line, i) =>
            richText(line) ? (
              <p key={i} className="truth-line display tooled" dangerouslySetInnerHTML={renderRich(line)} />
            ) : (
              <span key={i} className="truth-gap" aria-hidden="true" />
            )
          )}
        </div>
      </div>
    </section>
  )
}
