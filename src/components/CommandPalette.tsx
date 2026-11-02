import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { MagnifyingGlass, ArrowElbowDownLeft, Sun, Moon, SquaresFour, Storefront, GearSix, ClockCounterClockwise, Lifebuoy, ShieldStar, FileText, Plus } from '@phosphor-icons/react';
import { MODULES, getModule, getCategory } from '../../shared/registry';
import { useGet } from '../lib/api';
import { useUI } from '../lib/store';
import { CatIcon } from './Brand';
import type { OrgInfo } from './AppShell';

interface Item { id: string; label: string; hint?: string; icon: React.ReactNode; run: () => void; group: string }
export default function CommandPalette({ info, isSuper }: { info: OrgInfo; isSuper: boolean }) {
  const { paletteOpen: open, setPalette, setTheme } = useUI(); const nav = useNavigate();
  const [q, setQ] = useState(''); const [dq, setDq] = useState(''); const [sel, setSel] = useState(0); const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => { const t = setTimeout(() => setDq(q.trim()), 180); return () => clearTimeout(t); }, [q]);
  useEffect(() => { if (open) { setQ(''); setSel(0); setTimeout(() => inputRef.current?.focus(), 20); } }, [open]);
  const base = `/app/${info.org.slug}`;
  const search = useGet<any>(['search', info.org.slug, dq], open && dq.length >= 2 ? `/api/o/${info.org.slug}/search?q=${encodeURIComponent(dq)}` : null);
  const go = (to: string) => () => { setPalette(false); nav(to); };
  const items = useMemo<Item[]>(() => {
    const ql = q.toLowerCase();
    const nav: Item[] = [
      { id: 'n-dash', label: 'Dashboard', icon: <SquaresFour size={16} />, run: go(`${base}/dashboard`), group: 'Go to' },
      { id: 'n-mkt', label: 'Module marketplace', icon: <Storefront size={16} />, run: go(`${base}/marketplace`), group: 'Go to' },
      { id: 'n-set', label: 'Settings: members, roles, appearance', icon: <GearSix size={16} />, run: go(`${base}/settings`), group: 'Go to' },
      { id: 'n-aud', label: 'Audit log', icon: <ClockCounterClockwise size={16} />, run: go(`${base}/audit`), group: 'Go to' },
      { id: 'n-sup', label: 'Help & support', icon: <Lifebuoy size={16} />, run: go(`${base}/support`), group: 'Go to' },
      ...(isSuper ? [{ id: 'n-adm', label: 'Super admin panel', icon: <ShieldStar size={16} />, run: go(`${base}/admin`), group: 'Go to' }] : []),
      { id: 'a-light', label: 'Switch to light theme', icon: <Sun size={16} />, run: () => { setTheme('light'); setPalette(false); }, group: 'Actions' },
      { id: 'a-dark', label: 'Switch to dark theme', icon: <Moon size={16} />, run: () => { setTheme('dark'); setPalette(false); }, group: 'Actions' },
      { id: 'a-org', label: 'Create another workspace', icon: <Plus size={16} />, run: go('/onboarding'), group: 'Actions' },
    ];
    const active: Item[] = info.modules.filter((k) => info.permissions[k]?.includes('view')).map((k) => { const m = getModule(k)!; return { id: 'm-' + k, label: m.name, hint: getCategory(m.category)?.name, icon: <CatIcon name={getCategory(m.category)!.icon} size={16} />, run: go(`${base}/m/${k}`), group: 'Your modules' }; });
    const others: Item[] = ql.length >= 2 ? MODULES.filter((m) => !info.modules.includes(m.key) && (m.name.toLowerCase().includes(ql) || m.description.toLowerCase().includes(ql))).slice(0, 6).map((m) => ({ id: 'x-' + m.key, label: m.name, hint: 'in marketplace', icon: <Storefront size={16} />, run: go(`${base}/marketplace?q=${encodeURIComponent(m.name)}`), group: 'Marketplace' })) : [];
    const recs: Item[] = (search.data?.records || []).map((r: any) => ({ id: 'r-' + r.id, label: r.title, hint: `${getModule(r.module_key)?.name ?? r.module_key}${r.status ? ' · ' + r.status : ''}`, icon: <FileText size={16} />, run: go(`${base}/m/${r.module_key}?e=${r.entity_key}&open=${r.id}`), group: 'Records' }));
    const mem: Item[] = (search.data?.members || []).map((m: any, i: number) => ({ id: 'p-' + i, label: m.name || m.email, hint: m.role, icon: <GearSix size={16} />, run: go(`${base}/settings?tab=members`), group: 'People' }));
    const match = (i: Item) => !ql || i.label.toLowerCase().includes(ql) || (i.hint || '').toLowerCase().includes(ql);
    return [...recs, ...mem, ...active.filter(match).slice(0, ql ? 12 : 6), ...others, ...nav.filter(match)];
  }, [q, info, search.data, isSuper]);
  useEffect(() => { setSel(0); }, [items.length]);
  function onKey(e: React.KeyboardEvent) {
    if (e.key === 'Escape') setPalette(false);
    else if (e.key === 'ArrowDown') { e.preventDefault(); setSel((s) => Math.min(items.length - 1, s + 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setSel((s) => Math.max(0, s - 1)); }
    else if (e.key === 'Enter' && items[sel]) { e.preventDefault(); items[sel].run(); }
  }
  let lastGroup = '';
  return <AnimatePresence>{open && <motion.div className="fixed inset-0 z-[55] flex items-start justify-center px-3 pt-[12vh]" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
    <div className="absolute inset-0 bg-[#081114]/45" onClick={() => setPalette(false)} />
    <motion.div role="dialog" aria-modal="true" aria-label="Command palette" className="glass relative w-full max-w-xl overflow-hidden rounded-sheet" initial={{ y: -10, scale: 0.98 }} animate={{ y: 0, scale: 1 }} exit={{ y: -6, opacity: 0 }}>
      <div className="flex items-center gap-2 border-b border-line/70 px-4"><MagnifyingGlass size={18} className="text-muted" />
        <input ref={inputRef} value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={onKey} placeholder="Search records, jump to a module, run an action" className="h-12 flex-1 bg-transparent text-[15px] outline-none placeholder:text-muted" role="combobox" aria-expanded="true" aria-controls="cmd-list" aria-activedescendant={items[sel]?.id} />
        {search.isFetching && <span className="text-xs text-muted">searching…</span>}<span className="kbd">esc</span></div>
      <ul id="cmd-list" role="listbox" className="max-h-[56vh] overflow-y-auto p-2 bg-surface/50">
        {items.length === 0 && <li className="px-3 py-8 text-center text-sm text-muted">Nothing matches “{q}”.</li>}
        {items.map((it, i) => { const head = it.group !== lastGroup ? (lastGroup = it.group) : null; return <li key={it.id}>
          {head && <p className="eyebrow px-3 pb-1 pt-2">{head}</p>}
          <button id={it.id} role="option" aria-selected={i === sel} onMouseEnter={() => setSel(i)} onClick={it.run} className={'flex w-full items-center gap-3 rounded-ctl px-3 py-2 text-left text-sm ' + (i === sel ? 'bg-brand/15 text-ink' : 'text-ink-2')}>
            <span className="text-muted">{it.icon}</span><span className="flex-1 truncate">{it.label}</span>{it.hint && <span className="truncate text-xs text-muted max-w-[40%]">{it.hint}</span>}{i === sel && <ArrowElbowDownLeft size={14} className="text-muted" />}</button></li>; })}
      </ul>
    </motion.div></motion.div>}</AnimatePresence>;
}
