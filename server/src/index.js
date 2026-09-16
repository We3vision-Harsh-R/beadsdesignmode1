import './config/env.js';

const REQUIRED = ['SUPABASE_URL', 'SUPABASE_SECRET_KEY'];
const missing = REQUIRED.filter((key) => !process.env[key]);
if (missing.length) {
  console.error(`Missing ${missing.join(', ')}. Set them in server/.env (local) or in Hostinger hPanel -> Environment variables.`);
  process.exit(1);
}

const { default: app } = await import('./app.js');
const PORT = process.env.PORT || 5000;

const server = app.listen(PORT, () => console.log(`API running on http://localhost:${PORT} (Supabase: ${process.env.SUPABASE_URL})`));

const shutdown = () => server.close(() => process.exit(0));
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
