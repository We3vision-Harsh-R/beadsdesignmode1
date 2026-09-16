import { Router } from 'express';
import { count, db, q, uniqueSlug } from '../config/supabase.js';
import { protect, adminOnly } from '../middleware/auth.js';
import { toCategory } from '../utils/mappers.js';
import { HttpError, isUuid } from '../utils/helpers.js';

const router = Router();

router.get('/', async (req, res) => {
  const [categories, counts] = await Promise.all([
    q(db.from('categories').select('*').order('name')),
    q(db.rpc('category_counts')),
  ]);
  const byId = Object.fromEntries(counts.map((c) => [c.category_id, Number(c.count)]));
  res.json(categories.map((c) => ({ ...toCategory(c), count: byId[c.id] || 0 })));
});

router.post('/', protect, adminOnly, async (req, res) => {
  const name = String(req.body?.name || '').trim();
  if (!name) throw new HttpError(400, 'Name is required');
  const row = await q(
    db
      .from('categories')
      .insert({ name, image: req.body?.image || '', slug: await uniqueSlug('categories', name) })
      .select()
      .single()
  );
  res.status(201).json(toCategory(row));
});

router.put('/:id', protect, adminOnly, async (req, res) => {
  if (!isUuid(req.params.id)) throw new HttpError(404, 'Category not found');
  const current = await q(db.from('categories').select('*').eq('id', req.params.id).maybeSingle());
  if (!current) throw new HttpError(404, 'Category not found');
  const changes = {};
  const name = String(req.body?.name || '').trim();
  if (name && name !== current.name) {
    changes.name = name;
    changes.slug = await uniqueSlug('categories', name, current.id);
  }
  if (req.body?.image !== undefined) changes.image = String(req.body.image);
  const row = Object.keys(changes).length
    ? await q(db.from('categories').update(changes).eq('id', current.id).select().single())
    : current;
  res.json(toCategory(row));
});

router.delete('/:id', protect, adminOnly, async (req, res) => {
  if (!isUuid(req.params.id)) throw new HttpError(404, 'Category not found');
  const inUse = await count(db.from('designs').select('id', { count: 'exact', head: true }).eq('category_id', req.params.id));
  if (inUse) throw new HttpError(400, `${inUse} design(s) use this category. Move them first.`);
  const deleted = await q(db.from('categories').delete().eq('id', req.params.id).select('id'));
  if (!deleted.length) throw new HttpError(404, 'Category not found');
  res.json({ message: 'Category deleted' });
});

export default router;
