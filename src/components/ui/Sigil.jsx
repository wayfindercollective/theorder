/**
 * The Sigil — shield + cross + sword, drawn as inline SVG.
 * Used as the brand mark in the header, footer, and as a section accent.
 *
 * size: pixel size of the rendered SVG.
 * variant: 'full' (with sword), 'shield' (no sword overlay).
 */

export function Sigil({ size = 56, variant = 'full', className = '' }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      aria-hidden="true"
      className={className}
    >
      {/* shield outline */}
      <path
        d="M32 6 L54 13 L54 35 Q54 48 32 58 Q10 48 10 35 L10 13 Z"
        fill="#0f0d0b"
        stroke="#a6884a"
        strokeWidth="1.25"
      />
      {/* inner shield bevel */}
      <path
        d="M32 9 L51 15 L51 34 Q51 46 32 55 Q13 46 13 34 L13 15 Z"
        fill="none"
        stroke="#7d6635"
        strokeWidth="0.5"
        opacity="0.8"
      />
      {/* cross — cordovan */}
      <rect x="29.5" y="17" width="5" height="28" fill="#5c1f1c" />
      <rect x="22.5" y="25" width="19" height="5" fill="#5c1f1c" />
      {/* cross highlight strokes */}
      <rect x="29.5" y="17" width="5" height="28" fill="none" stroke="#7a2a26" strokeWidth="0.4" />
      <rect x="22.5" y="25" width="19" height="5" fill="none" stroke="#7a2a26" strokeWidth="0.4" />

      {variant === 'full' && (
        <g>
          {/* sword — vertical, bisects shield */}
          <rect x="30.5" y="3" width="3" height="58" fill="#b8b8b8" />
          <rect x="30.5" y="3" width="1" height="58" fill="#dcdcdc" />
          {/* sword crossguard */}
          <rect x="27" y="9" width="10" height="2.4" fill="#c8c8c8" />
          {/* pommel */}
          <circle cx="32" cy="4.5" r="1.6" fill="#a6884a" />
        </g>
      )}
    </svg>
  )
}
