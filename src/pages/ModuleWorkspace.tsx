import { useEffect, useMemo, useState } from 'react';
import { useParams, useSearchParams, Link } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Cell } from 'recharts';
import { Plus, MagnifyingGlass, DownloadSimple, UploadSimple, Trash, CaretUp, CaretDown, CaretLeft, CaretRight, Rows, FileCsv, Funnel } from '@phosphor-icons/react';
import { getModule, getCategory, type Entity, type Field as FieldDef } from '../../shared/registry';
import { MODULE_ACTIONS, SYSTEM_ROLES, moduleActions, type RoleSpec } from '../../shared/rbac';
import { useApi, useGet, errText, download, ApiError } from '../lib/api';
import { useOrg, canMod, can } from '../components/AppShell';
import { CatIcon } from '../components/Brand';
import { PageHead, Tabs, Modal, Confirm, Field, Empty, ErrorBox, SkeletonRows, Skeleton } from '../components/ui';
import { useUI } from '../lib/store';
import { npr, num, ago } from '../lib/format';
import { fillDays, tooltipStyle } from './Dashboard';

const ERR: Record<string, string> = { required: 'Required', too_long: 'Too long', email_invalid: 'Not a valid email', url_invalid: 'Use a full http(s) link', number_invalid: 'Enter a number', date_invalid: 'Pick a valid date', datetime_invalid: 'Pick a valid date and time', bool_invalid: 'Yes or no', option_invalid: 'Pick one of the options', ref_invalid: 'Pick a record', ref_not_found: 'That record no longer exists', phone_invalid: 'Not a valid phone number' };
const STATUS_TONE = (s: string) => /done|paid|active|completed|delivered|won|live|published|available|approved|resolved|closed|fit|healthy|present|issued|confirmed|signed|compliant|ok|up|clean|open$/i.test(s) ? 'bg-ok/12 text-ok border-ok/30' : /overdue|lost|rejected|failed|cancel|expired|down|breach|critical|absent|dead|blocked|default|suspended|missed|no-show/i.test(s) ? 'bg-danger/10 text-danger border-danger/30' : /pending|draft|due|hold|planned|waiting|new|enquiry|partial|late|review/i.test(s) ? 'bg-warn/12 text-warn border-warn/30' : 'bg-surface-2 text-ink-2 border-line';
function cell(f: FieldDef, v: unknown, refs: Record<string, string>) {
  if (v === undefined || v === null || v === '') return <span className="text-muted/60">·</span>;
  if (f.type === 'money') return <span className="tabular">{npr(v)}</span>;
  if (f.type === 'num') return <span className="tabular">{num(v)}</span>;
  if (f.type === 'bool') return v ? 'Yes' : 'No';
  if (f.type === 'sel') return <span className={'chip ' + STATUS_TONE(String(v))}>{String(v)}</span>;
  if (f.type === 'ref') return refs[String(v)] ?? '#' + v;
  if (f.type === 'url') return <a className="link" href={String(v)} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()}>link</a>;
  return <span className="line-clamp-1">{String(v)}</span>;
}

function RefSelect({ slug, mod, entity, value, onChange, id }: { slug: string; mod: string; entity: string; value: any; onChange: (v: any) => void; id: string }) {
  const o = useGet<any>(['opts', slug, mod, entity], `/api/o/${slug}/m/${mod}/e/${entity}/options`);
  return <select id={id} className="input" value={value ?? ''} onChange={(e) => onChange(e.target.value ? Number(e.target.value) : null)}>
    <option value="">{o.isLoading ? 'Loading…' : o.data?.options?.length ? 'Choose…' : 'No records yet'}</option>
    {(o.data?.options || []).map((x: any) => <option key={x.id} value={x.id}>{x.title}</option>)}
  </select>;
}
function RecordForm({ ent, mod, slug, data, setData, errors }: { ent: Entity; mod: string; slug: string; data: Record<string, any>; setData: (d: Record<string, any>) => void; errors: Record<string, string> }) {
  const set = (k: string, v: any) => setData({ ...data, [k]: v });
  return <div className="grid gap-4 sm:grid-cols-2">{ent.fields.map((f) => { const id = 'f-' + f.key; const e = errors[f.key] ? ERR[errors[f.key]] || errors[f.key] : null; const v = data[f.key];
    let input;
    if (f.type === 'long') input = <textarea id={id} className="input" value={v ?? ''} onChange={(x) => set(f.key, x.target.value)} />;
    else if (f.type === 'sel') input = <select id={id} className="input" value={v ?? ''} onChange={(x) => set(f.key, x.target.value || null)}><option value="">{f.required ? 'Choose…' : '(none)'}</option>{f.options!.map((o) => <option key={o}>{o}</option>)}</select>;
    else if (f.type === 'bool') input = <select id={id} className="input" value={v === true ? 'true' : v === false ? 'false' : ''} onChange={(x) => set(f.key, x.target.value === '' ? null : x.target.value === 'true')}><option value="">(not set)</option><option value="true">Yes</option><option value="false">No</option></select>;
    else if (f.type === 'ref') input = <RefSelect id={id} slug={slug} mod={mod} entity={f.ref!} value={v} onChange={(x) => set(f.key, x)} />;
    else input = <input id={id} className={'input' + (f.type === 'money' || f.type === 'num' ? ' tabular' : '')} value={v ?? ''} onChange={(x) => set(f.key, x.target.value)}
      type={f.type === 'date' ? 'date' : f.type === 'dt' ? 'datetime-local' : f.type === 'email' ? 'email' : f.type === 'url' ? 'url' : f.type === 'phone' ? 'tel' : 'text'}
      inputMode={f.type === 'num' || f.type === 'money' ? 'decimal' : undefined} placeholder={f.type === 'money' ? 'Rs' : undefined} />;
    return <div key={f.key} className={f.type === 'long' ? 'sm:col-span-2' : ''}><Field label={f.label} htmlFor={id} error={e} required={f.required}>{input}</Field></div>; })}</div>;
}

function EntityTable({ ent, mod, slug, pageSize = 25 }: { ent: Entity; mod: string; slug: string; pageSize?: number }) {
  const info = useOrg(); const api = useApi(); const qc = useQueryClient(); const toast = useUI((s) => s.toast);
  const [sp, setSp] = useSearchParams();
  const [q, setQ] = useState(''); const [dq, setDq] = useState(''); const [status, setStatus] = useState(''); const [fk, setFk] = useState<Record<string, string>>({});
  const [sort, setSort] = useState('updated_at'); const [dir, setDir] = useState<'asc' | 'desc'>('desc'); const [page, setPage] = useState(1); const [size, setSize] = useState(pageSize);
  const [sel, setSel] = useState<number[]>([]); const [edit, setEdit] = useState<null | { id?: number; data: Record<string, any> }>(null); const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false); const [confirm, setConfirm] = useState<null | 'one' | 'bulk'>(null); const [importOpen, setImportOpen] = useState(false);
  useEffect(() => { const t = setTimeout(() => { setDq(q); setPage(1); }, 250); return () => clearTimeout(t); }, [q]);
  useEffect(() => { setSel([]); }, [page, dq, status, fk, sort, dir]);
  const filterFields = ent.fields.filter((f) => (f.type === 'sel' && f.key !== ent.statusField) || f.type === 'bool').slice(0, 2);
  const qs = new URLSearchParams({ page: String(page), page_size: String(size), sort, dir }); if (dq) qs.set('q', dq); if (status) qs.set('status', status); for (const [k, v] of Object.entries(fk)) if (v) qs.set('f.' + k, v);
  const path = `/api/o/${slug}/m/${mod}/e/${ent.key}`;
  const list = useGet<any>(['rows', slug, mod, ent.key, qs.toString()], `${path}?${qs}`);
  const cols = ent.fields.filter((f) => f.type !== 'long').slice(0, 6);
  const P = (a: string) => canMod(info, mod, a);
  // open from command palette (?open=id)
  useEffect(() => { const id = sp.get('open'); if (id && sp.get('e') === ent.key) { api<any>(`${path}/${id}`).then((r) => setEdit({ id: r.id, data: r.data })).catch(() => toast('That record is gone or not yours to see', 'err')); sp.delete('open'); setSp(sp, { replace: true }); } }, []); // eslint-disable-line
  const refresh = () => { qc.invalidateQueries({ queryKey: ['rows', slug, mod] }); qc.invalidateQueries({ queryKey: ['stats', slug, mod] }); qc.invalidateQueries({ queryKey: ['opts', slug, mod] }); qc.invalidateQueries({ queryKey: ['dash', slug] }); };
  async function save() {
    setSaving(true); setErrors({});
    try { await api(edit!.id ? `${path}/${edit!.id}` : path, { method: edit!.id ? 'PATCH' : 'POST', body: { data: edit!.data } }); toast(edit!.id ? 'Saved' : `${ent.name} added`); setEdit(null); refresh(); }
    catch (x) { if (x instanceof ApiError && x.code === 'validation') setErrors(x.detail || {}); else toast(errText(x), 'err'); } finally { setSaving(false); }
  }
  async function del() {
    setSaving(true);
    try { if (confirm === 'bulk') { const r = await api<any>(`${path}/bulk-delete`, { method: 'POST', body: { ids: sel } }); toast(`${r.deleted} deleted`); setSel([]); } else { await api(`${path}/${edit!.id}`, { method: 'DELETE' }); toast('Deleted'); setEdit(null); } setConfirm(null); refresh(); }
    catch (x) { toast(errText(x), 'err'); } finally { setSaving(false); }
  }
  const toggleSort = (k: string) => { if (sort === k) setDir(dir === 'asc' ? 'desc' : 'asc'); else { setSort(k); setDir('asc'); } };
  const rows = list.data?.rows || []; const total = list.data?.total || 0; const pages = Math.max(1, Math.ceil(total / size));
  return <div className="panel overflow-hidden">
    <div className="flex flex-col gap-2 border-b border-line p-3 lg:flex-row lg:items-center">
      <label className="relative min-w-0 flex-1"><span className="sr-only">Search {ent.name}</span><MagnifyingGlass size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" /><input className="input pl-9" placeholder={`Search ${ent.name.toLowerCase()}s`} value={q} onChange={(e) => setQ(e.target.value)} /></label>
      <div className="flex flex-wrap items-center gap-2 lg:shrink-0 lg:flex-nowrap">
        {ent.statusField && <select aria-label="Filter by status" className="input !w-40" value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}><option value="">All {ent.fields.find((f) => f.key === ent.statusField)!.label.toLowerCase()}es</option>{ent.fields.find((f) => f.key === ent.statusField)!.options!.map((o) => <option key={o}>{o}</option>)}</select>}
        {filterFields.map((f) => <select key={f.key} aria-label={'Filter by ' + f.label} className="input !w-40" value={fk[f.key] || ''} onChange={(e) => { setFk({ ...fk, [f.key]: e.target.value }); setPage(1); }}><option value="">{f.label}: any</option>{f.type === 'bool' ? <><option value="true">Yes</option><option value="false">No</option></> : f.options!.map((o) => <option key={o}>{o}</option>)}</select>)}
        {P('export') && <button className="btn-line" onClick={() => download(api, `${path}/export.csv?${qs}`, `${mod}-${ent.key}.csv`).then(() => toast('CSV downloaded')).catch((x) => toast(errText(x), 'err'))}><DownloadSimple size={16} /> Export</button>}
        {P('import') && <button className="btn-line" onClick={() => setImportOpen(true)}><UploadSimple size={16} /> Import</button>}
        {P('create') && <button className="btn-brand" onClick={() => { setErrors({}); setEdit({ data: {} }); }}><Plus size={16} weight="bold" /> New {ent.name.toLowerCase()}</button>}
      </div>
    </div>
    {sel.length > 0 && <div className="flex items-center gap-3 border-b border-line bg-brand/10 px-4 py-2 text-sm"><b>{sel.length} selected</b>{P('delete') && <button className="btn-danger h-8" onClick={() => setConfirm('bulk')}><Trash size={14} /> Delete</button>}<button className="btn-ghost h-8" onClick={() => setSel([])}>Clear</button></div>}
    {list.isLoading ? <SkeletonRows rows={6} cols={Math.min(cols.length + 1, 5)} /> : list.error ? <ErrorBox error={errText(list.error)} retry={() => list.refetch()} /> :
      rows.length === 0 ? (dq || status || Object.values(fk).some(Boolean) ? <Empty title="No matches" body="Nothing fits these filters." icon={<Funnel size={20} />} action={<button className="btn-line" onClick={() => { setQ(''); setStatus(''); setFk({}); }}>Clear filters</button>} />
        : <Empty title={`No ${ent.name.toLowerCase()}s yet`} body={P('create') ? 'Add the first one, or import a CSV.' : 'Nothing here yet, and your role cannot add records.'} icon={<Rows size={20} />} action={P('create') && <button className="btn-brand" onClick={() => setEdit({ data: {} })}><Plus size={16} /> Add {ent.name.toLowerCase()}</button>} />) :
      <div className="overflow-x-auto"><table className="w-full min-w-[640px] text-sm">
        <thead className="bg-surface-2/60 text-left text-xs text-muted"><tr>
          <th className="w-10 px-3 py-2"><input type="checkbox" aria-label="Select all on this page" checked={sel.length === rows.length} onChange={(e) => setSel(e.target.checked ? rows.map((r: any) => r.id) : [])} /></th>
          {cols.map((f) => <th key={f.key} className="px-3 py-2"><button className="inline-flex items-center gap-1 hover:text-ink" onClick={() => toggleSort(f.key)}>{f.label}{sort === f.key && (dir === 'asc' ? <CaretUp size={11} /> : <CaretDown size={11} />)}</button></th>)}
          <th className="px-3 py-2 text-right"><button className="inline-flex items-center gap-1 hover:text-ink" onClick={() => toggleSort('updated_at')}>Updated{sort === 'updated_at' && (dir === 'asc' ? <CaretUp size={11} /> : <CaretDown size={11} />)}</button></th>
        </tr></thead>
        <tbody>{rows.map((r: any) => <tr key={r.id} className="cursor-pointer border-t border-line/70 hover:bg-surface-2/50" onClick={() => { setErrors({}); setEdit({ id: r.id, data: r.data }); }}>
          <td className="px-3 py-2" onClick={(e) => e.stopPropagation()}><input type="checkbox" aria-label={'Select ' + r.title} checked={sel.includes(r.id)} onChange={(e) => setSel(e.target.checked ? [...sel, r.id] : sel.filter((x) => x !== r.id))} /></td>
          {cols.map((f, i) => <td key={f.key} className={'px-3 py-2 ' + (i === 0 ? 'min-w-[150px] font-semibold' : 'text-ink-2')}>{cell(f, r.data[f.key], list.data.refs || {})}</td>)}
          <td className="px-3 py-2 text-right text-xs text-muted whitespace-nowrap">{ago(r.updated_at)}</td></tr>)}</tbody>
      </table></div>}
    <div className="flex flex-wrap items-center justify-between gap-2 border-t border-line px-3 py-2 text-sm text-muted">
      <span className="tabular">{total ? `${(page - 1) * size + 1}–${Math.min(page * size, total)} of ${num(total)}` : '0 records'}</span>
      <div className="flex items-center gap-2"><select aria-label="Rows per page" className="input h-8 !w-28" value={size} onChange={(e) => { setSize(Number(e.target.value)); setPage(1); }}>{[10, 25, 50, 100].map((n) => <option key={n} value={n}>{n} / page</option>)}</select>
        <button className="btn-line h-8 w-8 px-0" aria-label="Previous page" disabled={page <= 1} onClick={() => setPage(page - 1)}><CaretLeft size={14} /></button><span className="whitespace-nowrap tabular">{page} / {pages}</span>
        <button className="btn-line h-8 w-8 px-0" aria-label="Next page" disabled={page >= pages} onClick={() => setPage(page + 1)}><CaretRight size={14} /></button></div>
    </div>
    <Modal open={!!edit} onClose={() => setEdit(null)} title={edit?.id ? `Edit ${ent.name.toLowerCase()}` : `New ${ent.name.toLowerCase()}`} wide
      footer={<>{edit?.id && P('delete') && <button className="btn-ghost mr-auto text-danger" onClick={() => setConfirm('one')}><Trash size={16} /> Delete</button>}<button className="btn-ghost" onClick={() => setEdit(null)}>Cancel</button>
        {(edit?.id ? P('edit') : P('create')) && <button className="btn-primary" disabled={saving} onClick={save}>{saving ? 'Saving…' : edit?.id ? 'Save changes' : 'Add'}</button>}</>}>
      {edit && <fieldset disabled={!(edit.id ? P('edit') : P('create'))}><RecordForm ent={ent} mod={mod} slug={slug} data={edit.data} setData={(d) => setEdit({ ...edit, data: d })} errors={errors} /></fieldset>}
    </Modal>
    <Confirm open={!!confirm} onClose={() => setConfirm(null)} onConfirm={del} busy={saving} title={confirm === 'bulk' ? `Delete ${sel.length} records?` : 'Delete this record?'} body="This can't be undone. The audit log keeps a copy of what was deleted." />
    <ImportModal open={importOpen} onClose={() => setImportOpen(false)} ent={ent} path={path} onDone={refresh} />
  </div>;
}
function ImportModal({ open, onClose, ent, path, onDone }: { open: boolean; onClose: () => void; ent: Entity; path: string; onDone: () => void }) {
  const api = useApi(); const [text, setText] = useState<string | null>(null); const [name, setName] = useState(''); const [busy, setBusy] = useState(false); const [res, setRes] = useState<any>(null); const [err, setErr] = useState<string | null>(null);
  useEffect(() => { if (open) { setText(null); setRes(null); setErr(null); setName(''); } }, [open]);
  const template = () => { const blob = new Blob(['\uFEFF' + ent.fields.filter((f) => f.type !== 'ref').map((f) => f.key).join(',') + '\r\n'], { type: 'text/csv' }); const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `${ent.key}-template.csv`; a.click(); };
  async function go() { setBusy(true); setErr(null); try { const r = await api<any>(`${path}/import`, { method: 'POST', body: { csv: text } }); setRes(r); onDone(); } catch (x) { setErr(errText(x)); } finally { setBusy(false); } }
  return <Modal open={open} onClose={onClose} title={`Import ${ent.name.toLowerCase()}s from CSV`} footer={<><button className="btn-ghost" onClick={onClose}>{res ? 'Done' : 'Cancel'}</button>{!res && <button className="btn-primary" disabled={!text || busy} onClick={go}>{busy ? 'Importing…' : 'Import'}</button>}</>}>
    <div className="space-y-4 text-sm">
      <p className="text-ink-2">Columns are matched by key or label: {ent.fields.filter((f) => f.type !== 'ref').map((f) => <code key={f.key} className="mx-0.5 rounded bg-surface-2 px-1 font-mono text-xs">{f.key}</code>)}. Up to 1,000 rows; each row is validated like the form, and bad rows are listed, not imported. Links to other records are not imported.</p>
      <button className="btn-line" onClick={template}><FileCsv size={16} /> Download template</button>
      <label className="block rounded-panel border border-dashed border-line p-4 text-center hover:bg-surface-2/50"><UploadSimple size={20} className="mx-auto text-muted" /><span className="mt-1 block font-semibold">{name || 'Choose a .csv file'}</span>
        <input type="file" accept=".csv,text/csv" className="sr-only" onChange={async (e) => { const f = e.target.files?.[0]; if (!f) return; if (f.size > 2_000_000) { setErr('File is over 2 MB'); return; } setName(f.name); setText(await f.text()); setRes(null); }} /></label>
      {err && <p role="alert" className="text-danger">{err}</p>}
      {res && <div className="rounded-ctl border border-line p-3"><p><b className="text-ok">{res.inserted} imported</b>{res.rejected ? <>, <b className="text-danger">{res.rejected} rejected</b></> : null}.</p>
        {res.errors?.length > 0 && <ul className="mt-2 max-h-40 overflow-y-auto text-xs text-ink-2">{res.errors.map((e: any) => <li key={e.row}>Row {e.row}: {Object.entries(e.errors).map(([k, v]) => `${k} ${ERR[v as string] || v}`).join('; ')}</li>)}</ul>}</div>}
    </div>
  </Modal>;
}
function Overview({ mod, slug }: { mod: string; slug: string }) {
  const def = getModule(mod)!; const s = useGet<any>(['stats', slug, mod], `/api/o/${slug}/m/${mod}/stats`);
  if (s.isLoading) return <div className="grid gap-3 md:grid-cols-2"><Skeleton className="h-56" /><Skeleton className="h-56" /></div>;
  if (s.error) return <ErrorBox error={errText(s.error)} retry={() => s.refetch()} />;
  const colors = ['rgb(var(--primary))', 'rgb(var(--brand))', '#9E2A2B', '#7FB0BC', '#C9B458', '#540B0E'];
  return <div className="grid gap-3 md:grid-cols-2">{s.data.entities.map((e: any) => { const ent = def.entities.find((x) => x.key === e.entity)!; return <section key={e.entity} className="panel p-4">
    <div className="flex items-baseline justify-between"><h3 className="font-display text-lg font-semibold">{ent.name}s</h3><span className="font-display text-2xl font-semibold tabular">{num(e.total)}</span></div>
    {e.money_field && <p className="text-sm text-muted">Total {ent.fields.find((f) => f.key === e.money_field)!.label.toLowerCase()}: <b className="text-ink tabular">{npr(e.money_sum)}</b></p>}
    {e.by_status.length > 0 ? <div className="mt-3 h-40"><ResponsiveContainer width="100%" height="100%"><BarChart data={e.by_status} margin={{ left: -20, right: 4 }}><XAxis dataKey="status" tick={{ fontSize: 11, fill: 'rgb(var(--muted))' }} tickLine={false} axisLine={false} interval={0} /><YAxis allowDecimals={false} tick={{ fontSize: 11, fill: 'rgb(var(--muted))' }} tickLine={false} axisLine={false} /><Tooltip contentStyle={tooltipStyle} cursor={{ fill: 'rgb(var(--surface-2))' }} />
      <Bar dataKey="n" name="Records" radius={[4, 4, 0, 0]} animationDuration={600}>{e.by_status.map((_: any, i: number) => <Cell key={i} fill={colors[i % colors.length]} />)}</Bar></BarChart></ResponsiveContainer></div>
      : <div className="mt-3 h-40"><p className="text-xs text-muted mb-1">Added in the last 30 days</p><ResponsiveContainer width="100%" height="85%"><BarChart data={fillDays(e.daily, 30)} margin={{ left: -20 }}><XAxis dataKey="day" hide /><YAxis allowDecimals={false} tick={{ fontSize: 11, fill: 'rgb(var(--muted))' }} tickLine={false} axisLine={false} /><Tooltip contentStyle={tooltipStyle} /><Bar dataKey="n" name="Added" fill="rgb(var(--primary))" radius={[3, 3, 0, 0]} /></BarChart></ResponsiveContainer></div>}
  </section>; })}</div>;
}
function ModuleSettings({ mod, slug }: { mod: string; slug: string }) {
  const def = getModule(mod)!; const api = useApi(); const qc = useQueryClient(); const toast = useUI((s) => s.toast);
  const mods = useGet<any>(['modules', slug], `/api/o/${slug}/modules`); const roles = useGet<any>(['roles', slug], `/api/o/${slug}/roles`);
  const cur = mods.data?.modules.find((m: any) => m.key === mod);
  const all: RoleSpec[] = useMemo(() => [...SYSTEM_ROLES, ...(roles.data?.custom || [])].filter((r) => r.key !== 'owner'), [roles.data]);
  const [perms, setPerms] = useState<Record<string, string[]> | null>(null); const [cfg, setCfg] = useState<any>(null); const [busy, setBusy] = useState(false);
  useEffect(() => { if (cur && roles.data && !perms) { const p: Record<string, string[]> = {}; for (const r of all) p[r.key] = cur.perms[r.key] ?? moduleActions(r, mod); setPerms(p); setCfg({ page_size: cur.config.page_size ?? 25, default_entity: cur.config.default_entity ?? def.entities[0].key }); } }, [cur, roles.data, all, perms, mod, def]);
  if (!perms || !cfg) return <Skeleton className="h-64" />;
  async function save() {
    setBusy(true);
    const overrides: Record<string, string[]> = {}; for (const r of all) { const def0 = moduleActions(r, mod); if (JSON.stringify([...perms![r.key]].sort()) !== JSON.stringify([...def0].sort())) overrides[r.key] = perms![r.key]; }
    try { await api(`/api/o/${slug}/modules/${mod}/settings`, { method: 'PUT', body: { config: cfg, perms: overrides } }); await qc.invalidateQueries({ queryKey: ['modules', slug] }); await qc.invalidateQueries({ queryKey: ['org', slug] }); toast('Module settings saved'); }
    catch (x) { toast(errText(x), 'err'); } finally { setBusy(false); }
  }
  return <div className="space-y-4">
    <section className="panel p-4"><h3 className="font-display text-lg font-semibold">Defaults</h3>
      <div className="mt-3 grid gap-3 sm:grid-cols-2 max-w-xl"><Field label="Opens on" htmlFor="ms-ent"><select id="ms-ent" className="input" value={cfg.default_entity} onChange={(e) => setCfg({ ...cfg, default_entity: e.target.value })}>{def.entities.map((e) => <option key={e.key} value={e.key}>{e.name}</option>)}</select></Field>
        <Field label="Rows per page" htmlFor="ms-ps"><select id="ms-ps" className="input" value={cfg.page_size} onChange={(e) => setCfg({ ...cfg, page_size: Number(e.target.value) })}>{[10, 25, 50, 100].map((n) => <option key={n}>{n}</option>)}</select></Field></div></section>
    <section className="panel overflow-hidden"><div className="p-4"><h3 className="font-display text-lg font-semibold">Who can do what in {def.name}</h3><p className="text-sm text-muted">Starts from each role's defaults. Owners always have full access. The server enforces this on every request.</p></div>
      <div className="overflow-x-auto"><table className="w-full min-w-[620px] text-sm"><thead className="bg-surface-2/60 text-xs text-muted"><tr><th className="px-4 py-2 text-left">Role</th>{MODULE_ACTIONS.map((a) => <th key={a} className="px-2 py-2 capitalize">{a}</th>)}</tr></thead>
        <tbody>{all.map((r) => <tr key={r.key} className="border-t border-line/70"><td className="px-4 py-2"><span className="font-semibold">{r.name}</span>{!r.system && <span className="chip ml-2">custom</span>}</td>
          {MODULE_ACTIONS.map((a) => <td key={a} className="px-2 py-2 text-center"><input type="checkbox" aria-label={`${r.name} can ${a}`} checked={perms[r.key].includes(a)} onChange={(e) => setPerms({ ...perms, [r.key]: e.target.checked ? [...perms[r.key], a] : perms[r.key].filter((x) => x !== a) })} /></td>)}</tr>)}</tbody></table></div>
      <div className="flex justify-end border-t border-line p-3"><button className="btn-primary" disabled={busy} onClick={save}>{busy ? 'Saving…' : 'Save settings'}</button></div></section>
  </div>;
}
export default function ModuleWorkspace() {
  const { mod } = useParams(); const info = useOrg(); const [sp, setSp] = useSearchParams();
  const def = getModule(mod || '');
  const cfg = useGet<any>(['modules', info.org.slug], `/api/o/${info.org.slug}/modules`);
  if (!def) return <Empty title="Unknown module" body="This module doesn't exist." action={<Link className="btn-line" to={`/app/${info.org.slug}/marketplace`}>Marketplace</Link>} />;
  if (!info.modules.includes(def.key)) return <Empty title={`${def.name} is off`} body="Turn it on in the marketplace to use it." action={<Link className="btn-brand" to={`/app/${info.org.slug}/marketplace?q=${encodeURIComponent(def.name)}`}>Open marketplace</Link>} />;
  if (!canMod(info, def.key, 'view')) return <Empty title="No access" body={`Your role (${info.role.name}) can't view ${def.name}. Ask an admin.`} />;
  const cur = cfg.data?.modules.find((m: any) => m.key === def.key);
  const tab = sp.get('e') || (sp.get('tab') as string) || cur?.config?.default_entity || def.entities[0].key;
  const items = [...def.entities.map((e) => ({ key: e.key, label: e.name + 's' })), { key: 'overview', label: 'Overview' }, ...(can(info, 'modules.manage') ? [{ key: 'settings', label: 'Settings' }] : [])];
  const setTab = (k: string) => setSp(def.entities.some((e) => e.key === k) ? { e: k } : { tab: k });
  const ent = def.entities.find((e) => e.key === tab);
  const c = getCategory(def.category)!;
  return <div>
    <PageHead eyebrow={c.name} title={def.name} desc={<span className="inline-flex items-center gap-2"><CatIcon name={c.icon} size={16} />{def.description}.</span>} />
    <Tabs value={tab} onChange={setTab} items={items} />
    <div className="mt-4" key={tab}>
      {ent && <EntityTable ent={ent} mod={def.key} slug={info.org.slug} pageSize={cur?.config?.page_size ?? 25} />}
      {tab === 'overview' && <Overview mod={def.key} slug={info.org.slug} />}
      {tab === 'settings' && <ModuleSettings mod={def.key} slug={info.org.slug} />}
    </div>
  </div>;
}
