import { useEffect } from 'react'
import { applicationCopy } from '../../config/sectionContent.js'
import { bgImage } from '../../lib/img.js'
import { FinalScreen } from '../ui/FinalScreen.jsx'

/**
 * Standalone private booking destination. This route is intentionally absent
 * from the public questionnaire: Nico shares /booking in Instagram DMs after
 * speaking with a qualified applicant.
 */
export function BookingPage() {
  useEffect(() => {
    document.title = 'Book Your Enquiry Interview | The Order'
    window.scrollTo(0, 0)
  }, [])

  return (
    <section id="top" className="section section-application booking-page">
      {applicationCopy.image && (
        <div
          className="section-bg-image"
          style={{ backgroundImage: bgImage(applicationCopy.image) }}
          aria-hidden="true"
        />
      )}
      <div className="shell booking-page-shell">
        <div className="application-card booking-page-card card card-stitched nailed">
          <span className="nail-tl" />
          <span className="nail-br" />
          <FinalScreen />
        </div>
      </div>
    </section>
  )
}
