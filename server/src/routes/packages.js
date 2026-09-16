import { Router } from 'express';
import { db, q } from '../config/supabase.js';
import { protect, adminOnly } from '../middleware/auth.js';
import { toPackage } from '../utils/mappers.js';
import { HttpError, isUuid, toNumber } from '../utils/helpers.js';

const router = Router();

function pickFields(body = {}) {
  const out = {};
  for (const key of ['name', 'description', 'highlight']) {
    if (body[key] !== undefined) out[key] = String(body[key]).trim();
  }
  if (out.highlight) out.highlight = out.highlight.slice(0, 30);
  if (body.type !== undefined) {
    if (!['daily', 'total'].includes(body.type)) throw new HttpError(400, 'Type must be daily or total');
    out.type = body.type;
  }
  if (body.limit !== undefined) out.limit_count = toNumber(body.limit, 'Design limit', { min: 1, integer: true });
  if (body.validityDays !== undefined) out.validity_days = toNumber(body.validityDays, 'Validity', { min: 1, integer: true });
  if (body.price !== undefined) out.price = toNumber(body.price, 'Price', { min: 1 });
  if (body.mrp !== undefined) out.mrp = toNumber(body.mrp || 0, 'MRP');
  if (body.sort !== undefined) out.sort = toNumber(body.sort || 0, 'Sort order', { min: -1000, integer: true });
  if (body.isActive !== undefined) out.is_active = Boolean(body.isActive);
  return out;
}

const ordered = (req) => req.order('type').order('sort').order('price');

router.get('/', async (req, res) => {
  const rows = await q(ordered(db.from('packages').select('*').eq('is_active', true)));
  res.json(rows.map(toPackage));
});

router.get('/admin/all', protect, adminOnly, async (req, res) => {
  const rows = await q(ordered(db.from('packages').select('*')));
  res.json(rows.map(toPackage));
});

router.post('/', protect, adminOnly, async (req, res) => {
  const fields = pickFields(req.body);
  for (const key of ['name', 'type', 'limit_count', 'validity_days', 'price']) {
    if (fields[key] === undefined || fields[key] === '') throw new HttpError(400, 'Name, type, limit, validity and price are required');
  }
  res.status(201).json(toPackage(await q(db.from('packages').insert(fields).select().single())));
});

router.put('/:id', protect, adminOnly, async (req, res) => {
  if (!isUuid(req.params.id)) throw new HttpError(404, 'Package not found');
  const row = await q(db.from('packages').update(pickFields(req.body)).eq('id', req.params.id).select().maybeSingle());
  if (!row) throw new HttpError(404, 'Package not found');
  res.json(toPackage(row));
});

// Customers who already bought it keep their copy of the package details
router.delete('/:id', protect, adminOnly, async (req, res) => {
  if (!isUuid(req.params.id)) throw new HttpError(404, 'Package not found');
  const deleted = await q(db.from('packages').delete().eq('id', req.params.id).select('id'));
  if (!deleted.length) throw new HttpError(404, 'Package not found');
  res.json({ message: 'Package deleted' });
});

export default router;
