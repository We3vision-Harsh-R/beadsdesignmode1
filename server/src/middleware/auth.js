import { createRemoteJWKSet, jwtVerify } from 'jose';
import { db, q } from '../config/supabase.js';
import { toUser } from '../utils/mappers.js';
import { HttpError } from '../utils/helpers.js';

const issuer = `${process.env.SUPABASE_URL}/auth/v1`;
const JWKS = createRemoteJWKSet(new URL(process.env.SUPABASE_JWKS_URL || `${issuer}/.well-known/jwks.json`));

// Verifies a Supabase access token locally with the project's public signing keys
async function userFromRequest(req) {
  const header = req.headers.authorization || '';
  if (!header.startsWith('Bearer ')) return { user: null, reason: 'Please log in' };
  let payload;
  try {
    ({ payload } = await jwtVerify(header.slice(7), JWKS, { issuer, audience: 'authenticated' }));
  } catch {
    return { user: null, reason: 'Session expired, please log in again' };
  }
  const profile = await q(db.from('profiles').select('*').eq('id', payload.sub).maybeSingle());
  if (!profile) return { user: null, reason: 'Account not found' };
  return { user: toUser(profile) };
}

export async function protect(req, res, next) {
  const { user, reason } = await userFromRequest(req);
  if (!user) throw new HttpError(401, reason);
  req.user = user;
  next();
}

// Sets req.user when a valid token is sent, but never blocks the request
export async function optionalAuth(req, res, next) {
  req.user = (await userFromRequest(req)).user;
  next();
}

export function adminOnly(req, res, next) {
  if (req.user?.role !== 'admin') throw new HttpError(403, 'Admin access only');
  next();
}
