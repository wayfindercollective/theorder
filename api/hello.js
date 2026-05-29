/**
 * Diagnostic endpoint — no imports, no env vars, just proves /api/* is reachable.
 * GET /api/hello → { ok: true, time: "..." }
 */

export default function handler(req, res) {
  return res.status(200).json({ ok: true, time: new Date().toISOString() })
}
