import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { Trash, UserPlus, Copy, PencilSimple, Plus } from '@phosphor-icons/react';
import { CATEGORIES } from '../../shared/registry';
import { SYSTEM_ROLES, MODULE_ACTIONS, ORG_PERMS } from '../../shared/rbac';
import { useApi, useGet, errText } from '../lib/api';
import { useOrg, can } from '../components/AppShell';
import { PageHead, Tabs, Field, Modal, Confirm, Skeleton, ErrorBox, Empty } from '../components/ui';
import { useUI, type Accent, type Theme } from '../lib/store';
import { ago } from '../lib/format';

const PERM_LABEL: Record<string, string> = { 'org.settings': 'Workspace settings', 'members.manage': 'Members & invites', 'roles.manage': 'Roles', 'modules.manage': 'Activate modules', 'audit.view': 'Audit log', 'reports.view': 'Reports' };
function General() {
  const info = useOrg(); const api = useApi(); const qc = useQueryClient(); const { toast, theme, setTheme, setAccent } = useUI();
  const [name, setName] = useState(info.org.name); const [industry, setIndustry] = useState(info.org.industry); const [busy, setBusy] = useState(false);
  const editable = can(info, 'org.settings');
  async function save(body: any, msg: string) { setBusy(true); try { await api(`/api/o/${info.org.slug}`, { method: 'PATCH', body }); await qc.invalidateQueries({ queryKey: ['org', info.org.slug] }); await qc.invalidateQueries({ queryKey: ['me'] }); toast(msg); } catch (x) { toast(errText(x), 'err'); } finally { setBusy(false); } }
  const accents: { key: Accent; name: string; sw: string }[] = [{ key: 'saffron', name: 'Fulvous saffron', sw: '#E09F3E' }, { key: 'teal', name: 'Slate teal', sw: '#335C67' }, { key: 'auburn', name: 'Auburn', sw: '#9E2A2B' }, { key: 'vanilla', name: 'Vanilla', sw: '#FFF3B0' }];
  return <div className="grid gap-4 lg:grid-cols-2">
    <section className="panel p-5"><h2 className="font-display text-lg font-semibold">Workspace</h2>
      <form className="mt-4 space-y-4" onSubmit={(e) => { e.preventDefault(); save({ name, industry }, 'Workspace saved'); }}>
        <Field label="Name" htmlFor="ws-name"><input id="ws-name" className="input" disabled={!editable} value={name} onChange={(e) => setName(e.target.value)} /></Field>
        <Field label="Industry" htmlFor="ws-ind"><select id="ws-ind" className="input" disabled={!editable} value={industry} onChange={(e) => setIndustry(e.target.value)}>{CATEGORIES.map((c) => <option key={c.key} value={c.key}>{c.name}</option>)}</select></Field>
        <Field label="Address" hint="Workspace links use this; it doesn't change."><input className="input font-mono" disabled value={`/app/${info.org.slug}`} /></Field>
        {editable && <button className="btn-primary" disabled={busy}>Save</button>}
      </form></section>
    <section className="panel p-5"><h2 className="font-display text-lg font-semibold">Appearance</h2>
      <p className="mt-1 text-sm text-muted">Theme is yours (this device). Accent is the workspace's, everyone sees it.</p>
      <p className="mt-4 text-[13px] font-semibold text-ink-2">Theme</p>
      <div className="mt-2 flex gap-2" role="radiogroup" aria-label="Theme">{(['light', 'dark', 'system'] as Theme[]).map((t) => <button key={t} role="radio" aria-checked={theme === t} onClick={() => setTheme(t)} className={'btn-line capitalize ' + (theme === t ? 'border-brand ring-1 ring-brand' : '')}>{t}</button>)}</div>
      <p className="mt-5 text-[13px] font-semibold text-ink-2">Accent (from the Coolors “Dark Sunset” palette)</p>
      <div className="mt-2 grid grid-cols-2 gap-2" role="radiogroup" aria-label="Accent">{accents.map((a) => <button key={a.key} role="radio" aria-checked={info.org.accent === a.key} disabled={!editable || busy}
        onClick={() => { setAccent(a.key); save({ accent: a.key }, 'Accent updated'); }} className={'flex items-center gap-2 rounded-ctl border px-3 py-2 text-sm ' + (info.org.accent === a.key ? 'border-brand ring-1 ring-brand' : 'border-line hover:bg-surface-2')}>
        <span className="h-5 w-5 rounded-full border border-line" style={{ background: a.sw }} />{a.name}</button>)}</div>
      <p className="mt-5 text-[13px] font-semibold text-ink-2">Plan</p><p className="text-sm text-muted">Free. Billing is switched off until a payment provider is connected; nothing is charged and no card is asked for.</p>
    </section>
  </div>;
}
function Members() {
  const info = useOrg(); const api = useApi(); const qc = useQueryClient(); const toast = useUI((s) => s.toast);
  const m = useGet<any>(['members', info.org.slug], `/api/o/${info.org.slug}/members`); const roles = useGet<any>(['roles', info.org.slug], `/api/o/${info.org.slug}/roles`);
  const deps = useGet<any>(['deps', info.org.slug], `/api/o/${info.org.slug}/departments`);
  const [inv, setInv] = useState(false); const [email, setEmail] = useState(''); const [role, setRole] = useState('staff'); const [busy, setBusy] = useState(false); const [rm, setRm] = useState<any>(null);
  const allRoles = [...SYSTEM_ROLES, ...(roles.data?.custom || [])].filter((r) => r.key !== 'owner' || info.role.key === 'owner');
  const refresh = () => qc.invalidateQueries({ queryKey: ['members', info.org.slug] });
  async function patch(id: number, body: any) { try { await api(`/api/o/${info.org.slug}/members/${id}`, { method: 'PATCH', body }); toast('Member updated'); refresh(); } catch (x) { toast(errText(x), 'err'); } }
  async function invite(e: React.FormEvent) { e.preventDefault(); setBusy(true); try { await api(`/api/o/${info.org.slug}/invites`, { method: 'POST', body: { email, role } }); toast('Invite saved'); setInv(false); setEmail(''); refresh(); } catch (x) { toast(errText(x), 'err'); } finally { setBusy(false); } }
  if (!can(info, 'members.manage')) return <Empty title="Admins only" body="Your role can't manage members." />;
  if (m.isLoading) return <Skeleton className="h-64" />; if (m.error) return <ErrorBox error={errText(m.error)} retry={() => m.refetch()} />;
  const link = `${location.origin}/register`;
  return <div className="space-y-4">
    <div className="flex justify-end"><button className="btn-brand" onClick={() => setInv(true)}><UserPlus size={16} /> Invite member</button></div>
    <section className="panel overflow-x-auto"><table className="w-full min-w-[640px] text-sm"><thead className="bg-surface-2/60 text-left text-xs text-muted"><tr><th className="px-4 py-2">Member</th><th className="px-3 py-2">Role</th><th className="px-3 py-2">Department</th><th className="px-3 py-2">Status</th><th className="px-3 py-2">Last seen</th><th /></tr></thead>
      <tbody>{m.data.members.map((x: any) => <tr key={x.id} className="border-t border-line/70"><td className="px-4 py-2"><span className="font-semibold">{x.name || '(no name)'}</span><span className="block text-xs text-muted">{x.email}</span></td>
        <td className="px-3 py-2"><select aria-label={`Role for ${x.email}`} className="input h-8 w-auto" value={x.role} disabled={x.role === 'owner' && info.role.key !== 'owner'} onChange={(e) => patch(x.id, { role: e.target.value })}>{[...SYSTEM_ROLES, ...(roles.data?.custom || [])].map((r: any) => <option key={r.key} value={r.key} disabled={r.key === 'owner' && info.role.key !== 'owner'}>{r.name}</option>)}</select></td>
        <td className="px-3 py-2"><select aria-label={`Department for ${x.email}`} className="input h-8 w-auto" value={x.department_id ?? ''} onChange={(e) => patch(x.id, { department_id: e.target.value ? Number(e.target.value) : null })}><option value="">(none)</option>{(deps.data?.departments || []).map((d: any) => <option key={d.id} value={d.id}>{d.name}</option>)}</select></td>
        <td className="px-3 py-2"><select aria-label={`Status for ${x.email}`} className="input h-8 w-auto" value={x.status} onChange={(e) => patch(x.id, { status: e.target.value })}><option value="active">Active</option><option value="disabled">Disabled</option></select></td>
        <td className="px-3 py-2 text-xs text-muted">{x.last_seen ? ago(x.last_seen) : '·'}</td>
        <td className="px-3 py-2 text-right">{x.role !== 'owner' && <button className="btn-ghost h-8 w-8 px-0 text-danger" aria-label={`Remove ${x.email}`} onClick={() => setRm(x)}><Trash size={16} /></button>}</td></tr>)}</tbody></table></section>
    {m.data.invites.length > 0 && <section className="panel p-4"><h3 className="font-display font-semibold">Pending invites</h3>
      <p className="mt-1 text-sm text-muted">No email is sent from here yet. Send them this sign-up link yourself; the invite appears for them after they sign up with the invited email and verify it.</p>
      <div className="mt-2 flex items-center gap-2"><input className="input max-w-sm font-mono text-xs" readOnly value={link} aria-label="Sign-up link" /><button className="btn-line" onClick={() => { navigator.clipboard?.writeText(link); toast('Link copied'); }}><Copy size={16} /> Copy</button></div>
      <ul className="mt-3 divide-y divide-line text-sm">{m.data.invites.map((i: any) => <li key={i.id} className="flex items-center justify-between py-2"><span>{i.email} <span className="text-muted">as {i.role} · {ago(i.created_at)}</span></span>
        <button className="btn-ghost h-8 text-danger" onClick={async () => { try { await api(`/api/o/${info.org.slug}/invites/${i.id}`, { method: 'DELETE' }); refresh(); toast('Invite revoked'); } catch (x) { toast(errText(x), 'err'); } }}>Revoke</button></li>)}</ul></section>}
    <Modal open={inv} onClose={() => setInv(false)} title="Invite a member" footer={<><button className="btn-ghost" onClick={() => setInv(false)}>Cancel</button><button className="btn-primary" form="inv-form" disabled={busy}>{busy ? 'Saving…' : 'Save invite'}</button></>}>
      <form id="inv-form" onSubmit={invite} className="space-y-4"><Field label="Email" htmlFor="inv-email" required><input id="inv-email" className="input" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} /></Field>
        <Field label="Role" htmlFor="inv-role" hint={allRoles.find((r: any) => r.key === role)?.description}><select id="inv-role" className="input" value={role} onChange={(e) => setRole(e.target.value)}>{allRoles.map((r: any) => <option key={r.key} value={r.key}>{r.name}</option>)}</select></Field></form>
    </Modal>
    <Confirm open={!!rm} onClose={() => setRm(null)} title="Remove member?" body={<>Remove <b>{rm?.email}</b> from {info.org.name}? Their records stay.</>} confirmText="Remove" onConfirm={async () => { try { await api(`/api/o/${info.org.slug}/members/${rm.id}`, { method: 'DELETE' }); toast('Removed'); setRm(null); refresh(); } catch (x) { toast(errText(x), 'err'); } }} />
  </div>;
}
function RoleEditor({ open, onClose, initial, onSaved }: { open: boolean; onClose: () => void; initial: any; onSaved: () => void }) {
  const info = useOrg(); const api = useApi(); const toast = useUI((s) => s.toast);
  const [r, setR] = useState<any>(initial); useEffect(() => setR(initial), [initial]);
  const [busy, setBusy] = useState(false);
  if (!r) return null;
  const toggle = (arr: string[], v: string) => (arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v]);
  async function save() { setBusy(true); try { await api(`/api/o/${info.org.slug}/roles${r.key ? '/' + r.key : ''}`, { method: r.key ? 'PUT' : 'POST', body: r }); toast('Role saved'); onSaved(); onClose(); } catch (x) { toast(errText(x), 'err'); } finally { setBusy(false); } }
  return <Modal open={open} onClose={onClose} title={r.key ? `Edit ${r.name}` : 'New custom role'} wide footer={<><button className="btn-ghost" onClick={onClose}>Cancel</button><button className="btn-primary" disabled={busy || (r.name || '').trim().length < 2} onClick={save}>{busy ? 'Saving…' : 'Save role'}</button></>}>
    <div className="space-y-5 text-sm">
      <div className="grid gap-3 sm:grid-cols-2"><Field label="Name" htmlFor="r-name" required><input id="r-name" className="input" value={r.name} onChange={(e) => setR({ ...r, name: e.target.value })} /></Field>
        <Field label="Description" htmlFor="r-desc"><input id="r-desc" className="input" value={r.description || ''} onChange={(e) => setR({ ...r, description: e.target.value })} /></Field></div>
      <label className="flex items-center gap-2"><input type="checkbox" checked={!!r.ownOnly} onChange={(e) => setR({ ...r, ownOnly: e.target.checked })} /> Portal role: sees only records they created</label>
      <div><p className="font-semibold">Workspace permissions</p><div className="mt-2 flex flex-wrap gap-2">{ORG_PERMS.map((p) => <label key={p} className="chip cursor-pointer font-normal"><input type="checkbox" checked={r.org.includes(p)} onChange={() => setR({ ...r, org: toggle(r.org, p) })} />{PERM_LABEL[p]}</label>)}</div></div>
      <div><p className="font-semibold">Every module by default</p><div className="mt-2 flex flex-wrap gap-2">{MODULE_ACTIONS.map((a) => <label key={a} className="chip cursor-pointer font-normal capitalize"><input type="checkbox" checked={r.modules.default.includes(a)} onChange={() => setR({ ...r, modules: { ...r.modules, default: toggle(r.modules.default, a) } })} />{a}</label>)}</div></div>
      <div><p className="font-semibold">Overrides by category</p><p className="text-xs text-muted">Leave a row at “default” to inherit.</p>
        <div className="mt-2 max-h-72 overflow-y-auto rounded-ctl border border-line">{CATEGORIES.map((c) => { const v = r.modules.categories?.[c.key]; return <div key={c.key} className="flex flex-wrap items-center gap-2 border-b border-line/70 px-3 py-2 last:border-0">
          <span className="w-44 font-semibold">{c.name}</span>
          <label className="chip cursor-pointer font-normal"><input type="checkbox" checked={v === undefined} onChange={(e) => { const cats = { ...(r.modules.categories || {}) }; if (e.target.checked) delete cats[c.key]; else cats[c.key] = [...r.modules.default]; setR({ ...r, modules: { ...r.modules, categories: cats } }); }} />default</label>
          {v !== undefined && MODULE_ACTIONS.map((a) => <label key={a} className="chip cursor-pointer font-normal capitalize"><input type="checkbox" checked={v.includes(a)} onChange={() => setR({ ...r, modules: { ...r.modules, categories: { ...r.modules.categories, [c.key]: toggle(v, a) } } })} />{a}</label>)}</div>; })}</div></div>
    </div>
  </Modal>;
}
function Roles() {
  const info = useOrg(); const api = useApi(); const qc = useQueryClient(); const toast = useUI((s) => s.toast);
  const roles = useGet<any>(['roles', info.org.slug], `/api/o/${info.org.slug}/roles`); const [edit, setEdit] = useState<any>(null); const [del, setDel] = useState<any>(null);
  const refresh = () => { qc.invalidateQueries({ queryKey: ['roles', info.org.slug] }); qc.invalidateQueries({ queryKey: ['org', info.org.slug] }); };
  if (roles.isLoading) return <Skeleton className="h-64" />; if (roles.error) return <ErrorBox error={errText(roles.error)} />;
  const manage = can(info, 'roles.manage');
  const summary = (r: any) => `${r.modules.default.length ? r.modules.default.join(', ') : 'no access'} by default${r.modules.categories && Object.keys(r.modules.categories).length ? `; ${Object.keys(r.modules.categories).length} category override(s)` : ''}${r.ownOnly ? '; own records only' : ''}`;
  return <div className="space-y-4">
    {manage && <div className="flex justify-end"><button className="btn-brand" onClick={() => setEdit({ name: '', description: '', org: [], modules: { default: ['view'], categories: {} }, ownOnly: false })}><Plus size={16} /> New custom role</button></div>}
    <section className="panel divide-y divide-line">{[...roles.data.system, ...roles.data.custom].map((r: any) => <div key={r.key} className="flex flex-col gap-1 p-4 sm:flex-row sm:items-center">
      <div className="flex-1"><p className="font-semibold">{r.name} {r.system ? <span className="chip ml-1">built-in</span> : <span className="chip ml-1 border-brand/40 text-brand">custom</span>}</p><p className="text-sm text-muted">{r.description}</p>
        <p className="mt-1 text-xs text-ink-2">{r.org.length ? r.org.map((p: string) => PERM_LABEL[p]).join(' · ') : 'No workspace admin rights'}. Modules: {summary(r)}</p></div>
      {!r.system && manage && <div className="flex gap-1"><button className="btn-ghost h-8" onClick={() => setEdit(r)}><PencilSimple size={16} /> Edit</button><button className="btn-ghost h-8 text-danger" onClick={() => setDel(r)}><Trash size={16} /></button></div>}
    </div>)}</section>
    <RoleEditor open={!!edit} onClose={() => setEdit(null)} initial={edit} onSaved={refresh} />
    <Confirm open={!!del} onClose={() => setDel(null)} title="Delete role?" body={<>Delete <b>{del?.name}</b>? Members must be moved off it first.</>} onConfirm={async () => { try { await api(`/api/o/${info.org.slug}/roles/${del.key}`, { method: 'DELETE' }); toast('Role deleted'); setDel(null); refresh(); } catch (x) { toast(errText(x), 'err'); } }} />
  </div>;
}
function Departments() {
  const info = useOrg(); const api = useApi(); const qc = useQueryClient(); const toast = useUI((s) => s.toast);
  const d = useGet<any>(['deps', info.org.slug], `/api/o/${info.org.slug}/departments`); const [name, setName] = useState('');
  const refresh = () => qc.invalidateQueries({ queryKey: ['deps', info.org.slug] });
  return <section className="panel p-5 max-w-xl"><h2 className="font-display text-lg font-semibold">Departments</h2>
    {can(info, 'org.settings') && <form className="mt-3 flex gap-2" onSubmit={async (e) => { e.preventDefault(); try { await api(`/api/o/${info.org.slug}/departments`, { method: 'POST', body: { name } }); setName(''); refresh(); toast('Department added'); } catch (x) { toast(errText(x), 'err'); } }}>
      <input className="input" aria-label="Department name" placeholder="e.g. Accounts" value={name} onChange={(e) => setName(e.target.value)} /><button className="btn-primary" disabled={name.trim().length < 2}>Add</button></form>}
    {d.isLoading ? <Skeleton className="mt-3 h-24" /> : (d.data?.departments || []).length === 0 ? <p className="mt-4 text-sm text-muted">No departments yet.</p> :
      <ul className="mt-3 divide-y divide-line text-sm">{d.data.departments.map((x: any) => <li key={x.id} className="flex items-center justify-between py-2"><span>{x.name} <span className="text-muted">· {x.members} members</span></span>
        {can(info, 'org.settings') && <button className="btn-ghost h-8 text-danger" aria-label={`Delete ${x.name}`} onClick={async () => { try { await api(`/api/o/${info.org.slug}/departments/${x.id}`, { method: 'DELETE' }); refresh(); } catch (e) { toast(errText(e), 'err'); } }}><Trash size={16} /></button>}</li>)}</ul>}
  </section>;
}
export default function Settings() {
  const [sp, setSp] = useSearchParams(); const tab = (sp.get('tab') || 'general') as any;
  return <div><PageHead eyebrow="Settings" title="Workspace settings" />
    <Tabs value={tab} onChange={(t) => setSp({ tab: t })} items={[{ key: 'general', label: 'General & appearance' }, { key: 'members', label: 'Members' }, { key: 'roles', label: 'Roles & permissions' }, { key: 'departments', label: 'Departments' }]} />
    <div className="mt-4">{tab === 'general' && <General />}{tab === 'members' && <Members />}{tab === 'roles' && <Roles />}{tab === 'departments' && <Departments />}</div></div>;
}
