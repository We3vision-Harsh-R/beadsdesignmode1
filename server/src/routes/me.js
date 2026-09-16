import { Router } from 'express';
import { db, q, selectIn } from '../config/supabase.js';
import { protect } from '../middleware/auth.js';
import { subscriptionSummary } from '../services/access.js';
import { toDesign } from '../utils/mappers.js';

const router = Router();
router.use(protect);

// All designs the customer can download: purchased, free or unlocked with a package
router.get('/library', async (req, res) => {
  const [unlocks, orders] = await Promise.all([
    q(db.from('unlocks').select('design_id, via, created_at').eq('user_id', req.user._id).order('created_at', { ascending: false }).limit(2000)),
    q(db.from('orders').select('items, paid_at').eq('user_id', req.user._id).eq('payment_status', 'paid').order('paid_at', { ascending: false })),
  ]);

  const entries = new Map();
  for (const o of orders) {
    for (const it of o.items) {
      if (it.kind === 'design' && !entries.has(it.refId)) entries.set(it.refId, { via: 'purchase', date: o.paid_at });
    }
  }
  for (const u of unlocks) entries.set(u.design_id, { via: u.via, date: u.created_at });

  const designs = await selectIn('designs', 'id', [...entries.keys()], '*, category:categories(id, name, slug)');
  const list = designs
    .map((d) => ({ design: toDesign(d), ...entries.get(d.id) }))
    .sort((a, b) => new Date(b.date) - new Date(a.date));
  res.json(list);
});

router.get('/subscriptions', async (req, res) => {
  const subs = await q(
    db.from('subscriptions').select('*').eq('user_id', req.user._id).order('expires_at', { ascending: false }).limit(50)
  );
  res.json(await Promise.all(subs.map(subscriptionSummary)));
});

export default router;
