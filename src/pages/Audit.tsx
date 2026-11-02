import { useState } from 'react';
import { useInfiniteQuery } from '@tanstack/react-query';
import { ClockCounterClockwise } from '@phosphor-icons/react';
import { getModule } from '../../shared/registry';
import { useApi, errText } from '../lib/api';
import { useOrg, can } from '../components/AppShell';
import { PageHead, Empty, ErrorBox, SkeletonRows } from '../components/ui';
import { actionText, dateStr } from '../lib/format';

const FILTERS = [['', 'Everything'], ['record.', 'Records'], ['module.', 'Modules'], ['member.', 'Members'], ['invite.', 'Invites'], ['role.', 'Roles'], ['org.', 'Workspace']];
export default function Audit() {
  const info = useOrg(); const api = useApi(); const [f, setF] = useState('');
  const q = useInfiniteQuery({ queryKey: ['audit', info.org.slug, f], initialPageParam: 0, enabled: can(info, 'audit.view'),
    queryFn: ({ pageParam }) => api<any>(`/api/o/${info.org.slug}/audit?${new URLSearchParams({ ...(pageParam ? { before: String(pageParam) } : {}), ...(f ? { action: f } : {}) })}`),
    getNextPageParam: (last: any) => (last.entries.length === 50 ? last.entries[49].id : undefined) });
  if (!can(info, 'audit.view')) return <Empty title="No access" body="Your role doesn't include the audit log." />;
  const rows = q.data?.pages.flatMap((p: any) => p.entries) || [];
  return <div><PageHead eyebrow="Security" title="Audit log" desc="Every change in this workspace: who, what, when and from which IP. Entries can't be edited or deleted from the app." actions={<select aria-label="Filter" className="input w-auto" value={f} onChange={(e) => setF(e.target.value)}>{FILTERS.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select>} />
    <section className="panel overflow-hidden">{q.isLoading ? <SkeletonRows /> : q.error ? <ErrorBox error={errText(q.error)} retry={() => q.refetch()} /> : rows.length === 0 ? <Empty title="Nothing logged yet" icon={<ClockCounterClockwise size={20} />} /> :
      <div className="overflow-x-auto"><table className="w-full min-w-[680px] text-sm"><thead className="bg-surface-2/60 text-left text-xs text-muted"><tr><th className="px-4 py-2">When</th><th className="px-3 py-2">Who</th><th className="px-3 py-2">What</th><th className="px-3 py-2">Details</th><th className="px-3 py-2">IP</th></tr></thead>
        <tbody>{rows.map((a: any) => { const meta = JSON.parse(a.meta || '{}'); const mod = a.target?.includes('/') ? getModule(a.target.split('/')[0])?.name : a.target === 'module' ? getModule(a.target_id)?.name : null; return <tr key={a.id} className="border-t border-line/70 align-top">
          <td className="whitespace-nowrap px-4 py-2 text-xs text-muted tabular">{dateStr(a.created_at)}</td><td className="px-3 py-2">{a.name || a.email || 'System'}</td>
          <td className="px-3 py-2"><span className="font-mono text-xs text-ink-2">{a.action}</span><span className="block">{actionText(a.action)} {mod}</span></td>
          <td className="px-3 py-2 text-xs text-ink-2 max-w-[340px] break-words">{meta.title ? `“${meta.title}”` : ''}{meta.changed ? ` changed: ${meta.changed.join(', ')}` : ''}{meta.inserted !== undefined ? ` ${meta.inserted} in, ${meta.rejected} rejected` : ''}{meta.rows !== undefined ? ` ${meta.rows} rows` : ''}{meta.role ? ` role: ${meta.role}` : ''}{meta.email ? ` ${meta.email}` : ''}</td>
          <td className="px-3 py-2 font-mono text-xs text-muted">{a.ip}</td></tr>; })}</tbody></table></div>}
      {q.hasNextPage && <div className="border-t border-line p-3 text-center"><button className="btn-line" disabled={q.isFetchingNextPage} onClick={() => q.fetchNextPage()}>{q.isFetchingNextPage ? 'Loading…' : 'Load older'}</button></div>}
    </section></div>;
}
