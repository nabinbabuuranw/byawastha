import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { UserButton } from '@clerk/clerk-react';
import { motion } from 'framer-motion';
import { CATEGORIES, STARTER_BY_CATEGORY, getModule } from '../../shared/registry';
import { useApi, useGet, errText } from '../lib/api';
import { CatIcon, Wordmark } from '../components/Brand';
import { Field, Skeleton, ErrorBox } from '../components/ui';
import { useUI } from '../lib/store';

export default function Onboarding() {
  const me = useGet<any>(['me'], '/api/me'); const api = useApi(); const nav = useNavigate(); const qc = useQueryClient(); const toast = useUI((s) => s.toast);
  const [name, setName] = useState(''); const [industry, setIndustry] = useState('biz'); const [picked, setPicked] = useState<string[]>(STARTER_BY_CATEGORY.biz);
  const [busy, setBusy] = useState(false); const [err, setErr] = useState<string | null>(null);
  const starters = useMemo(() => CATEGORIES.find((c) => c.key === industry)!.modules.slice(0, 8), [industry]);
  function pickIndustry(k: string) { setIndustry(k); setPicked(STARTER_BY_CATEGORY[k] || []); }
  async function create(e: React.FormEvent) {
    e.preventDefault(); setBusy(true); setErr(null);
    try { const r = await api<{ slug: string }>('/api/orgs', { method: 'POST', body: { name, industry, modules: picked } }); await qc.invalidateQueries({ queryKey: ['me'] }); toast('Workspace created'); nav(`/app/${r.slug}/dashboard`); }
    catch (x) { setErr(errText(x)); } finally { setBusy(false); }
  }
  async function accept(id: number) {
    try { const r = await api<{ slug: string }>(`/api/invites/${id}/accept`, { method: 'POST' }); await qc.invalidateQueries({ queryKey: ['me'] }); nav(`/app/${r.slug}/dashboard`); }
    catch (x) { toast(errText(x), 'err'); }
  }
  return <div className="contours min-h-full">
    <div className="relative z-10 mx-auto max-w-4xl px-4 py-6 sm:px-8">
      <header className="flex items-center justify-between"><Link to="/"><Wordmark /></Link><UserButton /></header>
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="mt-10">
        <p className="eyebrow">Step 1 of 1</p>
        <h1 className="font-display text-3xl sm:text-4xl font-semibold tracking-tight mt-1">Set up your organisation</h1>
        <p className="mt-2 text-muted max-w-xl">A workspace holds your team, roles and the modules you switch on. You can add more modules from the marketplace any time.</p>
        {me.isLoading && <Skeleton className="mt-8 h-40 w-full" />}
        {me.error && <ErrorBox error={errText(me.error)} retry={() => me.refetch()} />}
        {me.data && <>
          {me.data.invites.length > 0 && <section className="panel mt-8 p-5">
            <h2 className="font-display text-lg font-semibold">You've been invited</h2>
            <ul className="mt-3 divide-y divide-line">{me.data.invites.map((i: any) => <li key={i.id} className="flex items-center justify-between py-3 text-sm">
              <span><b>{i.org_name}</b> <span className="text-muted">as {i.role}</span></span><button className="btn-brand h-8" onClick={() => accept(i.id)}>Join</button></li>)}</ul>
          </section>}
          {me.data.orgs.length > 0 && <section className="panel mt-6 p-5"><h2 className="font-display text-lg font-semibold">Your workspaces</h2>
            <ul className="mt-3 flex flex-wrap gap-2">{me.data.orgs.map((o: any) => <li key={o.slug}><Link className="btn-line" to={`/app/${o.slug}/dashboard`}>{o.name}</Link></li>)}</ul></section>}
          <form onSubmit={create} className="panel mt-6 p-5 sm:p-6 space-y-6">
            <Field label="Organisation name" htmlFor="org-name" required><input id="org-name" className="input max-w-md" required minLength={2} maxLength={80} value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Himal Traders Pvt. Ltd." /></Field>
            <div>
              <p className="text-[13px] font-semibold text-ink-2 mb-2">What kind of organisation is it?</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">{CATEGORIES.map((c) => <button type="button" key={c.key} onClick={() => pickIndustry(c.key)} aria-pressed={industry === c.key}
                className={'flex items-center gap-2 rounded-ctl border px-3 py-2.5 text-left text-sm transition-colors ' + (industry === c.key ? 'border-brand bg-brand/10 font-semibold' : 'border-line hover:bg-surface-2')}>
                <CatIcon name={c.icon} className={industry === c.key ? 'text-brand' : 'text-muted'} /><span className="leading-tight">{c.name}</span></button>)}</div>
            </div>
            <div>
              <p className="text-[13px] font-semibold text-ink-2 mb-2">Start with these modules <span className="font-normal text-muted">({picked.length} picked)</span></p>
              <div className="flex flex-wrap gap-2">{[...new Set([...starters, ...picked])].map((k) => { const m = getModule(k)!; const on = picked.includes(k); return <button type="button" key={k} aria-pressed={on} onClick={() => setPicked(on ? picked.filter((x) => x !== k) : [...picked, k])}
                className={'rounded-full border px-3 py-1 text-sm transition-colors ' + (on ? 'border-primary bg-primary text-on-primary' : 'border-line text-ink-2 hover:bg-surface-2')}>{m.name}</button>; })}</div>
            </div>
            {err && <p role="alert" className="text-sm text-danger">{err}</p>}
            <button className="btn-brand h-10 px-5" disabled={busy || name.trim().length < 2}>{busy ? 'Creating…' : 'Create workspace'}</button>
          </form>
        </>}
      </motion.div>
    </div>
  </div>;
}
