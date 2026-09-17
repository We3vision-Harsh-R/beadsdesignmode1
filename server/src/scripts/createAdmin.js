// Creates the admin login in Supabase Auth (or updates it) from server/.env.
// Login is by mobile number + password. If an older email-based admin exists
// (from before phone login), this attaches the phone number to that same
// account instead of creating a second one.
import { db, q } from '../config/supabase.js';
import { toE164Phone } from '../utils/helpers.js';

const { ADMIN_NAME = 'Store Admin', ADMIN_PHONE, ADMIN_EMAIL, ADMIN_PASSWORD } = process.env;

if (!ADMIN_PHONE || !ADMIN_PASSWORD) {
  console.error('Set ADMIN_PHONE (10 digit mobile number) and ADMIN_PASSWORD in server/.env');
  process.exit(1);
}
if (ADMIN_PASSWORD.length < 8) {
  console.error('ADMIN_PASSWORD must be at least 8 characters');
  process.exit(1);
}
const phone = toE164Phone(ADMIN_PHONE);
if (!phone) {
  console.error('ADMIN_PHONE must be a valid 10 digit Indian mobile number, e.g. 9876543210');
  process.exit(1);
}

let userId = (await q(db.from('profiles').select('id').eq('phone', phone).maybeSingle()))?.id;

// Not found by phone: fall back to the old email-based admin (if any) and attach this phone to it
if (!userId && ADMIN_EMAIL) {
  userId = (await q(db.from('profiles').select('id').eq('email', ADMIN_EMAIL.trim().toLowerCase()).maybeSingle()))?.id;
}

if (userId) {
  const { error } = await db.auth.admin.updateUserById(userId, { phone, password: ADMIN_PASSWORD, phone_confirm: true });
  if (error) throw error;
  console.log(`Updated admin login: ${phone} (password reset from .env)`);
} else {
  const { data, error } = await db.auth.admin.createUser({
    phone,
    password: ADMIN_PASSWORD,
    phone_confirm: true,
    user_metadata: { name: ADMIN_NAME },
  });
  if (error) throw error;
  userId = data.user.id;
  console.log(`Created admin login: ${phone}`);
}

await q(db.from('profiles').update({ role: 'admin', name: ADMIN_NAME, phone }).eq('id', userId));
console.log(`${phone} is now an admin. Log in with this mobile number and the password from .env.`);
