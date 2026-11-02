import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import { MagnifyingGlass, ArrowRight } from '@phosphor-icons/react';
import { CATEGORIES, MODULES, getCategory } from '../../shared/registry';
import { CatIcon, Wordmark } from '../components/Brand';

const TYPE_LABEL: Record<string, string> = { text: 'text', long: 'notes', num: 'number', money: 'amount', date: 'date', dt: 'date & time', email: 'email', phone: 'phone', url: 'link', bool: 'yes/no', sel: 'choice', ref: 'link to record' };
function Reveal({ children, delay = 0, className = '' }: { children: React.ReactNode; delay?: number; className?: string }) {
  const reduce = useReducedMotion();
  return <motion.div className={className} initial={reduce ? false : { opacity: 0, y: 18 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: false, amount: 0.25 }} transition={{ duration: 0.5, delay, ease: [0.22, 0.9, 0.24, 1] }}>{children}</motion.div>;
}
function Directory() {
  const [cat, setCat] = useState('health'); const [q, setQ] = useState(''); const [pick, setPick] = useState('pharmacy');
  const list = useMemo(() => { const ql = q.toLowerCase().trim(); return MODULES.filter((m) => (ql ? m.name.toLowerCase().includes(ql) || m.description.toLowerCase().includes(ql) : m.category === cat)); }, [q, cat]);
  const mod = MODULES.find((m) => m.key === pick) || list[0];
  return <div className="glass rounded-sheet p-3 sm:p-4">
    <div className="flex items-center gap-2 rounded-ctl border border-line/80 bg-surface/70 px-3"><MagnifyingGlass size={16} className="text-muted" /><input aria-label="Search the module directory" className="h-10 flex-1 bg-transparent text-sm outline-none placeholder:text-muted" placeholder="Try “rent”, “exam”, “dairy”, “royalties”" value={q} onChange={(e) => setQ(e.target.value)} /><span className="text-xs text-muted tabular">{list.length}</span></div>
    {!q && <div className="no-scrollbar mt-2 flex gap-1 overflow-x-auto pb-1">{CATEGORIES.map((c) => <button key={c.key} onClick={() => { setCat(c.key); setPick(c.modules[0]); }} aria-pressed={cat === c.key} className={'flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs ' + (cat === c.key ? 'border-brand bg-brand/15 font-semibold' : 'border-line/80 text-ink-2')}><CatIcon name={c.icon} size={14} />{c.name.split(' ')[0]}</button>)}</div>}
    <div className="mt-2 grid gap-2 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
      <ul className="max-h-72 overflow-y-auto rounded-ctl bg-surface/60 p-1" aria-label="Modules">{list.map((m) => <li key={m.key}><button onClick={() => setPick(m.key)} className={'w-full rounded-[6px] px-2.5 py-1.5 text-left text-sm ' + (mod?.key === m.key ? 'bg-primary text-on-primary font-semibold' : 'hover:bg-surface-2')}>{m.name}</button></li>)}
        {list.length === 0 && <li className="p-3 text-sm text-muted">No module by that name yet.</li>}</ul>
      {mod && <div className="rounded-ctl bg-surface/80 p-3 text-sm"><p className="eyebrow">{getCategory(mod.category)!.name}</p><p className="mt-0.5 font-display text-lg font-semibold leading-tight">{mod.name}</p><p className="text-muted">{mod.description}.</p>
        {mod.entities.map((e) => <div key={e.key} className="mt-2.5"><p className="text-xs font-semibold">{e.name}</p><div className="mt-1 flex flex-wrap gap-1">{e.fields.slice(0, 7).map((f) => <span key={f.key} className="rounded border border-line/80 px-1.5 py-0.5 text-[11px] text-ink-2">{f.label}<span className="text-muted"> · {TYPE_LABEL[f.type]}</span></span>)}{e.fields.length > 7 && <span className="text-[11px] text-muted">+{e.fields.length - 7}</span>}</div></div>)}</div>}
    </div>
  </div>;
}
const STATUS = [
  ['Sign-in, sign-up, Google, email codes, password reset, sessions', 'Live', 'Clerk'],
  ['Organisations, invites, departments', 'Live', 'Each workspace isolated on the server'],
  ['Roles: 12 built-in + your own custom roles', 'Live', 'Checked on every API request'],
  ['231 modules: add, edit, delete, search, filter, sort, pages', 'Live', 'One shared engine'],
  ['CSV import and export, audit log, notifications', 'Live', ''],
  ['Module dashboards and workspace analytics', 'Live', 'Counted from your records'],
  ['Deep automation per module (auto-billing, timetables, payroll maths…)', 'Next phases', 'Business, Finance and HR first'],
  ['Paid plans and premium modules', 'Off', 'No payment provider connected'],
];
export default function Landing() {
  return <div className="contours min-h-full">
    <div className="relative z-10">
      <header className="sticky top-3 z-30 mx-auto mt-3 max-w-6xl px-3"><nav className="glass flex items-center gap-2 rounded-full py-1.5 pl-4 pr-1.5" aria-label="Main">
        <Link to="/" aria-label="Byawastha home"><Wordmark /></Link>
        <div className="ml-auto hidden items-center gap-1 text-sm sm:flex"><a className="btn-ghost" href="#directory">Modules</a><a className="btn-ghost" href="#how">How it works</a><a className="btn-ghost" href="#status">What's live</a></div>
        <Link to="/login" className="btn-ghost ml-auto sm:ml-0">Sign in</Link><Link to="/register" className="btn-brand rounded-full">Start free</Link></nav></header>
      <main>
        <section className="mx-auto grid max-w-6xl gap-10 px-4 pb-16 pt-14 sm:px-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] lg:pt-20">
          <Reveal className="min-w-0"><p className="eyebrow">व्यवस्था · system, order, arrangement</p>
            <h1 className="mt-3 font-display text-[40px] leading-[1.04] font-semibold tracking-tight sm:text-[52px] xl:text-[58px]">Every management system your organisation runs, in one workspace.</h1>
            <p className="mt-5 max-w-lg text-lg text-ink-2">Schools, clinics, shops, farms, clubs, offices, wards. Switch on the modules you need from {MODULES.length}, give each person a role, and keep every change on record.</p>
            <div className="mt-7 flex flex-wrap gap-3"><Link to="/register" className="btn-brand h-11 px-5 text-[15px]">Create a free workspace <ArrowRight size={16} /></Link><a href="#directory" className="btn-line h-11 px-5 text-[15px]">Browse the {MODULES.length} modules</a></div>
            <p className="mt-4 text-sm text-muted">Free while billing is off. Sign in with Google or email.</p></Reveal>
          <Reveal delay={0.1} className="min-w-0 lg:pt-4"><div id="directory" className="scroll-mt-24"><Directory /></div><p className="mt-2 text-xs text-muted">This is the real module registry the app runs on, not a picture of it.</p></Reveal>
        </section>
        <section className="border-y border-line/70 bg-surface/50 py-14">
          <div className="mx-auto max-w-6xl px-4 sm:px-6"><Reveal><h2 className="font-display text-3xl font-semibold tracking-tight">17 categories, from ward offices to record labels</h2></Reveal>
            <ol className="mt-8 columns-1 gap-8 sm:columns-2 lg:columns-3">{CATEGORIES.map((c, i) => <li key={c.key} className="mb-5 break-inside-avoid"><Reveal delay={(i % 3) * 0.04}>
              <div className="flex items-baseline gap-3 border-b border-line/80 pb-2"><span className="font-mono text-xs text-muted tabular">{String(i + 1).padStart(2, '0')}</span><span className="flex-1 font-display text-lg font-semibold">{c.name}</span><span className="text-sm text-muted tabular">{c.modules.length}</span></div>
              <p className="mt-1.5 text-sm text-ink-2">{c.description}.</p></Reveal></li>)}</ol></div>
        </section>
        <section id="how" className="mx-auto max-w-6xl scroll-mt-24 px-4 py-16 sm:px-6">
          <Reveal><h2 className="font-display text-3xl font-semibold tracking-tight">How a workspace runs</h2></Reveal>
          <div className="mt-8 divide-y divide-line/80 border-y border-line/80">{[
            ['Create the organisation', 'Pick what kind of organisation it is; the matching modules are suggested and you choose which go on.'],
            ['Bring your data', 'Type records in, or import a spreadsheet as CSV. Each row is checked like the form and bad rows are listed back to you.'],
            ['Seat your people', 'Invite by email and give a role: Owner, Admin, Manager, Accountant, HR, Department Head, Staff, Teacher, Student, Patient, Vendor, Customer, or a role you define. Portal roles see only their own records.'],
            ['Keep the record', 'Every add, edit, delete, import and export lands in the audit log with who and when. Admins get notified about deletions and imports.'],
          ].map(([t, b], i) => <Reveal key={t}><div className="grid gap-2 py-6 sm:grid-cols-[80px_1fr_1.4fr] sm:gap-6"><span className="font-display text-4xl font-semibold text-brand tabular">{String(i + 1).padStart(2, '0')}</span><h3 className="font-display text-xl font-semibold">{t}</h3><p className="text-ink-2">{b}</p></div></Reveal>)}</div>
        </section>
        <section id="status" className="scroll-mt-24 bg-[#0B1619] py-16 text-[#F3EEDF]">
          <div className="mx-auto max-w-6xl px-4 sm:px-6"><Reveal><p className="eyebrow !text-[#A3B4B6]">Straight answer</p><h2 className="mt-1 font-display text-3xl font-semibold tracking-tight">What works today, and what doesn't yet</h2>
            <p className="mt-2 max-w-2xl text-[#A3B4B6]">Every module already stores real records with the shared engine. The deep, module-specific logic is being built category by category, and we label it honestly in the app.</p></Reveal>
            <div className="mt-8 overflow-x-auto"><table className="w-full min-w-[560px] text-sm"><tbody>{STATUS.map(([a, b, c]) => <tr key={a} className="border-t border-white/10"><td className="py-3 pr-4">{a}</td><td className="py-3 pr-4"><span className={'rounded-full px-2 py-0.5 text-xs font-semibold ' + (b === 'Live' ? 'bg-[#E09F3E] text-[#1A1104]' : b === 'Off' ? 'bg-white/10 text-[#F3EEDF]' : 'bg-[#FFF3B0] text-[#1A1104]')}>{b}</span></td><td className="py-3 text-[#A3B4B6]">{c}</td></tr>)}</tbody></table></div></div>
        </section>
        <section className="mx-auto max-w-3xl px-4 py-16 sm:px-6"><Reveal><h2 className="font-display text-3xl font-semibold tracking-tight">Questions</h2></Reveal>
          <div className="mt-6 divide-y divide-line/80 border-y border-line/80">{[
            ['Is it free?', 'Yes, right now. Billing is switched off and no card is asked for. If paid plans come, existing workspaces will be told before anything changes.'],
            ['Where is my data?', 'In a Cloudflare D1 database. Every row carries its organisation, and the server only ever reads rows for the organisation your membership belongs to.'],
            ['Do you store passwords?', 'No. Sign-in is handled by Clerk; this app only receives a signed token that says who you are.'],
            ['Can I get my data out?', 'Any table can be exported to CSV by anyone whose role allows export.'],
            ['Does it work on a phone?', 'Yes. The whole app is responsive, down to 360 px wide.'],
          ].map(([q, a]) => <details key={q} className="group py-4"><summary className="flex cursor-pointer list-none items-center justify-between font-semibold">{q}<span className="text-muted transition-transform group-open:rotate-45">+</span></summary><p className="mt-2 text-ink-2">{a}</p></details>)}</div></section>
      </main>
      <footer className="border-t border-line/80"><div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-8 text-sm text-muted sm:flex-row sm:items-center sm:px-6"><Wordmark /><span className="sm:ml-4">Made in Kathmandu.</span><span className="flex gap-4 sm:ml-auto"><Link className="hover:text-ink" to="/terms">Terms</Link><Link className="hover:text-ink" to="/privacy">Privacy</Link><Link className="hover:text-ink" to="/login">Sign in</Link></span></div></footer>
    </div>
  </div>;
}
