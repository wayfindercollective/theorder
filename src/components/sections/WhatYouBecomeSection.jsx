import { useInView } from '../../hooks/useInView.js'
import { becomeContent } from '../../config/sectionContent.js'
import { CtaButton } from '../ui/CtaButton.jsx'
import { SectionPainting } from '../ui/SectionPainting.jsx'
import { sectionAlign } from '../../config/design.js'
import { renderRich } from '../../lib/richtext.js'

export function WhatYouBecomeSection() {
  const { ref, inView } = useInView()
  const align = sectionAlign('become', becomeContent.imageAlign)
  const splitClass = align !== 'full' ? ` design-split img-${align}` : ''
  const offerings = (becomeContent.offerings || '')
    .split('\n')
    .map((o) => o.trim())
    .filter(Boolean)
  return (
    <section className={'section section-become' + splitClass} ref={ref}>
      <SectionPainting image={becomeContent.image} align={align} />
      <div className="shell">
        <div className={'reveal become-head ' + (inView ? 'in-view' : '')}>
          <div className="eyebrow">
            <span className="brass-rule" /> {becomeContent.eyebrow} <span className="brass-rule" />
          </div>
          <h2 className="display section-heading become-heading" dangerouslySetInnerHTML={renderRich(becomeContent.heading)} />
          <div className="section-divider" style={{ margin: '2rem auto 3rem' }} />
        </div>

        <ul className={'offerings-grid stagger ' + (inView ? 'in-view' : '')}>
          {offerings.map((o, i) => (
            <li key={i} className="offering display tooled">{o}</li>
          ))}
        </ul>

        {becomeContent.closing && (
          <p className={'offering-closing display reveal ' + (inView ? 'in-view' : '')} dangerouslySetInnerHTML={renderRich(becomeContent.closing)} />
        )}

        <CtaButton location="afterOfferings" className={'reveal ' + (inView ? 'in-view' : '')} />
      </div>
    </section>
  )
}
