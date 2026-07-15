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
 *
 * The first 11 entries mirror the live site (and follow CMS image swaps). The
 * final six (`pres-*`) are presentation-only paintings appended to the cycle so a
 * deck runs through 17 images before repeating; they are hard-coded and decoupled
 * from the site, so a future CMS swap never touches them. Existing saved slides
 * store a fixed siteImageIndex, so appending here never disturbs old decks.
 */
import data from '../../content/sections.json'
import { sectionAlign } from '../config/design.js'

const HERO_SRC = data.heroFilm?.frames?.[0]?.src || '/images/hero-horseman.jpg'

// key | alignKey (design.js) | sectionClass (CSS) | painting src | default box footprint
const DEFS = [
  { key: 'hero', label: 'Hero — the horseman',        alignKey: 'hero',        sectionClass: 'section-hero',        src: HERO_SRC,                imageAlign: null,                    box: { xPct: 27, yPct: 60, wPct: 46, hPct: 28 } },
  { key: 'truth', label: 'The Truth',       alignKey: 'truth',       sectionClass: 'section-truth',       src: data.truth?.image,       imageAlign: data.truth?.imageAlign,       box: { xPct: 27, yPct: 30, wPct: 46, hPct: 40 } },
  { key: 'code', label: 'Who We Are',        alignKey: 'code',        sectionClass: 'section-code',        src: data.code?.image,        imageAlign: data.code?.imageAlign,        box: { xPct: 6,  yPct: 28, wPct: 42, hPct: 50 } },
  { key: 'principles', label: 'The Principles',  alignKey: 'principles',  sectionClass: 'section-principles',  src: data.principles?.image,  imageAlign: data.principles?.imageAlign,  box: { xPct: 27, yPct: 34, wPct: 46, hPct: 36 } },
  { key: 'evidence', label: 'Testimonials',    alignKey: 'evidence',    sectionClass: 'section-evidence',    src: data.evidence?.image,    imageAlign: data.evidence?.imageAlign,    box: { xPct: 22, yPct: 30, wPct: 56, hPct: 44 } },
  { key: 'founder', label: 'Who Am I',     alignKey: 'founder',     sectionClass: 'section-founder',     src: data.founder?.image,     imageAlign: data.founder?.imageAlign,     box: { xPct: 27, yPct: 34, wPct: 46, hPct: 40 } },
  { key: 'become', label: "We're Offering You",      alignKey: 'become',      sectionClass: 'section-become',      src: data.become?.image,      imageAlign: data.become?.imageAlign,      box: { xPct: 52, yPct: 28, wPct: 42, hPct: 50 } },
  { key: 'faq', label: 'Questions a Serious Man Asks',         alignKey: 'faq',         sectionClass: 'section-faq',         src: data.faq?.image,         imageAlign: data.faq?.imageAlign,         box: { xPct: 6,  yPct: 24, wPct: 44, hPct: 56 } },
  { key: 'how', label: 'How We Operate',         alignKey: 'howWeOperate', sectionClass: 'section-how',        src: data.howWeOperate?.image, imageAlign: data.howWeOperate?.imageAlign, box: { xPct: 52, yPct: 26, wPct: 42, hPct: 52 } },
  { key: 'application', label: 'Application', alignKey: 'application', sectionClass: 'section-application', src: data.application?.image,  imageAlign: data.application?.imageAlign,  box: { xPct: 28, yPct: 30, wPct: 44, hPct: 44 } },
  { key: 'closing', label: 'Closing',     alignKey: 'closing',     sectionClass: 'section-closing',     src: data.closing?.image,     imageAlign: data.closing?.imageAlign,     box: { xPct: 27, yPct: 36, wPct: 46, hPct: 32 } },

  // --- Presentation-only extras, appended AFTER the 11 site mirrors so a deck
  //     cycles through 17 paintings before it repeats. These are DECOUPLED from
  //     sections.json: their src + align are hard-coded here (not read from the
  //     CMS, not in design.js splitSides), so a future image swap on the public
  //     site only ever reorders/replaces the first 11 — these six always sit at
  //     the tail in this fixed order. `align` is explicit: 'full' for landscapes,
  //     'right' for the standing-operator portrait (box falls on the left). Grade
  //     + crop for each live in presentations.css, keyed by sectionClass. ---
  { key: 'pres-soldier', label: 'Soldier at rest',  alignKey: null, sectionClass: 'section-pres-soldier',  src: '/images/pres-soldier.jpg',  imageAlign: null, align: 'full',  box: { xPct: 52, yPct: 14, wPct: 44, hPct: 34 } },
  { key: 'pres-squad', label: 'The squad',    alignKey: null, sectionClass: 'section-pres-squad',    src: '/images/pres-squad.jpg',    imageAlign: null, align: 'full',  box: { xPct: 27, yPct: 58, wPct: 46, hPct: 30 } },
  { key: 'pres-base', label: 'The base',     alignKey: null, sectionClass: 'section-pres-base',     src: '/images/pres-base.jpg',     imageAlign: null, align: 'full',  box: { xPct: 28, yPct: 10, wPct: 44, hPct: 28 } },
  { key: 'pres-dog', label: 'Dog handler',      alignKey: null, sectionClass: 'section-pres-dog',      src: '/images/pres-dog.jpg',      imageAlign: null, align: 'full',  box: { xPct: 5,  yPct: 30, wPct: 40, hPct: 42 } },
  { key: 'pres-blade', label: 'The blade',    alignKey: null, sectionClass: 'section-pres-blade',    src: '/images/pres-blade.jpg',    imageAlign: null, align: 'full',  box: { xPct: 27, yPct: 12, wPct: 46, hPct: 30 } },
  { key: 'pres-sentinel', label: 'The sentinel', alignKey: null, sectionClass: 'section-pres-sentinel', src: '/images/pres-sentinel.jpg', imageAlign: null, align: 'right', box: { xPct: 6,  yPct: 30, wPct: 40, hPct: 42 } },
]

export const SITE_IMAGES = DEFS.map((d) => ({
  key: d.key,
  label: d.label || d.key,
  alignKey: d.alignKey,
  sectionClass: d.sectionClass,
  src: d.src,
  // Appended extras carry an explicit `align`; site mirrors derive it from design.js.
  align: d.align ?? sectionAlign(d.alignKey, d.imageAlign || 'full'),
  defaultBox: d.box,
}))

export const SITE_IMAGE_COUNT = SITE_IMAGES.length

// (Placeable pictures — Nico's photo library — moved to src/lib/imageLibrary.js
// as PRES_PHOTOS, the shared source of truth for every picker.)

const mod = (i) => ((i % SITE_IMAGE_COUNT) + SITE_IMAGE_COUNT) % SITE_IMAGE_COUNT

export function imageForIndex(i) {
  return SITE_IMAGES[mod(i)]
}

// A slide can override the cycle with a hand-picked library image
// (slide.bgSrc). It renders full-bleed with a neutral oil grade
// (.section-pres-custom in presentations.css) and a centred default box.
const CUSTOM_BOX = { xPct: 27, yPct: 32, wPct: 46, hPct: 36 }

export function customImage(src) {
  return { key: 'custom', sectionClass: 'section-pres-custom', src, align: 'full', defaultBox: CUSTOM_BOX }
}

// A fresh blank slide sitting on a hand-picked library image instead of the
// next cycle painting. siteImageIndex stays 0 as the fallback if the custom
// background is ever cleared.
export function blankCustomSlide(src, idgen) {
  return {
    id: idgen(),
    siteImageIndex: 0,
    bgSrc: src,
    heading: '',
    body: '',
    extras: [],
    images: [],
    box: {
      ...CUSTOM_BOX,
      boxAlign: 'center',
      headingAlign: 'center',
      bodyAlign: 'center',
      headingPx: 40,
      bodyPx: 20,
    },
  }
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
    extras: [],
    images: [],
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
