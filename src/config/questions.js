/**
 * Application questions — loaded from /content/questions.json.
 *
 * Labels are applicant-facing. Question IDs and option values are stable
 * internal keys used only by the local qualification filter; none of this
 * data is sent to Wayfinder OS.
 */

import data from '../../content/questions.json'

export const questions = data.questions
