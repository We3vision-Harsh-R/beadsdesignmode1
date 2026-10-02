import { db, IMAGE_URL_PREFIX, q } from '../config/supabase.js';
import { HttpError } from '../utils/helpers.js';

// Logo shown in the website header. url '' = the logo that ships with the website.
export const BRANDING_DEFAULTS = { url: '', height: 40, mobileHeight: 30 };
export const LOGO_LIMITS = { height: [20, 90], mobileHeight: [16, 70] };

export async function getBranding() {
  try {
    const row = await q(db.from('site_settings').select('value').eq('key', 'branding').maybeSingle());
    return { ...BRANDING_DEFAULTS, ...(row?.value || {}) };
  } catch {
    return { ...BRANDING_DEFAULTS }; // never break the whole website because of a settings problem
  }
}

function size(value, name, [min, max]) {
  const n = Math.round(Number(value));
  if (!Number.isFinite(n) || n < min || n > max) throw new HttpError(400, `${name} must be between ${min} and ${max} px`);
  return n;
}

export async function saveBranding(body = {}) {
  const url = String(body.url ?? '');
  if (url && !url.startsWith(IMAGE_URL_PREFIX)) throw new HttpError(400, 'Upload the logo from the admin panel first');
  const value = {
    url,
    height: size(body.height, 'Logo height', LOGO_LIMITS.height),
    mobileHeight: size(body.mobileHeight, 'Mobile logo height', LOGO_LIMITS.mobileHeight),
  };
  await q(db.from('site_settings').upsert({ key: 'branding', value, updated_at: new Date().toISOString() }));
  return value;
}
