import crypto from 'node:crypto';
import express, { Router } from 'express';
import { db, q } from '../config/supabase.js';
import { fulfilFromPayment, safeEqual } from '../services/razorpayPay.js';

const router = Router();

// Razorpay calls this after a payment, even if the customer closed the browser.
// Dashboard -> Account & Settings -> Webhooks: events payment.captured and order.paid
router.post('/razorpay/webhook', express.raw({ type: '*/*', limit: '1mb' }), async (req, res) => {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
  if (!secret) return res.status(503).json({ message: 'Webhook secret not configured' });

  const expected = crypto.createHmac('sha256', secret).update(req.body).digest('hex');
  if (!safeEqual(expected, req.get('x-razorpay-signature') || '')) {
    return res.status(400).json({ message: 'Invalid signature' });
  }

  const event = JSON.parse(req.body.toString('utf8'));
  const payment = event.payload?.payment?.entity;
  if (['payment.captured', 'order.paid'].includes(event.event) && payment?.order_id) {
    const order = await q(db.from('orders').select('*').eq('razorpay_order_id', payment.order_id).maybeSingle());
    if (order) await fulfilFromPayment(order, payment);
    else console.warn(`Razorpay webhook: no order for ${payment.order_id}`);
  }
  res.json({ ok: true });
});

export default router;
