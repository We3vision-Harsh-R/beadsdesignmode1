// Copies the built website (client/dist) into server/public. That folder is committed to git, so the
// server can serve the website even when the host does not run (or keep the output of) the build.
import fs from 'node:fs';
import path from 'node:path';

const root = path.join(import.meta.dirname, '..');
const from = path.join(root, 'client', 'dist');
const to = path.join(root, 'server', 'public');

if (!fs.existsSync(path.join(from, 'index.html'))) {
  console.error('client/dist/index.html not found - run the client build first');
  process.exit(1);
}
fs.rmSync(to, { recursive: true, force: true });
fs.cpSync(from, to, { recursive: true });
console.log(`Copied ${path.relative(root, from)} -> ${path.relative(root, to)}`);
