// Byawastha API + static host: one Cloudflare Worker. /api/* is handled here; everything else is the SPA from ASSETS.
// Identity: Clerk (session JWT verified on every protected request). Data: Cloudflare D1. No passwords are stored here.
import { SCHEMA, SCHEMA_VERSION, DEFAULT_FLAGS } from './schema.ts';
import { verifyJwt, fetchJwks, issuerFromPublishableKey, AuthError, type Claims, type Jwk } from './jwt.ts';
import { toCsv, parseCsv } from './csv.ts';
import { MODULES, CATEGORIES, getModule, getEntity, STARTER_BY_CATEGORY, type Entity, type Field } from '../../shared/registry.ts';
import { SYSTEM_ROLES, SYSTEM_ROLE_KEYS, roleSpec, moduleActions, canModule, canOrg, validateRoleSpec, MODULE_ACTIONS, type RoleSpec, type ModuleAction, type OrgPerm, type ModulePerms } from '../../shared/rbac.ts';

declare const __CLERK_PK__: string;
const BUILD_PK = typeof __CLERK_PK__ === 'string' ? __CLERK_PK__ : '';
export const SUPER_ADMIN_EMAILS = ['nexamusic.np@gmail.com'];
export const ALLOWED_ORIGINS = ['https://byawastha.sites.tab.bot', 'http://localhost:5173', 'http://localhost:4173'];

export interface Env {
  DB: D1Database; ASSETS?: { fetch: (r: Request) => Promise<Response> };
  // test-only seams (never set in production: the published Worker has no vars)
  TEST_ISSUER?: string; TEST_JWKS?: Jwk[];
}
interface User { id: number; clerk_id: string; email: string | null; name: string; status: string; is_super: number; prefs: string; created_at: number; last_seen?: number | null }
interface Org { id: number; slug: string; name: string; industry: string; accent: string; status: string; plan: string; created_at: number }
interface Member { org: Org; role: RoleSpec; membership_id: number; customRoles: RoleSpec[] }
interface Ctx { req: Request; env: Env; url: URL; ip: string; user: User | null; claims: Claims | null; body: any }

export class HttpError extends Error { constructor(public status: number, public code: string, public detail?: any) { super(code); } }
const err = (s: number, c: string, d?: any) => new HttpError(s, c, d);
const now = () => Date.now();

// ------------------------------------------------------------------ helpers
const SEC_HEADERS: Record<string, string> = {
  'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'strict-origin-when-cross-origin', 'X-Frame-Options': 'DENY',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()', 'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
  'Cross-Origin-Opener-Policy': 'same-origin-allow-popups',
};
const CSP = [
  "default-src 'self'",
  "script-src 'self' https://*.clerk.accounts.dev https://*.clerk.com https://challenges.cloudflare.com",
  "connect-src 'self' https://*.clerk.accounts.dev https://*.clerk.com https://clerk-telemetry.com",
  "img-src 'self' data: https://img.clerk.com https://*.clerk.com",
  "style-src 'self' 'unsafe-inline'", "font-src 'self' data:", "frame-src https://challenges.cloudflare.com https://*.clerk.accounts.dev",
  "worker-src 'self' blob:", "form-action 'self'", "base-uri 'self'", "frame-ancestors 'none'",
].join('; ');
function json(data: unknown, status = 200, extra: Record<string, string> = {}) {
  return new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', ...SEC_HEADERS, ...extra } });
}
export function clean(v: unknown, max: number, required = true): string | null {
  if (v === undefined || v === null || v === '') return required ? null : '';
  if (typeof v !== 'string' && typeof v !== 'number') return null;
  const s = String(v).replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '').replace(/\r\n?/g, '\n').trim();
  if (required && !s) return null;
  if (s.length > max) return null;
  return s;
}
const slugify = (s: string) => s.toLowerCase().normalize('NFKD').replace(/[^\w\s-]/g, '').trim().replace(/[\s_-]+/g, '-').slice(0, 40) || 'org';
const intParam = (v: string | null, d: number, min: number, max: number) => { const n = Number(v); return Number.isInteger(n) && n >= min && n <= max ? n : d; };

/** Validate one field value from a form or CSV cell. Returns [value, error]. */
export function validateField(f: Field, raw: unknown): [unknown, string | null] {
  const empty = raw === undefined || raw === null || (typeof raw === 'string' && raw.trim() === '');
  if (empty) return f.required ? [null, 'required'] : [null, null];
  switch (f.type) {
    case 'text': case 'phone': { const s = clean(raw, 200); if (s === null) return [null, 'too_long']; if (f.type === 'phone' && !/^[+\d][\d\s()-]{5,19}$/.test(s)) return [null, 'phone_invalid']; return [s, null]; }
    case 'long': { const s = clean(raw, 5000); return s === null ? [null, 'too_long'] : [s, null]; }
    case 'email': { const s = clean(raw, 160); return s && /^[^\s@<>()",;:]+@[^\s@<>()",;:]+\.[a-z]{2,}$/i.test(s) ? [s.toLowerCase(), null] : [null, 'email_invalid']; }
    case 'url': { const s = clean(raw, 500); if (!s) return [null, 'url_invalid']; try { const u = new URL(s); return /^https?:$/.test(u.protocol) ? [u.toString(), null] : [null, 'url_invalid']; } catch { return [null, 'url_invalid']; } }
    case 'num': case 'money': { const n = typeof raw === 'number' ? raw : Number(String(raw).replace(/,/g, '').trim()); if (!Number.isFinite(n) || Math.abs(n) > 1e13) return [null, 'number_invalid']; return [f.type === 'money' ? Math.round(n * 100) / 100 : n, null]; }
    case 'date': { const s = String(raw).trim(); if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return [null, 'date_invalid']; const d = new Date(s + 'T00:00:00Z'); return isNaN(+d) || d.toISOString().slice(0, 10) !== s ? [null, 'date_invalid'] : [s, null]; }
    case 'dt': { const s = String(raw).trim(); const d = new Date(s); return isNaN(+d) || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(s) ? [null, 'datetime_invalid'] : [s.slice(0, 16), null]; }
    case 'bool': { if (raw === true || raw === false) return [raw, null]; const s = String(raw).trim().toLowerCase(); if (['true', 'yes', '1', 'y'].includes(s)) return [true, null]; if (['false', 'no', '0', 'n'].includes(s)) return [false, null]; return [null, 'bool_invalid']; }
    case 'sel': { const s = String(raw).trim(); const hit = f.options!.find((o) => o.toLowerCase() === s.toLowerCase()); return hit ? [hit, null] : [null, 'option_invalid']; }
    case 'ref': { const n = Number(raw); return Number.isInteger(n) && n > 0 ? [n, null] : [null, 'ref_invalid']; }
  }
}
export function validateRecord(ent: Entity, input: any, partial = false): { data: Record<string, unknown>; errors: Record<string, string> } {
  const data: Record<string, unknown> = {}; const errors: Record<string, string> = {};
  const src = input && typeof input === 'object' ? input : {};
  for (const f of ent.fields) {
    if (partial && !(f.key in src)) continue;
    const [v, e] = validateField(f, src[f.key]);
    if (e) errors[f.key] = e; else if (v !== null) data[f.key] = v;
  }
  return { data, errors };
}
const searchText = (ent: Entity, data: Record<string, unknown>) => ent.fields.filter((f) => ['text', 'long', 'email', 'phone', 'sel'].includes(f.type)).map((f) => data[f.key]).filter((x) => x != null).join(' ').toLowerCase().slice(0, 2000);

// ------------------------------------------------------------------ db
let schemaReady: Promise<void> | null = null;
async function ensureSchema(db: D1Database) {
  if (!schemaReady) schemaReady = (async () => {
    await db.batch(SCHEMA.map((s) => db.prepare(s)));
    const t = now();
    await db.batch([
      ...DEFAULT_FLAGS.map(([k, note]) => db.prepare('INSERT OR IGNORE INTO feature_flags (key, enabled, note, updated_at) VALUES (?, ?, ?, ?)').bind(k, k === 'billing' ? 0 : 1, note, t)),
      db.prepare("INSERT INTO meta (key, value) VALUES ('schema_version', ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value").bind(String(SCHEMA_VERSION)),
    ]);
  })().catch((e) => { schemaReady = null; throw e; });
  return schemaReady;
}
export function resetSchemaCache() { schemaReady = null; }

async function audit(c: Ctx, orgId: number | null, action: string, target: string | null, targetId: string | number | null, meta: Record<string, unknown> = {}) {
  await c.env.DB.prepare('INSERT INTO audit_logs (org_id, user_id, action, target, target_id, meta, ip, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
    .bind(orgId, c.user?.id ?? null, action, target, targetId == null ? null : String(targetId), JSON.stringify(meta).slice(0, 4000), c.ip, now()).run();
}
async function notifyAdmins(c: Ctx, orgId: number, kind: string, title: string, body: string, link: string | null) {
  const { results } = await c.env.DB.prepare("SELECT user_id FROM memberships WHERE org_id = ? AND status = 'active' AND role IN ('owner','admin') AND user_id != ?").bind(orgId, c.user!.id).all<{ user_id: number }>();
  if (!results.length) return;
  const t = now();
  await c.env.DB.batch(results.map((r) => c.env.DB.prepare('INSERT INTO notifications (org_id, user_id, kind, title, body, link, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)').bind(orgId, r.user_id, kind, title.slice(0, 160), body.slice(0, 500), link, t)));
}
async function flag(env: Env, key: string) { const r = await env.DB.prepare('SELECT enabled FROM feature_flags WHERE key = ?').bind(key).first<{ enabled: number }>(); return !!r?.enabled; }

async function rateLimit(c: Ctx, bucket: string, limit: number, windowSec = 60) {
  const key = `${bucket}:${c.ip}`; const t = Math.floor(now() / 1000); const win = t - (t % windowSec);
  const row = await c.env.DB.prepare(`INSERT INTO rate_limits (bucket, window_start, count) VALUES (?, ?, 1)
    ON CONFLICT(bucket) DO UPDATE SET count = CASE WHEN window_start = excluded.window_start THEN count + 1 ELSE 1 END, window_start = excluded.window_start
    RETURNING count`).bind(key, win).first<{ count: number }>();
  if (row && row.count > limit) throw err(429, 'rate_limited', { retry_after: windowSec - (t % windowSec) });
}

// ------------------------------------------------------------------ auth
function issuer(env: Env) { return env.TEST_ISSUER || issuerFromPublishableKey(BUILD_PK); }
async function authenticate(c: Ctx): Promise<void> {
  const h = c.req.headers.get('authorization') || '';
  const m = /^Bearer ([A-Za-z0-9._-]+)$/.exec(h);
  if (!m) return;
  const iss = issuer(c.env);
  if (!iss) throw err(503, 'auth_not_configured');
  let claims: Claims;
  try {
    claims = await verifyJwt(m[1], { issuer: iss, keys: c.env.TEST_JWKS ? c.env.TEST_JWKS : () => fetchJwks(iss + '/.well-known/jwks.json'), authorizedParties: ALLOWED_ORIGINS });
  } catch (e) { if (e instanceof AuthError) throw err(401, e.code); throw e; }
  c.claims = claims;
  const email = typeof claims.email === 'string' && /@/.test(claims.email) ? claims.email.toLowerCase().slice(0, 160) : null;
  const verified = claims.email_verified === true || claims.email_verified === 'true';
  const name = typeof claims.name === 'string' ? claims.name.slice(0, 120).trim() : '';
  const isSuper = email && verified && SUPER_ADMIN_EMAILS.includes(email) ? 1 : 0;
  const t = now();
  let u = await c.env.DB.prepare('SELECT * FROM users WHERE clerk_id = ?').bind(claims.sub).first<User>();
  if (!u) {
    if (!(await flag(c.env, 'public_signup')) && !isSuper) throw err(403, 'signup_closed');
    u = await c.env.DB.prepare('INSERT INTO users (clerk_id, email, name, is_super, created_at, last_seen) VALUES (?, ?, ?, ?, ?, ?) RETURNING *').bind(claims.sub, email, name, isSuper, t, t).first<User>();
    c.user = u; await audit(c, null, 'user.created', 'user', u!.id, { via: 'clerk' });
  } else if (u.email !== email || (name && u.name !== name) || u.is_super !== isSuper || !u.last_seen || t - (u as any).last_seen > 300_000) {
    await c.env.DB.prepare('UPDATE users SET email = ?, name = COALESCE(NULLIF(?, \'\'), name), is_super = ?, last_seen = ? WHERE id = ?').bind(email, name, isSuper, t, u.id).run();
    u = { ...u, email, name: name || u.name, is_super: isSuper };
  }
  if (u!.status !== 'active') throw err(403, 'account_suspended');
  c.user = u!;
}
function requireUser(c: Ctx): User { if (!c.user) throw err(401, 'auth_required'); return c.user; }

async function customRoles(env: Env, orgId: number): Promise<RoleSpec[]> {
  const { results } = await env.DB.prepare('SELECT key, spec FROM custom_roles WHERE org_id = ? ORDER BY id').bind(orgId).all<{ key: string; spec: string }>();
  return results.map((r) => ({ ...JSON.parse(r.spec), key: r.key, system: false }));
}
/** Resolve the caller's membership in the org named by the URL slug. Tenant isolation starts here. */
async function member(c: Ctx, slug: string): Promise<Member> {
  const u = requireUser(c);
  const row = await c.env.DB.prepare(`SELECT o.*, m.role AS m_role, m.id AS m_id, m.status AS m_status FROM orgs o JOIN memberships m ON m.org_id = o.id AND m.user_id = ? WHERE o.slug = ?`).bind(u.id, slug).first<any>();
  if (!row || row.m_status !== 'active') throw err(404, 'org_not_found'); // same answer for "doesn't exist" and "not yours"
  if (row.status !== 'active') throw err(403, 'org_suspended');
  const cr = await customRoles(c.env, row.id);
  const role = roleSpec(row.m_role, cr);
  if (!role) throw err(403, 'role_missing');
  const org: Org = { id: row.id, slug: row.slug, name: row.name, industry: row.industry, accent: row.accent, status: row.status, plan: row.plan, created_at: row.created_at };
  return { org, role, membership_id: row.m_id, customRoles: cr };
}
function needOrg(m: Member, p: OrgPerm) { if (!canOrg(m.role, p)) throw err(403, 'forbidden', { need: p }); }
async function activeModule(c: Ctx, m: Member, moduleKey: string) {
  const def = getModule(moduleKey); if (!def) throw err(404, 'module_not_found');
  const row = await c.env.DB.prepare('SELECT enabled, perms, config FROM org_modules WHERE org_id = ? AND module_key = ?').bind(m.org.id, moduleKey).first<{ enabled: number; perms: string; config: string }>();
  if (!row || !row.enabled) throw err(404, 'module_not_active');
  return { def, perms: JSON.parse(row.perms || '{}') as ModulePerms, config: JSON.parse(row.config || '{}') };
}
function needModule(m: Member, moduleKey: string, action: ModuleAction, perms: ModulePerms) { if (!canModule(m.role, moduleKey, action, perms)) throw err(403, 'forbidden', { need: `${moduleKey}.${action}` }); }

// ------------------------------------------------------------------ routes
type Handler = (c: Ctx, p: Record<string, string>) => Promise<Response>;
const routes: [string, RegExp, string[], Handler][] = [];
function route(method: string, pattern: string, h: Handler) {
  const names: string[] = [];
  const re = new RegExp('^' + pattern.replace(/:(\w+)/g, (_, n) => { names.push(n); return n === 'id' ? '(\\d+)' : '([^/]+)'; }) + '$');
  routes.push([method, re, names, h]);
}

route('GET', '/api/health', async (c) => {
  const t0 = Date.now(); await c.env.DB.prepare('SELECT 1').first(); const dbMs = Date.now() - t0;
  return json({ ok: true, service: 'byawastha-api', version: '0.1.0', db_ms: dbMs, auth: issuer(c.env) ? 'clerk' : 'not_configured', modules: MODULES.length, categories: CATEGORIES.length });
});
route('GET', '/api/config', async (c) => json({ auth_configured: !!issuer(c.env), billing: await flag(c.env, 'billing'), signup: await flag(c.env, 'public_signup'), csv_import: await flag(c.env, 'csv_import') }));

route('GET', '/api/me', async (c) => {
  const u = requireUser(c);
  const { results: orgs } = await c.env.DB.prepare(`SELECT o.slug, o.name, o.industry, o.accent, o.status, m.role FROM memberships m JOIN orgs o ON o.id = m.org_id WHERE m.user_id = ? AND m.status = 'active' ORDER BY o.name`).bind(u.id).all();
  const invites = u.email ? (await c.env.DB.prepare(`SELECT i.id, i.role, i.created_at, o.name AS org_name FROM invites i JOIN orgs o ON o.id = i.org_id WHERE i.email = ? AND i.accepted_at IS NULL AND i.revoked_at IS NULL AND NOT EXISTS (SELECT 1 FROM memberships m WHERE m.org_id = i.org_id AND m.user_id = ?)`).bind(u.email, u.id).all()).results : [];
  return json({ user: { id: u.id, email: u.email, name: u.name, is_super: !!u.is_super, prefs: JSON.parse(u.prefs || '{}'), created_at: u.created_at }, orgs, invites, email_verified: c.claims?.email_verified === true || c.claims?.email_verified === 'true' });
});
route('PATCH', '/api/me/prefs', async (c) => {
  const u = requireUser(c);
  const p = c.body?.prefs; if (!p || typeof p !== 'object') throw err(400, 'prefs_invalid');
  const prefs: Record<string, unknown> = {};
  if (['light', 'dark', 'system'].includes(p.theme)) prefs.theme = p.theme;
  if (typeof p.compact === 'boolean') prefs.compact = p.compact;
  if (typeof p.last_org === 'string' && /^[a-z0-9-]{1,48}$/.test(p.last_org)) prefs.last_org = p.last_org;
  const merged = { ...JSON.parse(u.prefs || '{}'), ...prefs };
  await c.env.DB.prepare('UPDATE users SET prefs = ? WHERE id = ?').bind(JSON.stringify(merged), u.id).run();
  return json({ prefs: merged });
});
route('POST', '/api/invites/:id/accept', async (c, p) => {
  const u = requireUser(c);
  if (!u.email || !(c.claims?.email_verified === true || c.claims?.email_verified === 'true')) throw err(403, 'email_not_verified');
  const inv = await c.env.DB.prepare('SELECT * FROM invites WHERE id = ? AND email = ? AND accepted_at IS NULL AND revoked_at IS NULL').bind(Number(p.id), u.email).first<any>();
  if (!inv) throw err(404, 'invite_not_found');
  const t = now();
  await c.env.DB.batch([
    c.env.DB.prepare('INSERT OR IGNORE INTO memberships (org_id, user_id, role, created_at) VALUES (?, ?, ?, ?)').bind(inv.org_id, u.id, inv.role, t),
    c.env.DB.prepare('UPDATE invites SET accepted_at = ? WHERE id = ?').bind(t, inv.id),
  ]);
  await audit(c, inv.org_id, 'member.joined', 'user', u.id, { role: inv.role, invite: inv.id });
  await notifyAdmins(c, inv.org_id, 'member', `${u.name || u.email} joined`, `Joined as ${inv.role}.`, null);
  const org = await c.env.DB.prepare('SELECT slug FROM orgs WHERE id = ?').bind(inv.org_id).first<{ slug: string }>();
  return json({ ok: true, slug: org!.slug });
});

route('POST', '/api/orgs', async (c) => {
  const u = requireUser(c);
  await rateLimit(c, 'org-create', 5, 3600);
  const name = clean(c.body?.name, 80); if (!name || name.length < 2) throw err(400, 'name_invalid');
  const industry = CATEGORIES.some((x) => x.key === c.body?.industry) ? c.body.industry : 'biz';
  const want = Array.isArray(c.body?.modules) ? c.body.modules.filter((k: any) => typeof k === 'string' && getModule(k)).slice(0, 30) : STARTER_BY_CATEGORY[industry];
  const base = slugify(name); let slug = base;
  for (let i = 2; await c.env.DB.prepare('SELECT 1 FROM orgs WHERE slug = ?').bind(slug).first(); i++) slug = `${base}-${i}`;
  const t = now();
  const org = await c.env.DB.prepare('INSERT INTO orgs (slug, name, industry, created_by, created_at) VALUES (?, ?, ?, ?, ?) RETURNING id').bind(slug, name, industry, u.id, t).first<{ id: number }>();
  await c.env.DB.batch([
    c.env.DB.prepare('INSERT INTO memberships (org_id, user_id, role, created_at) VALUES (?, ?, ?, ?)').bind(org!.id, u.id, 'owner', t),
    ...want.map((k: string) => c.env.DB.prepare('INSERT INTO org_modules (org_id, module_key, enabled, activated_by, activated_at, updated_at) VALUES (?, ?, 1, ?, ?, ?)').bind(org!.id, k, u.id, t, t)),
  ]);
  await audit(c, org!.id, 'org.created', 'org', org!.id, { name, industry, modules: want });
  return json({ slug, name }, 201);
});

route('GET', '/api/o/:org', async (c, p) => {
  const m = await member(c, p.org);
  const { results: mods } = await c.env.DB.prepare('SELECT module_key, enabled, activated_at FROM org_modules WHERE org_id = ? AND enabled = 1').bind(m.org.id).all<any>();
  const permissions: Record<string, ModuleAction[]> = {};
  const perms = await modulePermsMap(c, m.org.id);
  for (const r of mods) permissions[r.module_key] = moduleActions(m.role, r.module_key, perms[r.module_key]);
  return json({ org: m.org, role: { key: m.role.key, name: m.role.name, org: m.role.org, ownOnly: !!m.role.ownOnly }, modules: mods.map((r) => r.module_key), permissions });
});
async function modulePermsMap(c: Ctx, orgId: number): Promise<Record<string, ModulePerms>> {
  const { results } = await c.env.DB.prepare('SELECT module_key, perms FROM org_modules WHERE org_id = ?').bind(orgId).all<{ module_key: string; perms: string }>();
  return Object.fromEntries(results.map((r) => [r.module_key, JSON.parse(r.perms || '{}')]));
}
route('PATCH', '/api/o/:org', async (c, p) => {
  const m = await member(c, p.org); needOrg(m, 'org.settings');
  const sets: string[] = []; const vals: unknown[] = [];
  if (c.body?.name !== undefined) { const n = clean(c.body.name, 80); if (!n || n.length < 2) throw err(400, 'name_invalid'); sets.push('name = ?'); vals.push(n); }
  if (c.body?.industry !== undefined) { if (!CATEGORIES.some((x) => x.key === c.body.industry)) throw err(400, 'industry_invalid'); sets.push('industry = ?'); vals.push(c.body.industry); }
  if (c.body?.accent !== undefined) { if (!['saffron', 'teal', 'auburn', 'vanilla'].includes(c.body.accent)) throw err(400, 'accent_invalid'); sets.push('accent = ?'); vals.push(c.body.accent); }
  if (!sets.length) throw err(400, 'nothing_to_update');
  await c.env.DB.prepare(`UPDATE orgs SET ${sets.join(', ')} WHERE id = ?`).bind(...vals, m.org.id).run();
  await audit(c, m.org.id, 'org.updated', 'org', m.org.id, c.body);
  return json({ ok: true });
});

// ---- dashboard + search
route('GET', '/api/o/:org/dashboard', async (c, p) => {
  const m = await member(c, p.org);
  const perms = await modulePermsMap(c, m.org.id);
  const { results: mods } = await c.env.DB.prepare('SELECT module_key FROM org_modules WHERE org_id = ? AND enabled = 1').bind(m.org.id).all<{ module_key: string }>();
  const visible = mods.map((r) => r.module_key).filter((k) => canModule(m.role, k, 'view', perms[k]));
  const own = m.role.ownOnly ? ' AND created_by = ' + Number(c.user!.id) : '';
  const inList = visible.length ? visible.map(() => '?').join(',') : "''";
  const perModule = visible.length ? (await c.env.DB.prepare(`SELECT module_key, COUNT(*) AS n FROM records WHERE org_id = ? AND module_key IN (${inList})${own} GROUP BY module_key ORDER BY n DESC`).bind(m.org.id, ...visible).all<{ module_key: string; n: number }>()).results : [];
  const since = now() - 14 * 86400_000;
  const daily = visible.length ? (await c.env.DB.prepare(`SELECT strftime('%Y-%m-%d', created_at / 1000, 'unixepoch') AS day, COUNT(*) AS n FROM records WHERE org_id = ? AND created_at >= ? AND module_key IN (${inList})${own} GROUP BY day ORDER BY day`).bind(m.org.id, since, ...visible).all<{ day: string; n: number }>()).results : [];
  const members = await c.env.DB.prepare("SELECT COUNT(*) AS n FROM memberships WHERE org_id = ? AND status = 'active'").bind(m.org.id).first<{ n: number }>();
  const activity = canOrg(m.role, 'audit.view') ? (await c.env.DB.prepare('SELECT a.action, a.target, a.target_id, a.meta, a.created_at, u.name, u.email FROM audit_logs a LEFT JOIN users u ON u.id = a.user_id WHERE a.org_id = ? ORDER BY a.id DESC LIMIT 8').bind(m.org.id).all()).results : [];
  return json({ active_modules: mods.length, visible_modules: visible.length, records_total: perModule.reduce((a, r) => a + r.n, 0), members: members?.n ?? 0, per_module: perModule.slice(0, 10), daily, activity });
});
route('GET', '/api/o/:org/search', async (c, p) => {
  const m = await member(c, p.org);
  await rateLimit(c, 'search', 90);
  const q = (c.url.searchParams.get('q') || '').trim().toLowerCase().slice(0, 80);
  if (q.length < 2) return json({ records: [], members: [] });
  const perms = await modulePermsMap(c, m.org.id);
  const { results: mods } = await c.env.DB.prepare('SELECT module_key FROM org_modules WHERE org_id = ? AND enabled = 1').bind(m.org.id).all<{ module_key: string }>();
  const visible = mods.map((r) => r.module_key).filter((k) => canModule(m.role, k, 'view', perms[k]));
  const like = '%' + q.replace(/[%_\\]/g, (x) => '\\' + x) + '%';
  const own = m.role.ownOnly ? ' AND created_by = ' + Number(c.user!.id) : '';
  const records = visible.length ? (await c.env.DB.prepare(`SELECT id, module_key, entity_key, title, status FROM records WHERE org_id = ? AND module_key IN (${visible.map(() => '?').join(',')}) AND search LIKE ? ESCAPE '\\'${own} ORDER BY updated_at DESC LIMIT 20`).bind(m.org.id, ...visible, like).all()).results : [];
  const members = canOrg(m.role, 'members.manage') ? (await c.env.DB.prepare(`SELECT u.name, u.email, m.role FROM memberships m JOIN users u ON u.id = m.user_id WHERE m.org_id = ? AND (lower(u.name) LIKE ? ESCAPE '\\' OR lower(u.email) LIKE ? ESCAPE '\\') LIMIT 8`).bind(m.org.id, like, like).all()).results : [];
  return json({ records, members });
});

// ---- marketplace: activation, config, permissions
route('GET', '/api/o/:org/modules', async (c, p) => {
  const m = await member(c, p.org);
  const { results } = await c.env.DB.prepare('SELECT module_key, enabled, config, perms, activated_at, updated_at FROM org_modules WHERE org_id = ?').bind(m.org.id).all<any>();
  const counts = (await c.env.DB.prepare('SELECT module_key, COUNT(*) AS n FROM records WHERE org_id = ? GROUP BY module_key').bind(m.org.id).all<{ module_key: string; n: number }>()).results;
  const cmap = Object.fromEntries(counts.map((r) => [r.module_key, r.n]));
  return json({ modules: results.map((r) => ({ key: r.module_key, enabled: !!r.enabled, config: JSON.parse(r.config), perms: JSON.parse(r.perms), activated_at: r.activated_at, updated_at: r.updated_at, records: cmap[r.module_key] || 0 })) });
});
route('POST', '/api/o/:org/modules/:mod/activate', async (c, p) => {
  const m = await member(c, p.org); needOrg(m, 'modules.manage');
  const def = getModule(p.mod); if (!def) throw err(404, 'module_not_found');
  const t = now();
  await c.env.DB.prepare('INSERT INTO org_modules (org_id, module_key, enabled, activated_by, activated_at, updated_at) VALUES (?, ?, 1, ?, ?, ?) ON CONFLICT(org_id, module_key) DO UPDATE SET enabled = 1, updated_at = excluded.updated_at').bind(m.org.id, def.key, c.user!.id, t, t).run();
  await audit(c, m.org.id, 'module.activated', 'module', def.key);
  await notifyAdmins(c, m.org.id, 'module', `${def.name} activated`, `${c.user!.name || c.user!.email} turned on ${def.name}.`, `/app/${m.org.slug}/m/${def.key}`);
  return json({ ok: true });
});
route('POST', '/api/o/:org/modules/:mod/deactivate', async (c, p) => {
  const m = await member(c, p.org); needOrg(m, 'modules.manage');
  const def = getModule(p.mod); if (!def) throw err(404, 'module_not_found');
  await c.env.DB.prepare('UPDATE org_modules SET enabled = 0, updated_at = ? WHERE org_id = ? AND module_key = ?').bind(now(), m.org.id, def.key).run();
  await audit(c, m.org.id, 'module.deactivated', 'module', def.key);
  await notifyAdmins(c, m.org.id, 'module', `${def.name} turned off`, 'Its records are kept and come back if it is turned on again.', null);
  return json({ ok: true });
});
route('PUT', '/api/o/:org/modules/:mod/settings', async (c, p) => {
  const m = await member(c, p.org); needOrg(m, 'modules.manage');
  const { def } = await activeModule(c, m, p.mod);
  const cfg: Record<string, unknown> = {};
  const b = c.body?.config || {};
  if (b.label !== undefined) { const l = clean(b.label, 40, false); if (l === null) throw err(400, 'label_invalid'); cfg.label = l; }
  if (b.page_size !== undefined) { if (![10, 25, 50, 100].includes(Number(b.page_size))) throw err(400, 'page_size_invalid'); cfg.page_size = Number(b.page_size); }
  if (b.default_entity !== undefined) { if (!def.entities.some((e) => e.key === b.default_entity)) throw err(400, 'entity_invalid'); cfg.default_entity = b.default_entity; }
  const perms: ModulePerms = {};
  if (c.body?.perms && typeof c.body.perms === 'object') {
    const allRoles = [...SYSTEM_ROLE_KEYS, ...m.customRoles.map((r) => r.key)];
    for (const [rk, acts] of Object.entries(c.body.perms)) {
      if (!allRoles.includes(rk) || rk === 'owner' || !Array.isArray(acts)) continue;
      perms[rk] = (acts as any[]).filter((a) => (MODULE_ACTIONS as readonly string[]).includes(a));
    }
  }
  await c.env.DB.prepare('UPDATE org_modules SET config = ?, perms = ?, updated_at = ? WHERE org_id = ? AND module_key = ?').bind(JSON.stringify(cfg), JSON.stringify(perms), now(), m.org.id, def.key).run();
  await audit(c, m.org.id, 'module.configured', 'module', def.key, { config: cfg, perms });
  return json({ ok: true, config: cfg, perms });
});

// ---- records (the module engine)
function entityOf(def: ReturnType<typeof getModule>, key: string) { const e = def!.entities.find((x) => x.key === key); if (!e) throw err(404, 'entity_not_found'); return e; }
async function checkRefs(c: Ctx, orgId: number, moduleKey: string, ent: Entity, data: Record<string, unknown>) {
  for (const f of ent.fields) if (f.type === 'ref' && data[f.key] != null) {
    const r = await c.env.DB.prepare('SELECT id FROM records WHERE id = ? AND org_id = ? AND module_key = ? AND entity_key = ?').bind(data[f.key], orgId, moduleKey, f.ref).first();
    if (!r) throw err(400, 'validation', { [f.key]: 'ref_not_found' });
  }
}
function listQuery(c: Ctx, m: Member, moduleKey: string, ent: Entity) {
  const sp = c.url.searchParams;
  const where = ['org_id = ?', 'module_key = ?', 'entity_key = ?']; const args: unknown[] = [m.org.id, moduleKey, ent.key];
  if (m.role.ownOnly) { where.push('created_by = ?'); args.push(c.user!.id); }
  const q = (sp.get('q') || '').trim().toLowerCase().slice(0, 80);
  if (q) { where.push("search LIKE ? ESCAPE '\\'"); args.push('%' + q.replace(/[%_\\]/g, (x) => '\\' + x) + '%'); }
  const st = sp.get('status'); if (st && ent.statusField) { where.push('status = ?'); args.push(st); }
  for (const f of ent.fields) {
    const v = sp.get('f.' + f.key); if (v == null || v === '') continue;
    if (f.type === 'sel' || f.type === 'bool' || f.type === 'ref' || f.type === 'text') { where.push('json_extract(data, ?) = ?'); args.push('$.' + f.key, f.type === 'bool' ? (v === 'true' ? 1 : 0) : f.type === 'ref' ? Number(v) : v); }
    if (f.type === 'date' || f.type === 'num' || f.type === 'money') {
      const [lo, hi] = v.split('..');
      if (lo) { where.push('json_extract(data, ?) >= ?'); args.push('$.' + f.key, f.type === 'date' ? lo : Number(lo)); }
      if (hi) { where.push('json_extract(data, ?) <= ?'); args.push('$.' + f.key, f.type === 'date' ? hi : Number(hi)); }
    }
  }
  const sortKey = sp.get('sort') || 'updated_at'; const dir = sp.get('dir') === 'asc' ? 'ASC' : 'DESC';
  let order: string; const orderArgs: unknown[] = [];
  if (['updated_at', 'created_at', 'title', 'status', 'id'].includes(sortKey)) order = `${sortKey} ${dir}, id ${dir}`;
  else if (ent.fields.some((f) => f.key === sortKey)) { order = `json_extract(data, ?) ${dir}, id ${dir}`; orderArgs.push('$.' + sortKey); }
  else throw err(400, 'sort_invalid');
  return { where: where.join(' AND '), args, order, orderArgs };
}
async function refTitles(c: Ctx, orgId: number, rows: any[], ent: Entity) {
  const ids = new Set<number>();
  for (const r of rows) for (const f of ent.fields) if (f.type === 'ref' && r.data[f.key]) ids.add(Number(r.data[f.key]));
  if (!ids.size) return {};
  const list = [...ids].slice(0, 200);
  const { results } = await c.env.DB.prepare(`SELECT id, title FROM records WHERE org_id = ? AND id IN (${list.map(() => '?').join(',')})`).bind(orgId, ...list).all<{ id: number; title: string }>();
  return Object.fromEntries(results.map((r) => [r.id, r.title]));
}
const rowOut = (r: any) => ({ id: r.id, title: r.title, status: r.status, data: JSON.parse(r.data), created_by: r.created_by, created_at: r.created_at, updated_at: r.updated_at });

route('GET', '/api/o/:org/m/:mod/e/:ent', async (c, p) => {
  const m = await member(c, p.org); const { def, perms } = await activeModule(c, m, p.mod); needModule(m, def.key, 'view', perms);
  const ent = entityOf(def, p.ent); const lq = listQuery(c, m, def.key, ent);
  const page = intParam(c.url.searchParams.get('page'), 1, 1, 100000); const size = intParam(c.url.searchParams.get('page_size'), 25, 1, 100);
  const total = await c.env.DB.prepare(`SELECT COUNT(*) AS n FROM records WHERE ${lq.where}`).bind(...lq.args).first<{ n: number }>();
  const { results } = await c.env.DB.prepare(`SELECT * FROM records WHERE ${lq.where} ORDER BY ${lq.order} LIMIT ? OFFSET ?`).bind(...lq.args, ...lq.orderArgs, size, (page - 1) * size).all<any>();
  const rows = results.map(rowOut);
  return json({ rows, total: total?.n ?? 0, page, page_size: size, refs: await refTitles(c, m.org.id, rows, ent) });
});
route('GET', '/api/o/:org/m/:mod/e/:ent/options', async (c, p) => {
  const m = await member(c, p.org); const { def, perms } = await activeModule(c, m, p.mod); needModule(m, def.key, 'view', perms);
  const ent = entityOf(def, p.ent);
  const q = (c.url.searchParams.get('q') || '').toLowerCase().slice(0, 60);
  const own = m.role.ownOnly ? ' AND created_by = ' + Number(c.user!.id) : '';
  const { results } = await c.env.DB.prepare(`SELECT id, title FROM records WHERE org_id = ? AND module_key = ? AND entity_key = ?${own} AND lower(title) LIKE ? ORDER BY title LIMIT 50`).bind(m.org.id, def.key, ent.key, '%' + q + '%').all();
  return json({ options: results });
});
route('POST', '/api/o/:org/m/:mod/e/:ent', async (c, p) => {
  const m = await member(c, p.org); const { def, perms } = await activeModule(c, m, p.mod); needModule(m, def.key, 'create', perms);
  await rateLimit(c, 'write', 120);
  const ent = entityOf(def, p.ent);
  const { data, errors } = validateRecord(ent, c.body?.data);
  if (Object.keys(errors).length) throw err(400, 'validation', errors);
  await checkRefs(c, m.org.id, def.key, ent, data);
  const t = now();
  const row = await c.env.DB.prepare('INSERT INTO records (org_id, module_key, entity_key, title, status, data, search, created_by, updated_by, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) RETURNING *')
    .bind(m.org.id, def.key, ent.key, String(data[ent.titleField] ?? '').slice(0, 200) || '(untitled)', ent.statusField ? (data[ent.statusField] as string) ?? null : null, JSON.stringify(data), searchText(ent, data), c.user!.id, c.user!.id, t, t).first<any>();
  await audit(c, m.org.id, 'record.created', `${def.key}/${ent.key}`, row.id, { title: row.title });
  return json(rowOut(row), 201);
});
async function ownedRecord(c: Ctx, m: Member, moduleKey: string, entKey: string, id: string) {
  const row = await c.env.DB.prepare('SELECT * FROM records WHERE id = ? AND org_id = ? AND module_key = ? AND entity_key = ?').bind(Number(id), m.org.id, moduleKey, entKey).first<any>();
  if (!row || (m.role.ownOnly && row.created_by !== c.user!.id)) throw err(404, 'record_not_found');
  return row;
}
route('GET', '/api/o/:org/m/:mod/e/:ent/:id', async (c, p) => {
  const m = await member(c, p.org); const { def, perms } = await activeModule(c, m, p.mod); needModule(m, def.key, 'view', perms);
  const ent = entityOf(def, p.ent); const row = rowOut(await ownedRecord(c, m, def.key, ent.key, p.id));
  return json({ ...row, refs: await refTitles(c, m.org.id, [row], ent) });
});
route('PATCH', '/api/o/:org/m/:mod/e/:ent/:id', async (c, p) => {
  const m = await member(c, p.org); const { def, perms } = await activeModule(c, m, p.mod); needModule(m, def.key, 'edit', perms);
  await rateLimit(c, 'write', 120);
  const ent = entityOf(def, p.ent); const row = await ownedRecord(c, m, def.key, ent.key, p.id);
  const merged = { ...JSON.parse(row.data), ...(c.body?.data && typeof c.body.data === 'object' ? c.body.data : {}) };
  const { data, errors } = validateRecord(ent, merged);
  if (Object.keys(errors).length) throw err(400, 'validation', errors);
  await checkRefs(c, m.org.id, def.key, ent, data);
  const t = now();
  const out = await c.env.DB.prepare('UPDATE records SET title = ?, status = ?, data = ?, search = ?, updated_by = ?, updated_at = ? WHERE id = ? AND org_id = ? RETURNING *')
    .bind(String(data[ent.titleField] ?? '').slice(0, 200) || '(untitled)', ent.statusField ? (data[ent.statusField] as string) ?? null : null, JSON.stringify(data), searchText(ent, data), c.user!.id, t, row.id, m.org.id).first<any>();
  const changed = ent.fields.filter((f) => JSON.stringify(JSON.parse(row.data)[f.key]) !== JSON.stringify(data[f.key])).map((f) => f.key);
  await audit(c, m.org.id, 'record.updated', `${def.key}/${ent.key}`, row.id, { title: out.title, changed });
  return json(rowOut(out));
});
route('DELETE', '/api/o/:org/m/:mod/e/:ent/:id', async (c, p) => {
  const m = await member(c, p.org); const { def, perms } = await activeModule(c, m, p.mod); needModule(m, def.key, 'delete', perms);
  const ent = entityOf(def, p.ent); const row = await ownedRecord(c, m, def.key, ent.key, p.id);
  await c.env.DB.prepare('DELETE FROM records WHERE id = ? AND org_id = ?').bind(row.id, m.org.id).run();
  await audit(c, m.org.id, 'record.deleted', `${def.key}/${ent.key}`, row.id, { title: row.title, data: JSON.parse(row.data) });
  await notifyAdmins(c, m.org.id, 'record', `Deleted from ${def.name}`, `${c.user!.name || c.user!.email} deleted "${row.title}" (${ent.name}).`, `/app/${m.org.slug}/audit`);
  return json({ ok: true });
});
route('POST', '/api/o/:org/m/:mod/e/:ent/bulk-delete', async (c, p) => {
  const m = await member(c, p.org); const { def, perms } = await activeModule(c, m, p.mod); needModule(m, def.key, 'delete', perms);
  const ent = entityOf(def, p.ent);
  const ids = Array.isArray(c.body?.ids) ? c.body.ids.map(Number).filter((n: number) => Number.isInteger(n) && n > 0).slice(0, 100) : [];
  if (!ids.length) throw err(400, 'ids_required');
  const own = m.role.ownOnly ? ' AND created_by = ' + Number(c.user!.id) : '';
  const r = await c.env.DB.prepare(`DELETE FROM records WHERE org_id = ? AND module_key = ? AND entity_key = ? AND id IN (${ids.map(() => '?').join(',')})${own}`).bind(m.org.id, def.key, ent.key, ...ids).run();
  await audit(c, m.org.id, 'record.bulk_deleted', `${def.key}/${ent.key}`, null, { ids, deleted: r.meta.changes });
  return json({ ok: true, deleted: r.meta.changes });
});
route('GET', '/api/o/:org/m/:mod/e/:ent/export.csv', async (c, p) => {
  const m = await member(c, p.org); const { def, perms } = await activeModule(c, m, p.mod); needModule(m, def.key, 'export', perms);
  await rateLimit(c, 'export', 20);
  const ent = entityOf(def, p.ent); const lq = listQuery(c, m, def.key, ent);
  const { results } = await c.env.DB.prepare(`SELECT * FROM records WHERE ${lq.where} ORDER BY ${lq.order} LIMIT 5000`).bind(...lq.args, ...lq.orderArgs).all<any>();
  const rows = results.map(rowOut);
  const refs = await refTitles(c, m.org.id, rows, ent);
  const header = ['id', ...ent.fields.map((f) => f.key), 'created_at', 'updated_at'];
  const body = rows.map((r) => [r.id, ...ent.fields.map((f) => (f.type === 'ref' && r.data[f.key] ? `${r.data[f.key]}` : r.data[f.key] ?? '')), new Date(r.created_at).toISOString(), new Date(r.updated_at).toISOString()]);
  void refs;
  await audit(c, m.org.id, 'record.exported', `${def.key}/${ent.key}`, null, { rows: rows.length });
  return new Response(toCsv([header, ...body]), { headers: { 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': `attachment; filename="${def.key}-${ent.key}.csv"`, 'Cache-Control': 'no-store', ...SEC_HEADERS } });
});
route('POST', '/api/o/:org/m/:mod/e/:ent/import', async (c, p) => {
  const m = await member(c, p.org); const { def, perms } = await activeModule(c, m, p.mod); needModule(m, def.key, 'import', perms);
  if (!(await flag(c.env, 'csv_import'))) throw err(403, 'import_disabled');
  await rateLimit(c, 'import', 10);
  const ent = entityOf(def, p.ent);
  const text = typeof c.body?.csv === 'string' ? c.body.csv : '';
  if (!text || text.length > 2_000_000) throw err(400, 'csv_invalid');
  const table = parseCsv(text);
  if (table.length < 2) throw err(400, 'csv_empty');
  const head = table[0].map((h) => h.trim().toLowerCase());
  const colFor = (f: Field) => head.findIndex((h) => h === f.key || h === f.label.toLowerCase());
  const map = ent.fields.map((f) => [f, colFor(f)] as const);
  if (!map.some(([, i]) => i >= 0)) throw err(400, 'csv_no_matching_columns', { expected: ent.fields.map((f) => f.key) });
  const rows = table.slice(1).filter((r) => r.some((x) => x.trim() !== '')).slice(0, 1000);
  const errors: { row: number; errors: Record<string, string> }[] = []; const stmts: D1PreparedStatement[] = []; const t = now();
  rows.forEach((r, i) => {
    const input: Record<string, unknown> = {};
    for (const [f, ci] of map) if (ci >= 0) input[f.key] = r[ci];
    const { data, errors: e } = validateRecord({ ...ent, fields: ent.fields.map((f) => (f.type === 'ref' ? { ...f, required: false } : f)) }, input);
    for (const f of ent.fields) if (f.type === 'ref') delete data[f.key]; // references are not imported (ids are per-workspace)
    if (Object.keys(e).length) { errors.push({ row: i + 2, errors: e }); return; }
    stmts.push(c.env.DB.prepare('INSERT INTO records (org_id, module_key, entity_key, title, status, data, search, created_by, updated_by, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)')
      .bind(m.org.id, def.key, ent.key, String(data[ent.titleField] ?? '').slice(0, 200) || '(untitled)', ent.statusField ? (data[ent.statusField] as string) ?? null : null, JSON.stringify(data), searchText(ent, data), c.user!.id, c.user!.id, t, t));
  });
  for (let i = 0; i < stmts.length; i += 50) await c.env.DB.batch(stmts.slice(i, i + 50));
  await audit(c, m.org.id, 'record.imported', `${def.key}/${ent.key}`, null, { inserted: stmts.length, rejected: errors.length });
  if (stmts.length) await notifyAdmins(c, m.org.id, 'import', `Import into ${def.name}`, `${stmts.length} ${ent.name} rows imported, ${errors.length} rejected.`, `/app/${m.org.slug}/m/${def.key}`);
  return json({ inserted: stmts.length, rejected: errors.length, errors: errors.slice(0, 50) });
});
route('GET', '/api/o/:org/m/:mod/stats', async (c, p) => {
  const m = await member(c, p.org); const { def, perms } = await activeModule(c, m, p.mod); needModule(m, def.key, 'view', perms);
  const own = m.role.ownOnly ? ' AND created_by = ' + Number(c.user!.id) : '';
  const out: any[] = [];
  for (const ent of def.entities) {
    const base = `FROM records WHERE org_id = ? AND module_key = ? AND entity_key = ?${own}`; const a = [m.org.id, def.key, ent.key];
    const total = await c.env.DB.prepare(`SELECT COUNT(*) AS n ${base}`).bind(...a).first<{ n: number }>();
    const byStatus = ent.statusField ? (await c.env.DB.prepare(`SELECT COALESCE(status, '(none)') AS status, COUNT(*) AS n ${base} GROUP BY status ORDER BY n DESC`).bind(...a).all()).results : [];
    const money = ent.moneyField ? await c.env.DB.prepare(`SELECT COALESCE(SUM(json_extract(data, ?)), 0) AS s ${base}`).bind('$.' + ent.moneyField, ...a).first<{ s: number }>() : null;
    const daily = (await c.env.DB.prepare(`SELECT strftime('%Y-%m-%d', created_at / 1000, 'unixepoch') AS day, COUNT(*) AS n ${base} AND created_at >= ? GROUP BY day ORDER BY day`).bind(...a, now() - 30 * 86400_000).all()).results;
    out.push({ entity: ent.key, total: total?.n ?? 0, by_status: byStatus, money_field: ent.moneyField, money_sum: money?.s ?? null, daily });
  }
  return json({ module: def.key, entities: out });
});

// ---- members, invites, roles, departments
route('GET', '/api/o/:org/members', async (c, p) => {
  const m = await member(c, p.org); needOrg(m, 'members.manage');
  const { results: members } = await c.env.DB.prepare('SELECT m.id, m.role, m.status, m.department_id, m.created_at, u.name, u.email, u.last_seen FROM memberships m JOIN users u ON u.id = m.user_id WHERE m.org_id = ? ORDER BY m.created_at').bind(m.org.id).all();
  const { results: invites } = await c.env.DB.prepare('SELECT id, email, role, created_at FROM invites WHERE org_id = ? AND accepted_at IS NULL AND revoked_at IS NULL ORDER BY id DESC').bind(m.org.id).all();
  return json({ members, invites });
});
const canAssign = (m: Member, role: string) => (role === 'owner' ? m.role.key === 'owner' : [...SYSTEM_ROLE_KEYS, ...m.customRoles.map((r) => r.key)].includes(role));
route('POST', '/api/o/:org/invites', async (c, p) => {
  const m = await member(c, p.org); needOrg(m, 'members.manage');
  await rateLimit(c, 'invite', 30, 3600);
  const email = clean(c.body?.email, 160); if (!email || !/^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i.test(email)) throw err(400, 'email_invalid');
  const role = String(c.body?.role || 'staff'); if (!canAssign(m, role)) throw err(400, 'role_invalid');
  const exists = await c.env.DB.prepare('SELECT 1 FROM memberships mm JOIN users u ON u.id = mm.user_id WHERE mm.org_id = ? AND u.email = ?').bind(m.org.id, email.toLowerCase()).first();
  if (exists) throw err(409, 'already_member');
  const row = await c.env.DB.prepare('INSERT INTO invites (org_id, email, role, created_by, created_at) VALUES (?, ?, ?, ?, ?) RETURNING id').bind(m.org.id, email.toLowerCase(), role, c.user!.id, now()).first<{ id: number }>();
  await audit(c, m.org.id, 'invite.created', 'invite', row!.id, { email: email.toLowerCase(), role });
  return json({ id: row!.id }, 201);
});
route('DELETE', '/api/o/:org/invites/:id', async (c, p) => {
  const m = await member(c, p.org); needOrg(m, 'members.manage');
  const r = await c.env.DB.prepare('UPDATE invites SET revoked_at = ? WHERE id = ? AND org_id = ? AND accepted_at IS NULL').bind(now(), Number(p.id), m.org.id).run();
  if (!r.meta.changes) throw err(404, 'invite_not_found');
  await audit(c, m.org.id, 'invite.revoked', 'invite', p.id);
  return json({ ok: true });
});
route('PATCH', '/api/o/:org/members/:id', async (c, p) => {
  const m = await member(c, p.org); needOrg(m, 'members.manage');
  const target = await c.env.DB.prepare('SELECT * FROM memberships WHERE id = ? AND org_id = ?').bind(Number(p.id), m.org.id).first<any>();
  if (!target) throw err(404, 'member_not_found');
  if (target.role === 'owner' && m.role.key !== 'owner') throw err(403, 'forbidden');
  const sets: string[] = []; const vals: unknown[] = [];
  if (c.body?.role !== undefined) {
    if (!canAssign(m, c.body.role)) throw err(400, 'role_invalid');
    if (target.role === 'owner' && c.body.role !== 'owner') {
      const owners = await c.env.DB.prepare("SELECT COUNT(*) AS n FROM memberships WHERE org_id = ? AND role = 'owner' AND status = 'active'").bind(m.org.id).first<{ n: number }>();
      if ((owners?.n ?? 0) <= 1) throw err(409, 'last_owner');
    }
    sets.push('role = ?'); vals.push(c.body.role);
  }
  if (c.body?.status !== undefined) {
    if (!['active', 'disabled'].includes(c.body.status)) throw err(400, 'status_invalid');
    if (target.user_id === c.user!.id) throw err(409, 'cannot_disable_self');
    sets.push('status = ?'); vals.push(c.body.status);
  }
  if (c.body?.department_id !== undefined) {
    if (c.body.department_id === null) { sets.push('department_id = NULL'); }
    else { const d = await c.env.DB.prepare('SELECT id FROM departments WHERE id = ? AND org_id = ?').bind(Number(c.body.department_id), m.org.id).first(); if (!d) throw err(400, 'department_invalid'); sets.push('department_id = ?'); vals.push(Number(c.body.department_id)); }
  }
  if (!sets.length) throw err(400, 'nothing_to_update');
  await c.env.DB.prepare(`UPDATE memberships SET ${sets.join(', ')} WHERE id = ? AND org_id = ?`).bind(...vals, target.id, m.org.id).run();
  await audit(c, m.org.id, 'member.updated', 'membership', target.id, c.body);
  if (c.body?.role !== undefined) await c.env.DB.prepare('INSERT INTO notifications (org_id, user_id, kind, title, body, created_at) VALUES (?, ?, ?, ?, ?, ?)').bind(m.org.id, target.user_id, 'role', `Your role in ${m.org.name} changed`, `You are now ${c.body.role}.`, now()).run();
  return json({ ok: true });
});
route('DELETE', '/api/o/:org/members/:id', async (c, p) => {
  const m = await member(c, p.org); needOrg(m, 'members.manage');
  const target = await c.env.DB.prepare('SELECT * FROM memberships WHERE id = ? AND org_id = ?').bind(Number(p.id), m.org.id).first<any>();
  if (!target) throw err(404, 'member_not_found');
  if (target.role === 'owner') throw err(409, 'remove_owner_first_transfer');
  await c.env.DB.prepare('DELETE FROM memberships WHERE id = ? AND org_id = ?').bind(target.id, m.org.id).run();
  await audit(c, m.org.id, 'member.removed', 'membership', target.id, { user_id: target.user_id });
  return json({ ok: true });
});
route('GET', '/api/o/:org/roles', async (c, p) => {
  const m = await member(c, p.org);
  return json({ system: SYSTEM_ROLES, custom: m.customRoles });
});
route('POST', '/api/o/:org/roles', async (c, p) => {
  const m = await member(c, p.org); needOrg(m, 'roles.manage');
  const v = validateRoleSpec(c.body); if (!v.ok) throw err(400, v.error);
  if (m.customRoles.length >= 30) throw err(409, 'too_many_roles');
  const key = 'c_' + slugify(v.spec.name).replace(/-/g, '_').slice(0, 24);
  if (SYSTEM_ROLE_KEYS.includes(key) || m.customRoles.some((r) => r.key === key)) throw err(409, 'role_exists');
  const t = now();
  await c.env.DB.prepare('INSERT INTO custom_roles (org_id, key, spec, created_at, updated_at) VALUES (?, ?, ?, ?, ?)').bind(m.org.id, key, JSON.stringify(v.spec), t, t).run();
  await audit(c, m.org.id, 'role.created', 'role', key, v.spec);
  return json({ key }, 201);
});
route('PUT', '/api/o/:org/roles/:key', async (c, p) => {
  const m = await member(c, p.org); needOrg(m, 'roles.manage');
  const v = validateRoleSpec(c.body); if (!v.ok) throw err(400, v.error);
  const r = await c.env.DB.prepare('UPDATE custom_roles SET spec = ?, updated_at = ? WHERE org_id = ? AND key = ?').bind(JSON.stringify(v.spec), now(), m.org.id, p.key).run();
  if (!r.meta.changes) throw err(404, 'role_not_found');
  await audit(c, m.org.id, 'role.updated', 'role', p.key, v.spec);
  return json({ ok: true });
});
route('DELETE', '/api/o/:org/roles/:key', async (c, p) => {
  const m = await member(c, p.org); needOrg(m, 'roles.manage');
  const inUse = await c.env.DB.prepare('SELECT COUNT(*) AS n FROM memberships WHERE org_id = ? AND role = ?').bind(m.org.id, p.key).first<{ n: number }>();
  if ((inUse?.n ?? 0) > 0) throw err(409, 'role_in_use', { members: inUse!.n });
  const r = await c.env.DB.prepare('DELETE FROM custom_roles WHERE org_id = ? AND key = ?').bind(m.org.id, p.key).run();
  if (!r.meta.changes) throw err(404, 'role_not_found');
  await audit(c, m.org.id, 'role.deleted', 'role', p.key);
  return json({ ok: true });
});
route('GET', '/api/o/:org/departments', async (c, p) => {
  const m = await member(c, p.org);
  return json({ departments: (await c.env.DB.prepare('SELECT d.id, d.name, (SELECT COUNT(*) FROM memberships mm WHERE mm.department_id = d.id) AS members FROM departments d WHERE d.org_id = ? ORDER BY d.name').bind(m.org.id).all()).results });
});
route('POST', '/api/o/:org/departments', async (c, p) => {
  const m = await member(c, p.org); needOrg(m, 'org.settings');
  const name = clean(c.body?.name, 60); if (!name || name.length < 2) throw err(400, 'name_invalid');
  try { await c.env.DB.prepare('INSERT INTO departments (org_id, name, created_at) VALUES (?, ?, ?)').bind(m.org.id, name, now()).run(); } catch { throw err(409, 'department_exists'); }
  await audit(c, m.org.id, 'department.created', 'department', name);
  return json({ ok: true }, 201);
});
route('DELETE', '/api/o/:org/departments/:id', async (c, p) => {
  const m = await member(c, p.org); needOrg(m, 'org.settings');
  await c.env.DB.prepare('UPDATE memberships SET department_id = NULL WHERE org_id = ? AND department_id = ?').bind(m.org.id, Number(p.id)).run();
  const r = await c.env.DB.prepare('DELETE FROM departments WHERE id = ? AND org_id = ?').bind(Number(p.id), m.org.id).run();
  if (!r.meta.changes) throw err(404, 'department_not_found');
  await audit(c, m.org.id, 'department.deleted', 'department', p.id);
  return json({ ok: true });
});

// ---- audit + notifications + support
route('GET', '/api/o/:org/audit', async (c, p) => {
  const m = await member(c, p.org); needOrg(m, 'audit.view');
  const before = intParam(c.url.searchParams.get('before'), 2 ** 52, 1, 2 ** 52);
  const action = c.url.searchParams.get('action');
  const { results } = await c.env.DB.prepare(`SELECT a.id, a.action, a.target, a.target_id, a.meta, a.ip, a.created_at, u.name, u.email FROM audit_logs a LEFT JOIN users u ON u.id = a.user_id WHERE a.org_id = ? AND a.id < ?${action ? ' AND a.action LIKE ?' : ''} ORDER BY a.id DESC LIMIT 50`).bind(...[m.org.id, before, ...(action ? [action.replace(/[^a-z._]/g, '') + '%'] : [])]).all();
  return json({ entries: results });
});
route('GET', '/api/notifications', async (c) => {
  const u = requireUser(c);
  const { results } = await c.env.DB.prepare('SELECT n.id, n.kind, n.title, n.body, n.link, n.read_at, n.created_at, o.name AS org_name FROM notifications n LEFT JOIN orgs o ON o.id = n.org_id WHERE n.user_id = ? ORDER BY n.id DESC LIMIT 50').bind(u.id).all();
  const unread = await c.env.DB.prepare('SELECT COUNT(*) AS n FROM notifications WHERE user_id = ? AND read_at IS NULL').bind(u.id).first<{ n: number }>();
  return json({ notifications: results, unread: unread?.n ?? 0 });
});
route('POST', '/api/notifications/read', async (c) => {
  const u = requireUser(c);
  const ids = Array.isArray(c.body?.ids) ? c.body.ids.map(Number).filter(Number.isInteger).slice(0, 100) : null;
  if (ids && ids.length) await c.env.DB.prepare(`UPDATE notifications SET read_at = ? WHERE user_id = ? AND id IN (${ids.map(() => '?').join(',')})`).bind(now(), u.id, ...ids).run();
  else await c.env.DB.prepare('UPDATE notifications SET read_at = ? WHERE user_id = ? AND read_at IS NULL').bind(now(), u.id).run();
  return json({ ok: true });
});
route('POST', '/api/support', async (c) => {
  const u = requireUser(c); await rateLimit(c, 'support', 5, 3600);
  const subject = clean(c.body?.subject, 120); const body = clean(c.body?.body, 4000);
  if (!subject || !body) throw err(400, 'support_invalid');
  let orgId: number | null = null;
  if (typeof c.body?.org === 'string') { try { orgId = (await member(c, c.body.org)).org.id; } catch { orgId = null; } }
  const t = now();
  const r = await c.env.DB.prepare('INSERT INTO support_tickets (org_id, user_id, subject, body, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?) RETURNING id').bind(orgId, u.id, subject, body, t, t).first<{ id: number }>();
  await audit(c, orgId, 'support.created', 'ticket', r!.id);
  return json({ id: r!.id }, 201);
});
route('GET', '/api/support', async (c) => {
  const u = requireUser(c);
  return json({ tickets: (await c.env.DB.prepare('SELECT id, subject, body, status, reply, created_at, updated_at FROM support_tickets WHERE user_id = ? ORDER BY id DESC LIMIT 50').bind(u.id).all()).results });
});

// ---- super admin
function needSuper(c: Ctx) { const u = requireUser(c); if (!u.is_super) throw err(403, 'super_admin_only'); return u; }
route('GET', '/api/admin/overview', async (c) => {
  needSuper(c);
  const q = (s: string) => c.env.DB.prepare(s).first<{ n: number }>().then((r) => r?.n ?? 0);
  const [orgs, users, members, records, activations, tickets, suspended] = await Promise.all([
    q('SELECT COUNT(*) AS n FROM orgs'), q('SELECT COUNT(*) AS n FROM users'), q("SELECT COUNT(*) AS n FROM memberships WHERE status = 'active'"),
    q('SELECT COUNT(*) AS n FROM records'), q('SELECT COUNT(*) AS n FROM org_modules WHERE enabled = 1'), q("SELECT COUNT(*) AS n FROM support_tickets WHERE status = 'open'"), q("SELECT COUNT(*) AS n FROM orgs WHERE status = 'suspended'"),
  ]);
  const topModules = (await c.env.DB.prepare('SELECT module_key, COUNT(*) AS orgs FROM org_modules WHERE enabled = 1 GROUP BY module_key ORDER BY orgs DESC LIMIT 12').all()).results;
  const signups = (await c.env.DB.prepare("SELECT strftime('%Y-%m-%d', created_at / 1000, 'unixepoch') AS day, COUNT(*) AS n FROM users WHERE created_at >= ? GROUP BY day ORDER BY day").bind(now() - 30 * 86400_000).all()).results;
  const byCategory: Record<string, number> = {};
  for (const r of topModules as any[]) { const cat = getModule(r.module_key)?.category; if (cat) byCategory[cat] = (byCategory[cat] || 0) + r.orgs; }
  return json({ orgs, users, members, records, active_activations: activations, open_tickets: tickets, suspended_orgs: suspended, active_subscriptions: 0, revenue: { total: 0, note: 'Billing is switched off: no payment provider is connected, so no plan has been sold.' }, top_modules: topModules, signups, by_category: byCategory });
});
route('GET', '/api/admin/orgs', async (c) => {
  needSuper(c);
  const q = '%' + (c.url.searchParams.get('q') || '').toLowerCase().slice(0, 60) + '%';
  return json({ orgs: (await c.env.DB.prepare(`SELECT o.id, o.slug, o.name, o.industry, o.status, o.plan, o.created_at, (SELECT COUNT(*) FROM memberships m WHERE m.org_id = o.id) AS members, (SELECT COUNT(*) FROM org_modules om WHERE om.org_id = o.id AND om.enabled = 1) AS modules, (SELECT COUNT(*) FROM records r WHERE r.org_id = o.id) AS records FROM orgs o WHERE lower(o.name) LIKE ? OR o.slug LIKE ? ORDER BY o.id DESC LIMIT 100`).bind(q, q).all()).results });
});
route('PATCH', '/api/admin/orgs/:id', async (c, p) => {
  needSuper(c);
  if (!['active', 'suspended'].includes(c.body?.status)) throw err(400, 'status_invalid');
  const r = await c.env.DB.prepare('UPDATE orgs SET status = ? WHERE id = ?').bind(c.body.status, Number(p.id)).run();
  if (!r.meta.changes) throw err(404, 'org_not_found');
  await audit(c, Number(p.id), 'admin.org_status', 'org', p.id, { status: c.body.status });
  return json({ ok: true });
});
route('GET', '/api/admin/users', async (c) => {
  needSuper(c);
  const q = '%' + (c.url.searchParams.get('q') || '').toLowerCase().slice(0, 60) + '%';
  return json({ users: (await c.env.DB.prepare(`SELECT u.id, u.email, u.name, u.status, u.is_super, u.created_at, u.last_seen, (SELECT COUNT(*) FROM memberships m WHERE m.user_id = u.id) AS orgs FROM users u WHERE lower(COALESCE(u.email,'')) LIKE ? OR lower(u.name) LIKE ? ORDER BY u.id DESC LIMIT 100`).bind(q, q).all()).results });
});
route('PATCH', '/api/admin/users/:id', async (c, p) => {
  const me = needSuper(c);
  if (!['active', 'suspended'].includes(c.body?.status)) throw err(400, 'status_invalid');
  if (Number(p.id) === me.id) throw err(409, 'cannot_suspend_self');
  const r = await c.env.DB.prepare('UPDATE users SET status = ? WHERE id = ?').bind(c.body.status, Number(p.id)).run();
  if (!r.meta.changes) throw err(404, 'user_not_found');
  await audit(c, null, 'admin.user_status', 'user', p.id, { status: c.body.status });
  return json({ ok: true });
});
route('GET', '/api/admin/audit', async (c) => {
  needSuper(c);
  return json({ entries: (await c.env.DB.prepare('SELECT a.id, a.org_id, o.name AS org_name, a.action, a.target, a.target_id, a.ip, a.created_at, u.email FROM audit_logs a LEFT JOIN users u ON u.id = a.user_id LEFT JOIN orgs o ON o.id = a.org_id ORDER BY a.id DESC LIMIT 100').all()).results });
});
route('GET', '/api/admin/flags', async (c) => { needSuper(c); return json({ flags: (await c.env.DB.prepare('SELECT * FROM feature_flags ORDER BY key').all()).results }); });
route('PUT', '/api/admin/flags/:key', async (c, p) => {
  needSuper(c);
  if (p.key === 'billing' && c.body?.enabled) throw err(409, 'billing_needs_payment_provider');
  const r = await c.env.DB.prepare('UPDATE feature_flags SET enabled = ?, updated_at = ? WHERE key = ?').bind(c.body?.enabled ? 1 : 0, now(), p.key).run();
  if (!r.meta.changes) throw err(404, 'flag_not_found');
  await audit(c, null, 'admin.flag', 'flag', p.key, { enabled: !!c.body?.enabled });
  return json({ ok: true });
});
route('GET', '/api/admin/tickets', async (c) => {
  needSuper(c);
  return json({ tickets: (await c.env.DB.prepare('SELECT t.*, u.email, o.name AS org_name FROM support_tickets t LEFT JOIN users u ON u.id = t.user_id LEFT JOIN orgs o ON o.id = t.org_id ORDER BY t.id DESC LIMIT 100').all()).results });
});
route('PATCH', '/api/admin/tickets/:id', async (c, p) => {
  needSuper(c);
  const status = c.body?.status; if (!['open', 'answered', 'closed'].includes(status)) throw err(400, 'status_invalid');
  const reply = c.body?.reply == null ? null : clean(c.body.reply, 4000, false);
  const t = await c.env.DB.prepare('UPDATE support_tickets SET status = ?, reply = COALESCE(?, reply), updated_at = ? WHERE id = ? RETURNING user_id, subject').bind(status, reply, now(), Number(p.id)).first<any>();
  if (!t) throw err(404, 'ticket_not_found');
  if (reply) await c.env.DB.prepare('INSERT INTO notifications (user_id, kind, title, body, created_at) VALUES (?, ?, ?, ?, ?)').bind(t.user_id, 'support', `Reply: ${t.subject}`, reply.slice(0, 500), now()).run();
  await audit(c, null, 'admin.ticket', 'ticket', p.id, { status });
  return json({ ok: true });
});
route('GET', '/api/admin/health', async (c) => {
  needSuper(c);
  const t0 = Date.now(); await c.env.DB.prepare('SELECT 1').first(); const ping = Date.now() - t0;
  const tables = ['users', 'orgs', 'memberships', 'invites', 'custom_roles', 'departments', 'org_modules', 'records', 'audit_logs', 'notifications', 'support_tickets', 'rate_limits'];
  const counts: Record<string, number> = {};
  for (const tb of tables) counts[tb] = (await c.env.DB.prepare(`SELECT COUNT(*) AS n FROM ${tb}`).first<{ n: number }>())?.n ?? 0;
  const ver = await c.env.DB.prepare("SELECT value FROM meta WHERE key = 'schema_version'").first<{ value: string }>();
  const lastErrors = (await c.env.DB.prepare("SELECT action, created_at, meta FROM audit_logs WHERE action LIKE 'auth.%' ORDER BY id DESC LIMIT 10").all()).results;
  return json({ db_ping_ms: ping, schema_version: ver?.value, tables: counts, auth_issuer: issuer(c.env) || null, modules_registered: MODULES.length, categories: CATEGORIES.length, auth_failures: lastErrors });
});

// ------------------------------------------------------------------ entry
export async function handleApi(req: Request, env: Env): Promise<Response> {
  const url = new URL(req.url);
  const c: Ctx = { req, env, url, ip: req.headers.get('CF-Connecting-IP') || '0.0.0.0', user: null, claims: null, body: null };
  try {
    await ensureSchema(env.DB);
    if (!['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
      const origin = req.headers.get('Origin');
      if (origin && origin !== url.origin && !ALLOWED_ORIGINS.includes(origin)) throw err(403, 'origin_rejected');
      const ct = req.headers.get('Content-Type') || '';
      if (req.headers.get('Content-Length') !== '0' && req.body && !ct.startsWith('application/json')) throw err(415, 'json_required');
      const text = await req.text();
      if (text.length > 2_500_000) throw err(413, 'body_too_large');
      if (text) { try { c.body = JSON.parse(text); } catch { throw err(400, 'json_invalid'); } }
    }
    await rateLimit(c, 'api', 300);
    try { await authenticate(c); } catch (e) {
      if (e instanceof HttpError && e.status === 401) await env.DB.prepare('INSERT INTO audit_logs (action, meta, ip, created_at) VALUES (?, ?, ?, ?)').bind('auth.rejected', JSON.stringify({ code: e.code, path: url.pathname }), c.ip, now()).run();
      throw e;
    }
    for (const [method, re, names, h] of routes) {
      if (method !== req.method) continue;
      const mm = re.exec(url.pathname); if (!mm) continue;
      const params: Record<string, string> = {}; names.forEach((n, i) => (params[n] = decodeURIComponent(mm[i + 1])));
      return await h(c, params);
    }
    throw err(404, 'not_found');
  } catch (e) {
    if (e instanceof HttpError) return json({ error: e.code, detail: e.detail ?? null }, e.status, e.status === 429 ? { 'Retry-After': String(e.detail?.retry_after ?? 60) } : {});
    console.error('api_error', (e as Error)?.stack || e);
    return json({ error: 'server_error' }, 500);
  }
}

export default {
  async fetch(req: Request, env: Env): Promise<Response> {
    const url = new URL(req.url);
    if (url.pathname.startsWith('/api/')) return handleApi(req, env);
    if (!env.ASSETS) return new Response('Not found', { status: 404 });
    // index.html is shipped as /app-shell.html so no HTML route is served straight from assets:
    // every page passes through here and gets the CSP + security headers below.
    const isPage = !/\.[a-z0-9]{2,5}$/i.test(url.pathname);
    let res = isPage && req.method === 'GET' ? await env.ASSETS.fetch(new Request(new URL('/app-shell.html', url).toString(), req)) : await env.ASSETS.fetch(req);
    const out = new Response(res.body, res);
    for (const [k, v] of Object.entries(SEC_HEADERS)) out.headers.set(k, v);
    if ((out.headers.get('content-type') || '').includes('text/html')) out.headers.set('Content-Security-Policy', CSP);
    if (/^\/assets\//.test(url.pathname)) out.headers.set('Cache-Control', 'public, max-age=31536000, immutable');
    return out;
  },
};
