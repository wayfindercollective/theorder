import { useInView } from '../../hooks/useInView.js'
import { truthContent } from '../../config/sectionContent.js'
import { mdInline } from '../../lib/markdown.js'

export function TheTruthSection() {
  const { ref, inView } = useInView()
  return (
    <section className="section section-truth" ref={ref}>
      {truthContent.image && (
        <div
          className={`section-side-image section-side-image-${truthContent.imageAlign || 'right'}`}
          style={{ backgroundImage: `url(${truthContent.image})` }}
          aria-hidden="true"
        />
      )}
      <div className="shell-narrow">
        <div className={'reveal ' + (inView ? 'in-view' : '')}>
          <div className="eyebrow truth-eyebrow">
            <span className="brass-rule" /> {truthContent.eyebrow} <span className="brass-rule" />
          </div>
          <h2 className={'display section-heading h-sweep ' + (inView ? 'in-view' : '')}>
            {truthContent.heading}
          </h2>
          <div className="section-divider" style={{ margin: '2rem auto 2.5rem' }} />
        </div>

        <div className={'stagger truth-body ' + (inView ? 'in-view' : '')}>
          {truthContent.paragraphs.map((p, i) => (
            <p key={i} className="truth-p" dangerouslySetInnerHTML={mdInline(p)} />
          ))}
          <p className="truth-turn display">{truthContent.turn}</p>
        </div>
      </div>
    </section>
  )
}
