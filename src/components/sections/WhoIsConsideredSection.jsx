import { useInView } from '../../hooks/useInView.js'
import { consideredContent } from '../../config/sectionContent.js'

export function WhoIsConsideredSection() {
  const { ref, inView } = useInView()
  return (
    <section className="section section-considered" ref={ref}>
      {consideredContent.image && (
        <div
          className={`section-side-image section-side-image-${consideredContent.imageAlign || 'left'}`}
          style={{ backgroundImage: `url(${consideredContent.image})` }}
          aria-hidden="true"
        />
      )}
      <div className="shell-narrow">
        <div className={'reveal ' + (inView ? 'in-view' : '')}>
          <div className="eyebrow">
            <span className="brass-rule" /> {consideredContent.eyebrow} <span className="brass-rule" />
          </div>
          <h2 className="display section-heading">{consideredContent.heading}</h2>
          <div className="section-divider" style={{ margin: '2rem auto 3rem' }} />
        </div>

        <div className={'considered-lines stagger ' + (inView ? 'in-view' : '')}>
          <p className="considered-line considered-for display tooled">
            {consideredContent.for_}
          </p>
          <p className="considered-line considered-not display">
            {consideredContent.not}
          </p>
        </div>
      </div>
    </section>
  )
}
