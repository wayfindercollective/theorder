import { useInView } from '../../hooks/useInView.js'
import { founderContent } from '../../config/sectionContent.js'
import { renderRich } from '../../lib/richtext.js'
import { CtaButton } from '../ui/CtaButton.jsx'

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
          <h2 className="display section-heading" dangerouslySetInnerHTML={renderRich(founderContent.heading)} />
          <div className="section-divider" style={{ margin: '2rem auto 3.5rem' }} />
        </div>

        <div className={'founder-grid stagger ' + (inView ? 'in-view' : '')}>
          <div
            className={'founder-portrait card nailed ' + (founderContent.portrait ? 'has-portrait' : 'card-stitched')}
            style={founderContent.portrait ? { backgroundImage: `url(${founderContent.portrait})` } : undefined}
          >
            <span className="nail-tl" />
            <span className="nail-br" />
            {!founderContent.portrait && (
              <div className="founder-portrait-inner">
                <span className="restraint founder-portrait-mark">
                  {founderContent.placeholderMark}
                </span>
              </div>
            )}
            {founderContent.templated && !founderContent.portrait && (
              <span className="template-flag">{founderContent.templatedLabel || 'TEMPLATED'}</span>
            )}
          </div>

          <div className="founder-text">
            {founderContent.paragraphs.map((p, i) => (
              <p key={i} className="founder-p" dangerouslySetInnerHTML={renderRich(p)} />
            ))}
            <p className="founder-signature display">{founderContent.signature}</p>
          </div>
        </div>

        <CtaButton location="afterFounder" className={'reveal ' + (inView ? 'in-view' : '')} />
      </div>
    </section>
  )
}
