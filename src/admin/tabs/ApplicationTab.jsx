/**
 * ApplicationTab — edit application questions and their on-screen labels.
 *
 * The `value` field on scored questions is the Wayfinder scoring contract
 * (the string the CRM scores on). Those are rendered read-only with a
 * warning. The `label` shown to applicants is freely editable.
 */

function setAt(obj, path, value) {
  if (path.length === 0) return value
  const [head, ...rest] = path
  const isArrayKey = typeof head === 'number'
  const next = isArrayKey ? (Array.isArray(obj) ? [...obj] : []) : { ...(obj || {}) }
  next[head] = setAt(next[head], rest, value)
  return next
}

function getAt(obj, path) {
  let cur = obj
  for (const k of path) { if (cur == null) return undefined; cur = cur[k] }
  return cur
}

export function ApplicationTab({ questions, onChange }) {
  const qs = questions?.questions || []
  const update = (path, value) => onChange((cur) => setAt(cur, path, value))

  return (
    <div className="admin-tab-pane">
      <p className="restraint admin-tab-intro">
        Edit the question text and answer labels. The scoring values (right column on
        choice questions) are the contract with the CRM — do not change.
      </p>

      {qs.map((q, qi) => (
        <section key={q.id} className="admin-section-block">
          <h2 className="admin-section-title display">Q{qi + 1} — {q.id}</h2>

          <div className="admin-fields">
            <label className="admin-field">
              <span className="admin-field-label">Question text</span>
              <input
                className="input-field"
                type="text"
                value={getAt(questions, ['questions', qi, 'question']) ?? ''}
                onChange={(e) => update(['questions', qi, 'question'], e.target.value)}
              />
              <span className="admin-field-hint">The question applicants read. Keep it punchy.</span>
            </label>

            <label className="admin-field">
              <span className="admin-field-label">Subtitle (optional)</span>
              <input
                className="input-field"
                type="text"
                value={getAt(questions, ['questions', qi, 'subtitle']) ?? ''}
                onChange={(e) => update(['questions', qi, 'subtitle'], e.target.value)}
              />
              <span className="admin-field-hint">Smaller line under the question. Leave blank to hide.</span>
            </label>
          </div>

          {q.type === 'choice' && q.options && (
            <div className="admin-options">
              <div className="admin-options-header">
                <span className="admin-field-label">Answer options</span>
                <span className="admin-options-hint">left: label shown · right: scoring value (locked)</span>
              </div>
              {q.options.map((opt, oi) => (
                <div key={oi} className="admin-option-row">
                  <input
                    className="input-field admin-option-label"
                    type="text"
                    value={getAt(questions, ['questions', qi, 'options', oi, 'label']) ?? ''}
                    onChange={(e) => update(['questions', qi, 'options', oi, 'label'], e.target.value)}
                  />
                  <input
                    className="input-field admin-option-value"
                    type="text"
                    value={opt.value}
                    readOnly
                    tabIndex={-1}
                    title="Scoring value — do not change"
                  />
                </div>
              ))}
            </div>
          )}

          {q.type === 'contact' && (
            <p className="restraint admin-tab-intro">
              (Contact step — name, email, phone, SMS consent. No additional fields here.)
            </p>
          )}
        </section>
      ))}
    </div>
  )
}
