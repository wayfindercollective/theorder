import { useEffect } from 'react'
import { applicationCopy } from '../../config/sectionContent.js'
import { CommitmentGate } from '../ui/CommitmentGate.jsx'
import { SectionPainting } from '../ui/SectionPainting.jsx'

/**
 * Private acceptance page shared by Nico after the Instagram conversation.
 * The calendar remains one deliberate click away at /application/booking.
 */
export function ApplicationGatePage() {
  useEffect(() => {
    document.title = 'Application Accepted | The Order'
    window.scrollTo(0, 0)
  }, [])

  return (
    <section id="top" className="section section-application booking-page application-gate-page">
      <SectionPainting image={applicationCopy.image} eager />
      <div className="shell booking-page-shell">
        <div className="application-card booking-page-card application-gate-card card card-stitched nailed">
          <span className="nail-tl" />
          <span className="nail-br" />
          <CommitmentGate />
        </div>
      </div>
    </section>
  )
}
