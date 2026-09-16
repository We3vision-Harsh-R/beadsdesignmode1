import path from 'node:path';

// Loads server/.env for local use. On Hostinger the values come from the
// hPanel environment variables instead, and those always win.
try {
  process.loadEnvFile(path.join(import.meta.dirname, '../../.env'));
} catch {
  // no .env file - fine in production
}
