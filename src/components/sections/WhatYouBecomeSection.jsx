import { useInView } from '../../hooks/useInView.js'
import { becomeContent } from '../../config/sectionContent.js'

export function WhatYouBecomeSection() {
  const { ref, inView } = useInView()
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
          <div className="section-divider" style={{ margin: '2rem auto 4rem' }} />
        </div>

        <div className={'become-grid stagger ' + (inView ? 'in-view' : '')}>
          {becomeContent.blocks.map((b, i) => (
            <article key={b.title} className="become-block card card-stitched nailed">
              <span className="nail-tl" />
              <span className="nail-br" />
              <span className="become-numeral display engraved">
                {['i', 'ii', 'iii'][i]}
              </span>
              <h3 className="display become-title">{b.title}</h3>
              <p className="become-body">{b.body}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}
