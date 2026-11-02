import { useAuth } from '@clerk/clerk-react';
import { useCallback } from 'react';
import { useQuery, useMutation, useQueryClient, type QueryKey } from '@tanstack/react-query';

export class ApiError extends Error { constructor(public status: number, public code: string, public detail: any) { super(code); } }
const MESSAGES: Record<string, string> = {
  auth_required: 'Please sign in again.', token_expired: 'Your session expired. Refreshing…', forbidden: "Your role doesn't allow that here.",
  org_not_found: "That workspace doesn't exist or you're not a member.", module_not_active: 'This module is turned off for the workspace.',
  validation: 'Some fields need a fix.', rate_limited: 'Too many requests. Wait a moment and try again.', last_owner: 'A workspace needs at least one owner.',
  role_in_use: 'Move the members on this role to another role first.', already_member: 'That person is already a member.', email_invalid: 'That email address looks wrong.',
  csv_no_matching_columns: 'No column in the file matches this table. Download the template first.', import_disabled: 'CSV import is switched off by the platform admin.',
  super_admin_only: 'Platform admins only.', org_suspended: 'This workspace is suspended. Contact support.', account_suspended: 'This account is suspended.',
  billing_needs_payment_provider: 'Billing stays off until a payment provider is connected.', email_not_verified: 'Verify your email first.',
  auth_not_configured: 'Sign-in is not configured on this deployment.', server_error: 'Something broke on our side. Try again.',
};
export const errText = (e: unknown) => (e instanceof ApiError ? MESSAGES[e.code] || e.code.replace(/_/g, ' ') : e instanceof Error ? e.message : 'Something went wrong');

export function useApi() {
  const { getToken } = useAuth();
  return useCallback(async <T = any>(path: string, init: { method?: string; body?: unknown; raw?: boolean } = {}): Promise<T> => {
    const token = await getToken();
    const res = await fetch(path, {
      method: init.method || 'GET',
      headers: { ...(token ? { Authorization: 'Bearer ' + token } : {}), ...(init.body !== undefined ? { 'Content-Type': 'application/json' } : {}) },
      body: init.body !== undefined ? JSON.stringify(init.body) : undefined,
    });
    if (init.raw && res.ok) return res as unknown as T;
    const text = await res.text(); let j: any = null; try { j = text ? JSON.parse(text) : null; } catch { j = text; }
    if (!res.ok) throw new ApiError(res.status, j?.error || 'http_' + res.status, j?.detail);
    return j as T;
  }, [getToken]);
}
export function useGet<T = any>(key: QueryKey, path: string | null, opts: { refetchInterval?: number } = {}) {
  const api = useApi();
  return useQuery<T>({ queryKey: key, queryFn: () => api<T>(path!), enabled: !!path, refetchInterval: opts.refetchInterval, retry: (n, e) => !(e instanceof ApiError && e.status < 500) && n < 2 });
}
export function useSend<V = any, R = any>(fn: (api: ReturnType<typeof useApi>, v: V) => Promise<R>, invalidate: QueryKey[] = []) {
  const api = useApi(); const qc = useQueryClient();
  return useMutation<R, unknown, V>({ mutationFn: (v) => fn(api, v), onSuccess: () => invalidate.forEach((k) => qc.invalidateQueries({ queryKey: k })) });
}
export async function download(api: ReturnType<typeof useApi>, path: string, filename: string) {
  const res = await api<Response>(path, { raw: true });
  const blob = await res.blob(); const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href = url; a.download = filename; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 2000);
}
