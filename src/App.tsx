import { lazy, Suspense, useEffect } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { SignedIn, SignedOut, useAuth } from '@clerk/clerk-react';
import { Toaster, Skeleton } from './components/ui';
import Landing from './pages/Landing';
import { Terms, Privacy } from './pages/Legal';

const Auth = lazy(() => import('./pages/Auth'));
const Onboarding = lazy(() => import('./pages/Onboarding'));
const AppShell = lazy(() => import('./components/AppShell'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Marketplace = lazy(() => import('./pages/Marketplace'));
const ModuleWorkspace = lazy(() => import('./pages/ModuleWorkspace'));
const Settings = lazy(() => import('./pages/Settings'));
const Audit = lazy(() => import('./pages/Audit'));
const Notifications = lazy(() => import('./pages/Notifications'));
const Profile = lazy(() => import('./pages/Profile'));
const Support = lazy(() => import('./pages/Support'));
const Admin = lazy(() => import('./pages/Admin'));
const AppHome = lazy(() => import('./pages/AppHome'));

function Loading() { return <div className="p-8 space-y-3"><Skeleton className="h-8 w-60" /><Skeleton className="h-4 w-96" /><Skeleton className="h-40 w-full" /></div>; }
function Protected({ children }: { children: JSX.Element }) {
  const { isLoaded } = useAuth(); const loc = useLocation();
  if (!isLoaded) return <Loading />;
  return <><SignedIn>{children}</SignedIn><SignedOut><Navigate to={'/login?redirect_url=' + encodeURIComponent(loc.pathname)} replace /></SignedOut></>;
}
function NoClerk() {
  return <div className="contours min-h-full grid place-items-center p-6"><div className="panel max-w-md p-6 text-sm"><h1 className="font-display text-xl font-semibold mb-2">Sign-in isn't configured here</h1>
    <p className="text-muted">This build has no Clerk publishable key (VITE_CLERK_PUBLISHABLE_KEY), so accounts are switched off. Nothing is faked: set the key and rebuild.</p></div></div>;
}
export default function App({ clerk }: { clerk: boolean }) {
  const loc = useLocation();
  useEffect(() => { window.scrollTo(0, 0); }, [loc.pathname]);
  return <>
    <Suspense fallback={<Loading />}>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/terms" element={<Terms />} />
        <Route path="/privacy" element={<Privacy />} />
        {!clerk ? <Route path="*" element={<NoClerk />} /> : <>
          <Route path="/login/*" element={<Auth mode="login" />} />
          <Route path="/register/*" element={<Auth mode="register" />} />
          <Route path="/forgot-password" element={<Auth mode="forgot" />} />
          <Route path="/verify-email" element={<Auth mode="verify" />} />
          <Route path="/onboarding" element={<Protected><Onboarding /></Protected>} />
          <Route path="/app" element={<Protected><AppHome /></Protected>} />
          <Route path="/app/:org" element={<Protected><AppShell /></Protected>}>
            <Route index element={<Navigate to="dashboard" replace />} />
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="marketplace" element={<Marketplace />} />
            <Route path="m/:mod" element={<ModuleWorkspace />} />
            <Route path="settings" element={<Settings />} />
            <Route path="audit" element={<Audit />} />
            <Route path="notifications" element={<Notifications />} />
            <Route path="profile/*" element={<Profile />} />
            <Route path="support" element={<Support />} />
            <Route path="admin" element={<Admin />} />
          </Route>
          <Route path="*" element={<NotFound />} />
        </>}
      </Routes>
    </Suspense>
    <Toaster />
  </>;
}
function NotFound() {
  return <div className="contours min-h-full grid place-items-center p-6 text-center"><div><p className="eyebrow">404</p><h1 className="font-display text-3xl font-semibold mt-1">No page here</h1>
    <a className="btn-primary mt-5" href="/">Back home</a></div></div>;
}
