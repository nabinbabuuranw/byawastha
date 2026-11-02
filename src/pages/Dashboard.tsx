import { Link } from 'react-router-dom';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, BarChart, Bar, CartesianGrid } from 'recharts';
import { Storefront, Rows, UsersThree, SquaresFour, ArrowRight } from '@phosphor-icons/react';
import { getModule, getCategory } from '../../shared/registry';
import { useGet, errText } from '../lib/api';
import { useOrg } from '../components/AppShell';
import { CatIcon } from '../components/Brand';
import { PageHead, Skeleton, ErrorBox, Empty } from '../components/ui';
import { ago, actionText, num } from '../lib/format';

export function fillDays(rows: { day: string; n: number }[], days: number) {
  const m = new Map(rows.map((r) => [r.day, r.n])); const out = [];
  for (let i = days - 1; i >= 0; i--) { const d = new Date(Date.now() - i * 86400_000).toISOString().slice(0, 10); out.push({ day: d.slice(5), n: m.get(d) || 0 }); }
  return out;
}
export const tooltipStyle = { background: 'rgb(var(--surface))', border: '1px solid rgb(var(--line))', borderRadius: 8, fontSize: 12, color: 'rgb(var(--ink))' };
function Kpi({ label, value, icon, foot }: { label: string; value: string; icon: React.ReactNode; foot?: string }) {
  return <div className="panel p-4"><div className="flex items-center justify-between"><p className="eyebrow">{label}</p><span className="text-muted">{icon}</span></div>
    <p className="mt-2 font-display text-3xl font-semibold tabular">{value}</p>{foot && <p className="mt-1 text-xs text-muted">{foot}</p>}</div>;
}
export default function Dashboard() {
  const info = useOrg(); const base = `/app/${info.org.slug}`;
  const d = useGet<any>(['dash', info.org.slug], `/api/o/${info.org.slug}/dashboard`);
  return <div>
    <PageHead eyebrow={getCategory(info.org.industry)?.name} title={`Good to see you. Here's ${info.org.name}.`} desc="Every number on this page is counted from your workspace's own records, live." actions={<Link to={`${base}/marketplace`} className="btn-brand"><Storefront size={16} /> Add modules</Link>} />
    {d.isLoading && <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-28" />)}<Skeleton className="h-64 sm:col-span-2 lg:col-span-3" /><Skeleton className="h-64" /></div>}
    {d.error && <ErrorBox error={errText(d.error)} retry={() => d.refetch()} />}
    {d.data && <>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi label="Modules on" value={num(d.data.active_modules)} icon={<SquaresFour size={18} />} foot={`${d.data.visible_modules} visible to your role`} />
        <Kpi label="Records" value={num(d.data.records_total)} icon={<Rows size={18} />} foot="Across the modules you can see" />
        <Kpi label="Members" value={num(d.data.members)} icon={<UsersThree size={18} />} foot={`You are ${info.role.name}`} />
        <Kpi label="Plan" value="Free" icon={<Storefront size={18} />} foot="Billing is off; nothing is charged" />
      </div>
      <div className="mt-3 grid gap-3 lg:grid-cols-3">
        <section className="panel p-4 lg:col-span-2">
          <div className="flex items-baseline justify-between"><h2 className="font-display text-lg font-semibold">New records, last 14 days</h2><span className="text-xs text-muted">{d.data.daily.reduce((a: number, r: any) => a + r.n, 0)} total</span></div>
          <div className="mt-3 h-56"><ResponsiveContainer width="100%" height="100%"><AreaChart data={fillDays(d.data.daily, 14)} margin={{ left: -18, right: 6, top: 6 }}>
            <defs><linearGradient id="g1" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="rgb(var(--brand))" stopOpacity={0.35} /><stop offset="100%" stopColor="rgb(var(--brand))" stopOpacity={0} /></linearGradient></defs>
            <CartesianGrid stroke="rgb(var(--line))" strokeDasharray="2 4" vertical={false} /><XAxis dataKey="day" tick={{ fontSize: 11, fill: 'rgb(var(--muted))' }} tickLine={false} axisLine={false} />
            <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: 'rgb(var(--muted))' }} tickLine={false} axisLine={false} /><Tooltip contentStyle={tooltipStyle} />
            <Area type="monotone" dataKey="n" name="Records" stroke="rgb(var(--brand))" strokeWidth={2} fill="url(#g1)" animationDuration={700} /></AreaChart></ResponsiveContainer></div>
        </section>
        <section className="panel p-4">
          <h2 className="font-display text-lg font-semibold">Busiest modules</h2>
          {d.data.per_module.length === 0 ? <Empty title="No records yet" body="Open a module and add your first record." icon={<Rows size={20} />} /> :
            <div className="mt-3 h-56"><ResponsiveContainer width="100%" height="100%"><BarChart layout="vertical" data={d.data.per_module.map((r: any) => ({ name: (getModule(r.module_key)?.name || r.module_key).replace(/ Management$/, ''), n: r.n }))} margin={{ left: 8, right: 8 }}>
              <XAxis type="number" hide /><YAxis type="category" dataKey="name" width={96} tick={{ fontSize: 11, fill: 'rgb(var(--ink-2))' }} tickLine={false} axisLine={false} /><Tooltip contentStyle={tooltipStyle} cursor={{ fill: 'rgb(var(--surface-2))' }} />
              <Bar dataKey="n" name="Records" fill="rgb(var(--primary))" radius={[0, 4, 4, 0]} animationDuration={700} /></BarChart></ResponsiveContainer></div>}
        </section>
      </div>
      <div className="mt-3 grid gap-3 lg:grid-cols-3">
        <section className="panel p-4 lg:col-span-2">
          <h2 className="font-display text-lg font-semibold">Your modules</h2>
          {info.modules.length === 0 ? <Empty title="Nothing switched on" body="Pick modules in the marketplace." action={<Link className="btn-brand" to={`${base}/marketplace`}>Open marketplace</Link>} icon={<Storefront size={20} />} /> :
            <ul className="mt-3 grid gap-2 sm:grid-cols-2">{info.modules.filter((k) => info.permissions[k]?.includes('view')).map((k) => { const m = getModule(k)!; const c = getCategory(m.category)!; return <li key={k}>
              <Link to={`${base}/m/${k}`} className="group flex items-center gap-3 rounded-ctl border border-line px-3 py-2.5 hover:bg-surface-2"><CatIcon name={c.icon} className="text-primary" /><span className="min-w-0 flex-1"><span className="block truncate text-sm font-semibold">{m.name}</span><span className="block truncate text-xs text-muted">{m.entities.map((e) => e.name).join(' · ')}</span></span><ArrowRight size={14} className="text-muted" /></Link></li>; })}</ul>}
        </section>
        <section className="panel p-4">
          <h2 className="font-display text-lg font-semibold">Recent activity</h2>
          {d.data.activity.length === 0 ? <p className="mt-3 text-sm text-muted">{info.role.org.includes('audit.view') ? 'Nothing yet.' : 'Your role does not include the activity feed.'}</p> :
            <ol className="mt-3 space-y-3">{d.data.activity.map((a: any, i: number) => { const meta = JSON.parse(a.meta || '{}'); const mod = a.target?.split('/')[0]; return <li key={i} className="text-sm leading-snug">
              <span className="font-semibold">{a.name || a.email || 'System'}</span> <span className="text-ink-2">{actionText(a.action)}</span>{meta.title ? <> “{meta.title}”</> : null}{mod && getModule(mod) ? <span className="text-muted"> in {getModule(mod)!.name}</span> : a.target === 'module' && getModule(a.target_id) ? <span className="text-muted"> {getModule(a.target_id)!.name}</span> : null}
              <span className="block text-xs text-muted">{ago(a.created_at)}</span></li>; })}</ol>}
        </section>
      </div>
    </>}
  </div>;
}
