/**
 * Preview pages for the two screens an applicant only ever sees AFTER
 * submitting the questionnaire — there is no other way to look at them.
 *
 *   /preview/qualified   the qualified handoff (Nico's post-questionnaire
 *                        video + the Instagram DM button)
 *   /preview/declined    the negation screen
 *
 * Same wrapper markup as the live application card (painting, narrow shell,
 * stitched nailed card) so what you check here is what applicants get. Public
 * by design: nothing here is private, and Nico needs to verify a clip swap
 * without filling in his own form each time. Not linked from anywhere, not in
 * the sitemap.
 */
import { applicationCopy } from '../../config/sectionContent.js'
import { QualifiedScreen } from '../ui/QualifiedScreen.jsx'
import { DeclineScreen } from '../ui/DeclineScreen.jsx'
import { SectionPainting } from '../ui/SectionPainting.jsx'

export function PostFormPreviewPage({ screen = 'qualified' }) {
  return (
    <section id="application" className="section section-application">
      <SectionPainting image={applicationCopy.image} eager />
      <div className="shell-narrow application-shell">
        <div className="application-card card card-stitched nailed">
          <span className="nail-tl" />
          <span className="nail-br" />
          {screen === 'declined' ? <DeclineScreen /> : <QualifiedScreen inView />}
        </div>
      </div>
    </section>
  )
}
