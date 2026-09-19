import crypto from 'node:crypto';
import { Router } from 'express';
import { db, dbError, q } from '../config/supabase.js';
import { protect, adminOnly } from '../middleware/auth.js';
import { ownedDesignIds } from '../services/access.js';
import { markOrderPaid, revokeOrder } from '../services/fulfil.js';
import { toOrder } from '../utils/mappers.js';
import { cleanMobile, cleanSearch, HttpError, isUuid, pageParams } from '../utils/helpers.js';
import { getRazorpay } from '../config/razorpay.js';
import { razorpayCheckout, safeEqual, syncRazorpayOrder } from '../services/razorpayPay.js';

export const PAYMENT_STATUSES = ['pending', 'review', 'paid', 'failed', 'refunded'];
const WITH_USER = '*, user:profiles(id, name, email, phone, role, created_at)';

const router = Router();
router.use(protect);

function makeOrderNumber() {
  const date = new Date().toISOString().slice(2, 10).replace(/-/g, '');
  return `ED${date}${crypto.randomInt(10000, 99999)}`;
}

function cleanUpiRef(value) {
  const ref = String(value || '').trim();
  if (!/^[A-Za-z0-9]{6,30}$/.test(ref)) {
    throw new HttpError(400, 'Enter the UPI transaction / UTR number (6-30 letters or digits)');
  }
  return ref;
}

async function ownOrder(req) {
  if (!isUuid(req.params.id)) throw new HttpError(404, 'Order not found');
  const order = await q(db.from('orders').select('*').eq('id', req.params.id).eq('user_id', req.user._id).maybeSingle());
  if (!order) throw new HttpError(404, 'Order not found');
  return order;
}

const withUser = (id) => q(db.from('orders').select(WITH_USER).eq('id', id).single());

// ---------- Customer ----------
router.post('/', async (req, res) => {
  const { designIds, packageId, paymentMethod } = req.body || {};
  const razorpay = getRazorpay();

  // Mobile number is collected at payment time
  const phone = cleanMobile(req.body?.phone);
  if (!phone) throw new HttpError(400, 'Enter a valid 10 digit mobile number');

  if (!['RAZORPAY', 'UPI'].includes(paymentMethod)) throw new HttpError(400, 'Choose a payment method');
  if (paymentMethod === 'RAZORPAY' && !razorpay) throw new HttpError(400, 'Online payment is not enabled');
  if (paymentMethod === 'UPI' && !process.env.UPI_ID) throw new HttpError(400, 'UPI payment is not enabled');

  let items;
  if (packageId) {
    if (!isUuid(packageId)) throw new HttpError(400, 'Invalid package');
    const pkg = await q(db.from('packages').select('*').eq('id', packageId).eq('is_active', true).maybeSingle());
    if (!pkg) throw new HttpError(400, 'This package is no longer available');
    items = [{ kind: 'package', refId: pkg.id, name: pkg.name, code: null, image: '', price: Number(pkg.price) }];
  } else {
    if (!Array.isArray(designIds) || designIds.length === 0) throw new HttpError(400, 'Your cart is empty');
    if (designIds.length > 100) throw new HttpError(400, 'Too many designs in one order');
    const ids = [...new Set(designIds.map(String))];
    if (!ids.every(isUuid)) throw new HttpError(400, 'Invalid design in cart');

    const designs = await q(db.from('designs').select('id, code, sku, name, images, price, is_free').in('id', ids).eq('is_active', true));
    if (designs.length !== ids.length) throw new HttpError(400, 'Some designs in your cart are no longer available');
    const free = designs.find((d) => d.is_free);
    if (free) throw new HttpError(400, `Design ${free.code} is free - download it directly, no need to buy`);
    const owned = await ownedDesignIds(req.user._id, ids);
    const already = designs.filter((d) => owned.has(d.id));
    if (already.length) {
      throw new HttpError(400, `You already own design ${already.map((d) => d.code).join(', ')}. Remove it from your cart.`);
    }
    items = designs.map((d) => ({
      kind: 'design',
      refId: d.id,
      name: d.name,
      code: d.code,
      sku: d.sku,
      image: d.images[0] || '',
      price: Number(d.price), // always the price from the database
    }));
  }

  const total = Math.round(items.reduce((sum, i) => sum + i.price, 0) * 100) / 100;
  if (total <= 0) throw new HttpError(400, 'Nothing to pay for');

  const order = await q(
    db
      .from('orders')
      .insert({ order_number: makeOrderNumber(), user_id: req.user._id, items, total, payment_method: paymentMethod, phone })
      .select()
      .single()
  );
  // Keep the latest number on the customer's profile too (shown in the admin customer list)
  await q(db.from('profiles').update({ phone }).eq('id', req.user._id));

  if (paymentMethod === 'RAZORPAY') {
    try {
      const checkout = await razorpayCheckout(order);
      return res.status(201).json({ order: toOrder(checkout.order), razorpay: checkout.razorpay });
    } catch (err) {
      await db.from('orders').delete().eq('id', order.id);
      throw err;
    }
  }

  res.status(201).json({ order: toOrder(order) });
});

router.post('/:id/verify-payment', async (req, res) => {
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body || {};
  const order = await ownOrder(req);
  if (order.payment_status === 'paid') return res.json({ order: toOrder(order) });
  if (order.payment_method !== 'RAZORPAY' || order.status === 'cancelled') throw new HttpError(400, 'Invalid order');
  if (!razorpay_payment_id || !razorpay_signature || razorpay_order_id !== order.razorpay_order_id) {
    throw new HttpError(400, 'Invalid payment details');
  }

  const expected = crypto
    .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
    .update(`${order.razorpay_order_id}|${razorpay_payment_id}`)
    .digest('hex');
  if (!safeEqual(expected, razorpay_signature)) {
    await q(db.from('orders').update({ payment_status: 'failed' }).eq('id', order.id));
    throw new HttpError(400, 'Payment verification failed');
  }

  const paid = await markOrderPaid(order, { razorpay_payment_id: String(razorpay_payment_id) });
  res.json({ order: toOrder(paid) });
});

// Pay (or retry paying) an unpaid order online
router.post('/:id/pay', async (req, res) => {
  const order = await ownOrder(req);
  if (order.status !== 'pending' || !['pending', 'failed'].includes(order.payment_status)) {
    throw new HttpError(400, 'This order cannot be paid now');
  }
  const synced = await syncRazorpayOrder(order);
  if (synced.payment_status === 'paid') return res.json({ order: toOrder(synced) });
  const checkout = await razorpayCheckout(order);
  res.json({ order: toOrder(checkout.order), razorpay: checkout.razorpay });
});

// Checks with Razorpay whether the order was paid (owner or admin)
router.post('/:id/sync-payment', async (req, res) => {
  if (!isUuid(req.params.id)) throw new HttpError(404, 'Order not found');
  const order = await q(db.from('orders').select('*').eq('id', req.params.id).maybeSingle());
  if (!order || (req.user.role !== 'admin' && order.user_id !== req.user._id)) throw new HttpError(404, 'Order not found');
  await syncRazorpayOrder(order);
  res.json(toOrder(await withUser(order.id)));
});

// Customer sends the UPI transaction number after paying; admin then verifies it
router.post('/:id/upi-ref', async (req, res) => {
  const order = await ownOrder(req);
  if (order.payment_method !== 'UPI' || order.status === 'cancelled' || order.payment_status === 'paid') {
    throw new HttpError(400, 'This order is not waiting for a UPI payment');
  }
  await q(
    db.from('orders').update({ upi_ref: cleanUpiRef(req.body?.upiRef), payment_status: 'review' }).eq('id', order.id)
  );
  res.json(toOrder(await withUser(order.id)));
});

router.get('/mine', async (req, res) => {
  const rows = await q(
    db.from('orders').select('*').eq('user_id', req.user._id).order('created_at', { ascending: false }).limit(200)
  );
  res.json(rows.map(toOrder));
});

router.post('/:id/cancel', async (req, res) => {
  const order = await ownOrder(req);
  if (order.payment_status === 'paid' || order.status !== 'pending') {
    throw new HttpError(400, 'This order can no longer be cancelled');
  }
  await q(db.from('orders').update({ status: 'cancelled' }).eq('id', order.id));
  res.json(toOrder(await withUser(order.id)));
});

// ---------- Admin ----------
router.get('/', adminOnly, async (req, res) => {
  const { page, limit, from, to } = pageParams(req.query, { defaultLimit: 25, maxLimit: 100 });
  let query = db.from('orders').select(WITH_USER, { count: 'exact' });
  if (PAYMENT_STATUSES.includes(req.query.payment)) query = query.eq('payment_status', req.query.payment);
  if (req.query.status === 'cancelled') query = query.eq('status', 'cancelled');
  const term = cleanSearch(req.query.q).replace(/\s/g, '');
  if (/^\d{1,7}$/.test(term)) {
    // Short numbers are design IDs
    query = query.filter('items', 'cs', JSON.stringify([{ code: Number(term) }]));
  } else if (term) {
    query = query.or(`order_number.ilike."%${term}%",upi_ref.ilike."%${term}%"`);
  }
  const { data, count: total, error } = await query.order('created_at', { ascending: false }).range(from, to);
  if (error?.code === 'PGRST103') return res.json({ items: [], total: total || 0, page, pages: 0 });
  if (error) throw dbError(error);
  res.json({ items: data.map(toOrder), total, page, pages: Math.ceil(total / limit) });
});

router.patch('/:id', adminOnly, async (req, res) => {
  const { paymentStatus, status, adminNote } = req.body || {};
  if (!isUuid(req.params.id)) throw new HttpError(404, 'Order not found');
  const order = await q(db.from('orders').select('*').eq('id', req.params.id).maybeSingle());
  if (!order) throw new HttpError(404, 'Order not found');
  const wasPaid = order.payment_status === 'paid';
  const changes = {};

  if (adminNote !== undefined) changes.admin_note = String(adminNote).slice(0, 500);

  if (status === 'cancelled') {
    changes.status = 'cancelled';
    if (wasPaid) {
      changes.payment_status = 'refunded';
      await revokeOrder(order.id);
    }
  } else if (paymentStatus !== undefined) {
    if (!PAYMENT_STATUSES.includes(paymentStatus)) throw new HttpError(400, 'Invalid payment status');
    if (order.status === 'cancelled') throw new HttpError(400, 'This order is cancelled');
    if (paymentStatus === 'paid') {
      await markOrderPaid(order);
    } else {
      changes.payment_status = paymentStatus;
      if (wasPaid) {
        changes.status = paymentStatus === 'refunded' ? 'cancelled' : 'pending';
        changes.paid_at = null;
        await revokeOrder(order.id);
      }
    }
  }

  if (Object.keys(changes).length) await q(db.from('orders').update(changes).eq('id', order.id));
  res.json(toOrder(await withUser(order.id)));
});

// ---------- Owner or admin ----------
router.get('/:id', async (req, res) => {
  if (!isUuid(req.params.id)) throw new HttpError(404, 'Order not found');
  const order = await q(db.from('orders').select(WITH_USER).eq('id', req.params.id).maybeSingle());
  if (!order || (req.user.role !== 'admin' && order.user_id !== req.user._id)) {
    throw new HttpError(404, 'Order not found');
  }
  res.json(toOrder(order));
});

export default router;
