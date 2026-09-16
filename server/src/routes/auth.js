import { Router } from 'express';
import { db, q } from '../config/supabase.js';
import { protect } from '../middleware/auth.js';
import { toUser } from '../utils/mappers.js';
import { HttpError } from '../utils/helpers.js';

// Sign up, login and passwords are handled by Supabase Auth in the browser.
// These routes only read and update the customer's profile.
const router = Router();

router.get('/me', protect, (req, res) => {
  res.json({ user: req.user });
});

router.put('/me', protect, async (req, res) => {
  const { name, phone } = req.body || {};
  const changes = {};
  if (name !== undefined) {
    if (!String(name).trim()) throw new HttpError(400, 'Name is required');
    changes.name = String(name).trim().slice(0, 80);
  }
  if (phone !== undefined) changes.phone = String(phone).trim().slice(0, 20);
  const profile = await q(db.from('profiles').update(changes).eq('id', req.user._id).select().single());
  res.json({ user: toUser(profile) });
});

export default router;
