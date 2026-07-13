/**
 * ApplicationTab — full editor for the application questions.
 *
 * Everything is editable: question text, subtitles, answer labels, and the
 * question/option set itself (add, remove, reorder). The `value` field on
 * options and the question `id` are the Wayfinder scoring contract (the
 * strings the CRM scores on / the field names it reads) — those stay locked
 * behind an explicit unlock toggle so they can't be changed by accident.
 *
 * Each answer option also carries a "Declines the application" flag — a
 * business rule, NOT part of the CRM contract, so it is never locked. An
 * applicant who picks a flagged answer finishes the form, sees the negation
 * screen (edited here too), and no lead is sent to the CRM.
 *
 * The contact step is pinned last (the form's submit lives on it) and can't
 * be removed or moved.
 */

import { useState } from 'react'

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

function moveItem(arr, from, to) {
  const next = [...arr]
  const [item] = next.splice(from, 1)
  next.splice(to, 0, item)
  return next
}

function nextQuestionId(qs) {
  const taken = new Set(qs.map((q) => q.id))
  let n = qs.length
  while (taken.has(`question${n}`)) n++
  return `question${n}`
}

export function ApplicationTab({ questions, onChange, sections, onSectionsChange }) {
  const qs = questions?.questions || []
  const [unlocked, setUnlocked] = useState(false)
  const update = (path, value) => onChange((cur) => setAt(cur, path, value))
  const updateList = (fn) => onChange((cur) => ({ ...cur, questions: fn(cur.questions || []) }))
  const decline = sections?.declineScreen || {}
  const updateDecline = (key, value) =>
    onSectionsChange((cur) => ({ ...cur, declineScreen: { ...(cur.declineScreen || {}), [key]: value } }))

  // The contact step is pinned to the end — choice questions can only move
  // within the range above it.
  const lastChoiceIndex = qs.reduce((acc, q, i) => (q.type === 'choice' ? i : acc), -1)

  const addOption = (qi) => updateList((list) =>
    list.map((q, i) => i === qi
      ? { ...q, options: [...(q.options || []), { label: '', value: '' }] }
      : q))

  const removeOption = (qi, oi) => updateList((list) =>
    list.map((q, i) => i === qi
      ? { ...q, options: (q.options || []).filter((_, j) => j !== oi) }
      : q))

  const moveOption = (qi, oi, dir) => updateList((list) =>
    list.map((q, i) => i === qi
      ? { ...q, options: moveItem(q.options || [], oi, oi + dir) }
      : q))

  const addQuestion = () => updateList((list) => {
    const q = {
      id: nextQuestionId(list),
      type: 'choice',
      scored: true,
      question: '',
      subtitle: '',
      options: [
        { label: '', value: '' },
        { label: '', value: '' },
      ],
    }
    // Insert before the contact step (or at the end if there isn't one).
    const contactIdx = list.findIndex((x) => x.type === 'contact')
    const next = [...list]
    next.splice(contactIdx === -1 ? next.length : contactIdx, 0, q)
    return next
  })

  const removeQuestion = (qi) => {
    const q = qs[qi]
    const name = q?.question?.trim() ? `“${q.question.trim()}”` : `Q${qi + 1}`
    if (!window.confirm(`Remove question ${name} and all its answer options?`)) return
    updateList((list) => list.filter((_, i) => i !== qi))
  }

  const moveQuestion = (qi, dir) => updateList((list) => moveItem(list, qi, qi + dir))

  return (
    <div className="admin-tab-pane">
      <p className="restraint admin-tab-intro">
        Edit the questions and answer options applicants see. The scoring values and
        field IDs are the contract with the CRM — they stay locked unless you unlock
        them below, and changing them changes how leads are scored. Tick
        “Declines the application” on an answer to turn away anyone who picks it:
        they finish the form, see the negation screen below, and are NOT sent to the
        CRM.
      </p>

      <section className="admin-section-block">
        <h2 className="admin-section-title display">Negation screen</h2>
        <p className="restraint admin-tab-intro">
          Shown instead of the booking screen when an applicant picks a declining
          answer. Their details are not stored and no lead is created.
        </p>
        <div className="admin-fields">
          <label className="admin-field">
            <span className="admin-field-label">Heading</span>
            <input
              className="input-field"
              type="text"
              value={decline.heading ?? ''}
              onChange={(e) => updateDecline('heading', e.target.value)}
            />
          </label>
          <label className="admin-field">
            <span className="admin-field-label">Message</span>
            <input
              className="input-field"
              type="text"
              value={decline.body ?? ''}
              onChange={(e) => updateDecline('body', e.target.value)}
            />
            <span className="admin-field-hint">The invitation to return when they are ready to go all in.</span>
          </label>
          <label className="admin-field">
            <span className="admin-field-label">Privacy line</span>
            <input
              className="input-field"
              type="text"
              value={decline.notice ?? ''}
              onChange={(e) => updateDecline('notice', e.target.value)}
            />
            <span className="admin-field-hint">Tells them their information has not been stored. Leave blank to hide.</span>
          </label>
        </div>
      </section>

      {qs.map((q, qi) => (
        <section key={qi} className="admin-section-block">
          <div className="admin-q-header">
            <h2 className="admin-section-title display">
              Q{qi + 1} — {q.id}{q.type === 'contact' ? ' (contact step)' : ''}
            </h2>
            {q.type === 'choice' && (
              <div className="admin-q-toolbar">
                <button
                  type="button" className="admin-mini-btn" title="Move up" aria-label="Move question up"
                  onClick={() => moveQuestion(qi, -1)} disabled={qi === 0}
                >↑</button>
                <button
                  type="button" className="admin-mini-btn" title="Move down" aria-label="Move question down"
                  onClick={() => moveQuestion(qi, 1)} disabled={qi >= lastChoiceIndex}
                >↓</button>
                <button
                  type="button" className="admin-mini-btn admin-mini-danger" title="Remove question" aria-label="Remove question"
                  onClick={() => removeQuestion(qi)}
                >✕</button>
              </div>
            )}
          </div>

          <div className="admin-fields">
            <label className="admin-field">
              <span className="admin-field-label">Question text</span>
              <input
                className="input-field"
                type="text"
                value={getAt(questions, ['questions', qi, 'question']) ?? ''}
                onChange={(e) => update(['questions', qi, 'question'], e.target.value)}
              />
              <span className="admin-field-hint">The question applicants read. Display font, large, typed character-by-character.</span>
            </label>

            <label className="admin-field">
              <span className="admin-field-label">Subtitle (optional)</span>
              <input
                className="input-field admin-input-italic"
                type="text"
                value={getAt(questions, ['questions', qi, 'subtitle']) ?? ''}
                onChange={(e) => update(['questions', qi, 'subtitle'], e.target.value)}
              />
              <span className="admin-field-hint">Smaller line under the question. Renders italic. Leave blank to hide.</span>
            </label>

            {q.type === 'choice' && unlocked && (
              <label className="admin-field">
                <span className="admin-field-label">Field ID (CRM contract)</span>
                <input
                  className="input-field admin-option-value admin-value-unlocked"
                  type="text"
                  value={getAt(questions, ['questions', qi, 'id']) ?? ''}
                  onChange={(e) => update(['questions', qi, 'id'], e.target.value)}
                />
                <span className="admin-field-hint">The field name this answer is sent under. Must match the Wayfinder funnel.</span>
              </label>
            )}
          </div>

          {q.type === 'choice' && (
            <div className="admin-options">
              <div className="admin-options-header">
                <span className="admin-field-label">Answer options</span>
                <span className="admin-options-hint">
                  left: label shown · right: scoring value {unlocked ? '(unlocked)' : '(locked)'}
                </span>
              </div>
              {(q.options || []).map((opt, oi) => (
                <div key={oi}>
                  <div className="admin-option-row admin-option-row-managed">
                    <input
                      className="input-field admin-option-label"
                      type="text"
                      placeholder="Answer shown to the applicant"
                      value={getAt(questions, ['questions', qi, 'options', oi, 'label']) ?? ''}
                      onChange={(e) => update(['questions', qi, 'options', oi, 'label'], e.target.value)}
                    />
                    <input
                      className={'input-field admin-option-value' + (unlocked ? ' admin-value-unlocked' : '')}
                      type="text"
                      placeholder={unlocked ? 'Scoring value sent to the CRM' : 'Scoring value (locked)'}
                      value={getAt(questions, ['questions', qi, 'options', oi, 'value']) ?? ''}
                      readOnly={!unlocked}
                      tabIndex={unlocked ? 0 : -1}
                      title={unlocked ? 'Scoring value sent to the CRM' : 'Scoring value — unlock below to edit'}
                      onChange={(e) => update(['questions', qi, 'options', oi, 'value'], e.target.value)}
                    />
                    <div className="admin-q-toolbar">
                      <button
                        type="button" className="admin-mini-btn" title="Move up" aria-label="Move option up"
                        onClick={() => moveOption(qi, oi, -1)} disabled={oi === 0}
                      >↑</button>
                      <button
                        type="button" className="admin-mini-btn" title="Move down" aria-label="Move option down"
                        onClick={() => moveOption(qi, oi, 1)} disabled={oi === (q.options || []).length - 1}
                      >↓</button>
                      <button
                        type="button" className="admin-mini-btn admin-mini-danger" title="Remove option" aria-label="Remove option"
                        onClick={() => removeOption(qi, oi)} disabled={(q.options || []).length <= 2}
                      >✕</button>
                    </div>
                  </div>
                  {/* Business rule, not CRM contract — never locked. */}
                  <label
                    className="admin-unlock admin-option-disqualify"
                    style={{ margin: '0.15rem 0 0.6rem', fontSize: '0.8rem' }}
                  >
                    <input
                      type="checkbox"
                      checked={!!opt.disqualify}
                      onChange={(e) => update(['questions', qi, 'options', oi, 'disqualify'], e.target.checked)}
                    />
                    <span style={opt.disqualify ? { color: '#c98' } : undefined}>
                      Declines the application{opt.disqualify ? ' — applicants who pick this are turned away' : ''}
                    </span>
                  </label>
                </div>
              ))}
              {(q.options || []).length > 0 && (q.options || []).every((o) => o.disqualify) && (
                <p className="admin-field-hint" style={{ color: '#c86' }}>
                  ⚠ Every answer on this question declines the application — NO
                  applicant can get through this form. Untick at least one.
                </p>
              )}
              <div>
                <button type="button" className="admin-add-btn" onClick={() => addOption(qi)}>
                  + Add answer option
                </button>
                {unlocked
                  ? null
                  : <span className="admin-field-hint admin-add-hint">New options need a scoring value — unlock below to set it.</span>}
              </div>
            </div>
          )}

          {q.type === 'contact' && (
            <p className="restraint admin-tab-intro">
              (Contact step — name, email, phone, SMS consent. Field labels and messages
              are edited under Sections → “Application form — field labels &amp; messages”.)
            </p>
          )}
        </section>
      ))}

      <div className="admin-q-footer">
        <button type="button" className="admin-add-btn" onClick={addQuestion}>
          + Add question
        </button>
        <label className="admin-unlock">
          <input
            type="checkbox"
            checked={unlocked}
            onChange={(e) => setUnlocked(e.target.checked)}
          />
          <span>
            Unlock scoring values &amp; field IDs — <strong>changes how leads are scored.</strong>{' '}
            Only edit these in step with the Wayfinder funnel.
          </span>
        </label>
      </div>
    </div>
  )
}
