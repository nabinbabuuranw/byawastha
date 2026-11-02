import { describe, test, expect, beforeAll } from 'vitest';
import { handleApi, resetSchemaCache, validateField } from '../src/worker.ts';
import { verifyJwt, issuerFromPublishableKey } from '../src/jwt.ts';
import { toCsv, parseCsv } from '../src/csv.ts';
import { MODULES, CATEGORIES } from '../../shared/registry.ts';
import { SYSTEM_ROLES, canModule, roleSpec } from '../../shared/rbac.ts';
import { D1Shim } from './d1shim.ts';

const ORIGIN = 'https://byawastha.sites.tab.bot';
const ISS = 'https://test-instance.clerk.accounts.dev';
let env: any; let priv: CryptoKey; let jwk: any; let ip = 0;
const b64u = (b: ArrayBuffer | Uint8Array) => Buffer.from(b instanceof Uint8Array ? b : new Uint8Array(b)).toString('base64url');
async function sign(claims: Record<string, unknown>, key = priv, kid = 'k1', alg = 'RS256') {
  const h = b64u(new TextEncoder().encode(JSON.stringify({ alg, kid, typ: 'JWT' })));
  const p = b64u(new TextEncoder().encode(JSON.stringify(claims)));
  const sig = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', key, new TextEncoder().encode(h + '.' + p));
  return `${h}.${p}.${b64u(sig)}`;
}
const t0 = () => Math.floor(Date.now() / 1000);
const tok = (sub: string, email: string, extra: Record<string, unknown> = {}) => sign({ sub, iss: ISS, exp: t0() + 60, iat: t0(), nbf: t0() - 1, azp: ORIGIN, email, name: email.split('@')[0], email_verified: true, ...extra });
async function call(method: string, path: string, o: { token?: string; body?: any; raw?: string } = {}) {
  const h: Record<string, string> = { 'CF-Connecting-IP': `10.0.${Math.floor(++ip / 250)}.${ip % 250}` };
  if (o.token) h.Authorization = 'Bearer ' + o.token;
  if (method !== 'GET') { h.Origin = ORIGIN; h['Content-Type'] = 'application/json'; }
  const res = await handleApi(new Request(ORIGIN + path, { method, headers: h, body: o.raw ?? (o.body !== undefined ? JSON.stringify(o.body) : undefined) }), env);
  const text = await res.text(); let json: any = null; try { json = JSON.parse(text); } catch { json = text; }
  return { status: res.status, json, text, headers: res.headers };
}
let A: string, B: string, STAFF: string, STUDENT: string, SUPER: string, OUT: string;
let slugA = '', slugB = '';

beforeAll(async () => {
  const kp = (await crypto.subtle.generateKey({ name: 'RSASSA-PKCS1-v1_5', modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: 'SHA-256' }, true, ['sign', 'verify'])) as CryptoKeyPair;
  priv = kp.privateKey; jwk = { ...(await crypto.subtle.exportKey('jwk', kp.publicKey)), kid: 'k1', alg: 'RS256', use: 'sig' };
  resetSchemaCache();
  env = { DB: new D1Shim(), TEST_ISSUER: ISS, TEST_JWKS: [jwk] };
  A = await tok('user_alice1', 'alice@acme.test'); B = await tok('user_bob1', 'bob@beta.test');
  STAFF = await tok('user_sam1', 'sam@acme.test'); STUDENT = await tok('user_stu1', 'stu@acme.test');
  SUPER = await tok('user_nabin1', 'nexamusic.np@gmail.com'); OUT = await tok('user_out1', 'out@else.test');
});

describe('registry + rbac', () => {
  test('231 modules in 17 categories, each with 1-4 domain entities', () => {
    expect(MODULES.length).toBe(231); expect(CATEGORIES.length).toBe(17);
    for (const m of MODULES) { expect(m.entities.length).toBeGreaterThanOrEqual(1); expect(m.entities.length).toBeLessThanOrEqual(4); }
    expect(new Set(MODULES.map((m) => m.key)).size).toBe(231);
  });
  test('system roles exist and behave', () => {
    expect(SYSTEM_ROLES.map((r) => r.key)).toEqual(expect.arrayContaining(['owner', 'admin', 'manager', 'staff', 'accountant', 'hr', 'dept_head', 'customer', 'student', 'teacher', 'patient', 'vendor']));
    expect(canModule(roleSpec('accountant')!, 'invoice', 'delete')).toBe(true);
    expect(canModule(roleSpec('accountant')!, 'crm', 'edit')).toBe(false);
    expect(canModule(roleSpec('hr')!, 'payroll', 'delete')).toBe(true);
    expect(canModule(roleSpec('staff')!, 'crm', 'delete')).toBe(false);
    expect(canModule(roleSpec('owner')!, 'crm', 'delete', { owner: [] })).toBe(true); // owner can't be locked out
  });
  test('field validation', () => {
    expect(validateField({ key: 'd', label: 'D', type: 'date', required: true }, '2026-02-30')[1]).toBe('date_invalid');
    expect(validateField({ key: 's', label: 'S', type: 'sel', required: false, options: ['Open', 'Closed'] }, 'open')[0]).toBe('Open');
    expect(validateField({ key: 'm', label: 'M', type: 'money', required: false }, '1,250.555')[0]).toBe(1250.56);
    expect(validateField({ key: 'u', label: 'U', type: 'url', required: false }, 'javascript:alert(1)')[1]).toBe('url_invalid');
    expect(validateField({ key: 'e', label: 'E', type: 'email', required: true }, '')[1]).toBe('required');
  });
  test('csv round trip + formula guard', () => {
    const csv = toCsv([['a', 'b'], ['x,1', 'he said "hi"\nok'], ['=SUM(A1)', '']]);
    const back = parseCsv(csv);
    expect(back[1]).toEqual(['x,1', 'he said "hi"\nok']); expect(back[2][0]).toBe('=SUM(A1)'); expect(csv).toContain("'=SUM");
  });
  test('issuer from publishable key', () => { expect(issuerFromPublishableKey('pk_test_Y3V0ZS1maWxseS05MDk4LmNsZXJrLmFjY291bnRzLmRldiQ')).toBe('https://cute-filly-9098.clerk.accounts.dev'); });
});

describe('auth middleware (Clerk JWT)', () => {
  test('health is public', async () => { const r = await call('GET', '/api/health'); expect(r.status).toBe(200); expect(r.json.modules).toBe(231); expect(r.headers.get('x-content-type-options')).toBe('nosniff'); });
  test('protected route without token is 401', async () => { expect((await call('GET', '/api/me')).status).toBe(401); });
  test('expired, wrong issuer, wrong azp, bad signature, wrong alg are rejected', async () => {
    expect((await call('GET', '/api/me', { token: await sign({ sub: 'user_x1', iss: ISS, exp: t0() - 120 }) })).json.error).toBe('token_expired');
    expect((await call('GET', '/api/me', { token: await sign({ sub: 'user_x1', iss: 'https://evil.example', exp: t0() + 60 }) })).json.error).toBe('token_issuer');
    expect((await call('GET', '/api/me', { token: await sign({ sub: 'user_x1', iss: ISS, exp: t0() + 60, azp: 'https://evil.example' }) })).json.error).toBe('token_azp');
    const other = (await crypto.subtle.generateKey({ name: 'RSASSA-PKCS1-v1_5', modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: 'SHA-256' }, true, ['sign', 'verify'])) as CryptoKeyPair;
    expect((await call('GET', '/api/me', { token: await sign({ sub: 'user_x1', iss: ISS, exp: t0() + 60 }, other.privateKey) })).json.error).toBe('token_signature');
    expect((await call('GET', '/api/me', { token: await sign({ sub: 'user_x1', iss: ISS, exp: t0() + 60 }, priv, 'k1', 'HS256') })).json.error).toBe('token_alg');
    expect((await call('GET', '/api/me', { token: 'abc.def.ghi' })).status).toBe(401);
  });
  test('valid token maps Clerk user id to a DB user (no password stored)', async () => {
    const r = await call('GET', '/api/me', { token: A }); expect(r.status).toBe(200);
    expect(r.json.user.email).toBe('alice@acme.test'); expect(r.json.orgs).toEqual([]); expect(r.json.user.is_super).toBe(false);
    const cols = (env.DB.db.prepare("SELECT name FROM pragma_table_info('users')").all() as any[]).map((x) => x.name);
    expect(cols.some((c: string) => /pass/i.test(c))).toBe(false);
  });
  test('jwt verifier: not-before', async () => {
    await expect(verifyJwt(await sign({ sub: 'user_a1', iss: ISS, exp: t0() + 600, nbf: t0() + 300 }), { issuer: ISS, keys: [jwk] })).rejects.toThrow('token_not_yet_valid');
  });
  test('cross-origin writes are refused', async () => {
    const res = await handleApi(new Request(ORIGIN + '/api/orgs', { method: 'POST', headers: { Authorization: 'Bearer ' + A, Origin: 'https://evil.example', 'Content-Type': 'application/json' }, body: '{"name":"X"}' }), env);
    expect(res.status).toBe(403);
  });
});

describe('orgs, modules, records', () => {
  test('create orgs (tenant A and tenant B) with starter modules', async () => {
    const a = await call('POST', '/api/orgs', { token: A, body: { name: 'Acme Traders', industry: 'biz' } }); expect(a.status).toBe(201); slugA = a.json.slug;
    const b = await call('POST', '/api/orgs', { token: B, body: { name: 'Beta Clinic', industry: 'health', modules: ['patient', 'crm'] } }); expect(b.status).toBe(201); slugB = b.json.slug;
    const o = await call('GET', `/api/o/${slugA}`, { token: A }); expect(o.json.role.key).toBe('owner'); expect(o.json.modules).toEqual(expect.arrayContaining(['crm', 'task', 'employee', 'inventory']));
  });
  let leadId = 0; let dealId = 0;
  test('CRUD with validation, search, filter, sort, pagination', async () => {
    const bad = await call('POST', `/api/o/${slugA}/m/crm/e/lead`, { token: A, body: { data: { email: 'nope' } } });
    expect(bad.status).toBe(400); expect(bad.json.detail).toMatchObject({ name: 'required', email: 'email_invalid' });
    for (const [n, s] of [['Ram Shrestha', 'New'], ['Sita Karki', 'Qualified'], ['Hari Thapa', 'New'], ['Gita Rai', 'Lost']]) {
      const r = await call('POST', `/api/o/${slugA}/m/crm/e/lead`, { token: A, body: { data: { name: n, company: 'Co ' + n, status: s, source: 'Referral' } } });
      expect(r.status).toBe(201); leadId = r.json.id;
    }
    const all = await call('GET', `/api/o/${slugA}/m/crm/e/lead?page_size=2&page=2&sort=name&dir=asc`, { token: A });
    expect(all.json.total).toBe(4); expect(all.json.rows.map((r: any) => r.title)).toEqual(['Ram Shrestha', 'Sita Karki']);
    expect((await call('GET', `/api/o/${slugA}/m/crm/e/lead?status=New`, { token: A })).json.total).toBe(2);
    expect((await call('GET', `/api/o/${slugA}/m/crm/e/lead?q=karki`, { token: A })).json.total).toBe(1);
    expect((await call('GET', `/api/o/${slugA}/m/crm/e/lead?f.source=Referral`, { token: A })).json.total).toBe(4);
    expect((await call('GET', `/api/o/${slugA}/m/crm/e/lead?sort=drop table`, { token: A })).status).toBe(400);
    const up = await call('PATCH', `/api/o/${slugA}/m/crm/e/lead/${leadId}`, { token: A, body: { data: { status: 'Contacted' } } });
    expect(up.status).toBe(200); expect(up.json.status).toBe('Contacted'); expect(up.json.title).toBe('Gita Rai');
    const d = await call('POST', `/api/o/${slugA}/m/crm/e/deal`, { token: A, body: { data: { title: 'Big order', value: '150000', stage: 'Proposal' } } }); expect(d.status).toBe(201); dealId = d.json.id;
    const st = await call('GET', `/api/o/${slugA}/m/crm/stats`, { token: A });
    expect(st.json.entities.find((e: any) => e.entity === 'deal').money_sum).toBe(150000);
    expect(st.json.entities.find((e: any) => e.entity === 'lead').total).toBe(4);
  });
  test('module that is not active is refused; activate/deactivate works', async () => {
    expect((await call('GET', `/api/o/${slugA}/m/hotel/e/guest`, { token: A })).status).toBe(404);
    expect((await call('POST', `/api/o/${slugA}/modules/hotel/activate`, { token: A })).status).toBe(200);
    expect((await call('GET', `/api/o/${slugA}/m/hotel/e/guest`, { token: A })).status).toBe(200);
    expect((await call('POST', `/api/o/${slugA}/modules/hotel/deactivate`, { token: A })).status).toBe(200);
    expect((await call('GET', `/api/o/${slugA}/m/hotel/e/guest`, { token: A })).status).toBe(404);
  });
  test('references must point inside the same org', async () => {
    await call('POST', `/api/o/${slugA}/modules/library/activate`, { token: A });
    const book = await call('POST', `/api/o/${slugA}/m/library/e/book`, { token: A, body: { data: { title: 'Muna Madan', copies: 3 } } });
    const mem = await call('POST', `/api/o/${slugA}/m/library/e/member`, { token: A, body: { data: { name: 'Asha' } } });
    const loan = await call('POST', `/api/o/${slugA}/m/library/e/loan`, { token: A, body: { data: { book: book.json.id, member: mem.json.id, status: 'Issued' } } });
    expect(loan.status).toBe(201);
    const list = await call('GET', `/api/o/${slugA}/m/library/e/loan`, { token: A }); expect(list.json.refs[book.json.id]).toBe('Muna Madan');
    const bad = await call('POST', `/api/o/${slugA}/m/library/e/loan`, { token: A, body: { data: { book: 999999, member: mem.json.id } } });
    expect(bad.status).toBe(400);
  });
  test('TENANT ISOLATION: org B cannot see or touch org A', async () => {
    expect((await call('GET', `/api/o/${slugA}`, { token: B })).status).toBe(404);
    expect((await call('GET', `/api/o/${slugA}/m/crm/e/lead`, { token: B })).status).toBe(404);
    expect((await call('GET', `/api/o/${slugA}/dashboard`, { token: B })).status).toBe(404);
    // B guesses A's record id through B's own org: not found, because every query is scoped to B's org_id
    expect((await call('GET', `/api/o/${slugB}/m/crm/e/lead/${leadId}`, { token: B })).status).toBe(404);
    expect((await call('PATCH', `/api/o/${slugB}/m/crm/e/lead/${leadId}`, { token: B, body: { data: { name: 'pwned' } } })).status).toBe(404);
    expect((await call('DELETE', `/api/o/${slugB}/m/crm/e/deal/${dealId}`, { token: B })).status).toBe(404);
    const bl = await call('POST', `/api/o/${slugB}/m/crm/e/lead/bulk-delete`, { token: B, body: { ids: [leadId] } }); expect(bl.json.deleted).toBe(0);
    // B lists its own CRM: empty, A's rows don't leak
    expect((await call('GET', `/api/o/${slugB}/m/crm/e/lead`, { token: B })).json.total).toBe(0);
    expect((await call('GET', `/api/o/${slugB}/search?q=shrestha`, { token: B })).json.records).toEqual([]);
    // A's record still intact
    expect((await call('GET', `/api/o/${slugA}/m/crm/e/lead/${leadId}`, { token: A })).json.title).toBe('Gita Rai');
    // A stranger with no membership sees nothing
    expect((await call('GET', `/api/o/${slugB}/m/patient/e/patient`, { token: OUT })).status).toBe(404);
  });
  test('CSV export and import with row errors', async () => {
    const ex = await call('GET', `/api/o/${slugA}/m/crm/e/lead/export.csv`, { token: A });
    expect(ex.status).toBe(200); expect(ex.headers.get('content-type')).toContain('text/csv'); expect(ex.text).toContain('Sita Karki');
    const csv = 'name,email,status\nPrem Gurung,prem@x.np,New\n,bad,New\nBina Lama,bina@x.np,Weird\nKiran,kiran@x.np,Qualified\n';
    const im = await call('POST', `/api/o/${slugA}/m/crm/e/lead/import`, { token: A, body: { csv } });
    expect(im.json.inserted).toBe(2); expect(im.json.rejected).toBe(2); expect(im.json.errors[0].row).toBe(3);
    expect((await call('GET', `/api/o/${slugA}/m/crm/e/lead`, { token: A })).json.total).toBe(6);
  });
});

describe('RBAC: members, roles, own-only portal roles', () => {
  let staffMember = 0;
  test('invite + accept with verified email', async () => {
    expect((await call('POST', `/api/o/${slugA}/invites`, { token: A, body: { email: 'sam@acme.test', role: 'staff' } })).status).toBe(201);
    expect((await call('POST', `/api/o/${slugA}/invites`, { token: A, body: { email: 'stu@acme.test', role: 'student' } })).status).toBe(201);
    const me = await call('GET', '/api/me', { token: STAFF }); expect(me.json.invites.length).toBe(1);
    expect((await call('POST', `/api/invites/${me.json.invites[0].id}/accept`, { token: STAFF })).json.slug).toBe(slugA);
    const me2 = await call('GET', '/api/me', { token: STUDENT });
    expect((await call('POST', `/api/invites/${me2.json.invites[0].id}/accept`, { token: STUDENT })).status).toBe(200);
    // someone else can't accept Sam's invite
    expect((await call('POST', `/api/invites/${me.json.invites[0].id}/accept`, { token: B })).status).toBe(404);
    const unverified = await tok('user_unv1', 'sam@acme.test', { email_verified: false });
    expect((await call('POST', `/api/invites/1/accept`, { token: unverified })).json.error).toBe('email_not_verified');
    const ms = await call('GET', `/api/o/${slugA}/members`, { token: A }); staffMember = ms.json.members.find((x: any) => x.email === 'sam@acme.test').id;
  });
  test('staff can create/edit but not delete, export or manage members', async () => {
    const r = await call('POST', `/api/o/${slugA}/m/task/e/task`, { token: STAFF, body: { data: { title: 'Call supplier', status: 'To do' } } }); expect(r.status).toBe(201);
    expect((await call('DELETE', `/api/o/${slugA}/m/task/e/task/${r.json.id}`, { token: STAFF })).status).toBe(403);
    expect((await call('GET', `/api/o/${slugA}/m/task/e/task/export.csv`, { token: STAFF })).status).toBe(403);
    expect((await call('GET', `/api/o/${slugA}/members`, { token: STAFF })).status).toBe(403);
    expect((await call('POST', `/api/o/${slugA}/modules/hotel/activate`, { token: STAFF })).status).toBe(403);
    expect((await call('GET', `/api/o/${slugA}/audit`, { token: STAFF })).status).toBe(403);
    expect((await call('DELETE', `/api/o/${slugA}/m/task/e/task/${r.json.id}`, { token: A })).status).toBe(200);
  });
  test('per-module permission override by the admin', async () => {
    expect((await call('PUT', `/api/o/${slugA}/modules/task/settings`, { token: A, body: { config: { page_size: 50 }, perms: { staff: ['view', 'create', 'edit', 'delete'], owner: [] } } })).status).toBe(200);
    const r = await call('POST', `/api/o/${slugA}/m/task/e/task`, { token: STAFF, body: { data: { title: 'Temp' } } });
    expect((await call('DELETE', `/api/o/${slugA}/m/task/e/task/${r.json.id}`, { token: STAFF })).status).toBe(200);
  });
  test('custom role: create, assign, enforce, refuse delete while in use', async () => {
    const c = await call('POST', `/api/o/${slugA}/roles`, { token: A, body: { name: 'Store Keeper', org: [], modules: { default: ['view'], categories: { biz: ['view', 'create', 'edit', 'delete'] } } } });
    expect(c.status).toBe(201); expect(c.json.key).toBe('c_store_keeper');
    expect((await call('PATCH', `/api/o/${slugA}/members/${staffMember}`, { token: A, body: { role: 'c_store_keeper' } })).status).toBe(200);
    const it = await call('POST', `/api/o/${slugA}/m/inventory/e/item`, { token: STAFF, body: { data: { sku: 'RICE-25', name: 'Rice 25kg', qty: 40 } } });
    expect(it.status).toBe(201);
    expect((await call('DELETE', `/api/o/${slugA}/m/inventory/e/item/${it.json.id}`, { token: STAFF })).status).toBe(200);
    expect((await call('DELETE', `/api/o/${slugA}/roles/c_store_keeper`, { token: A })).json.error).toBe('role_in_use');
    expect((await call('POST', `/api/o/${slugA}/roles`, { token: STAFF, body: { name: 'Sneaky', org: ['members.manage'] } })).status).toBe(403);
  });
  test('student (portal role) sees only own records in Education, nothing elsewhere', async () => {
    await call('POST', `/api/o/${slugA}/modules/admission/activate`, { token: A });
    await call('POST', `/api/o/${slugA}/m/admission/e/application`, { token: A, body: { data: { applicant: 'Owner-made', status: 'Applied' } } });
    const mine = await call('POST', `/api/o/${slugA}/m/admission/e/application`, { token: STUDENT, body: { data: { applicant: 'Stu Self', status: 'Applied' } } });
    expect(mine.status).toBe(201);
    const list = await call('GET', `/api/o/${slugA}/m/admission/e/application`, { token: STUDENT });
    expect(list.json.total).toBe(1); expect(list.json.rows[0].title).toBe('Stu Self');
    expect((await call('GET', `/api/o/${slugA}/m/crm/e/lead`, { token: STUDENT })).status).toBe(403);
    expect((await call('GET', `/api/o/${slugA}/m/admission/e/application`, { token: A })).json.total).toBe(2);
  });
  test('last owner cannot be demoted; owner cannot be removed', async () => {
    const ms = await call('GET', `/api/o/${slugA}/members`, { token: A }); const own = ms.json.members.find((x: any) => x.role === 'owner').id;
    expect((await call('PATCH', `/api/o/${slugA}/members/${own}`, { token: A, body: { role: 'admin' } })).json.error).toBe('last_owner');
    expect((await call('DELETE', `/api/o/${slugA}/members/${own}`, { token: A })).status).toBe(409);
  });
});

describe('audit, notifications, super admin', () => {
  test('every write is audited', async () => {
    for (const x of ['org.created', 'record.created', 'record.updated', 'record.deleted', 'record.imported', 'record.exported', 'module.activated', 'role.created', 'member.joined', 'invite.created']) {
      const a = await call('GET', `/api/o/${slugA}/audit?action=${x}`, { token: A });
      expect(a.json.entries.length, x).toBeGreaterThan(0); expect(a.json.entries[0].action).toBe(x);
    }
  });
  test('admins are notified', async () => {
    const n = await call('GET', '/api/notifications', { token: A }); expect(n.json.unread).toBeGreaterThan(0);
    await call('POST', '/api/notifications/read', { token: A, body: {} });
    expect((await call('GET', '/api/notifications', { token: A })).json.unread).toBe(0);
  });
  test('super admin panel is only for the verified super admin email', async () => {
    expect((await call('GET', '/api/admin/overview', { token: A })).status).toBe(403);
    const fake = await tok('user_fake1', 'nexamusic.np@gmail.com', { email_verified: false });
    expect((await call('GET', '/api/admin/overview', { token: fake })).status).toBe(403);
    const o = await call('GET', '/api/admin/overview', { token: SUPER });
    expect(o.status).toBe(200); expect(o.json.orgs).toBe(2); expect(o.json.revenue.total).toBe(0);
    expect((await call('PUT', '/api/admin/flags/billing', { token: SUPER, body: { enabled: true } })).status).toBe(409);
    const orgs = await call('GET', '/api/admin/orgs', { token: SUPER }); const b = orgs.json.orgs.find((x: any) => x.slug === slugB);
    expect((await call('PATCH', `/api/admin/orgs/${b.id}`, { token: SUPER, body: { status: 'suspended' } })).status).toBe(200);
    expect((await call('GET', `/api/o/${slugB}`, { token: B })).json.error).toBe('org_suspended');
    expect((await call('GET', '/api/admin/health', { token: SUPER })).json.modules_registered).toBe(231);
  });
  test('support ticket round trip', async () => {
    const t = await call('POST', '/api/support', { token: A, body: { subject: 'Help', body: 'How do I import?', org: slugA } }); expect(t.status).toBe(201);
    expect((await call('PATCH', `/api/admin/tickets/${t.json.id}`, { token: SUPER, body: { status: 'answered', reply: 'Use Import in the module.' } })).status).toBe(200);
    expect((await call('GET', '/api/support', { token: A })).json.tickets[0].reply).toContain('Import');
  });
  test('rejects non-JSON bodies and oversize garbage', async () => {
    const r = await handleApi(new Request(ORIGIN + '/api/orgs', { method: 'POST', headers: { Authorization: 'Bearer ' + A, Origin: ORIGIN, 'Content-Type': 'text/plain' }, body: 'name=x' }), env);
    expect(r.status).toBe(415);
    expect((await call('POST', '/api/orgs', { token: A, raw: '{bad json' })).status).toBe(400);
  });
});
