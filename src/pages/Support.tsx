import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useApi, useGet, errText } from '../lib/api';
import { useOrg } from '../components/AppShell';
import { PageHead, Field, SkeletonRows } from '../components/ui';
import { useUI } from '../lib/store';
import { ago } from '../lib/format';
export default function Support() {
  const info = useOrg(); const api = useApi(); const qc = useQueryClient(); const toast = useUI((s) => s.toast);
  const t = useGet<any>(['tickets'], '/api/support'); const [subject, setSubject] = useState(''); const [body, setBody] = useState(''); const [busy, setBusy] = useState(false);
  async function send(e: React.FormEvent) { e.preventDefault(); setBusy(true); try { await api('/api/support', { method: 'POST', body: { subject, body, org: info.org.slug } }); setSubject(''); setBody(''); toast('Ticket sent. The platform team replies here.'); qc.invalidateQueries({ queryKey: ['tickets'] }); } catch (x) { toast(errText(x), 'err'); } finally { setBusy(false); } }
  return <div><PageHead eyebrow="Help" title="Help & support" desc="Questions, bugs, or a module you need deeper? Tickets go to the platform admin; replies show up here and in notifications." />
    <div className="grid gap-4 lg:grid-cols-2">
      <form onSubmit={send} className="panel space-y-4 p-5"><h2 className="font-display text-lg font-semibold">New ticket</h2>
        <Field label="Subject" htmlFor="s-sub" required><input id="s-sub" className="input" required maxLength={120} value={subject} onChange={(e) => setSubject(e.target.value)} /></Field>
        <Field label="What happened?" htmlFor="s-body" required><textarea id="s-body" className="input min-h-[140px]" required maxLength={4000} value={body} onChange={(e) => setBody(e.target.value)} /></Field>
        <button className="btn-primary" disabled={busy}>{busy ? 'Sending…' : 'Send ticket'}</button></form>
      <section className="panel p-5"><h2 className="font-display text-lg font-semibold">Your tickets</h2>
        {t.isLoading ? <SkeletonRows rows={3} cols={2} /> : (t.data?.tickets || []).length === 0 ? <p className="mt-3 text-sm text-muted">None yet.</p> :
          <ul className="mt-3 space-y-3">{t.data.tickets.map((x: any) => <li key={x.id} className="rounded-ctl border border-line p-3 text-sm"><p className="flex justify-between gap-2"><b>{x.subject}</b><span className="chip">{x.status}</span></p><p className="mt-1 text-ink-2 whitespace-pre-wrap">{x.body}</p>
            {x.reply && <p className="mt-2 rounded-ctl bg-surface-2 p-2 text-ink"><span className="eyebrow block">Reply</span>{x.reply}</p>}<p className="mt-1 text-xs text-muted">{ago(x.created_at)}</p></li>)}</ul>}</section>
    </div></div>;
}
