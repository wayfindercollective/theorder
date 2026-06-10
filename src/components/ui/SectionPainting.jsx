/**
 * SectionPainting — a painted background for a segment.
 *
 * align='full' (default) renders the same `.section-bg-image` element the
 * original sections use, so the global "one giant painting" treatment (warm
 * oil grade, canvas weave, framed vignette in globals.css) applies to it
 * automatically. align='left' | 'right' renders a `.section-side-image` that
 * occupies one half of the section and fades into the centre — the v2 split
 * layout. Drop it in as the first child of a <section>. No-ops when image is unset.
 */
export function SectionPainting({ image, align = 'full' }) {
  if (!image) return null
  const className = align === 'full'
    ? 'section-bg-image'
    : `section-side-image section-side-image-${align}`
  return (
    <div
      className={className}
      style={{ backgroundImage: `url(${image})` }}
      aria-hidden="true"
    />
  )
}
