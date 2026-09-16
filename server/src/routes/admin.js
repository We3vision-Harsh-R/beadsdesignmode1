import { Router } from 'express';
import { db, q } from '../config/supabase.js';
import { protect, adminOnly } from '../middleware/auth.js';
import { toOrder, toUser } from '../utils/mappers.js';
import { cleanSearch, HttpError, isUuid } from '../utils/helpers.js';

const router = Router();
router.use(protect, adminOnly);

router.get('/stats', async (req, res) => {
  const [stats, topDesigns, recentOrders] = await Promise.all([
    q(db.rpc('admin_stats')),
    q(db.from('designs').select('id, name, code, downloads, price, is_free').order('downloads', { ascending: false }).limit(8)),
    q(db.from('orders').select('*, user:profiles(id, name, email, phone, role, created_at)').order('created_at', { ascending: false }).limit(8)),
  ]);
  res.json({
    ...stats,
    revenue: Number(stats.revenue),
    daily: stats.daily.map((d) => ({ ...d, revenue: Number(d.revenue) })),
    topDesigns: topDesigns.map((d) => ({
      _id: d.id,
      name: d.name,
      code: d.code,
      downloads: d.downloads,
      price: Number(d.price),
      isFree: d.is_free,
    })),
    recentOrders: recentOrders.map(toOrder),
  });
});

router.get('/users', async (req, res) => {
  let query = db.from('profiles').select('*').order('created_at', { ascending: false }).limit(200);
  const term = cleanSearch(req.query.q);
  if (term) query = query.or(`name.ilike."%${term}%",email.ilike."%${term}%",phone.ilike."%${term}%"`);
  const users = await q(query);
  const ids = users.map((u) => u.id);
  if (!ids.length) return res.json([]);

  const [stats, subs] = await Promise.all([
    q(db.rpc('user_stats', { p_ids: ids })),
    q(
      db
        .from('subscriptions')
        .select('user_id, name, expires_at')
        .in('user_id', ids)
        .eq('is_active', true)
        .gt('expires_at', new Date().toISOString())
    ),
  ]);
  const byUser = Object.fromEntries(stats.map((s) => [s.user_id, s]));
  res.json(
    users.map((u) => ({
      ...toUser(u),
      orders: Number(byUser[u.id]?.orders || 0),
      spent: Number(byUser[u.id]?.spent || 0),
      designs: Number(byUser[u.id]?.designs || 0),
      packages: subs.filter((s) => s.user_id === u.id).map((s) => ({ name: s.name, expiresAt: s.expires_at })),
    }))
  );
});

router.patch('/users/:id/role', async (req, res) => {
  const { role } = req.body || {};
  if (!['user', 'admin'].includes(role)) throw new HttpError(400, 'Invalid role');
  if (!isUuid(req.params.id)) throw new HttpError(404, 'User not found');
  if (req.params.id === req.user._id) throw new HttpError(400, 'You cannot change your own role');
  const user = await q(db.from('profiles').update({ role }).eq('id', req.params.id).select().maybeSingle());
  if (!user) throw new HttpError(404, 'User not found');
  res.json(toUser(user));
});

export default router;
