import crypto from 'node:crypto';
import path from 'node:path';
import { Router } from 'express';
import multer from 'multer';
import { db, dbError, FILES_BUCKET, q, removeDesignFiles, removeImages } from '../config/supabase.js';
import { protect, adminOnly, optionalAuth } from '../middleware/auth.js';
import { getAccess } from '../services/access.js';
import { toDesign } from '../utils/mappers.js';
import { cleanSearch, HttpError, isUuid, pageParams, slugify, toNumber } from '../utils/helpers.js';

export const MACHINE_TYPES = ['multi-head', 'single-head', 'small-machine'];
export const FILE_FORMATS = ['EMB', 'DST', 'PES', 'JEF', 'EXP', 'VP3', 'XXX', 'HUS', 'VIP', 'SEW', 'PXF', 'ZIP'];

const router = Router();

const SORTS = {
  newest: ['created_at', false],
  popular: ['downloads', false],
  price_asc: ['price', true],
  price_desc: ['price', false],
  id: ['code', false],
};

const LIST_SELECT = '*, category:categories(id, name, slug)';

async function listDesigns(query, { includeHidden = false } = {}) {
  const { page, limit, from, to } = pageParams(query);
  const empty = { items: [], total: 0, page, pages: 0 };
  let req = db.from('designs').select(LIST_SELECT, { count: 'exact' });

  if (!includeHidden) req = req.eq('is_active', true);
  else if (query.status === 'live') req = req.eq('is_active', true);
  else if (query.status === 'hidden') req = req.eq('is_active', false);

  const term = cleanSearch(query.q);
  if (term) {
    const filters = [`name.ilike."%${term}%"`, `sku.ilike."%${term}%"`, `tags.cs.{"${term.toLowerCase()}"}`];
    if (/^\d{1,9}$/.test(term)) filters.push(`code.eq.${term}`);
    req = req.or(filters.join(','));
  }
  if (typeof query.category === 'string' && query.category) {
    const cat = await q(db.from('categories').select('id').eq('slug', query.category).maybeSingle());
    if (!cat) return empty;
    req = req.eq('category_id', cat.id);
  }
  if (MACHINE_TYPES.includes(query.machine)) req = req.eq('machine_type', query.machine);
  if (typeof query.stitches === 'string' && /^\d+-\d+$/.test(query.stitches)) {
    const [min, max] = query.stitches.split('-').map(Number);
    req = req.gte('stitches', min).lte('stitches', max);
  }
  const colors = parseInt(query.colors, 10);
  if (colors > 0) req = req.lte('colors', colors);
  if (query.price === 'free') req = req.eq('is_free', true);
  if (query.price === 'paid') req = req.eq('is_free', false);
  const format = String(query.format || '').toUpperCase();
  if (FILE_FORMATS.includes(format)) req = req.contains('formats', [format]);
  if (query.featured === 'true') req = req.eq('featured', true);

  const [column, ascending] = SORTS[query.sort] || SORTS.newest;
  req = req.order(column, { ascending }).order('created_at', { ascending: false }).range(from, to);

  const { data, count: total, error } = await req;
  if (error?.code === 'PGRST103') return { ...empty, total: total || 0 }; // page past the end
  if (error) throw dbError(error);
  return { items: data.map((d) => toDesign(d)), total, page, pages: Math.ceil(total / limit) };
}

function cleanParts(parts) {
  if (!Array.isArray(parts)) throw new HttpError(400, 'parts must be a list');
  return parts.slice(0, 50).map((p) => ({
    name: String(p?.name ?? '').trim().slice(0, 60),
    stitches: toNumber(p?.stitches || 0, 'Stitches', { integer: true }),
    area: toNumber(p?.area || 0, 'Area'),
    height: toNumber(p?.height || 0, 'Height'),
    width: toNumber(p?.width || 0, 'Width'),
    colors: toNumber(p?.colors || 0, 'Colours', { integer: true }),
  }));
}

async function cleanFiles(files) {
  if (!Array.isArray(files)) throw new HttpError(400, 'files must be a list');
  const bucket = db.storage.from(FILES_BUCKET);
  return Promise.all(
    files.slice(0, 20).map(async (f) => {
      const filePath = String(f?.path || '');
      if (!/^[\w-]+\/[\w.-]+$/.test(filePath) || filePath.includes('..')) {
        throw new HttpError(400, `Invalid design file: ${f?.originalName || filePath}`);
      }
      if (!FILE_FORMATS.includes(f.format)) throw new HttpError(400, `Unsupported format ${f.format}`);
      const { data: exists } = await bucket.exists(filePath);
      if (!exists) throw new HttpError(400, `Design file missing: ${f.originalName || filePath}. Please upload it again.`);
      return {
        id: isUuid(f._id) ? f._id : crypto.randomUUID(),
        format: f.format,
        path: filePath,
        originalName: String(f.originalName || '').slice(0, 200),
        size: Number(f.size) || 0,
      };
    })
  );
}

async function pickFields(body = {}) {
  const out = {};
  if (body.name !== undefined) out.name = String(body.name).trim();
  if (body.description !== undefined) out.description = String(body.description);
  if (body.price !== undefined) out.price = toNumber(body.price || 0, 'Price');
  if (body.mrp !== undefined) out.mrp = toNumber(body.mrp || 0, 'MRP');
  if (body.isActive !== undefined) out.is_active = Boolean(body.isActive);
  if (body.featured !== undefined) out.featured = Boolean(body.featured);
  if (body.isFree !== undefined) out.is_free = Boolean(body.isFree);
  if (body.machineType !== undefined) {
    if (!MACHINE_TYPES.includes(body.machineType)) throw new HttpError(400, 'Invalid machine type');
    out.machine_type = body.machineType;
  }
  if (body.category !== undefined) {
    if (body.category && !isUuid(body.category)) throw new HttpError(400, 'Invalid category');
    out.category_id = body.category || null;
  }
  if (body.images !== undefined) {
    if (!Array.isArray(body.images)) throw new HttpError(400, 'images must be a list');
    out.images = body.images.filter((u) => typeof u === 'string' && /^https?:\/\//.test(u)).slice(0, 12);
  }
  if (body.tags !== undefined) {
    const list = Array.isArray(body.tags) ? body.tags : String(body.tags).split(',');
    out.tags = [...new Set(list.map((t) => cleanSearch(t).toLowerCase()).filter(Boolean))].slice(0, 20);
  }
  if (body.parts !== undefined) out.parts = cleanParts(body.parts);
  if (body.driveUrl !== undefined) out.drive_url = cleanDriveUrl(body.driveUrl);
  if (body.formats !== undefined) {
    if (!Array.isArray(body.formats)) throw new HttpError(400, 'formats must be a list');
    out.formats = [...new Set(body.formats.filter((f) => FILE_FORMATS.includes(f)))];
  }
  if (body.files !== undefined) out.files = await cleanFiles(body.files);
  return out;
}

function cleanDriveUrl(value) {
  const url = String(value || '').trim();
  if (!url) return '';
  let parsed;
  try {
    parsed = new URL(url);
  } catch {
    throw new HttpError(400, 'Enter a valid Google Drive link');
  }
  if (parsed.protocol !== 'https:' || !['drive.google.com', 'docs.google.com'].includes(parsed.hostname)) {
    throw new HttpError(400, 'Only Google Drive links (https://drive.google.com/...) are allowed');
  }
  return url.slice(0, 500);
}

// A shared Drive *file* link becomes a direct download; folder links open the folder
export function driveDownloadUrl(url) {
  const id = url.match(/\/file\/d\/([\w-]{10,})/)?.[1] || (url.includes('/folders/') ? null : new URL(url).searchParams.get('id'));
  return id ? `https://drive.google.com/uc?export=download&id=${id}` : url;
}

// Totals used by the filters, calculated from the details table
function withTotals(row) {
  const out = { ...row };
  const parts = row.parts || [];
  if (parts.length) {
    const max = (key) => Math.max(0, ...parts.map((p) => p[key] || 0));
    out.stitches = parts.reduce((sum, p) => sum + (p.stitches || 0), 0);
    out.colors = max('colors');
    out.area = max('area');
    out.height = max('height');
    out.width = max('width');
  }
  // File types come from uploaded files plus the ones the admin ticked (for Drive links)
  out.formats = [...new Set([...(row.formats || []), ...(row.files || []).map((f) => f.format)])];
  if (row.is_free) out.price = 0;
  if (!out.name) throw new HttpError(400, 'Name is required');
  if (!out.is_free && !(out.price > 0)) throw new HttpError(400, 'Set a price, or mark the design as free');
  return out;
}

async function findDesign(id) {
  if (!isUuid(id)) return null;
  return q(db.from('designs').select('*').eq('id', id).maybeSingle());
}

// ---------- Admin: design file upload (private bucket) ----------
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024, files: 12 },
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).slice(1).toUpperCase();
    if (FILE_FORMATS.includes(ext)) cb(null, true);
    else cb(new HttpError(400, `${file.originalname}: only ${FILE_FORMATS.join(', ')} files are allowed`));
  },
});

router.post('/admin/files', protect, adminOnly, upload.array('files', 12), async (req, res) => {
  if (!req.files?.length) throw new HttpError(400, 'No files uploaded');
  const month = new Date().toISOString().slice(0, 7);
  const uploaded = await Promise.all(
    req.files.map(async (f) => {
      const ext = path.extname(f.originalname).slice(1).toLowerCase();
      const filePath = `${month}/${Date.now()}-${crypto.randomBytes(8).toString('hex')}.${ext}`;
      await q(
        db.storage.from(FILES_BUCKET).upload(filePath, f.buffer, { contentType: 'application/octet-stream', upsert: false })
      );
      return { format: ext.toUpperCase(), path: filePath, originalName: f.originalname, size: f.size };
    })
  );
  res.status(201).json(uploaded);
});

router.get('/admin/all', protect, adminOnly, async (req, res) => {
  res.json(await listDesigns(req.query, { includeHidden: true }));
});

router.get('/admin/:id', protect, adminOnly, async (req, res) => {
  const design = await findDesign(req.params.id);
  if (!design) throw new HttpError(404, 'Design not found');
  res.json(toDesign(design, { withPaths: true }));
});

router.post('/', protect, adminOnly, async (req, res) => {
  const fields = await pickFields(req.body);
  const row = withTotals({ price: 0, is_free: false, files: [], parts: [], ...fields });
  const created = await q(db.from('designs').insert(row).select().single());
  res.status(201).json(toDesign(created, { withPaths: true }));
});

router.put('/:id', protect, adminOnly, async (req, res) => {
  const current = await findDesign(req.params.id);
  if (!current) throw new HttpError(404, 'Design not found');
  const fields = await pickFields(req.body);
  const merged = withTotals({ ...current, ...fields });
  const changes = { ...fields };
  for (const key of ['stitches', 'colors', 'area', 'height', 'width', 'formats', 'price']) changes[key] = merged[key];
  const updated = await q(db.from('designs').update(changes).eq('id', current.id).select().single());

  const keptFiles = new Set(updated.files.map((f) => f.path));
  removeDesignFiles(current.files.map((f) => f.path).filter((p) => !keptFiles.has(p)));
  const keptImages = new Set(updated.images);
  removeImages(current.images.filter((u) => !keptImages.has(u)));
  res.json(toDesign(updated, { withPaths: true }));
});

router.delete('/:id', protect, adminOnly, async (req, res) => {
  const design = await findDesign(req.params.id);
  if (!design) throw new HttpError(404, 'Design not found');
  await q(db.from('designs').delete().eq('id', design.id));
  removeDesignFiles(design.files.map((f) => f.path));
  removeImages(design.images);
  res.json({ message: 'Design deleted' });
});

// ---------- Public ----------
router.get('/', async (req, res) => {
  res.json(await listDesigns(req.query));
});

router.get('/:code', async (req, res) => {
  if (!/^\d{1,9}$/.test(req.params.code)) throw new HttpError(404, 'Design not found');
  const design = await q(
    db.from('designs').select(LIST_SELECT).eq('code', Number(req.params.code)).eq('is_active', true).maybeSingle()
  );
  if (!design) throw new HttpError(404, 'Design not found');
  let related = db.from('designs').select(LIST_SELECT).eq('is_active', true).neq('id', design.id);
  if (design.category_id) related = related.eq('category_id', design.category_id);
  const rows = await q(related.order('created_at', { ascending: false }).limit(8));
  res.json({ design: toDesign(design), related: rows.map((d) => toDesign(d)) });
});

router.get('/:id/access', optionalAuth, async (req, res) => {
  const design = await findDesign(req.params.id);
  if (!design || (!design.is_active && req.user?.role !== 'admin')) throw new HttpError(404, 'Design not found');
  res.json(await getAccess(req.user, design));
});

// Returns the Google Drive link after checking payment / package access
router.get('/:id/drive', protect, async (req, res) => {
  const design = await findDesign(req.params.id);
  if (!design || !design.drive_url) throw new HttpError(404, 'No download link for this design');
  const access = await getAccess(req.user, design, { unlock: true });
  if (!access.allowed) throw new HttpError(403, 'Buy this design or a download package to download it');
  await q(db.rpc('increment_design_downloads', { p_id: design.id }));
  res.json({ url: driveDownloadUrl(design.drive_url) });
});

// Returns a short-lived download link after checking access
router.get('/:id/files/:fileId', protect, async (req, res) => {
  const design = await findDesign(req.params.id);
  if (!design) throw new HttpError(404, 'Design not found');
  const file = design.files.find((f) => f.id === req.params.fileId);
  if (!file) throw new HttpError(404, 'File not found');

  const access = await getAccess(req.user, design, { unlock: true });
  if (!access.allowed) throw new HttpError(403, 'Buy this design or a download package to download it');

  const filename = `${design.code}-${slugify(design.name) || 'design'}.${file.format.toLowerCase()}`;
  const { data, error } = await db.storage.from(FILES_BUCKET).createSignedUrl(file.path, 60, { download: filename });
  if (error) throw new HttpError(404, 'File is missing on the server. Please contact support.');
  await q(db.rpc('increment_design_downloads', { p_id: design.id }));
  res.json({ url: data.signedUrl, filename });
});

export default router;
