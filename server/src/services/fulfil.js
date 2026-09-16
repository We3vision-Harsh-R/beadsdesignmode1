import { db, dbError, q } from '../config/supabase.js';

const DAY = 24 * 60 * 60 * 1000;

// Marks an order paid (once) and activates any package in it. Returns the order row.
export async function markOrderPaid(order, extra = {}) {
  if (order.payment_status === 'paid') return order;
  const updated = await q(
    db
      .from('orders')
      .update({ ...extra, payment_status: 'paid', status: 'completed', paid_at: new Date().toISOString() })
      .eq('id', order.id)
      .neq('payment_status', 'paid')
      .select()
      .maybeSingle()
  );
  // Another request already marked it paid
  if (!updated) return q(db.from('orders').select('*').eq('id', order.id).single());

  for (const item of updated.items.filter((i) => i.kind === 'package')) {
    const pkg = await q(db.from('packages').select('*').eq('id', item.refId).maybeSingle());
    if (!pkg) continue;
    const startsAt = new Date();
    const { error } = await db.from('subscriptions').insert({
      user_id: updated.user_id,
      package_id: pkg.id,
      order_id: updated.id,
      name: pkg.name,
      type: pkg.type,
      limit_count: pkg.limit_count,
      starts_at: startsAt.toISOString(),
      expires_at: new Date(startsAt.getTime() + pkg.validity_days * DAY).toISOString(),
    });
    if (error && error.code !== '23505') throw dbError(error);
  }
  return updated;
}

// Removes access given by an order (refund / cancel after payment)
export async function revokeOrder(orderId) {
  await q(db.from('subscriptions').update({ is_active: false }).eq('order_id', orderId));
  await q(db.from('unlocks').delete().eq('order_id', orderId));
}
