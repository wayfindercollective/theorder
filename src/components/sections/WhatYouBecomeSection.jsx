import { useInView } from '../../hooks/useInView.js'
import { becomeContent } from '../../config/sectionContent.js'
import { CtaButton } from '../ui/CtaButton.jsx'

export function WhatYouBecomeSection() {
  const { ref, inView } = useInView()
  const offerings = (becomeContent.offerings || '')
    .split('\n')
    .map((o) => o.trim())
    .filter(Boolean)
  return (
    <section className="section section-become" ref={ref}>
      {becomeContent.image && (
        <div
          className="section-bg-image"
          style={{ backgroundImage: `url(${becomeContent.image})` }}
          aria-hidden="true"
        />
      )}
      <div className="shell">
        <div className={'reveal become-head ' + (inView ? 'in-view' : '')}>
          <div className="eyebrow">
            <span className="brass-rule" /> {becomeContent.eyebrow} <span className="brass-rule" />
          </div>
          <h2 className="display section-heading become-heading">
            {becomeContent.heading}
          </h2>
          <div className="section-divider" style={{ margin: '2rem auto 3rem' }} />
        </div>

        <ul className={'offerings-grid stagger ' + (inView ? 'in-view' : '')}>
          {offerings.map((o, i) => (
            <li key={i} className="offering display tooled">{o}</li>
          ))}
        </ul>

        {becomeContent.closing && (
          <p className={'offering-closing display reveal ' + (inView ? 'in-view' : '')}>
            {becomeContent.closing}
          </p>
        )}

        <CtaButton location="afterOfferings" className={'reveal ' + (inView ? 'in-view' : '')} />
      </div>
    </section>
  )
}
