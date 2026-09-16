import crypto from 'node:crypto';
import { db, q } from '../config/supabase.js';
import { getRazorpay } from '../config/razorpay.js';
import { markOrderPaid } from './fulfil.js';
import { HttpError } from '../utils/helpers.js';

const paise = (order) => Math.round(Number(order.total) * 100);

export function safeEqual(a, b) {
  const x = Buffer.from(String(a));
  const y = Buffer.from(String(b));
  return x.length === y.length && crypto.timingSafeEqual(x, y);
}

// Creates (or reuses) the Razorpay order and returns what the checkout popup needs
export async function razorpayCheckout(order) {
  const razorpay = getRazorpay();
  if (!razorpay) throw new HttpError(400, 'Online payment is not enabled');
  let rzpOrderId = order.razorpay_order_id;
  if (!rzpOrderId) {
    const rzpOrder = await razorpay.orders.create({
      amount: paise(order),
      currency: 'INR',
      receipt: order.order_number,
      notes: { order_id: order.id },
    });
    rzpOrderId = rzpOrder.id;
    order = await q(
      db.from('orders').update({ razorpay_order_id: rzpOrderId, payment_method: 'RAZORPAY' }).eq('id', order.id).select().single()
    );
  }
  return {
    order,
    razorpay: { keyId: process.env.RAZORPAY_KEY_ID, orderId: rzpOrderId, amount: paise(order), currency: 'INR' },
  };
}

// Marks the order paid if Razorpay received the full amount for it
export async function fulfilFromPayment(order, payment) {
  if (!order || order.status === 'cancelled') return order;
  if (payment.order_id !== order.razorpay_order_id || payment.currency !== 'INR' || payment.amount !== paise(order)) {
    return order;
  }
  if (payment.status !== 'captured') return order;
  return markOrderPaid(order, { razorpay_payment_id: payment.id });
}

// Asks Razorpay directly whether this order has been paid (captures authorised payments if needed)
export async function syncRazorpayOrder(order) {
  const razorpay = getRazorpay();
  if (!razorpay || !order.razorpay_order_id || order.payment_status === 'paid') return order;
  const { items = [] } = await razorpay.orders.fetchPayments(order.razorpay_order_id);
  for (let payment of items) {
    if (payment.status === 'authorized' && payment.amount === paise(order)) {
      payment = await razorpay.payments.capture(payment.id, payment.amount, 'INR');
    }
    if (payment.status === 'captured') return fulfilFromPayment(order, payment);
  }
  return order;
}
