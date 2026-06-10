import { useInView } from '../../hooks/useInView.js'
import { evidenceContent } from '../../config/sectionContent.js'
import { SectionPainting } from '../ui/SectionPainting.jsx'

export function EvidenceSection() {
  const { ref, inView } = useInView()
  return (
    <section className="section section-evidence" ref={ref}>
      <SectionPainting image={evidenceContent.image} />
      <div className="shell">
        <div className={'reveal evidence-head ' + (inView ? 'in-view' : '')}>
          <div className="eyebrow">
            <span className="brass-rule" /> {evidenceContent.eyebrow} <span className="brass-rule" />
          </div>
          <h2 className="display section-heading">{evidenceContent.heading}</h2>
          <p className="restraint evidence-intro">{evidenceContent.intro}</p>
          <div className="section-divider" style={{ margin: '2rem auto 3.5rem' }} />
        </div>

        <div className={'evidence-grid stagger ' + (inView ? 'in-view' : '')}>
          {evidenceContent.cards.map((c, i) => (
            <article key={i} className="evidence-card card card-stitched">
              <span className="evidence-mark display engraved">"</span>
              <p className="evidence-quote">{c.quote}</p>
              <p className="evidence-attr restraint">{c.attribution}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}
