import { useInView } from '../../hooks/useInView.js'
import { truthContent } from '../../config/sectionContent.js'

export function TheTruthSection() {
  const { ref, inView } = useInView()
  const lines = (truthContent.provocation || '').split('\n')
  const isFull = truthContent.imageAlign === 'full'
  return (
    <section className="section section-truth" ref={ref}>
      {truthContent.image && (
        <div
          className={isFull
            ? 'section-bg-image'
            : `section-side-image section-side-image-${truthContent.imageAlign || 'right'}`}
          style={{ backgroundImage: `url(${truthContent.image})` }}
          aria-hidden="true"
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
            line.trim() ? (
              <p key={i} className="truth-line display tooled">{line}</p>
            ) : (
              <span key={i} className="truth-gap" aria-hidden="true" />
            )
          )}
        </div>
      </div>
    </section>
  )
}
