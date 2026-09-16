// No top-level await here: Hostinger starts this file with require(), which cannot load it otherwise.
// Missing Supabase settings are reported by config/supabase.js when the app loads.
import './config/env.js';
import app from './app.js';

const PORT = process.env.PORT || 5000;

const server = app.listen(PORT, () => console.log(`API running on port ${PORT} (Supabase: ${process.env.SUPABASE_URL})`));

const shutdown = () => server.close(() => process.exit(0));
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
