import { supabase } from './utils/supabase';

const BASE = import.meta.env.VITE_API_URL || '';
export const STORE_NAME = import.meta.env.VITE_STORE_NAME || 'Beads Design';

// Current Supabase access token (supabase-js refreshes it automatically)
export async function getToken() {
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token || null;
}

export async function api(path, { method = 'GET', body } = {}) {
  const token = await getToken();
  const isForm = body instanceof FormData;
  const res = await fetch(`${BASE}/api${path}`, {
    method,
    headers: {
      ...(isForm || body === undefined ? {} : { 'Content-Type': 'application/json' }),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: isForm ? body : body === undefined ? undefined : JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    if (res.status === 401 && token) await supabase.auth.signOut();
    throw new Error(data.message || `Request failed (${res.status})`);
  }
  return data;
}

export function imgUrl(url) {
  if (!url) return '';
  return /^https?:\/\//.test(url) ? url : `${BASE}${url}`;
}

const inr = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 });
export const money = (n) => inr.format(Number(n) || 0).replace(/\.00$/, '');

export const formatDate = (d) =>
  new Date(d).toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });

export const MACHINE_LABELS = {
  'multi-head': 'Multi Head',
  'single-head': 'Single Head',
  'small-machine': 'Small Machine (Usha / Brother)',
};

export const STITCH_RANGES = [
  ['0-5000', 'Up to 5,000'],
  ['5000-20000', '5,000 – 20,000'],
  ['20000-40000', '20,000 – 40,000'],
  ['40000-60000', '40,000 – 60,000'],
  ['60000-100000', '60,000 – 1,00,000'],
  ['100000-200000', '1,00,000 – 2,00,000'],
  ['200000-100000000', 'Above 2,00,000'],
];

export const FORMATS = ['EMB', 'DST', 'PES', 'JEF', 'EXP', 'VP3', 'XXX', 'HUS', 'VIP', 'SEW', 'PXF', 'ZIP'];

export const num = (n) => Number(n || 0).toLocaleString('en-IN');

export const fileSize = (bytes) =>
  bytes >= 1048576 ? `${(bytes / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`;

// Asks the API for a short-lived download link (after the access check) and opens it.
// The link already tells the browser to save the file under the right name.
export async function downloadFile(path) {
  const { url, filename } = await api(path);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.rel = 'noopener';
  document.body.appendChild(a);
  a.click();
  a.remove();
}

export function loadScript(src) {
  return new Promise((resolve) => {
    if (document.querySelector(`script[src="${src}"]`)) return resolve(true);
    const s = document.createElement('script');
    s.src = src;
    s.onload = () => resolve(true);
    s.onerror = () => resolve(false);
    document.body.appendChild(s);
  });
}
