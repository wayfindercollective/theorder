/**
 * Section content loaded from content/sections.json. The CMS at /admin writes
 * that file, and Vite bundles these named exports into the site.
 *
 * Variant landing pages (/physical, /financial): when the current path matches
 * a variant slug, that variant's text file (content/variants/<slug>.json) is
 * merged over the base BEFORE the exports below are computed — variant words
 * win, every asset and everything unlisted stays base. Section components are
 * untouched; they keep importing the same named exports.
 */

import base from '../../content/sections.json'
import { mergeVariantSections, variantSlugFromPath } from './variantFields.js'

// Eagerly bundled: text-only files, ~3 KB gzipped each. Keeps content
// resolution synchronous so module-init order never matters.
const variantModules = import.meta.glob('../../content/variants/*.json', { eager: true })

function resolveContent() {
  const slug = typeof window === 'undefined' ? null : variantSlugFromPath(window.location.pathname)
  if (!slug) return base
  const mod = variantModules[`../../content/variants/${slug}.json`]
  const variant = mod?.default || mod
  return variant ? mergeVariantSections(base, variant) : base
}

const data = resolveContent()

export const brandContent = data.brand || { logo: null }
export const heroContent = data.hero
export const heroFilm = data.heroFilm
export const truthContent = data.truth
export const codeContent = data.code
export const principlesContent = data.principles || {}
export const becomeContent = data.become
export const consideredContent = data.considered
export const applicationCopy = data.application
export const founderContent = data.founder
export const evidenceContent = data.evidence
export const faqContent = data.faq
export const howWeOperateContent = data.howWeOperate
export const closingContent = data.closing
export const ctaContent = data.cta
export const footerContent = data.footer
export const finalScreenContent = data.finalScreen

export const qualifiedScreenContent = data.qualifiedScreen || {
  heading: 'Congratulations',
  sub: 'You have passed the first stage.',
  video: '',
  videoMobile: '',
  poster: '',
  videoLabel: "Watch Nico's Message",
  message: "Watch Nico's video, then take the next step.",
  note: '',
  button: 'Message @theorder.global',
  instagramHandle: '@theorder.global',
  instagramUrl: 'https://ig.me/m/theorder.global',
}

export const commitmentGateContent = data.commitmentGate || {
  acceptance: 'Well done on getting accepted for an inquiry. Only 3% of people make it this far.',
  line1: 'We are inundated with applications',
  line2: 'This will be your only call, failure to attend will result in no further consideration to your application.',
  line3: 'You answered the questionnaire, are you a man of your word indeed?',
  button: 'Book Your Enquiry Interview',
}

export const declineScreenContent = data.declineScreen || {
  heading: 'Thank you for your enquiry.',
  body: 'Please return when you have made progress and are willing to go all in.',
  notice: 'Your information has not been stored.',
}

// Contact details exist only inside the standalone Wayfinder booking widget,
// so its privacy, terms and SMS disclosure are rendered directly beneath it.
export const submitConsent = data.consent || {}
