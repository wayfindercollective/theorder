/**
 * Application questions — loaded from /content/questions.json.
 *
 * IMPORTANT — Wayfinder contract:
 *   - The `value` strings on scored questions MUST match the funnel's scoring
 *     rules EXACTLY. The CMS marks them read-only.
 *   - The `label` shown to the user can differ from `value`.
 *   - Field IDs (mainChallenge, commitment, readiness, income, contact) must
 *     match the Wayfinder funnel field names — do not rename.
 */

import data from '../../content/questions.json'

export const questions = data.questions
