/**
 * SectionPainting — a full-bleed painted background for a segment.
 *
 * Renders the same `.section-bg-image` element the original sections use,
 * so the global "one giant painting" treatment (warm oil grade, canvas
 * weave, framed vignette in globals.css) applies to it automatically.
 * Drop it in as the first child of a <section>. No-ops when image is unset.
 */
export function SectionPainting({ image }) {
  if (!image) return null
  return (
    <div
      className="section-bg-image"
      style={{ backgroundImage: `url(${image})` }}
      aria-hidden="true"
    />
  )
}
