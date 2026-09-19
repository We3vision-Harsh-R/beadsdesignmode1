export class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

export function slugify(text) {
  return String(text)
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

// Keeps search text safe to embed in PostgREST filters
export function cleanSearch(text) {
  return String(text ?? '')
    .replace(/[^\p{L}\p{N}\s-]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 60);
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const isUuid = (value) => UUID.test(String(value ?? ''));

export function toNumber(value, name, { min = 0, integer = false } = {}) {
  const n = Number(value);
  if (!Number.isFinite(n) || n < min) throw new HttpError(400, `${name} must be a number of at least ${min}`);
  return integer ? Math.floor(n) : n;
}

export function pageParams(query, { defaultLimit = 24, maxLimit = 60 } = {}) {
  const page = Math.max(1, parseInt(query.page, 10) || 1);
  const limit = Math.min(maxLimit, Math.max(1, parseInt(query.limit, 10) || defaultLimit));
  return { page, limit, from: (page - 1) * limit, to: page * limit - 1 };
}

// Returns the 10 digit Indian mobile number (digits only) or null if it is not valid
export function cleanMobile(raw) {
  const digits = String(raw ?? '').replace(/\D/g, '');
  const local = digits.startsWith('91') && digits.length === 12 ? digits.slice(2) : digits;
  return /^[6-9]\d{9}$/.test(local) ? local : null;
}

