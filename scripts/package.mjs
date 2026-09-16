// Creates deploy/beads-design-hostinger.zip with the source code only
// (no node_modules, no build output, no secret .env files)
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const root = path.join(import.meta.dirname, '..');
const out = path.join(root, 'deploy', 'beads-design-hostinger.zip');
const SKIP_DIRS = new Set(['node_modules', 'dist', 'deploy', '.git', '.claude']);
const SKIP_FILES = new Set(['.env', '.env.local']);

const files = [];
(function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (!SKIP_DIRS.has(entry.name)) walk(full);
    } else if (!SKIP_FILES.has(entry.name) && !entry.name.endsWith('.log')) {
      files.push(path.relative(root, full));
    }
  }
})(root);

fs.mkdirSync(path.dirname(out), { recursive: true });
fs.rmSync(out, { force: true });
// tar on Windows 10+, macOS and Linux can write zip files
const tar = process.platform === 'win32' ? path.join(process.env.SystemRoot, 'System32', 'tar.exe') : 'tar';
execFileSync(tar, ['-a', '-c', '-f', out, ...files], { cwd: root, stdio: 'inherit' });
console.log(`Created ${path.relative(root, out)} with ${files.length} files`);
