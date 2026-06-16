/**
 * The ordered list of site paintings a presentation deck mirrors.
 *
 * Order matches the public site's DOM order in src/App.jsx. Alignment is taken
 * from the SAME logic the live sections use — sectionAlign()/splitSides in
 * src/config/design.js — NOT the raw imageAlign in sections.json (which reads
 * "full" everywhere even though five sections render split). Images are read
 * from the bundled sections.json, so a CMS image swap flows into every deck on
 * the next deploy.
 *
 * Note the `how` entry: splitSides keys it as `howWeOperate` but its CSS class
 * is `section-how`, so alignKey and sectionClass are stored separately.
 */
import data from '../../content/sections.json'
import { sectionAlign } from '../config/design.js'

const HERO_SRC = data.heroFilm?.frames?.[0]?.src || '/images/hero-horseman.jpg'

// key | alignKey (design.js) | sectionClass (CSS) | painting src | default box footprint
const DEFS = [
  { key: 'hero',        alignKey: 'hero',        sectionClass: 'section-hero',        src: HERO_SRC,                imageAlign: null,                    box: { xPct: 27, yPct: 60, wPct: 46, hPct: 28 } },
  { key: 'truth',       alignKey: 'truth',       sectionClass: 'section-truth',       src: data.truth?.image,       imageAlign: data.truth?.imageAlign,       box: { xPct: 27, yPct: 30, wPct: 46, hPct: 40 } },
  { key: 'code',        alignKey: 'code',        sectionClass: 'section-code',        src: data.code?.image,        imageAlign: data.code?.imageAlign,        box: { xPct: 6,  yPct: 28, wPct: 42, hPct: 50 } },
  { key: 'principles',  alignKey: 'principles',  sectionClass: 'section-principles',  src: data.principles?.image,  imageAlign: data.principles?.imageAlign,  box: { xPct: 27, yPct: 34, wPct: 46, hPct: 36 } },
  { key: 'evidence',    alignKey: 'evidence',    sectionClass: 'section-evidence',    src: data.evidence?.image,    imageAlign: data.evidence?.imageAlign,    box: { xPct: 22, yPct: 30, wPct: 56, hPct: 44 } },
  { key: 'founder',     alignKey: 'founder',     sectionClass: 'section-founder',     src: data.founder?.image,     imageAlign: data.founder?.imageAlign,     box: { xPct: 27, yPct: 34, wPct: 46, hPct: 40 } },
  { key: 'become',      alignKey: 'become',      sectionClass: 'section-become',      src: data.become?.image,      imageAlign: data.become?.imageAlign,      box: { xPct: 52, yPct: 28, wPct: 42, hPct: 50 } },
  { key: 'faq',         alignKey: 'faq',         sectionClass: 'section-faq',         src: data.faq?.image,         imageAlign: data.faq?.imageAlign,         box: { xPct: 6,  yPct: 24, wPct: 44, hPct: 56 } },
  { key: 'how',         alignKey: 'howWeOperate', sectionClass: 'section-how',        src: data.howWeOperate?.image, imageAlign: data.howWeOperate?.imageAlign, box: { xPct: 52, yPct: 26, wPct: 42, hPct: 52 } },
  { key: 'application', alignKey: 'application', sectionClass: 'section-application', src: data.application?.image,  imageAlign: data.application?.imageAlign,  box: { xPct: 28, yPct: 30, wPct: 44, hPct: 44 } },
  { key: 'closing',     alignKey: 'closing',     sectionClass: 'section-closing',     src: data.closing?.image,     imageAlign: data.closing?.imageAlign,     box: { xPct: 27, yPct: 36, wPct: 46, hPct: 32 } },
]

export const SITE_IMAGES = DEFS.map((d) => ({
  key: d.key,
  alignKey: d.alignKey,
  sectionClass: d.sectionClass,
  src: d.src,
  align: sectionAlign(d.alignKey, d.imageAlign || 'full'),
  defaultBox: d.box,
}))

export const SITE_IMAGE_COUNT = SITE_IMAGES.length

const mod = (i) => ((i % SITE_IMAGE_COUNT) + SITE_IMAGE_COUNT) % SITE_IMAGE_COUNT

export function imageForIndex(i) {
  return SITE_IMAGES[mod(i)]
}

// image right → box on the left; image left → box on the right; full → centred.
function sidesFor(img) {
  if (img.align === 'right') return { boxAlign: 'left', textAlign: 'left' }
  if (img.align === 'left') return { boxAlign: 'right', textAlign: 'right' }
  return { boxAlign: 'center', textAlign: 'center' }
}

// A fresh blank editable slide for a given page index (0 = hero, 1.. = content,
// wrapping past the end). `idgen` returns a unique id (crypto.randomUUID).
export function blankSlideForIndex(index, idgen) {
  const img = imageForIndex(index)
  const sides = sidesFor(img)
  return {
    id: idgen(),
    siteImageIndex: mod(index),
    heading: '',
    body: '',
    box: {
      ...img.defaultBox,
      boxAlign: sides.boxAlign,
      headingAlign: sides.textAlign,
      bodyAlign: sides.textAlign,
      headingPx: 40,
      bodyPx: 20,
    },
  }
}

// A brand-new deck = a blank mirror of the site: the implicit hero (page 0) plus
// one blank slide for every other painting (pages 1..N-1). `cursor` points at the
// next page to append (N → wraps to the hero painting as a blank slide).
export function buildDefaultDeck(idgen) {
  const slides = []
  for (let p = 1; p < SITE_IMAGE_COUNT; p++) slides.push(blankSlideForIndex(p, idgen))
  return {
    id: idgen(),
    title: 'Untitled Presentation',
    cursor: SITE_IMAGE_COUNT,
    slides,
  }
}
