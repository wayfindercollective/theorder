/**
 * SectionsTab — text inputs for every editable string in sections.json.
 *
 * Schema is driven by the SECTION_DEFS array below — each entry describes one
 * editable field. To add a new field, add an entry; no other code change.
 *
 * Field flags:
 *   textarea   — multiline plain text (rows defaults to 3, override with `rows`)
 *   markdown   — multiline markdown (with toolbar + preview)
 *   hint       — small grey caption under the field
 */

import { MarkdownField } from '../MarkdownField.jsx'
import { RichText } from '../../components/ui/RichText.jsx'
import { richModeForPath } from '../../lib/richtext.js'

const SECTION_DEFS = [
  {
    key: 'meta',
    title: 'Link preview — when the site is shared',
    fields: [
      { path: ['meta', 'title'],       label: 'Share title', hint: 'The bold first line in iMessage / WhatsApp / Facebook previews. Also the browser tab title.' },
      { path: ['meta', 'description'], label: 'Share description', textarea: true, hint: 'The line under the title in link previews, and what Google shows under the site name. One or two sentences. Note: platforms cache previews — a change can take a day to show on links already shared.' },
    ],
  },
  {
    key: 'brand',
    title: 'Brand',
    fields: [
      { path: ['brand', 'wordmark'], label: 'Wordmark', hint: 'The brand name beside the logo in the top bar. Also used as the logo’s screen-reader text across the page.' },
    ],
  },
  {
    key: 'hero',
    title: 'Hero',
    fields: [
      { path: ['hero', 'eyebrow'],   label: 'Eyebrow', hint: 'Small text above the headline. Optional — leave blank to hide.' },
      { path: ['hero', 'headline'],  label: 'Headline', textarea: true, hint: 'The single biggest line on the page.' },
      { path: ['hero', 'verseLine'], label: 'Verse line (above CTA)', hint: 'One quiet line between the headline and the button. e.g. Mark 12:30 · Mark 12:31' },
      { path: ['hero', 'cta'],       label: 'CTA button', hint: '2–4 words. Action verb.' },
      { path: ['hero', 'restraint'], label: 'Restraint line (under CTA)', hint: 'One quiet line under the button. Optional — leave blank to hide.' },
      { path: ['hero', 'scrollLabel'], label: 'Scroll cue', hint: 'Tiny word at the bottom of the hero inviting the visitor to scroll. e.g. Scroll' },
    ],
  },
  {
    key: 'truth',
    title: 'The Truth — provocation',
    fields: [
      { path: ['truth', 'eyebrow'],     label: 'Numeral / eyebrow', hint: 'Small numeral above the section. e.g. I' },
      { path: ['truth', 'provocation'], label: 'Provocation lines', textarea: true, rows: 7, hint: 'One line per row. Leave a blank row to break into a new stanza. Rendered large, centered, over the landscape image.' },
    ],
  },
  {
    key: 'code',
    title: 'Who We Are',
    fields: [
      { path: ['code', 'eyebrow'],     label: 'Numeral / eyebrow', hint: 'Small numeral above the heading. e.g. II' },
      { path: ['code', 'heading'],     label: 'Heading' },
      { path: ['code', 'intro'],       label: 'Intro', markdown: true, previewClass: 'values-intro', hint: 'One or two paragraphs. Separate with a blank line. Optional inline formatting: **bold**, *italic word*, [link](url).' },
      { path: ['code', 'valuesLabel'], label: 'Principles label', hint: 'Small label above the values grid. e.g. The Principles' },
      { path: ['code', 'values'],      label: 'The Principles (values)', textarea: true, rows: 12, hint: 'One value per line. Rendered as the engraved grid.' },
    ],
  },
  {
    key: 'principles',
    title: 'The Principles wall',
    fields: [
      { path: ['principles', 'eyebrow'], label: 'Numeral / eyebrow', hint: 'Small numeral above the values wall. e.g. III. Leave blank to hide. The values themselves are edited under Who We Are.' },
    ],
  },
  {
    key: 'become',
    title: "We're Offering You",
    fields: [
      { path: ['become', 'eyebrow'],   label: 'Numeral / eyebrow', hint: 'Small numeral above the heading. e.g. VI' },
      { path: ['become', 'heading'],   label: 'Heading' },
      { path: ['become', 'offerings'], label: 'Offerings', textarea: true, rows: 10, hint: 'One offering per line.' },
      { path: ['become', 'closing'],   label: 'Closing line', hint: 'One line under the list. e.g. I hope that you join us.' },
    ],
  },
  {
    key: 'considered',
    title: 'Who Is Considered (hidden — fill to re-enable)',
    fields: [
      { path: ['considered', 'eyebrow'], label: 'Numeral / eyebrow', hint: 'Small numeral above the heading. e.g. IV' },
      { path: ['considered', 'heading'], label: 'Heading', hint: '2–4 words. This section is hidden on the site until it has copy and is re-enabled in code.' },
      { path: ['considered', 'for_'],    label: 'Apply if… line', textarea: true, hint: 'Centered, large, parchment colour.' },
      { path: ['considered', 'not'],     label: 'Do not apply if… line', textarea: true, hint: 'Centered, large, faded grey to contrast with the line above.' },
    ],
  },
  {
    key: 'application',
    title: 'Application — copy around the form',
    fields: [
      { path: ['application', 'eyebrow'],          label: 'Eyebrow', hint: 'Small label at the top of the form card. e.g. Apply Now' },
      { path: ['application', 'submitButton'],     label: 'Submit button text', hint: 'Shown on the final step. e.g. Submit' },
      { path: ['application', 'submittingButton'], label: 'Submit button — while sending', hint: 'Shown briefly after they press submit. e.g. Submitting…' },
      { path: ['application', 'backButton'],       label: 'Back button text', hint: 'Lets applicants return to the previous question. e.g. ← Back' },
      { path: ['application', 'stepLabel'],        label: 'Step counter word', hint: 'Renders as e.g. “Step 1 / 3” under the form. Just the word before the numbers.' },
    ],
  },
  {
    key: 'form',
    title: 'Application form — field labels & messages',
    fields: [
      { path: ['form', 'nameLabel'],        label: 'Name — label' },
      { path: ['form', 'namePlaceholder'],  label: 'Name — placeholder', hint: 'Greyed example text inside the box.' },
      { path: ['form', 'emailLabel'],       label: 'Email — label' },
      { path: ['form', 'emailPlaceholder'], label: 'Email — placeholder' },
      { path: ['form', 'emailError'],       label: 'Email — error message', hint: 'Shown if the email looks invalid.' },
      { path: ['form', 'phoneLabel'],       label: 'Phone — label' },
      { path: ['form', 'phonePlaceholder'], label: 'Phone — placeholder' },
      { path: ['form', 'phoneError'],       label: 'Phone — error message', hint: 'Shown if the number looks invalid.' },
      { path: ['form', 'countrySearchPlaceholder'], label: 'Country picker — search placeholder', hint: 'Greyed text in the search box of the phone country-code dropdown.' },
      { path: ['consent', 'smsLine'],       label: 'SMS consent line', textarea: true, rows: 6, hint: 'The opt-in text beside the consent checkbox. Carrier-required legal text — must name the brand, describe the messages, and include message frequency, rates, STOP, HELP and the no-third-party-sharing line. Change with care.' },
      { path: ['consent', 'privacyLabel'],  label: 'Privacy link text', hint: 'Link text shown under the SMS consent checkbox. Leave blank to hide.' },
      { path: ['consent', 'privacyHref'],   label: 'Privacy link URL', hint: 'Full https:// URL to the Privacy Policy.' },
      { path: ['consent', 'termsLabel'],    label: 'Terms link text', hint: 'Link text shown under the SMS consent checkbox. Leave blank to hide.' },
      { path: ['consent', 'termsHref'],     label: 'Terms link URL', hint: 'Full https:// URL to the Terms of Service.' },
    ],
  },
  {
    key: 'evidence',
    title: 'Testimonials',
    fields: [
      { path: ['evidence', 'eyebrow'], label: 'Numeral / eyebrow', hint: 'Small numeral above the heading.' },
      { path: ['evidence', 'heading'], label: 'Heading', hint: 'e.g. Testimonials' },
      { path: ['evidence', 'intro'],   label: 'Intro line', textarea: true, hint: 'Optional line under the heading. Leave blank to hide.' },
      { path: ['evidence', 'cards', 0, 'video'],       label: 'Testimonial 1 — video', hint: 'Path to a video file in /public, e.g. /testimonials/Tony.mp4. When set, this card plays the video instead of a text quote.' },
      { path: ['evidence', 'cards', 0, 'title'],       label: 'Testimonial 1 — video title', hint: 'Caption shown under the video. e.g. Tony — Entrepreneur, coach and real estate developer' },
      { path: ['evidence', 'cards', 0, 'quote'],       label: 'Testimonial 1 — quote (text fallback)', textarea: true, rows: 4, hint: 'Used only when no video is set above.' },
      { path: ['evidence', 'cards', 0, 'attribution'], label: 'Testimonial 1 — name (text fallback)', hint: 'Who said it. e.g. — James, Selection 2025' },
      { path: ['evidence', 'cards', 1, 'video'],       label: 'Testimonial 2 — video', hint: 'Path to a video file in /public, e.g. /testimonials/testimonial-2.mp4. When set, this card plays the video instead of a text quote.' },
      { path: ['evidence', 'cards', 1, 'title'],       label: 'Testimonial 2 — video title', hint: 'Caption shown under the video. e.g. Name — role.' },
      { path: ['evidence', 'cards', 1, 'quote'],       label: 'Testimonial 2 — quote (text fallback)', textarea: true, rows: 4, hint: 'Used only when no video is set above.' },
      { path: ['evidence', 'cards', 1, 'attribution'], label: 'Testimonial 2 — name (text fallback)' },
      { path: ['evidence', 'cards', 2, 'video'],       label: 'Testimonial 3 — video', hint: 'Path to a video file in /public, e.g. /testimonials/testimonial-3.mp4. When set, this card plays the video instead of a text quote.' },
      { path: ['evidence', 'cards', 2, 'title'],       label: 'Testimonial 3 — video title', hint: 'Caption shown under the video. e.g. Name — role.' },
      { path: ['evidence', 'cards', 2, 'quote'],       label: 'Testimonial 3 — quote (text fallback)', textarea: true, rows: 4, hint: 'Used only when no video is set above.' },
      { path: ['evidence', 'cards', 2, 'attribution'], label: 'Testimonial 3 — name (text fallback)' },
      { path: ['evidence', 'cards', 3, 'video'],       label: 'Testimonial 4 — video', hint: 'Path to a video file in /public, e.g. /testimonials/testimonial-4.mp4. When set, this card plays the video instead of a text quote.' },
      { path: ['evidence', 'cards', 3, 'title'],       label: 'Testimonial 4 — video title', hint: 'Caption shown under the video. e.g. Name — role.' },
      { path: ['evidence', 'cards', 3, 'quote'],       label: 'Testimonial 4 — quote (text fallback)', textarea: true, rows: 4, hint: 'Used only when no video is set above.' },
      { path: ['evidence', 'cards', 3, 'attribution'], label: 'Testimonial 4 — name (text fallback)' },
    ],
  },
  {
    key: 'founder',
    title: 'Who Am I (Founder)',
    previewWrap: 'section-founder-preview',
    fields: [
      { path: ['founder', 'eyebrow'],         label: 'Numeral / eyebrow', hint: 'Small numeral above the heading. e.g. V' },
      { path: ['founder', 'heading'],         label: 'Heading', hint: 'Display font, centered.' },
      { path: ['founder', 'placeholderMark'], label: 'Portrait label', hint: 'Caption in the portrait frame until a photo is uploaded. e.g. Nico Seedsman — Afghanistan' },
      { path: ['founder', 'templatedLabel'],  label: 'Placeholder badge', hint: 'Small corner badge on the portrait frame while no photo is uploaded. Internal marker — e.g. TEMPLATED.' },
      { path: ['founder', 'paragraphs', 0],   label: 'Paragraph 1', markdown: true, italic: true, previewClass: 'founder-p', hint: 'Whole paragraph renders italic. Optional inline formatting: **bold**, [link](url).' },
      { path: ['founder', 'paragraphs', 1],   label: 'Paragraph 2', markdown: true, italic: true, previewClass: 'founder-p', hint: 'Whole paragraph renders italic.' },
      { path: ['founder', 'paragraphs', 2],   label: 'Paragraph 3', markdown: true, italic: true, previewClass: 'founder-p', hint: 'Whole paragraph renders italic.' },
      { path: ['founder', 'paragraphs', 3],   label: 'Paragraph 4', markdown: true, italic: true, previewClass: 'founder-p', hint: 'Whole paragraph renders italic.' },
      { path: ['founder', 'signature'],       label: 'Signature', hint: 'Brass-coloured display font. e.g. — Nico Seedsman' },
    ],
  },
  {
    key: 'faq',
    title: 'Questions a Serious Man Asks',
    fields: [
      { path: ['faq', 'eyebrow'],   label: 'Numeral / eyebrow', hint: 'Small numeral above the heading. e.g. VII' },
      { path: ['faq', 'heading'],   label: 'Heading', hint: 'Display font, centered.' },
      { path: ['faq', 'questions'], label: 'Questions', textarea: true, rows: 9, hint: 'One question per line. Each renders as a numbered reflective line. No answers.' },
    ],
  },
  {
    key: 'howWeOperate',
    title: 'How We Operate & What to Expect',
    fields: [
      { path: ['howWeOperate', 'eyebrow'],       label: 'Numeral / eyebrow', hint: 'Small numeral above the heading. e.g. VIII' },
      { path: ['howWeOperate', 'heading'],       label: 'Heading' },
      { path: ['howWeOperate', 'paragraphs', 0], label: 'Paragraph 1', textarea: true },
      { path: ['howWeOperate', 'paragraphs', 1], label: 'Paragraph 2', textarea: true },
      { path: ['howWeOperate', 'paragraphs', 2], label: 'Paragraph 3', textarea: true },
      { path: ['howWeOperate', 'pullQuote'],     label: 'Pull-quote', italic: true, hint: 'Large quote shown after paragraph 3.' },
      { path: ['howWeOperate', 'paragraphs', 3], label: 'Paragraph 4', textarea: true },
      { path: ['howWeOperate', 'paragraphs', 4], label: 'Paragraph 5', textarea: true },
      { path: ['howWeOperate', 'paragraphs', 5], label: 'Paragraph 6', textarea: true },
      { path: ['howWeOperate', 'paragraphs', 6], label: 'Paragraph 7', textarea: true },
    ],
  },
  {
    key: 'cta',
    title: 'Call to Action button',
    fields: [
      { path: ['cta', 'label'], label: 'Button label', hint: 'Used on every "Come this way" band across the page.' },
    ],
  },
  {
    key: 'closing',
    title: 'Closing (logo + verses)',
    fields: [
      { path: ['closing', 'wordmark'],          label: 'Wordmark', hint: 'Large word under the sigil. e.g. THE ORDER' },
      { path: ['closing', 'verses', 0, 'text'], label: 'Verse 1 — text', textarea: true },
      { path: ['closing', 'verses', 0, 'ref'],  label: 'Verse 1 — reference', hint: 'e.g. Mark 12:30' },
      { path: ['closing', 'verses', 1, 'text'], label: 'Verse 2 — text', textarea: true },
      { path: ['closing', 'verses', 1, 'ref'],  label: 'Verse 2 — reference', hint: 'e.g. Mark 12:31' },
    ],
  },
  {
    key: 'footer',
    title: 'Footer',
    fields: [
      { path: ['footer', 'email'],       label: 'Contact email', hint: 'Shown as a mailto link at the bottom of the page. e.g. info@theorder.global' },
      { path: ['footer', 'phone'],       label: 'Contact phone', hint: 'Shown as a tel link. Optional — leave blank to hide.' },
      { path: ['footer', 'copyright'],   label: 'Copyright', hint: 'Renders in uppercase monospace, small.' },
      { path: ['footer', 'privacyLabel'], label: 'Privacy link text', hint: 'The link text at the bottom of the page. Leave blank to hide the link.' },
      { path: ['footer', 'privacyHref'], label: 'Privacy link URL', hint: 'Full https:// URL.' },
    ],
  },
  {
    key: 'finalScreen',
    title: 'Final screen (after submitting application)',
    fields: [
      { path: ['finalScreen', 'heading'], label: 'Heading', hint: 'Display font, large.' },
      { path: ['finalScreen', 'sub'],     label: 'Sub line', textarea: true, hint: 'Standard body paragraph.' },
      { path: ['finalScreen', 'begin'],   label: 'Encouragement', textarea: true, italic: true, hint: 'Renders italic, brass-light colour.' },
    ],
  },
]

function getAt(obj, path) {
  let cur = obj
  for (const k of path) {
    if (cur == null) return undefined
    cur = cur[k]
  }
  return cur
}

function setAt(obj, path, value) {
  if (path.length === 0) return value
  const [head, ...rest] = path
  const isArrayKey = typeof head === 'number'
  const next = isArrayKey ? (Array.isArray(obj) ? [...obj] : []) : { ...(obj || {}) }
  next[head] = setAt(next[head], rest, value)
  return next
}

export function SectionsTab({ sections, onChange }) {
  const update = (path, value) => onChange((cur) => setAt(cur, path, value))

  return (
    <div className="admin-tab-pane">
      {SECTION_DEFS.map((sec) => (
        <section key={sec.key} className="admin-section-block">
          <h2 className="admin-section-title display">{sec.title}</h2>
          <div className="admin-fields">
            {sec.fields.map((f) => {
              const value = getAt(sections, f.path) ?? ''
              const id = sec.key + '-' + f.path.join('-')

              const richMode = richModeForPath(f.path)
              if (richMode) {
                const raw = getAt(sections, f.path)
                const richValue = richMode === 'lines'
                  ? (Array.isArray(raw) ? raw : (typeof raw === 'string' && raw ? raw.split('\n') : []))
                  : (raw ?? '')
                return (
                  <label key={id} className="admin-field">
                    <span className="admin-field-label">{f.label}</span>
                    <RichText
                      value={richValue}
                      mode={richMode}
                      withLink
                      onChange={(v) => update(f.path, v)}
                      className={'admin-rich' + (f.italic ? ' admin-rich-italic' : '')}
                    />
                    {f.hint && <span className="admin-field-hint">{f.hint}</span>}
                  </label>
                )
              }

              if (f.markdown) {
                return (
                  <MarkdownField
                    key={id}
                    id={id}
                    label={f.label}
                    value={value}
                    onChange={(v) => update(f.path, v)}
                    rows={4}
                    hint={f.hint || 'Optional inline formatting: **bold**, *italic word*, [link](url).'}
                    previewClass={f.previewClass || ''}
                    previewWrapClass={sec.previewWrap || ''}
                    italic={!!f.italic}
                  />
                )
              }

              const italicClass = f.italic ? ' admin-input-italic' : ''

              return (
                <label key={id} className="admin-field" htmlFor={id}>
                  <span className="admin-field-label">{f.label}</span>
                  {f.textarea ? (
                    <textarea
                      id={id}
                      className={'input-field admin-textarea' + italicClass}
                      value={value}
                      rows={f.rows || 3}
                      onChange={(e) => update(f.path, e.target.value)}
                    />
                  ) : (
                    <input
                      id={id}
                      className={'input-field' + italicClass}
                      type="text"
                      value={value}
                      onChange={(e) => update(f.path, e.target.value)}
                    />
                  )}
                  {f.hint && <span className="admin-field-hint">{f.hint}</span>}
                </label>
              )
            })}
          </div>
        </section>
      ))}
    </div>
  )
}
