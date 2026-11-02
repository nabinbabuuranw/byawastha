import { Navigate } from 'react-router-dom';
import { useGet, errText } from '../lib/api';
import { ErrorBox, Skeleton } from '../components/ui';
export default function AppHome() {
  const me = useGet<any>(['me'], '/api/me');
  if (me.isLoading) return <div className="p-8"><Skeleton className="h-10 w-64" /></div>;
  if (me.error) return <ErrorBox error={errText(me.error)} retry={() => me.refetch()} />;
  const orgs = me.data.orgs as any[];
  if (!orgs.length) return <Navigate to="/onboarding" replace />;
  const last = me.data.user.prefs?.last_org; const pick = orgs.find((o) => o.slug === last) || orgs[0];
  return <Navigate to={`/app/${pick.slug}/dashboard`} replace />;
}
