import { useEffect } from 'react'
import { applicationCopy } from '../../config/sectionContent.js'
import { bgImage } from '../../lib/img.js'
import { CommitmentGate } from '../ui/CommitmentGate.jsx'

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
      {applicationCopy.image && (
        <div
          className="section-bg-image"
          style={{ backgroundImage: bgImage(applicationCopy.image) }}
          aria-hidden="true"
        />
      )}
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
