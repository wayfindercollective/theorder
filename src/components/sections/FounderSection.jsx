import { useInView } from '../../hooks/useInView.js'
import { founderContent } from '../../config/sectionContent.js'
import { renderRich } from '../../lib/richtext.js'
import { CtaButton } from '../ui/CtaButton.jsx'
import { DeferredBackground } from '../ui/DeferredBackground.jsx'

export function FounderSection() {
  const { ref, inView } = useInView()
  return (
    <section className="section section-founder" ref={ref}>
      {founderContent.image && (
        <DeferredBackground
          image={founderContent.image}
          className="section-bg-image"
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
          <DeferredBackground
            image={founderContent.portrait}
            ariaHidden={false}
            className={
              'founder-portrait card nailed ' +
              (founderContent.portrait ? 'has-portrait' : 'card-stitched')
            }
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
          </DeferredBackground>

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
