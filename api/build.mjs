// Bundles the API Worker next to the built SPA -> dist/site is the folder that gets published.
// The Clerk publishable key (public) is baked in so the Worker can derive the issuer; no secret is bundled.
import { build } from 'esbuild';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const out = path.join(root, 'dist/site');
if (!fs.existsSync(path.join(out, 'index.html'))) throw new Error('run vite build first');
fs.renameSync(path.join(out, 'index.html'), path.join(out, 'app-shell.html'));
fs.rmSync(path.join(out, '_headers'), { force: true });
let pk = process.env.VITE_CLERK_PUBLISHABLE_KEY || '';
if (!pk && fs.existsSync(path.join(root, '.env'))) pk = (/VITE_CLERK_PUBLISHABLE_KEY=(\S+)/.exec(fs.readFileSync(path.join(root, '.env'), 'utf8')) || [])[1] || '';
if (pk && !/^pk_(test|live)_[A-Za-z0-9+/=_-]+$/.test(pk)) throw new Error('VITE_CLERK_PUBLISHABLE_KEY must be a publishable key (pk_...)');
await build({ entryPoints: [path.join(root, 'api/src/worker.ts')], bundle: true, format: 'esm', platform: 'neutral', target: 'es2022', outfile: path.join(out, '_worker.js'), legalComments: 'none', logLevel: 'warning', minify: true, define: { __CLERK_PK__: JSON.stringify(pk) } });
fs.writeFileSync(path.join(out, 'tab-site.json'), JSON.stringify({
  kind: 'worker', entry: '_worker.js', bindings: [{ type: 'd1', name: 'DB' }],
  worker: { compatibility_date: '2026-08-01', compatibility_flags: ['nodejs_compat'], html_handling: 'none', not_found_handling: 'none', assets_binding: 'ASSETS' },
}, null, 2));
let total = 0; const walk = (d) => { for (const f of fs.readdirSync(d)) { const p = path.join(d, f); const s = fs.statSync(p); s.isDirectory() ? walk(p) : (total += s.size); } }; walk(out);
console.log('worker', fs.statSync(path.join(out, '_worker.js')).size, 'bytes; site total', total, 'bytes; clerk', pk ? 'configured' : 'NOT configured');
