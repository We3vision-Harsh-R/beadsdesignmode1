import './env.js';
import { createClient } from '@supabase/supabase-js';
import { HttpError, slugify } from '../utils/helpers.js';

const { SUPABASE_URL, SUPABASE_SECRET_KEY } = process.env;

if (!SUPABASE_URL || !SUPABASE_SECRET_KEY) {
  throw new Error('SUPABASE_URL and SUPABASE_SECRET_KEY are missing. Set them in server/.env (local) or in Hostinger -> Environment variables.');
}

// Server-side client. The secret key bypasses Row Level Security, so it must never reach the browser.
export const db = createClient(SUPABASE_URL, SUPABASE_SECRET_KEY, {
  auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
});

export const FILES_BUCKET = 'design-files'; // private
export const IMAGES_BUCKET = 'design-images'; // public
export const IMAGE_URL_PREFIX = `${SUPABASE_URL}/storage/v1/object/public/${IMAGES_BUCKET}/`;

const PG_ERRORS = {
  23505: [409, 'This already exists'],
  23503: [400, 'This item is still linked to other data'],
  23514: [400, 'A value is not allowed'],
  23502: [400, 'A required value is missing'],
  '22P02': [400, 'Invalid id or value'],
  22003: [400, 'A number is too large'],
};

export function dbError(error) {
  // Errors raised on purpose by our own database functions (e.g. "SKU limit reached")
  if (error.code === 'P0001') return new HttpError(400, error.message);
  const known = PG_ERRORS[error.code];
  if (known) return new HttpError(known[0], known[1]);
  const err = new HttpError(500, error.message || 'Database error');
  err.details = error;
  return err;
}

// Unwraps a Supabase response: returns data or throws
export async function q(request) {
  const { data, error } = await request;
  if (error) throw dbError(error);
  return data;
}

export async function count(request) {
  const { count: n, error } = await request;
  if (error) throw dbError(error);
  return n || 0;
}

export async function uniqueSlug(table, text, excludeId) {
  const base = slugify(text) || 'item';
  for (let n = 1; ; n += 1) {
    const slug = n === 1 ? base : `${base}-${n}`;
    let query = db.from(table).select('id').eq('slug', slug).limit(1);
    if (excludeId) query = query.neq('id', excludeId);
    const rows = await q(query);
    if (!rows.length) return slug;
  }
}

// Runs an `.in()` lookup in chunks so long id lists don't overflow the URL
export async function selectIn(table, column, ids, select = '*') {
  const out = [];
  for (let i = 0; i < ids.length; i += 150) {
    out.push(...(await q(db.from(table).select(select).in(column, ids.slice(i, i + 150)))));
  }
  return out;
}

export function removeImages(urls = []) {
  const paths = urls.filter((u) => u.startsWith(IMAGE_URL_PREFIX)).map((u) => u.slice(IMAGE_URL_PREFIX.length));
  if (paths.length) db.storage.from(IMAGES_BUCKET).remove(paths).catch(() => {});
}

export function removeDesignFiles(paths = []) {
  if (paths.length) db.storage.from(FILES_BUCKET).remove(paths).catch(() => {});
}
