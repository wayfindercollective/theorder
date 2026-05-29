/**
 * SectionsTab — text inputs for every editable string in sections.json.
 *
 * Schema is driven by the FIELDS array below — each entry describes one
 * editable string. To add a new field, add an entry; no other code change.
 */

const SECTION_DEFS = [
  {
    key: 'hero',
    title: 'Hero',
    fields: [
      { path: ['hero', 'eyebrow'],   label: 'Eyebrow' },
      { path: ['hero', 'headline'],  label: 'Headline', textarea: true },
      { path: ['hero', 'cta'],       label: 'CTA button' },
      { path: ['hero', 'restraint'], label: 'Restraint line (under CTA)' },
    ],
  },
  {
    key: 'truth',
    title: 'The Truth',
    fields: [
      { path: ['truth', 'heading'],       label: 'Heading' },
      { path: ['truth', 'paragraphs', 0], label: 'Paragraph 1', textarea: true },
      { path: ['truth', 'paragraphs', 1], label: 'Paragraph 2', textarea: true },
      { path: ['truth', 'paragraphs', 2], label: 'Paragraph 3', textarea: true },
      { path: ['truth', 'turn'],          label: 'Turn line (italic)' },
    ],
  },
  {
    key: 'code',
    title: 'The Code',
    fields: [
      { path: ['code', 'heading'],          label: 'Heading' },
      { path: ['code', 'intro'],            label: 'Intro line' },
      { path: ['code', 'principles', 0, 'text'], label: 'Principle I' },
      { path: ['code', 'principles', 1, 'text'], label: 'Principle II' },
      { path: ['code', 'principles', 2, 'text'], label: 'Principle III' },
    ],
  },
  {
    key: 'become',
    title: 'What You Become',
    fields: [
      { path: ['become', 'heading'], label: 'Heading' },
      { path: ['become', 'blocks', 0, 'title'], label: 'Block 1 — title' },
      { path: ['become', 'blocks', 0, 'body'],  label: 'Block 1 — body', textarea: true },
      { path: ['become', 'blocks', 1, 'title'], label: 'Block 2 — title' },
      { path: ['become', 'blocks', 1, 'body'],  label: 'Block 2 — body', textarea: true },
      { path: ['become', 'blocks', 2, 'title'], label: 'Block 3 — title' },
      { path: ['become', 'blocks', 2, 'body'],  label: 'Block 3 — body', textarea: true },
    ],
  },
  {
    key: 'considered',
    title: 'Who Is Considered',
    fields: [
      { path: ['considered', 'heading'], label: 'Heading' },
      { path: ['considered', 'for_'],    label: 'Apply if… line' },
      { path: ['considered', 'not'],     label: 'Do not apply if… line' },
    ],
  },
  {
    key: 'application',
    title: 'Application — copy around the form',
    fields: [
      { path: ['application', 'heading'],      label: 'Heading' },
      { path: ['application', 'sub'],          label: 'Sub line' },
      { path: ['application', 'submitButton'], label: 'Submit button text' },
    ],
  },
  {
    key: 'founder',
    title: 'From the Founder',
    fields: [
      { path: ['founder', 'heading'],          label: 'Heading' },
      { path: ['founder', 'paragraphs', 0],    label: 'Paragraph 1', textarea: true },
      { path: ['founder', 'paragraphs', 1],    label: 'Paragraph 2', textarea: true },
      { path: ['founder', 'paragraphs', 2],    label: 'Paragraph 3', textarea: true },
      { path: ['founder', 'signature'],        label: 'Signature' },
    ],
  },
  {
    key: 'faq',
    title: 'FAQ',
    fields: [
      { path: ['faq', 'heading'], label: 'Heading' },
      { path: ['faq', 'items', 0, 'q'], label: 'Q1' },
      { path: ['faq', 'items', 0, 'a'], label: 'A1', textarea: true },
      { path: ['faq', 'items', 1, 'q'], label: 'Q2' },
      { path: ['faq', 'items', 1, 'a'], label: 'A2', textarea: true },
      { path: ['faq', 'items', 2, 'q'], label: 'Q3' },
      { path: ['faq', 'items', 2, 'a'], label: 'A3', textarea: true },
      { path: ['faq', 'items', 3, 'q'], label: 'Q4' },
      { path: ['faq', 'items', 3, 'a'], label: 'A4', textarea: true },
      { path: ['faq', 'items', 4, 'q'], label: 'Q5' },
      { path: ['faq', 'items', 4, 'a'], label: 'A5', textarea: true },
    ],
  },
  {
    key: 'footer',
    title: 'Footer',
    fields: [
      { path: ['footer', 'restraint'],   label: 'Restraint line' },
      { path: ['footer', 'copyright'],   label: 'Copyright' },
      { path: ['footer', 'privacyHref'], label: 'Privacy link URL' },
    ],
  },
  {
    key: 'finalScreen',
    title: 'Final screen (after submitting application)',
    fields: [
      { path: ['finalScreen', 'heading'], label: 'Heading' },
      { path: ['finalScreen', 'sub'],     label: 'Sub line' },
      { path: ['finalScreen', 'begin'],   label: 'Encouragement', textarea: true },
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
  // Returns a structurally-cloned object with the value set at path.
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
              return (
                <label key={id} className="admin-field" htmlFor={id}>
                  <span className="admin-field-label">{f.label}</span>
                  {f.textarea ? (
                    <textarea
                      id={id}
                      className="input-field admin-textarea"
                      value={value}
                      rows={3}
                      onChange={(e) => update(f.path, e.target.value)}
                    />
                  ) : (
                    <input
                      id={id}
                      className="input-field"
                      type="text"
                      value={value}
                      onChange={(e) => update(f.path, e.target.value)}
                    />
                  )}
                </label>
              )
            })}
          </div>
        </section>
      ))}
    </div>
  )
}
