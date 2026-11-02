export const npr = (n: unknown) => (typeof n === 'number' ? 'Rs ' + n.toLocaleString('en-IN', { maximumFractionDigits: 2 }) : '');
export const num = (n: unknown) => (typeof n === 'number' ? n.toLocaleString('en-IN') : '');
export function ago(ms: number) {
  const s = Math.round((Date.now() - ms) / 1000);
  if (s < 60) return 'just now'; if (s < 3600) return Math.floor(s / 60) + ' min ago'; if (s < 86400) return Math.floor(s / 3600) + ' h ago';
  if (s < 86400 * 7) return Math.floor(s / 86400) + ' d ago';
  return new Date(ms).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}
export const dateStr = (ms: number) => new Date(ms).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
export const ROLE_TONE: Record<string, string> = { owner: 'bg-brand/15 text-brand', admin: 'bg-primary/15 text-primary' };
export const actionText = (a: string) => ({
  'org.created': 'created the workspace', 'org.updated': 'changed workspace settings', 'record.created': 'added', 'record.updated': 'edited', 'record.deleted': 'deleted',
  'record.bulk_deleted': 'bulk-deleted rows in', 'record.imported': 'imported rows into', 'record.exported': 'exported', 'module.activated': 'activated', 'module.deactivated': 'turned off',
  'module.configured': 'configured', 'member.joined': 'joined', 'member.updated': 'updated a member', 'member.removed': 'removed a member', 'invite.created': 'invited someone',
  'invite.revoked': 'revoked an invite', 'role.created': 'created a role', 'role.updated': 'edited a role', 'role.deleted': 'deleted a role', 'department.created': 'added a department',
  'department.deleted': 'removed a department', 'support.created': 'opened a support ticket',
} as Record<string, string>)[a] || a;
