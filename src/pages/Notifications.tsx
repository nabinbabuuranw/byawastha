import { Link } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { Bell, Checks } from '@phosphor-icons/react';
import { useApi, useGet, errText } from '../lib/api';
import { PageHead, Empty, ErrorBox, SkeletonRows } from '../components/ui';
import { ago } from '../lib/format';
import { useUI } from '../lib/store';
export default function Notifications() {
  const n = useGet<any>(['notifications'], '/api/notifications'); const api = useApi(); const qc = useQueryClient(); const toast = useUI((s) => s.toast);
  async function readAll() { try { await api('/api/notifications/read', { method: 'POST', body: {} }); qc.invalidateQueries({ queryKey: ['notifications'] }); toast('All marked read'); } catch (x) { toast(errText(x), 'err'); } }
  async function read(id: number) { await api('/api/notifications/read', { method: 'POST', body: { ids: [id] } }).catch(() => {}); qc.invalidateQueries({ queryKey: ['notifications'] }); }
  return <div><PageHead eyebrow="Inbox" title="Notifications" desc="Role changes, module changes, deletions and imports in your workspaces, plus replies from support." actions={n.data?.unread ? <button className="btn-line" onClick={readAll}><Checks size={16} /> Mark all read</button> : null} />
    <section className="panel">{n.isLoading ? <SkeletonRows rows={4} cols={2} /> : n.error ? <ErrorBox error={errText(n.error)} retry={() => n.refetch()} /> : n.data.notifications.length === 0 ? <Empty title="You're all caught up" icon={<Bell size={20} />} /> :
      <ul className="divide-y divide-line">{n.data.notifications.map((x: any) => <li key={x.id} className={'flex gap-3 p-4 ' + (x.read_at ? '' : 'bg-brand/5')}>
        <span className={'mt-1.5 h-2 w-2 shrink-0 rounded-full ' + (x.read_at ? 'bg-transparent' : 'bg-brand')} aria-hidden="true" />
        <div className="flex-1 text-sm"><p className="font-semibold">{x.title}</p>{x.body && <p className="text-ink-2">{x.body}</p>}<p className="mt-0.5 text-xs text-muted">{x.org_name ? x.org_name + ' · ' : ''}{ago(x.created_at)}</p></div>
        <div className="flex shrink-0 items-start gap-1">{x.link && <Link className="btn-ghost h-8" to={x.link} onClick={() => read(x.id)}>Open</Link>}{!x.read_at && <button className="btn-ghost h-8" onClick={() => read(x.id)}>Mark read</button>}</div></li>)}</ul>}</section></div>;
}
