import { useInView } from '../../hooks/useInView.js'
import { founderContent } from '../../config/sectionContent.js'
import { mdInline } from '../../lib/markdown.js'

export function FounderSection() {
  const { ref, inView } = useInView()
  return (
    <section className="section section-founder" ref={ref}>
      {founderContent.image && (
        <div
          className="section-bg-image"
          style={{ backgroundImage: `url(${founderContent.image})` }}
          aria-hidden="true"
        />
      )}
      <div className="shell">
        <div className={'reveal founder-head ' + (inView ? 'in-view' : '')}>
          <div className="eyebrow">
            <span className="brass-rule" /> {founderContent.eyebrow} <span className="brass-rule" />
          </div>
          <h2 className="display section-heading">{founderContent.heading}</h2>
          <div className="section-divider" style={{ margin: '2rem auto 3.5rem' }} />
        </div>

        <div className={'founder-grid stagger ' + (inView ? 'in-view' : '')}>
          <div className="founder-portrait card card-stitched nailed">
            <span className="nail-tl" />
            <span className="nail-br" />
            <div className="founder-portrait-inner">
              <span className="restraint founder-portrait-mark">
                {founderContent.placeholderMark}
              </span>
            </div>
            {founderContent.templated && (
              <span className="template-flag">TEMPLATED</span>
            )}
          </div>

          <div className="founder-text">
            {founderContent.paragraphs.map((p, i) => (
              <p key={i} className="founder-p" dangerouslySetInnerHTML={mdInline(p)} />
            ))}
            <p className="founder-signature display">{founderContent.signature}</p>
          </div>
        </div>
      </div>
    </section>
  )
}
