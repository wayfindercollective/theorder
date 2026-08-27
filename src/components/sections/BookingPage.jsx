import { useEffect } from 'react'
import { applicationCopy } from '../../config/sectionContent.js'
import { FinalScreen } from '../ui/FinalScreen.jsx'
import { SectionPainting } from '../ui/SectionPainting.jsx'

/**
 * Standalone private calendar at /application/booking. Applicants reach it by
 * accepting the call terms on /application.
 */
export function BookingPage() {
  useEffect(() => {
    document.title = 'Book Your Enquiry Interview | The Order'
    window.scrollTo(0, 0)
  }, [])

  return (
    <section id="top" className="section section-application booking-page">
      <SectionPainting image={applicationCopy.image} eager />
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
