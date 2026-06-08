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
export const formCopy         = data.form
export const submitConsent    = data.consent
