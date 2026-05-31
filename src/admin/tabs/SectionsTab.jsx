/**
 * SectionsTab — text inputs for every editable string in sections.json.
 *
 * Schema is driven by the SECTION_DEFS array below — each entry describes one
 * editable field. To add a new field, add an entry; no other code change.
 *
 * Field flags:
 *   textarea   — multiline plain text
 *   markdown   — multiline markdown (with toolbar + preview)
 *   hint       — small grey caption under the field
 */

import { MarkdownField } from '../MarkdownField.jsx'

const SECTION_DEFS = [
  {
    key: 'hero',
    title: 'Hero',
    fields: [
      { path: ['hero', 'eyebrow'],   label: 'Eyebrow', hint: '1–3 words. Small text above the headline.' },
      { path: ['hero', 'headline'],  label: 'Headline', textarea: true, hint: '3–7 words. The single biggest line on the page.' },
      { path: ['hero', 'cta'],       label: 'CTA button', hint: '2–4 words. Action verb.' },
      { path: ['hero', 'restraint'], label: 'Restraint line (under CTA)', hint: 'One quiet line under the button. Optional.' },
    ],
  },
  {
    key: 'truth',
    title: 'The Truth',
    previewWrap: 'section-truth-preview',
    fields: [
      { path: ['truth', 'heading'],       label: 'Heading', hint: 'Names the condition. 3–7 words. Rendered in display font, centered.' },
      { path: ['truth', 'paragraphs', 0], label: 'Paragraph 1', markdown: true, previewClass: 'truth-p', hint: 'Centered body text. Optional inline formatting: **bold**, *italic word*, [link](url).' },
      { path: ['truth', 'paragraphs', 1], label: 'Paragraph 2', markdown: true, previewClass: 'truth-p', hint: 'Centered body text. Optional inline formatting: **bold**, *italic word*, [link](url).' },
      { path: ['truth', 'paragraphs', 2], label: 'Paragraph 3', markdown: true, previewClass: 'truth-p', hint: 'Centered body text. Optional inline formatting: **bold**, *italic word*, [link](url).' },
      { path: ['truth', 'turn'],          label: 'Turn line', italic: true, hint: 'The pivot — one line. Renders italic, brass-light colour.' },
    ],
  },
  {
    key: 'code',
    title: 'The Code',
    fields: [
      { path: ['code', 'heading'],          label: 'Heading' },
      { path: ['code', 'intro'],            label: 'Intro line', textarea: true, hint: 'One sentence above the principles. Optional.' },
      { path: ['code', 'principles', 0, 'text'], label: 'Principle I', hint: 'One word or one sentence. Numbered I in Roman.' },
      { path: ['code', 'principles', 1, 'text'], label: 'Principle II' },
      { path: ['code', 'principles', 2, 'text'], label: 'Principle III' },
    ],
  },
  {
    key: 'become',
    title: 'What You Become',
    fields: [
      { path: ['become', 'heading'], label: 'Heading' },
      { path: ['become', 'blocks', 0, 'title'], label: 'Block 1 — title', hint: '2–5 words. Display font.' },
      { path: ['become', 'blocks', 0, 'body'],  label: 'Block 1 — body', markdown: true, previewClass: 'become-body', hint: 'Plain body text (not italic). Optional inline formatting: **bold**, *italic word*, [link](url).' },
      { path: ['become', 'blocks', 1, 'title'], label: 'Block 2 — title', hint: '2–5 words. Display font.' },
      { path: ['become', 'blocks', 1, 'body'],  label: 'Block 2 — body', markdown: true, previewClass: 'become-body', hint: 'Plain body text (not italic). Optional inline formatting: **bold**, *italic word*, [link](url).' },
      { path: ['become', 'blocks', 2, 'title'], label: 'Block 3 — title', hint: '2–5 words. Display font.' },
      { path: ['become', 'blocks', 2, 'body'],  label: 'Block 3 — body', markdown: true, previewClass: 'become-body', hint: 'Plain body text (not italic). Optional inline formatting: **bold**, *italic word*, [link](url).' },
    ],
  },
  {
    key: 'considered',
    title: 'Who Is Considered',
    fields: [
      { path: ['considered', 'heading'], label: 'Heading', hint: '2–4 words. Display font, centered.' },
      { path: ['considered', 'for_'],    label: 'Apply if… line', textarea: true, hint: 'Centered, large, parchment colour.' },
      { path: ['considered', 'not'],     label: 'Do not apply if… line', textarea: true, hint: 'Centered, large, faded grey to contrast with the line above.' },
    ],
  },
  {
    key: 'application',
    title: 'Application — copy around the form',
    fields: [
      { path: ['application', 'eyebrow'],      label: 'Eyebrow' },
      { path: ['application', 'heading'],      label: 'Heading' },
      { path: ['application', 'sub'],          label: 'Sub line', textarea: true },
      { path: ['application', 'submitButton'], label: 'Submit button text' },
    ],
  },
  {
    key: 'founder',
    title: 'From the Founder',
    previewWrap: 'section-founder-preview',
    fields: [
      { path: ['founder', 'heading'],          label: 'Heading', hint: 'Display font, centered.' },
      { path: ['founder', 'paragraphs', 0],    label: 'Paragraph 1 — who he is', markdown: true, italic: true, previewClass: 'founder-p', hint: 'Whole paragraph renders italic. Optional inline formatting: **bold**, [link](url).' },
      { path: ['founder', 'paragraphs', 1],    label: 'Paragraph 2 — what he saw missing', markdown: true, italic: true, previewClass: 'founder-p', hint: 'Whole paragraph renders italic. Optional inline formatting: **bold**, [link](url).' },
      { path: ['founder', 'paragraphs', 2],    label: 'Paragraph 3 — the invitation', markdown: true, italic: true, previewClass: 'founder-p', hint: 'Whole paragraph renders italic. Optional inline formatting: **bold**, [link](url).' },
      { path: ['founder', 'signature'],        label: 'Signature', hint: 'Brass-coloured display font. e.g. — Nico Seedsman, 2026' },
    ],
  },
  {
    key: 'faq',
    title: 'FAQ',
    previewWrap: 'section-faq-preview',
    fields: [
      { path: ['faq', 'heading'], label: 'Heading', hint: 'Display font, centered.' },
      { path: ['faq', 'items', 0, 'q'], label: 'Q1', hint: 'Display font, parchment colour.' },
      { path: ['faq', 'items', 0, 'a'], label: 'A1', markdown: true, previewClass: 'faq-preview-p', hint: 'Plain body text. Optional inline formatting: **bold**, *italic word*, [link](url).' },
      { path: ['faq', 'items', 1, 'q'], label: 'Q2' },
      { path: ['faq', 'items', 1, 'a'], label: 'A2', markdown: true, previewClass: 'faq-preview-p', hint: 'Plain body text. Optional inline formatting: **bold**, *italic word*, [link](url).' },
      { path: ['faq', 'items', 2, 'q'], label: 'Q3' },
      { path: ['faq', 'items', 2, 'a'], label: 'A3', markdown: true, previewClass: 'faq-preview-p', hint: 'Plain body text. Optional inline formatting: **bold**, *italic word*, [link](url).' },
      { path: ['faq', 'items', 3, 'q'], label: 'Q4' },
      { path: ['faq', 'items', 3, 'a'], label: 'A4', markdown: true, previewClass: 'faq-preview-p', hint: 'Plain body text. Optional inline formatting: **bold**, *italic word*, [link](url).' },
      { path: ['faq', 'items', 4, 'q'], label: 'Q5' },
      { path: ['faq', 'items', 4, 'a'], label: 'A5', markdown: true, previewClass: 'faq-preview-p', hint: 'Plain body text. Optional inline formatting: **bold**, *italic word*, [link](url).' },
    ],
  },
  {
    key: 'footer',
    title: 'Footer',
    fields: [
      { path: ['footer', 'restraint'],   label: 'Restraint line', italic: true, hint: 'One philosophical line. Renders italic in display font.' },
      { path: ['footer', 'copyright'],   label: 'Copyright', hint: 'Renders in uppercase monospace, small.' },
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
                      rows={3}
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
