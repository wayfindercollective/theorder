/**
 * One source of truth for phone normalization.
 * Used by the form (buildPayload) and the legacy-payload migration (submitLead).
 * Guards common paste mistakes without pulling in a full phone library —
 * Wayfinder normalizes again server-side; we only need to avoid sending
 * obviously-broken strings.
 *
 * Returns { phone, phoneCountry }. `country` is a countryCodes entry
 * ({ code, dial }) or { code, dial } reconstructed from a legacy payload.
 */
export function normalizePhone(rawPhone, country) {
  const raw = (rawPhone || '').trim()
  const digits = raw.replace(/\D/g, '')
  if (!digits) return { phone: '', phoneCountry: '' }
  // Explicit international "+…" → honor as-is; the selected flag is unreliable.
  if (raw.startsWith('+')) return { phone: `+${digits}`, phoneCountry: '' }
  const dialDigits = (country?.dial || '').replace(/\D/g, '')
  let national = digits
  if (dialDigits) {
    // Country code typed WITHOUT "+" (e.g. "1 555…", "44 7…") — drop the
    // duplicate. The length threshold keeps short local numbers that merely
    // start with the same digit (e.g. a 7-digit "1234567") from being mangled.
    if (national.startsWith(dialDigits) && national.length - dialDigits.length >= 7) {
      national = national.slice(dialDigits.length)
    }
    // National trunk "0" (e.g. UK "07700…" → "7700…"). NANP (+1) has no trunk 0.
    if (dialDigits !== '1' && national.startsWith('0')) {
      national = national.replace(/^0+/, '')
    }
  }
  // Strict E.164 for the wire: `+` + digits only, NO space or punctuation
  // (e.g. `+15551234567`). Wayfinder's SMS-consent gate silently drops the
  // opt-in if the phone won't normalize to E.164 — a space after the country
  // code ("+1 5551234567") was enough to break it. Keep this separator-free.
  const phone = dialDigits ? `+${dialDigits}${national}` : national
  return { phone, phoneCountry: country?.code || '' }
}
