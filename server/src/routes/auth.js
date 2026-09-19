import { Router } from 'express';
import { db, q } from '../config/supabase.js';
import { protect } from '../middleware/auth.js';
import { toUser } from '../utils/mappers.js';
import { cleanMobile, HttpError } from '../utils/helpers.js';

// Sign up, login and passwords are handled by Supabase Auth in the browser.
// These routes only read and update the customer's profile.
const router = Router();

router.get('/me', protect, (req, res) => {
  res.json({ user: req.user });
});

router.put('/me', protect, async (req, res) => {
  const { name, phone } = req.body || {};
  const changes = {};
  if (name !== undefined) changes.name = String(name).trim().slice(0, 80);
  if (phone !== undefined && String(phone).trim() !== '') {
    const mobile = cleanMobile(phone);
    if (!mobile) throw new HttpError(400, 'Enter a valid 10 digit mobile number');
    changes.phone = mobile;
  }
  if (!Object.keys(changes).length) throw new HttpError(400, 'Nothing to update');
  const profile = await q(db.from('profiles').update(changes).eq('id', req.user._id).select().single());
  res.json({ user: toUser(profile) });
});

export default router;
