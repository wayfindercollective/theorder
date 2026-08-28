/** The one branded play treatment shared by every primary video surface. */
export function VideoPlayPill({ label, className = '', as: Element = 'span', ...props }) {
  return (
    <Element
      className={'hero-video-pill' + (className ? ` ${className}` : '')}
      {...props}
    >
      <span className="founder-video-play" aria-hidden="true">▶</span>
      <span className="founder-video-label display">{label}</span>
    </Element>
  )
}
