import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, AreaChart, Area } from 'recharts';
import { ShieldStar } from '@phosphor-icons/react';
import { getModule, getCategory, MODULES } from '../../shared/registry';
import { useApi, useGet, errText } from '../lib/api';
import { PageHead, Tabs, Empty, ErrorBox, Skeleton, SkeletonRows, Switch } from '../components/ui';
import { useUI } from '../lib/store';
import { ago, dateStr, num } from '../lib/format';
import { fillDays, tooltipStyle } from './Dashboard';

function Overview() {
  const o = useGet<any>(['adm-ov'], '/api/admin/overview');
  if (o.isLoading) return <div className="grid gap-3 sm:grid-cols-4">{Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-24" />)}</div>;
  if (o.error) return <ErrorBox error={errText(o.error)} retry={() => o.refetch()} />;
  const d = o.data; const k = [['Organisations', d.orgs], ['Users', d.users], ['Active memberships', d.members], ['Records', d.records], ['Module activations', d.active_activations], ['Active subscriptions', d.active_subscriptions], ['Open tickets', d.open_tickets], ['Suspended orgs', d.suspended_orgs]];
  return <div className="space-y-3">
    <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">{k.map(([l, v]) => <div key={l} className="panel p-4"><p className="eyebrow">{l}</p><p className="mt-1 font-display text-3xl font-semibold tabular">{num(v)}</p></div>)}</div>
    <div className="panel p-4 text-sm"><p className="eyebrow">Revenue</p><p className="mt-1 font-display text-3xl font-semibold">Rs 0</p><p className="text-muted">{d.revenue.note}</p></div>
    <div className="grid gap-3 lg:grid-cols-2">
      <section className="panel p-4"><h3 className="font-display text-lg font-semibold">Sign-ups, last 30 days</h3><div className="mt-2 h-52"><ResponsiveContainer width="100%" height="100%"><AreaChart data={fillDays(d.signups, 30)} margin={{ left: -20 }}><XAxis dataKey="day" tick={{ fontSize: 10, fill: 'rgb(var(--muted))' }} tickLine={false} axisLine={false} interval={4} /><YAxis allowDecimals={false} tick={{ fontSize: 11, fill: 'rgb(var(--muted))' }} tickLine={false} axisLine={false} /><Tooltip contentStyle={tooltipStyle} /><Area dataKey="n" name="Users" stroke="rgb(var(--brand))" fill="rgb(var(--brand) / .2)" /></AreaChart></ResponsiveContainer></div></section>
      <section className="panel p-4"><h3 className="font-display text-lg font-semibold">Most activated modules</h3>{d.top_modules.length === 0 ? <p className="mt-3 text-sm text-muted">No activations yet.</p> :
        <div className="mt-2 h-52"><ResponsiveContainer width="100%" height="100%"><BarChart layout="vertical" data={d.top_modules.map((m: any) => ({ name: (getModule(m.module_key)?.name || m.module_key).replace(/ Management$/, ''), n: m.orgs }))} margin={{ left: 8 }}><XAxis type="number" hide allowDecimals={false} /><YAxis type="category" dataKey="name" width={110} tick={{ fontSize: 11, fill: 'rgb(var(--ink-2))' }} tickLine={false} axisLine={false} /><Tooltip contentStyle={tooltipStyle} /><Bar dataKey="n" name="Orgs" fill="rgb(var(--primary))" radius={[0, 4, 4, 0]} /></BarChart></ResponsiveContainer></div>}</section>
    </div>
  </div>;
}
function Orgs() {
  const [q, setQ] = useState(''); const o = useGet<any>(['adm-orgs', q], `/api/admin/orgs?q=${encodeURIComponent(q)}`); const api = useApi(); const qc = useQueryClient(); const toast = useUI((s) => s.toast);
  async function set(id: number, status: string) { try { await api(`/api/admin/orgs/${id}`, { method: 'PATCH', body: { status } }); qc.invalidateQueries({ queryKey: ['adm-orgs'] }); toast(`Organisation ${status}`); } catch (x) { toast(errText(x), 'err'); } }
  return <section className="panel overflow-hidden"><div className="p-3"><input className="input max-w-sm" placeholder="Search organisations" aria-label="Search organisations" value={q} onChange={(e) => setQ(e.target.value)} /></div>
    {o.isLoading ? <SkeletonRows /> : <div className="overflow-x-auto"><table className="w-full min-w-[720px] text-sm"><thead className="bg-surface-2/60 text-left text-xs text-muted"><tr><th className="px-4 py-2">Organisation</th><th className="px-3 py-2">Industry</th><th className="px-3 py-2">Members</th><th className="px-3 py-2">Modules</th><th className="px-3 py-2">Records</th><th className="px-3 py-2">Plan</th><th className="px-3 py-2">Created</th><th className="px-3 py-2">Status</th></tr></thead>
      <tbody>{(o.data?.orgs || []).map((x: any) => <tr key={x.id} className="border-t border-line/70"><td className="px-4 py-2"><b>{x.name}</b><span className="block font-mono text-xs text-muted">{x.slug}</span></td><td className="px-3 py-2">{getCategory(x.industry)?.name}</td><td className="px-3 py-2 tabular">{x.members}</td><td className="px-3 py-2 tabular">{x.modules}</td><td className="px-3 py-2 tabular">{x.records}</td><td className="px-3 py-2">{x.plan}</td><td className="px-3 py-2 text-xs text-muted">{ago(x.created_at)}</td>
        <td className="px-3 py-2"><select aria-label={`Status of ${x.name}`} className="input h-8 w-auto" value={x.status} onChange={(e) => set(x.id, e.target.value)}><option value="active">Active</option><option value="suspended">Suspended</option></select></td></tr>)}</tbody></table></div>}</section>;
}
function Users() {
  const [q, setQ] = useState(''); const u = useGet<any>(['adm-users', q], `/api/admin/users?q=${encodeURIComponent(q)}`); const api = useApi(); const qc = useQueryClient(); const toast = useUI((s) => s.toast);
  async function set(id: number, status: string) { try { await api(`/api/admin/users/${id}`, { method: 'PATCH', body: { status } }); qc.invalidateQueries({ queryKey: ['adm-users'] }); toast(`User ${status}`); } catch (x) { toast(errText(x), 'err'); } }
  return <section className="panel overflow-hidden"><div className="p-3"><input className="input max-w-sm" placeholder="Search users" aria-label="Search users" value={q} onChange={(e) => setQ(e.target.value)} /></div>
    {u.isLoading ? <SkeletonRows /> : <div className="overflow-x-auto"><table className="w-full min-w-[640px] text-sm"><thead className="bg-surface-2/60 text-left text-xs text-muted"><tr><th className="px-4 py-2">User</th><th className="px-3 py-2">Orgs</th><th className="px-3 py-2">Joined</th><th className="px-3 py-2">Last seen</th><th className="px-3 py-2">Status</th></tr></thead>
      <tbody>{(u.data?.users || []).map((x: any) => <tr key={x.id} className="border-t border-line/70"><td className="px-4 py-2"><b>{x.name || '(no name)'}</b> {x.is_super ? <span className="chip ml-1">super admin</span> : null}<span className="block text-xs text-muted">{x.email}</span></td><td className="px-3 py-2 tabular">{x.orgs}</td><td className="px-3 py-2 text-xs text-muted">{ago(x.created_at)}</td><td className="px-3 py-2 text-xs text-muted">{x.last_seen ? ago(x.last_seen) : '·'}</td>
        <td className="px-3 py-2"><select aria-label={`Status of ${x.email}`} className="input h-8 w-auto" value={x.status} disabled={!!x.is_super} onChange={(e) => set(x.id, e.target.value)}><option value="active">Active</option><option value="suspended">Suspended</option></select></td></tr>)}</tbody></table></div>}</section>;
}
function Tickets() {
  const t = useGet<any>(['adm-tickets'], '/api/admin/tickets'); const api = useApi(); const qc = useQueryClient(); const toast = useUI((s) => s.toast); const [reply, setReply] = useState<Record<number, string>>({});
  async function set(id: number, status: string) { try { await api(`/api/admin/tickets/${id}`, { method: 'PATCH', body: { status, reply: reply[id] || null } }); qc.invalidateQueries({ queryKey: ['adm-tickets'] }); toast('Ticket updated'); } catch (x) { toast(errText(x), 'err'); } }
  if (t.isLoading) return <Skeleton className="h-40" />;
  if (!t.data?.tickets.length) return <Empty title="No tickets" />;
  return <ul className="space-y-3">{t.data.tickets.map((x: any) => <li key={x.id} className="panel p-4 text-sm"><p className="flex flex-wrap justify-between gap-2"><b>#{x.id} {x.subject}</b><span className="chip">{x.status}</span></p><p className="text-xs text-muted">{x.email} · {x.org_name || 'no org'} · {dateStr(x.created_at)}</p><p className="mt-2 whitespace-pre-wrap text-ink-2">{x.body}</p>
    {x.reply && <p className="mt-2 rounded-ctl bg-surface-2 p-2"><span className="eyebrow block">Reply sent</span>{x.reply}</p>}
    <div className="mt-3 flex flex-col gap-2 sm:flex-row"><input className="input" placeholder="Reply (the user is notified)" aria-label="Reply" value={reply[x.id] || ''} onChange={(e) => setReply({ ...reply, [x.id]: e.target.value })} /><button className="btn-primary" onClick={() => set(x.id, 'answered')}>Reply</button><button className="btn-line" onClick={() => set(x.id, 'closed')}>Close</button></div></li>)}</ul>;
}
function Flags() {
  const f = useGet<any>(['adm-flags'], '/api/admin/flags'); const api = useApi(); const qc = useQueryClient(); const toast = useUI((s) => s.toast);
  async function set(key: string, enabled: boolean) { try { await api(`/api/admin/flags/${key}`, { method: 'PUT', body: { enabled } }); qc.invalidateQueries({ queryKey: ['adm-flags'] }); toast('Flag saved'); } catch (x) { toast(errText(x), 'err'); } }
  if (f.isLoading) return <Skeleton className="h-40" />;
  return <section className="panel divide-y divide-line">{f.data.flags.map((x: any) => <div key={x.key} className="flex items-center gap-4 p-4"><div className="flex-1"><p className="font-mono text-sm font-semibold">{x.key}</p><p className="text-sm text-muted">{x.note}</p></div><Switch label={x.key} checked={!!x.enabled} onChange={(v) => set(x.key, v)} /></div>)}</section>;
}
function Health() {
  const h = useGet<any>(['adm-health'], '/api/admin/health', { refetchInterval: 30_000 });
  if (h.isLoading) return <Skeleton className="h-40" />; if (h.error) return <ErrorBox error={errText(h.error)} />;
  const d = h.data;
  return <div className="grid gap-3 lg:grid-cols-2">
    <section className="panel p-4 text-sm"><h3 className="font-display text-lg font-semibold">System</h3><dl className="mt-2 grid grid-cols-2 gap-y-1.5"><dt className="text-muted">Database ping</dt><dd className="tabular">{d.db_ping_ms} ms</dd><dt className="text-muted">Schema version</dt><dd>{d.schema_version}</dd><dt className="text-muted">Auth issuer</dt><dd className="break-all font-mono text-xs">{d.auth_issuer || 'not configured'}</dd><dt className="text-muted">Modules registered</dt><dd>{d.modules_registered} in {d.categories} categories</dd><dt className="text-muted">Registry in this build</dt><dd>{MODULES.length}</dd></dl></section>
    <section className="panel p-4 text-sm"><h3 className="font-display text-lg font-semibold">Database rows</h3><dl className="mt-2 grid grid-cols-2 gap-y-1.5">{Object.entries(d.tables).map(([k, v]) => <div key={k} className="contents"><dt className="font-mono text-xs text-muted">{k}</dt><dd className="tabular">{num(v as number)}</dd></div>)}</dl></section>
    <section className="panel p-4 text-sm lg:col-span-2"><h3 className="font-display text-lg font-semibold">Security: rejected sign-in tokens</h3>{d.auth_failures.length === 0 ? <p className="mt-2 text-muted">None recorded.</p> : <ul className="mt-2 space-y-1">{d.auth_failures.map((a: any, i: number) => <li key={i} className="font-mono text-xs">{dateStr(a.created_at)} · {a.meta}</li>)}</ul>}</section>
  </div>;
}
function PlatformAudit() {
  const a = useGet<any>(['adm-audit'], '/api/admin/audit');
  if (a.isLoading) return <SkeletonRows />;
  return <section className="panel overflow-x-auto"><table className="w-full min-w-[640px] text-sm"><thead className="bg-surface-2/60 text-left text-xs text-muted"><tr><th className="px-4 py-2">When</th><th className="px-3 py-2">Org</th><th className="px-3 py-2">Who</th><th className="px-3 py-2">Action</th><th className="px-3 py-2">IP</th></tr></thead>
    <tbody>{(a.data?.entries || []).map((x: any) => <tr key={x.id} className="border-t border-line/70"><td className="px-4 py-2 text-xs text-muted">{dateStr(x.created_at)}</td><td className="px-3 py-2">{x.org_name || '·'}</td><td className="px-3 py-2">{x.email || 'anonymous'}</td><td className="px-3 py-2 font-mono text-xs">{x.action} {x.target ? `· ${x.target}` : ''}</td><td className="px-3 py-2 font-mono text-xs text-muted">{x.ip}</td></tr>)}</tbody></table></section>;
}
export default function Admin() {
  const me = useGet<any>(['me'], '/api/me'); const [tab, setTab] = useState<'overview' | 'orgs' | 'users' | 'tickets' | 'flags' | 'health' | 'audit'>('overview');
  if (me.isLoading) return <Skeleton className="h-40" />;
  if (!me.data?.user?.is_super) return <Empty title="Platform admins only" body="This panel is for the Byawastha platform owner." icon={<ShieldStar size={20} />} />;
  return <div><PageHead eyebrow="Platform" title="Super admin" desc="The whole platform across every organisation. Billing is off, so subscriptions and revenue read zero." />
    <Tabs value={tab} onChange={setTab} items={[{ key: 'overview', label: 'Overview' }, { key: 'orgs', label: 'Organisations' }, { key: 'users', label: 'Users' }, { key: 'tickets', label: 'Support' }, { key: 'flags', label: 'Feature flags' }, { key: 'health', label: 'System health' }, { key: 'audit', label: 'Audit' }]} />
    <div className="mt-4">{tab === 'overview' && <Overview />}{tab === 'orgs' && <Orgs />}{tab === 'users' && <Users />}{tab === 'tickets' && <Tickets />}{tab === 'flags' && <Flags />}{tab === 'health' && <Health />}{tab === 'audit' && <PlatformAudit />}</div></div>;
}
