import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { NavLink, Outlet, useNavigate, useParams, Link, useLocation } from 'react-router-dom';
import { UserButton } from '@clerk/clerk-react';
import { AnimatePresence, motion } from 'framer-motion';
import { SquaresFour, Storefront, GearSix, ClockCounterClockwise, Bell, MagnifyingGlass, Sun, Moon, List, X, ShieldStar, Lifebuoy, CaretDown, CaretUpDown, Plus } from '@phosphor-icons/react';
import { CATEGORIES, getModule } from '../../shared/registry';
import { useApi, useGet, errText } from '../lib/api';
import { useUI } from '../lib/store';
import { CatIcon, Wordmark } from './Brand';
import { ErrorBox, Skeleton } from './ui';
import CommandPalette from './CommandPalette';

export interface OrgInfo { org: { id: number; slug: string; name: string; industry: string; accent: string; plan: string }; role: { key: string; name: string; org: string[]; ownOnly: boolean }; modules: string[]; permissions: Record<string, string[]> }
const OrgCtx = createContext<OrgInfo | null>(null);
export const useOrg = () => useContext(OrgCtx)!;
export const can = (o: OrgInfo, perm: string) => o.role.org.includes(perm);
export const canMod = (o: OrgInfo, mod: string, action: string) => !!o.permissions[mod]?.includes(action);

function ThemeToggle() {
  const { theme, setTheme } = useUI();
  const next = theme === 'dark' ? 'light' : 'dark';
  const dark = document.documentElement.classList.contains('dark');
  return <button className="btn-ghost h-9 w-9 px-0" onClick={() => setTheme(next)} aria-label={`Switch to ${dark ? 'light' : 'dark'} theme`} title="Theme">{dark ? <Sun size={18} /> : <Moon size={18} />}</button>;
}
function OrgSwitcher({ me, current }: { me: any; current: OrgInfo }) {
  const [open, setOpen] = useState(false);
  return <div className="relative">
    <button className="flex w-full items-center gap-2.5 rounded-ctl px-2 py-2 text-left hover:bg-surface-2/70" onClick={() => setOpen(!open)} aria-expanded={open}>
      <span className="grid h-8 w-8 shrink-0 place-items-center rounded-ctl bg-primary text-on-primary font-display font-semibold">{current.org.name.slice(0, 1).toUpperCase()}</span>
      <span className="min-w-0 flex-1"><span className="block truncate text-sm font-semibold">{current.org.name}</span><span className="block truncate text-[11px] text-muted">{current.role.name}</span></span>
      <CaretUpDown size={14} className="text-muted" />
    </button>
    {open && <div className="glass absolute left-0 right-0 top-full z-30 mt-1 rounded-panel p-1" onMouseLeave={() => setOpen(false)}>
      {(me?.orgs || []).map((o: any) => <Link key={o.slug} to={`/app/${o.slug}/dashboard`} onClick={() => setOpen(false)} className={'block rounded-ctl px-3 py-2 text-sm hover:bg-surface-2 ' + (o.slug === current.org.slug ? 'font-semibold' : '')}>{o.name}</Link>)}
      <Link to="/onboarding" className="flex items-center gap-2 rounded-ctl px-3 py-2 text-sm text-primary hover:bg-surface-2"><Plus size={14} /> New workspace</Link>
    </div>}
  </div>;
}
function Sidebar({ info, me, onNav }: { info: OrgInfo; me: any; onNav?: () => void }) {
  const base = `/app/${info.org.slug}`;
  const [closed, setClosed] = useState<Record<string, boolean>>({});
  const groups = useMemo(() => CATEGORIES.map((c) => ({ c, mods: info.modules.filter((k) => getModule(k)?.category === c.key && info.permissions[k]?.includes('view')) })).filter((g) => g.mods.length), [info]);
  const item = 'flex items-center gap-2.5 rounded-ctl px-2.5 py-1.5 text-sm transition-colors';
  const cls = ({ isActive }: { isActive: boolean }) => item + (isActive ? ' bg-surface/90 text-ink font-semibold ring-1 ring-line' : ' text-ink-2 hover:bg-surface-2/70');
  return <nav aria-label="Workspace" className="flex h-full flex-col gap-1 overflow-y-auto p-3 text-sm">
    <OrgSwitcher me={me} current={info} />
    <div className="my-2 h-px bg-line/70" />
    <NavLink to={`${base}/dashboard`} className={cls} onClick={onNav}><SquaresFour size={18} weight="duotone" /> Dashboard</NavLink>
    <NavLink to={`${base}/marketplace`} className={cls} onClick={onNav}><Storefront size={18} weight="duotone" /> Marketplace</NavLink>
    <p className="eyebrow mt-4 mb-1 px-2.5">Modules · {info.modules.length}</p>
    {groups.length === 0 && <p className="px-2.5 text-xs text-muted">No modules on yet. Open the marketplace to switch some on.</p>}
    {groups.map(({ c, mods }) => <div key={c.key}>
      <button className="flex w-full items-center gap-2 rounded-ctl px-2.5 py-1.5 text-xs font-semibold text-muted hover:text-ink" onClick={() => setClosed({ ...closed, [c.key]: !closed[c.key] })} aria-expanded={!closed[c.key]}>
        <CatIcon name={c.icon} size={15} /> <span className="flex-1 text-left truncate">{c.name}</span><CaretDown size={12} className={'transition-transform ' + (closed[c.key] ? '-rotate-90' : '')} /></button>
      {!closed[c.key] && <div className="ml-3 border-l border-line/70 pl-2">{mods.map((k) => <NavLink key={k} to={`${base}/m/${k}`} className={cls} onClick={onNav}><span className="truncate">{getModule(k)!.name.replace(/ Management$/, '')}</span></NavLink>)}</div>}
    </div>)}
    <div className="mt-auto pt-4 space-y-0.5">
      {can(info, 'audit.view') && <NavLink to={`${base}/audit`} className={cls} onClick={onNav}><ClockCounterClockwise size={18} weight="duotone" /> Audit log</NavLink>}
      {(can(info, 'org.settings') || can(info, 'members.manage') || can(info, 'roles.manage')) && <NavLink to={`${base}/settings`} className={cls} onClick={onNav}><GearSix size={18} weight="duotone" /> Settings</NavLink>}
      <NavLink to={`${base}/support`} className={cls} onClick={onNav}><Lifebuoy size={18} weight="duotone" /> Help & support</NavLink>
      {me?.user?.is_super && <NavLink to={`${base}/admin`} className={cls} onClick={onNav}><ShieldStar size={18} weight="duotone" /> Super admin</NavLink>}
    </div>
  </nav>;
}
export default function AppShell() {
  const { org } = useParams(); const api = useApi(); const nav = useNavigate(); const loc = useLocation();
  const info = useGet<OrgInfo>(['org', org], `/api/o/${org}`);
  const me = useGet<any>(['me'], '/api/me');
  const notes = useGet<any>(['notifications'], '/api/notifications', { refetchInterval: 30_000 });
  const { setPalette, navOpen, setNav, setAccent } = useUI();
  useEffect(() => {
    const k = (e: KeyboardEvent) => { if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); setPalette(true); } };
    window.addEventListener('keydown', k); return () => window.removeEventListener('keydown', k);
  }, [setPalette]);
  useEffect(() => { if (info.data?.org.accent) setAccent(info.data.org.accent as any); }, [info.data?.org.accent, setAccent]);
  useEffect(() => { if (org && me.data && me.data.user.prefs?.last_org !== org) api('/api/me/prefs', { method: 'PATCH', body: { prefs: { last_org: org } } }).catch(() => {}); }, [org, me.data, api]);
  useEffect(() => { setNav(false); }, [loc.pathname, setNav]);
  if (info.isLoading) return <div className="grid min-h-full lg:grid-cols-[264px_1fr]"><div className="hidden lg:block border-r border-line p-4 space-y-3">{Array.from({ length: 9 }).map((_, i) => <Skeleton key={i} className="h-7 w-full" />)}</div><div className="p-8 space-y-4"><Skeleton className="h-9 w-72" /><Skeleton className="h-48 w-full" /></div></div>;
  if (info.error) return <div className="contours min-h-full p-6"><div className="relative z-10 mx-auto max-w-lg pt-16"><ErrorBox error={errText(info.error)} retry={() => info.refetch()} /><div className="text-center"><button className="btn-line" onClick={() => nav('/app')}>Go to my workspaces</button></div></div></div>;
  const unread = notes.data?.unread ?? 0;
  return <OrgCtx.Provider value={info.data!}>
    <div className="contours min-h-full">
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-[70] btn-primary">Skip to content</a>
      <aside className="glass fixed inset-y-3 left-3 z-30 hidden w-[256px] rounded-sheet lg:block"><div className="px-4 pt-4"><Link to="/" aria-label="Byawastha home"><Wordmark /></Link></div><div className="h-[calc(100%-52px)]"><Sidebar info={info.data!} me={me.data} /></div></aside>
      <AnimatePresence>{navOpen && <motion.div className="fixed inset-0 z-40 lg:hidden" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
        <div className="absolute inset-0 bg-[#081114]/50" onClick={() => setNav(false)} />
        <motion.aside className="glass absolute inset-y-0 left-0 w-[86vw] max-w-[300px] rounded-r-sheet" initial={{ x: -320 }} animate={{ x: 0 }} exit={{ x: -320 }} transition={{ type: 'spring', stiffness: 380, damping: 36 }}>
          <div className="flex items-center justify-between px-4 pt-4"><Wordmark /><button className="btn-ghost h-9 w-9 px-0" onClick={() => setNav(false)} aria-label="Close menu"><X size={18} /></button></div>
          <div className="h-[calc(100%-56px)]"><Sidebar info={info.data!} me={me.data} onNav={() => setNav(false)} /></div>
        </motion.aside></motion.div>}</AnimatePresence>
      <div className="relative z-10 lg:pl-[272px]">
        <header className="glass sticky top-0 z-20 mx-0 flex h-14 items-center gap-2 px-3 lg:top-3 lg:mx-3 lg:rounded-sheet">
          <button className="btn-ghost h-9 w-9 px-0 lg:hidden" onClick={() => setNav(true)} aria-label="Open menu"><List size={20} /></button>
          <button onClick={() => setPalette(true)} className="flex h-9 min-w-0 flex-1 items-center gap-2 rounded-ctl border border-line/80 bg-surface/60 px-3 text-left text-sm text-muted hover:bg-surface sm:max-w-md" aria-label="Search and commands">
            <MagnifyingGlass size={16} /><span className="truncate">Search records, modules, actions…</span><span className="kbd ml-auto hidden sm:inline">⌘K</span></button>
          <div className="ml-auto flex items-center gap-1">
            <ThemeToggle />
            <Link to={`/app/${org}/notifications`} className="btn-ghost relative h-9 w-9 px-0" aria-label={`Notifications${unread ? `, ${unread} unread` : ''}`}><Bell size={18} />{unread > 0 && <span className="absolute right-1 top-1 min-w-[16px] rounded-full bg-brand px-1 text-[10px] font-bold leading-4 text-on-brand">{unread > 9 ? '9+' : unread}</span>}</Link>
            <div className="ml-1"><UserButton userProfileUrl={`/app/${org}/profile`} userProfileMode="navigation" /></div>
          </div>
        </header>
        <main id="main" className="mx-auto max-w-[1400px] px-4 pb-16 pt-6 sm:px-6 lg:pt-8">
          <motion.div key={loc.pathname} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.22 }}><Outlet /></motion.div>
        </main>
      </div>
      <CommandPalette info={info.data!} isSuper={!!me.data?.user?.is_super} />
    </div>
  </OrgCtx.Provider>;
}
