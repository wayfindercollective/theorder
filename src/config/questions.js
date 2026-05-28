/**
 * The Application — 5 steps. All multiple-choice except contact.
 *
 * IMPORTANT — Wayfinder contract:
 *   - The `value` strings on scored questions MUST match the funnel's scoring rules EXACTLY.
 *     Those are the strings the CRM scores on. DO NOT bracket / change them.
 *   - The `label` shown to the user can differ from `value`. Labels here are bracketed
 *     placeholder slots — fill them in with the on-screen wording you want.
 *   - Field names (mainChallenge, commitment, readiness, income) must match the
 *     Wayfinder funnel field names. Do not rename.
 */

export const questions = [
  {
    id: 'mainChallenge',
    type: 'choice',
    scored: false,
    question: '[ Q1 — opener question ]',
    subtitle: '[ Q1 subtitle — optional ]',
    options: [
      { label: '[ Option 1 ]', value: 'Option 1' },
      { label: '[ Option 2 ]', value: 'Option 2' },
      { label: '[ Option 3 ]', value: 'Option 3' },
      { label: '[ Option 4 ]', value: 'Option 4' },
      { label: '[ Option 5 ]', value: 'Option 5' },
    ],
  },
  {
    id: 'commitment',
    type: 'choice',
    scored: true,
    question: '[ Q2 — commitment question ]',
    subtitle: '[ Q2 subtitle — optional ]',
    options: [
      // VALUE STRINGS = WAYFINDER CONTRACT — DO NOT CHANGE
      { label: '[ Commitment — highest ]', value: 'Fully commits and follows through' },
      { label: '[ Commitment — high ]',    value: 'Mostly commits' },
      { label: '[ Commitment — mid ]',     value: 'Inconsistent commitment' },
      { label: '[ Commitment — low ]',     value: 'Rarely commits' },
    ],
  },
  {
    id: 'readiness',
    type: 'choice',
    scored: true,
    question: '[ Q3 — readiness question ]',
    subtitle: '[ Q3 subtitle — optional ]',
    options: [
      // VALUE STRINGS = WAYFINDER CONTRACT — DO NOT CHANGE
      { label: '[ Readiness — now ]',       value: 'Ready now' },
      { label: '[ Readiness — soon ]',      value: 'Ready soon' },
      { label: '[ Readiness — open ]',      value: 'Open to it' },
      { label: '[ Readiness — exploring ]', value: 'Exploring' },
    ],
  },
  {
    id: 'income',
    type: 'choice',
    scored: true,
    question: '[ Q4 — income question ]',
    subtitle: '[ Q4 subtitle — optional ]',
    options: [
      // VALUE STRINGS = WAYFINDER CONTRACT — DO NOT CHANGE
      { label: '[ $100k+ ]',  value: '$100k+ Per Month' },
      { label: '[ $10–100k ]', value: '$10-100k Per Month' },
      { label: '[ $5–10k ]',   value: '$5-10k Per Month' },
      { label: '[ $3–5k ]',    value: '$3-5k Per Month' },
      { label: '[ $1–3k ]',    value: '$1-3k Per Month' },
      { label: '[ $0–1k ]',    value: '$0-1k Per Month' },
    ],
  },
  {
    id: 'contact',
    type: 'contact',
    scored: false,
    question: '[ Q5 — contact step heading ]',
    subtitle: '[ Q5 subtitle — optional ]',
  },
]
