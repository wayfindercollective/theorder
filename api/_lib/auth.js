/**
 * Shared auth helpers for /api/admin/* routes.
 * JWT verification using jose, signed with ADMIN_JWT_SECRET.
 */

import { SignJWT, jwtVerify } from 'jose'

const JWT_ALG = 'HS256'
const JWT_TTL = '24h'

function getSecret() {
  const raw = process.env.ADMIN_JWT_SECRET
  if (!raw) throw new Error('ADMIN_JWT_SECRET not set')
  return new TextEncoder().encode(raw)
}

export async function issueToken(subject = 'admin') {
  return await new SignJWT({ sub: subject })
    .setProtectedHeader({ alg: JWT_ALG })
    .setIssuedAt()
    .setExpirationTime(JWT_TTL)
    .sign(getSecret())
}

export async function verifyToken(token) {
  try {
    const { payload } = await jwtVerify(token, getSecret(), { algorithms: [JWT_ALG] })
    return { ok: true, payload }
  } catch (err) {
    return { ok: false, error: err?.message || 'invalid token' }
  }
}

export function readBearer(req) {
  const h = req.headers?.authorization || req.headers?.Authorization || ''
  const m = h.match(/^Bearer\s+(.+)$/i)
  return m ? m[1] : null
}

export async function requireAuth(req, res) {
  const token = readBearer(req)
  if (!token) {
    res.status(401).json({ error: 'missing token' })
    return null
  }
  const v = await verifyToken(token)
  if (!v.ok) {
    res.status(401).json({ error: 'invalid token' })
    return null
  }
  return v.payload
}

export function timingSafeEqualStr(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string') return false
  if (a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return diff === 0
}
