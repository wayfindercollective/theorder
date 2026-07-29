/**
 * Section content — loaded from /content/sections.json.
 *
 * The JSON file is the editable source of truth. The CMS at /admin writes to
 * it (via GitHub API), Vite bundles it at build time, components import from
 * the named re-exports below.
 *
 * Keep field names stable — the editor UI maps to these.
 */

import data from '../../content/sections.json'

export const brandContent     = data.brand || { logo: null }
export const heroContent      = data.hero
export const heroFilm         = data.heroFilm
export const truthContent     = data.truth
export const codeContent      = data.code
export const principlesContent = data.principles || {}
export const becomeContent    = data.become
export const consideredContent = data.considered
export const applicationCopy  = data.application
export const founderContent   = data.founder
export const evidenceContent  = data.evidence
export const faqContent       = data.faq
export const howWeOperateContent = data.howWeOperate
export const closingContent   = data.closing
export const ctaContent       = data.cta
export const footerContent    = data.footer
export const finalScreenContent = data.finalScreen
// Fallback keeps DeclineScreen render-safe if a stale content deploy lacks the block.
export const declineScreenContent = data.declineScreen || {
  heading: 'Thank you for your enquiry.',
  body: 'Please return when you have made progress and are willing to go all in.',
  notice: 'Your information has not been stored.',
}
// The commitment gate between the last question and the calendar. Fallbacks
// keep it render-safe if a stale content deploy lacks the block.
export const commitmentGateContent = data.commitmentGate || {
  line1: 'We are inundated with applications',
  line2: 'This will be your only enquiry call, failure to attend will result in no further consideration to your application.',
  line3: 'You answered the questionnaire, are you a man of your word indeed?',
  button: 'Book Your Call',
}
// `data.form` (name/email/phone labels) retired with the contact step — the
// application is choice-only now and contact details are typed on the booking
// page. `consent` survives: its SMS/privacy/terms lines render under the
// calendar, which is where details are actually collected.
export const submitConsent    = data.consent || {}
