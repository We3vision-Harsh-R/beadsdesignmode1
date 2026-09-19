// Creates the admin login in Supabase Auth (or resets its password) from server/.env
import { db, q } from '../config/supabase.js';

const { ADMIN_NAME = 'Store Admin', ADMIN_EMAIL, ADMIN_PASSWORD } = process.env;

if (!ADMIN_EMAIL || !ADMIN_PASSWORD) {
  console.error('Set ADMIN_EMAIL and ADMIN_PASSWORD in server/.env');
  process.exit(1);
}
if (ADMIN_PASSWORD.length < 8) {
  console.error('ADMIN_PASSWORD must be at least 8 characters');
  process.exit(1);
}

const email = ADMIN_EMAIL.trim().toLowerCase();
const existing = await q(db.from('profiles').select('id').eq('email', email).maybeSingle());
let userId = existing?.id;

if (userId) {
  const { error } = await db.auth.admin.updateUserById(userId, { password: ADMIN_PASSWORD, email_confirm: true });
  if (error) throw error;
  console.log(`Updated ${email}: password reset from .env`);
} else {
  const { data, error } = await db.auth.admin.createUser({
    email,
    password: ADMIN_PASSWORD,
    email_confirm: true,
    user_metadata: { name: ADMIN_NAME },
  });
  if (error) throw error;
  userId = data.user.id;
  console.log(`Created login ${email}`);
}

await q(db.from('profiles').update({ role: 'admin', name: ADMIN_NAME }).eq('id', userId));
console.log(`${email} is now an admin`);
