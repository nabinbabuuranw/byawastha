import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, useNavigate } from 'react-router-dom';
import { ClerkProvider } from '@clerk/clerk-react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import App from './App';
import './styles.css';

const PK = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY as string | undefined;
const qc = new QueryClient({ defaultOptions: { queries: { staleTime: 15_000, refetchOnWindowFocus: false } } });
const saved = localStorage.getItem('bw-accent'); if (saved) document.documentElement.dataset.accent = saved;

function WithClerk({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate();
  if (!PK) return <>{children}</>;
  return <ClerkProvider publishableKey={PK} routerPush={(to) => navigate(to)} routerReplace={(to) => navigate(to, { replace: true })}
    signInUrl="/login" signUpUrl="/register" signInFallbackRedirectUrl="/app" signUpFallbackRedirectUrl="/onboarding" afterSignOutUrl="/">
    {children}
  </ClerkProvider>;
}
ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <WithClerk><QueryClientProvider client={qc}><App clerk={!!PK} /></QueryClientProvider></WithClerk>
    </BrowserRouter>
  </React.StrictMode>,
);
