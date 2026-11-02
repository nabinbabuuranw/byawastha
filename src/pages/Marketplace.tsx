import { useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { MagnifyingGlass, CheckCircle, Power, ArrowSquareOut, Info } from '@phosphor-icons/react';
import { CATEGORIES, MODULES, getCategory, type ModuleDef } from '../../shared/registry';
import { useApi, useGet, errText } from '../lib/api';
import { useOrg, can } from '../components/AppShell';
import { CatIcon } from '../components/Brand';
import { PageHead, Modal, Empty, Skeleton } from '../components/ui';
import { useUI } from '../lib/store';

const TYPE_LABEL: Record<string, string> = { text: 'text', long: 'long text', num: 'number', money: 'amount', date: 'date', dt: 'date & time', email: 'email', phone: 'phone', url: 'link', bool: 'yes/no', sel: 'choice', ref: 'link to' };
export default function Marketplace() {
  const info = useOrg(); const api = useApi(); const qc = useQueryClient(); const toast = useUI((s) => s.toast);
  const [sp, setSp] = useSearchParams(); const [q, setQ] = useState(sp.get('q') || ''); const [cat, setCat] = useState<string>(sp.get('cat') || 'all'); const [show, setShow] = useState<'all' | 'on' | 'off'>('all');
  const [open, setOpen] = useState<ModuleDef | null>(null); const [busy, setBusy] = useState<string | null>(null);
  const mods = useGet<any>(['modules', info.org.slug], `/api/o/${info.org.slug}/modules`);
  const state = useMemo(() => Object.fromEntries((mods.data?.modules || []).map((m: any) => [m.key, m])), [mods.data]);
  const manage = can(info, 'modules.manage');
  const list = useMemo(() => {
    const ql = q.trim().toLowerCase();
    return MODULES.filter((m) => (cat === 'all' || m.category === cat) && (!ql || m.name.toLowerCase().includes(ql) || m.description.toLowerCase().includes(ql) || m.entities.some((e) => e.name.toLowerCase().includes(ql)))
      && (show === 'all' || (show === 'on' ? state[m.key]?.enabled : !state[m.key]?.enabled)));
  }, [q, cat, show, state]);
  async function toggle(m: ModuleDef, on: boolean) {
    setBusy(m.key);
    try { await api(`/api/o/${info.org.slug}/modules/${m.key}/${on ? 'activate' : 'deactivate'}`, { method: 'POST' });
      await Promise.all([qc.invalidateQueries({ queryKey: ['modules', info.org.slug] }), qc.invalidateQueries({ queryKey: ['org', info.org.slug] })]);
      toast(on ? `${m.name} is on` : `${m.name} turned off. Its records are kept.`, on ? 'ok' : 'info'); }
    catch (x) { toast(errText(x), 'err'); } finally { setBusy(null); }
  }
  const activeCount = Object.values(state).filter((m: any) => m.enabled).length;
  return <div>
    <PageHead eyebrow="Module marketplace" title={`${MODULES.length} management systems, switch on what you run`} desc={<>Every module runs on the same engine: add, edit, delete, search, filter, sort, CSV import and export, role permissions and an audit trail. All are free while billing is off. <b className="text-ink">{activeCount}</b> on in {info.org.name}.</>} />
    <div className="grid gap-4 lg:grid-cols-[220px_minmax(0,1fr)]">
      <nav aria-label="Categories" className="min-w-0 lg:sticky lg:top-24 lg:self-start">
        <div className="no-scrollbar flex gap-1 overflow-x-auto pb-1 lg:flex-col lg:overflow-visible">
          {[{ key: 'all', name: 'All categories', icon: 'SquaresFour', n: MODULES.length }, ...CATEGORIES.map((c) => ({ key: c.key, name: c.name, icon: c.icon, n: c.modules.length }))].map((c) =>
            <button key={c.key} onClick={() => { setCat(c.key); setSp(c.key === 'all' ? {} : { cat: c.key }); }} aria-pressed={cat === c.key}
              className={'flex shrink-0 items-center gap-2 rounded-ctl px-2.5 py-1.5 text-left text-sm ' + (cat === c.key ? 'bg-primary text-on-primary font-semibold' : 'text-ink-2 hover:bg-surface-2/70')}>
              <CatIcon name={c.icon} size={16} className={cat === c.key ? 'text-on-primary' : 'text-muted'} /><span className="flex-1 truncate">{c.name}</span><span className={'text-xs tabular ' + (cat === c.key ? 'text-on-primary/80' : 'text-muted')}>{c.n}</span></button>)}
        </div>
      </nav>
      <section className="min-w-0">
        <div className="mb-3 flex flex-col gap-2 sm:flex-row">
          <label className="relative flex-1"><span className="sr-only">Search modules</span><MagnifyingGlass size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
            <input className="input pl-9" placeholder="Search: pharmacy, payroll, tournament, rent…" value={q} onChange={(e) => setQ(e.target.value)} /></label>
          <div className="flex rounded-ctl border border-line bg-surface p-0.5 text-sm" role="group" aria-label="Show">
            {(['all', 'on', 'off'] as const).map((s) => <button key={s} onClick={() => setShow(s)} aria-pressed={show === s} className={'rounded-[5px] px-3 py-1 ' + (show === s ? 'bg-primary text-on-primary font-semibold' : 'text-ink-2')}>{s === 'all' ? 'All' : s === 'on' ? 'Active' : 'Not active'}</button>)}
          </div>
        </div>
        {!manage && <p className="mb-3 flex items-center gap-2 text-sm text-muted"><Info size={16} /> Only owners and admins can switch modules on or off. You can still browse.</p>}
        {mods.isLoading ? <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">{Array.from({ length: 9 }).map((_, i) => <Skeleton key={i} className="h-24" />)}</div> :
          list.length === 0 ? <Empty title="No module matches" body="Try a broader word, or another category." icon={<MagnifyingGlass size={20} />} /> :
          <ul className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">{list.map((m) => { const on = !!state[m.key]?.enabled; const c = getCategory(m.category)!; return <li key={m.key}>
            <div className={'group flex h-full flex-col rounded-panel border bg-surface p-3.5 transition-colors ' + (on ? 'border-primary/50' : 'border-line hover:border-ink-2/30')}>
              <button className="text-left" onClick={() => setOpen(m)}>
                <span className="flex items-start gap-2"><CatIcon name={c.icon} className="mt-0.5 text-muted" /><span className="flex-1 font-semibold leading-snug">{m.name}</span>{on && <CheckCircle size={18} weight="fill" className="text-ok" aria-label="Active" />}</span>
                <span className="mt-1 block text-[13px] leading-snug text-muted line-clamp-2">{m.description}</span>
              </button>
              <div className="mt-auto flex items-center gap-2 pt-3 text-xs">
                <span className="chip">{m.entities.length} {m.entities.length === 1 ? 'table' : 'tables'}</span><span className="chip">Standard</span>
                <span className="ml-auto flex gap-1">
                  {on && <Link to={`/app/${info.org.slug}/m/${m.key}`} className="btn-ghost h-7 px-2 text-xs">Open</Link>}
                  {manage && <button className={(on ? 'btn-line' : 'btn-primary') + ' h-7 px-2.5 text-xs'} disabled={busy === m.key} onClick={() => toggle(m, !on)}>{busy === m.key ? '…' : on ? 'Turn off' : 'Activate'}</button>}
                </span>
              </div>
            </div></li>; })}</ul>}
      </section>
    </div>
    <Modal open={!!open} onClose={() => setOpen(null)} title={open?.name || ''} wide footer={open && <>
      {state[open.key]?.enabled && <Link className="btn-line" to={`/app/${info.org.slug}/m/${open.key}`} onClick={() => setOpen(null)}><ArrowSquareOut size={16} /> Open workspace</Link>}
      {manage && <button className={state[open.key]?.enabled ? 'btn-line' : 'btn-brand'} disabled={busy === open.key} onClick={() => toggle(open, !state[open.key]?.enabled)}><Power size={16} /> {state[open.key]?.enabled ? 'Turn off' : 'Activate for ' + info.org.name}</button>}</>}>
      {open && <div className="space-y-4 text-sm">
        <p className="text-ink-2">{open.description}. <span className="text-muted">Category: {getCategory(open.category)!.name}.</span></p>
        <p className="rounded-ctl border border-line bg-surface-2/60 p-3 text-[13px] text-ink-2"><b>Standard module.</b> Runs on the shared engine (CRUD, search, filters, sort, pages, CSV in/out, per-role permissions, audit, dashboard counts). Domain-specific automations (e.g. auto-billing, schedules) are planned in later phases and are not in it yet.</p>
        {open.entities.map((e) => <div key={e.key}><p className="font-semibold">{e.name}</p>
          <div className="mt-1.5 flex flex-wrap gap-1.5">{e.fields.map((f) => <span key={f.key} className="chip font-normal">{f.label}<span className="text-muted">· {TYPE_LABEL[f.type]}{f.type === 'ref' ? ' ' + (open.entities.find((x) => x.key === f.ref)?.name || '') : ''}{f.required ? ' · required' : ''}</span></span>)}</div></div>)}
        {state[open.key] && <p className="text-xs text-muted">{state[open.key].records} records in this workspace.</p>}
      </div>}
    </Modal>
  </div>;
}
