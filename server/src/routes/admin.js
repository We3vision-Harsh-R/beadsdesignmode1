import { Router } from 'express';
import { db, q, selectIn } from '../config/supabase.js';
import { protect, adminOnly } from '../middleware/auth.js';
import { toOrder, toUser } from '../utils/mappers.js';
import { cleanSearch, HttpError, isUuid } from '../utils/helpers.js';


const router = Router();
router.use(protect, adminOnly);

router.get('/stats', async (req, res) => {
  const [stats, topDesigns, recentOrders] = await Promise.all([
    q(db.rpc('admin_stats')),
    q(db.from('designs').select('id, name, code, sku, downloads, price, is_free').order('downloads', { ascending: false }).limit(8)),
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
      sku: d.sku,
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


// ---------- Customers: details, purchases and exports ----------

// Reads every row of a query, 1000 at a time (Supabase returns at most 1000 per request)
async function fetchAll(makeQuery, max = 20000) {
  const rows = [];
  for (let from = 0; from < max; from += 1000) {
    const batch = await q(makeQuery().range(from, from + 999));
    rows.push(...batch);
    if (batch.length < 1000) break;
  }
  return rows;
}

const PROFILE_FIELDS = 'id, name, email, phone, role, created_at';

// One row per design / package a customer got: paid orders, plus downloads made with a package or for free
async function buildPurchases({ userId } = {}) {
  let orderQuery = () => {
    let query = db.from('orders').select(`id, order_number, items, total, phone, payment_method, paid_at, user:profiles(${PROFILE_FIELDS})`)
      .eq('payment_status', 'paid').order('paid_at', { ascending: false });
    if (userId) query = query.eq('user_id', userId);
    return query;
  };
  let unlockQuery = () => {
    let query = db.from('unlocks').select(`via, created_at, design_id, user:profiles(${PROFILE_FIELDS}), subscription:subscriptions(name)`)
      .in('via', ['package', 'free']).order('created_at', { ascending: false });
    if (userId) query = query.eq('user_id', userId);
    return query;
  };
  const [orders, unlocks] = await Promise.all([fetchAll(orderQuery), fetchAll(unlockQuery)]);

  const designIds = new Set(unlocks.map((u) => u.design_id));
  for (const o of orders) for (const it of o.items) if (it.kind === 'design') designIds.add(it.refId);
  const designs = Object.fromEntries((await selectIn('designs', 'id', [...designIds], 'id, code, sku, name')).map((d) => [d.id, d]));

  const rows = [];
  for (const o of orders) {
    for (const it of o.items) {
      const d = designs[it.refId];
      rows.push({
        date: o.paid_at,
        user: o.user,
        mobile: o.phone || o.user?.phone || '',
        type: it.kind === 'package' ? 'Package' : 'Design',
        sku: d?.sku || it.sku || '',
        code: d?.code ?? it.code ?? '',
        name: it.kind === 'package' ? `${it.name} (package)` : d?.name || it.name,
        amount: Number(it.price),
        how: o.payment_method === 'UPI' ? 'Paid (UPI)' : 'Paid (Razorpay)',
        order: o.order_number,
      });
    }
  }
  for (const u of unlocks) {
    const d = designs[u.design_id];
    rows.push({
      date: u.created_at,
      user: u.user,
      mobile: u.user?.phone || '',
      type: 'Design',
      sku: d?.sku || '',
      code: d?.code ?? '',
      name: d?.name || '(deleted design)',
      amount: 0,
      how: u.via === 'free' ? 'Free design' : `Package: ${u.subscription?.name || ''}`,
      order: '',
    });
  }
  return rows.sort((a, b) => new Date(b.date) - new Date(a.date));
}

// Escapes a value for CSV; cells starting with = + - @ are prefixed so spreadsheets don't run them as formulas
function csvCell(value) {
  let text = String(value ?? '');
  if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`;
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function sendCsv(res, filename, header, rows) {
  const lines = [header, ...rows].map((r) => r.map(csvCell).join(','));
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.send('﻿' + lines.join('\r\n')); // BOM so Excel reads Gujarati/Unicode names correctly
}

const istDate = (d) => (d ? new Date(d).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', hour12: false }) : '');

router.get('/users/:id', async (req, res) => {
  if (!isUuid(req.params.id)) throw new HttpError(404, 'Customer not found');
  const profile = await q(db.from('profiles').select('*').eq('id', req.params.id).maybeSingle());
  if (!profile) throw new HttpError(404, 'Customer not found');
  const [orders, purchases, subs] = await Promise.all([
    q(db.from('orders').select('*').eq('user_id', profile.id).order('created_at', { ascending: false }).limit(200)),
    buildPurchases({ userId: profile.id }),
    q(db.from('subscriptions').select('name, type, limit_count, used, starts_at, expires_at, is_active').eq('user_id', profile.id).order('expires_at', { ascending: false })),
  ]);
  res.json({
    user: toUser(profile),
    orders: orders.map(toOrder),
    purchases: purchases.map((p) => ({ ...p, user: undefined })),
    packages: subs.map((s) => ({ name: s.name, type: s.type, limit: s.limit_count, used: s.used, startsAt: s.starts_at, expiresAt: s.expires_at, isActive: s.is_active })),
  });
});

router.get('/export/customers.csv', async (req, res) => {
  const users = await fetchAll(() => db.from('profiles').select('*').order('created_at', { ascending: false }));
  const stats = [];
  for (let i = 0; i < users.length; i += 200) {
    stats.push(...(await q(db.rpc('user_stats', { p_ids: users.slice(i, i + 200).map((u) => u.id) }))));
  }
  const byUser = Object.fromEntries(stats.map((s) => [s.user_id, s]));
  sendCsv(
    res,
    `customers-${new Date().toISOString().slice(0, 10)}.csv`,
    ['Name', 'Mobile', 'Email', 'Role', 'Joined (IST)', 'Paid orders', 'Total spent (INR)', 'Designs owned'],
    users.map((u) => [u.name, u.phone, u.email, u.role, istDate(u.created_at), byUser[u.id]?.orders ?? 0, byUser[u.id]?.spent ?? 0, byUser[u.id]?.designs ?? 0])
  );
});

router.get('/export/purchases.csv', async (req, res) => {
  const rows = await buildPurchases();
  sendCsv(
    res,
    `purchases-${new Date().toISOString().slice(0, 10)}.csv`,
    ['Date (IST)', 'Customer', 'Mobile', 'Email', 'Type', 'SKU', 'Design ID', 'Design / Package', 'Amount (INR)', 'How', 'Order no.'],
    rows.map((r) => [istDate(r.date), r.user?.name, r.mobile, r.user?.email, r.type, r.sku, r.code, r.name, r.amount, r.how, r.order])
  );
});

export default router;
