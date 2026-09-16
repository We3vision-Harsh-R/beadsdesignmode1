import { count, db, dbError, q } from '../config/supabase.js';

const DAY = 24 * 60 * 60 * 1000;
const IST_OFFSET = 5.5 * 60 * 60 * 1000;

// Daily limits reset at midnight India time
export function startOfTodayIST() {
  return new Date(Math.floor((Date.now() + IST_OFFSET) / DAY) * DAY - IST_OFFSET);
}

const itemFilter = (designId) => JSON.stringify([{ kind: 'design', refId: designId }]);

export async function subscriptionSummary(sub) {
  const now = new Date();
  const expiresAt = new Date(sub.expires_at);
  const live = sub.is_active && new Date(sub.starts_at) <= now && expiresAt > now;
  let usedToday = 0;
  let remaining;
  if (sub.type === 'daily') {
    usedToday = await count(
      db
        .from('unlocks')
        .select('id', { count: 'exact', head: true })
        .eq('subscription_id', sub.id)
        .gte('created_at', startOfTodayIST().toISOString())
    );
    remaining = Math.max(0, sub.limit_count - usedToday);
  } else {
    remaining = Math.max(0, sub.limit_count - sub.used);
  }
  return {
    _id: sub.id,
    name: sub.name,
    type: sub.type,
    limit: sub.limit_count,
    used: sub.used,
    usedToday,
    remaining: live ? remaining : 0,
    startsAt: sub.starts_at,
    expiresAt: sub.expires_at,
    status: !sub.is_active ? 'cancelled' : expiresAt <= now ? 'expired' : 'active',
  };
}

// Active package with downloads left, the one expiring first
async function usableSubscription(userId) {
  const now = new Date().toISOString();
  const subs = await q(
    db
      .from('subscriptions')
      .select('*')
      .eq('user_id', userId)
      .eq('is_active', true)
      .lte('starts_at', now)
      .gt('expires_at', now)
      .order('expires_at')
  );
  for (const sub of subs) {
    const summary = await subscriptionSummary(sub);
    if (summary.remaining > 0) return { sub, summary };
  }
  return null;
}

async function createUnlock(row) {
  const { error } = await db.from('unlocks').insert(row);
  if (!error) return true;
  if (error.code === '23505') return false; // already unlocked (parallel request)
  throw dbError(error);
}

/**
 * Can this user download this design (a database row)?
 * With { unlock: true } the access is recorded (and a package download is used).
 */
export async function getAccess(user, design, { unlock = false } = {}) {
  if (!user) return { allowed: false, reason: 'login', isFree: design.is_free };
  if (user.role === 'admin') return { allowed: true, via: 'admin', unlocked: true };

  const existing = await q(
    db.from('unlocks').select('via').eq('user_id', user._id).eq('design_id', design.id).maybeSingle()
  );
  if (existing) return { allowed: true, via: existing.via, unlocked: true };

  if (design.is_free) {
    if (unlock) await createUnlock({ user_id: user._id, design_id: design.id, via: 'free' });
    return { allowed: true, via: 'free', unlocked: unlock };
  }

  const [order] = await q(
    db
      .from('orders')
      .select('id')
      .eq('user_id', user._id)
      .eq('payment_status', 'paid')
      .filter('items', 'cs', itemFilter(design.id))
      .limit(1)
  );
  if (order) {
    if (unlock) await createUnlock({ user_id: user._id, design_id: design.id, via: 'purchase', order_id: order.id });
    return { allowed: true, via: 'purchase', unlocked: unlock };
  }

  const usable = await usableSubscription(user._id);
  if (usable) {
    const { sub, summary } = usable;
    if (unlock) {
      const created = await createUnlock({ user_id: user._id, design_id: design.id, via: 'package', subscription_id: sub.id });
      if (created) {
        await q(db.rpc('increment_subscription_used', { p_id: sub.id }));
        summary.remaining -= 1;
      }
    }
    return { allowed: true, via: 'package', unlocked: unlock, subscription: summary };
  }

  return { allowed: false, reason: 'buy' };
}

/** Designs this user already owns (purchased or unlocked) out of the given ids */
export async function ownedDesignIds(userId, designIds) {
  const [unlocks, orders] = await Promise.all([
    q(db.from('unlocks').select('design_id').eq('user_id', userId).in('design_id', designIds)),
    q(db.from('orders').select('items').eq('user_id', userId).eq('payment_status', 'paid')),
  ]);
  const owned = new Set(unlocks.map((u) => u.design_id));
  const wanted = new Set(designIds);
  for (const o of orders) {
    for (const it of o.items) if (it.kind === 'design' && wanted.has(it.refId)) owned.add(it.refId);
  }
  return owned;
}
