import { useState, type ReactNode } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { SignIn, SignUp, useSignIn, useSignUp, useAuth } from '@clerk/clerk-react';
import { motion } from 'framer-motion';
import { Wordmark } from '../components/Brand';
import { Field } from '../components/ui';
import { isDark } from '../lib/store';

export const clerkAppearance = () => {
  const dark = isDark();
  return {
    variables: {
      colorPrimary: dark ? '#E09F3E' : '#335C67', colorText: dark ? '#F3EEDF' : '#14262B', colorTextSecondary: dark ? '#A3B4B6' : '#4D6168',
      colorBackground: dark ? '#13252A' : '#FBF8F1', colorInputBackground: dark ? '#0F1E22' : '#FFFFFF', colorInputText: dark ? '#F3EEDF' : '#14262B',
      colorTextOnPrimaryBackground: dark ? '#1A1104' : '#FFF8E2', colorDanger: dark ? '#E6746C' : '#9E2A2B', borderRadius: '7px',
      fontFamily: '"Plus Jakarta Sans Variable", system-ui, sans-serif', fontFamilyButtons: '"Plus Jakarta Sans Variable", system-ui, sans-serif',
    },
    elements: { card: 'shadow-none border-0 bg-transparent', rootBox: 'w-full', cardBox: 'shadow-none w-full border border-line', headerTitle: 'font-display', footer: 'bg-transparent' },
  };
};

function Shell({ children, side }: { children: ReactNode; side?: ReactNode }) {
  return <div className="contours min-h-full">
    <div className="relative z-10 mx-auto grid min-h-full max-w-6xl lg:grid-cols-[1fr_1.05fr] gap-10 px-4 py-6 sm:px-8">
      <div className="flex flex-col">
        <Link to="/" className="w-fit" aria-label="Byawastha home"><Wordmark /></Link>
        <motion.div className="my-auto py-10" initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45, ease: [0.22, 0.9, 0.24, 1] }}>{children}</motion.div>
        <p className="text-xs text-muted">Sign-in is handled by Clerk. Byawastha never sees or stores your password. <Link className="link" to="/privacy">Privacy</Link> · <Link className="link" to="/terms">Terms</Link></p>
      </div>
      <aside className="hidden lg:flex flex-col justify-center">{side ?? <SidePanel />}</aside>
    </div>
  </div>;
}
function SidePanel() {
  const rows = [['School', 'Students, classes, fees, exams'], ['Clinic', 'Patients, appointments, records'], ['Shop', 'Products, POS bills, suppliers'], ['Farm', 'Plots, crops, livestock, harvest'], ['Club', 'Players, fixtures, memberships']];
  return <div className="glass rounded-sheet p-7">
    <p className="eyebrow">One login, every workspace</p>
    <h2 className="mt-2 font-display text-3xl font-semibold leading-tight">Turn on the modules your organisation actually runs.</h2>
    <ul className="mt-6 divide-y divide-line/70 text-sm">{rows.map(([a, b]) => <li key={a} className="flex justify-between gap-4 py-2.5"><span className="font-semibold">{a}</span><span className="text-muted text-right">{b}</span></li>)}</ul>
    <p className="mt-5 text-sm text-muted">231 modules in 17 categories, roles for every seat, and an audit trail on every change.</p>
  </div>;
}

function ForgotPassword() {
  const { isLoaded, signIn, setActive } = useSignIn(); const nav = useNavigate();
  const [email, setEmail] = useState(''); const [code, setCode] = useState(''); const [pw, setPw] = useState('');
  const [stage, setStage] = useState<'email' | 'reset'>('email'); const [err, setErr] = useState<string | null>(null); const [busy, setBusy] = useState(false);
  const clerkErr = (e: any) => e?.errors?.[0]?.longMessage || e?.errors?.[0]?.message || 'Something went wrong';
  async function send(e: React.FormEvent) {
    e.preventDefault(); if (!isLoaded) return; setBusy(true); setErr(null);
    try { await signIn!.create({ strategy: 'reset_password_email_code', identifier: email }); setStage('reset'); } catch (x) { setErr(clerkErr(x)); } finally { setBusy(false); }
  }
  async function reset(e: React.FormEvent) {
    e.preventDefault(); if (!isLoaded) return; setBusy(true); setErr(null);
    try {
      const r = await signIn!.attemptFirstFactor({ strategy: 'reset_password_email_code', code, password: pw });
      if (r.status === 'complete') { await setActive!({ session: r.createdSessionId }); nav('/app'); }
      else if (r.status === 'needs_second_factor') setErr('This account uses two-step verification. Finish it on the sign-in page.');
      else setErr('Reset not finished: ' + r.status);
    } catch (x) { setErr(clerkErr(x)); } finally { setBusy(false); }
  }
  return <div className="panel p-6 sm:p-7 max-w-md">
    <h1 className="font-display text-2xl font-semibold">Reset your password</h1>
    {stage === 'email' ? <form onSubmit={send} className="mt-5 space-y-4">
      <p className="text-sm text-muted">We'll email you a 6-digit code.</p>
      <Field label="Email" htmlFor="fp-email"><input id="fp-email" className="input" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} /></Field>
      {err && <p role="alert" className="text-sm text-danger">{err}</p>}
      <button className="btn-primary w-full" disabled={busy}>{busy ? 'Sending…' : 'Send code'}</button>
    </form> : <form onSubmit={reset} className="mt-5 space-y-4">
      <p className="text-sm text-muted">Code sent to <b className="text-ink">{email}</b>.</p>
      <Field label="Code" htmlFor="fp-code"><input id="fp-code" className="input font-mono tracking-[.3em]" inputMode="numeric" autoComplete="one-time-code" required value={code} onChange={(e) => setCode(e.target.value)} /></Field>
      <Field label="New password" htmlFor="fp-pw" hint="At least 8 characters; Clerk rejects passwords found in known leaks."><input id="fp-pw" className="input" type="password" autoComplete="new-password" required value={pw} onChange={(e) => setPw(e.target.value)} /></Field>
      {err && <p role="alert" className="text-sm text-danger">{err}</p>}
      <button className="btn-primary w-full" disabled={busy}>{busy ? 'Saving…' : 'Set new password'}</button>
    </form>}
    <p className="mt-5 text-sm"><Link className="link" to="/login">Back to sign in</Link></p>
  </div>;
}
function VerifyEmail() {
  const { isLoaded, signUp, setActive } = useSignUp(); const { isSignedIn } = useAuth(); const nav = useNavigate();
  const [code, setCode] = useState(''); const [err, setErr] = useState<string | null>(null); const [busy, setBusy] = useState(false); const [sent, setSent] = useState(false);
  const pending = isLoaded && signUp?.status === 'missing_requirements' && signUp.unverifiedFields.includes('email_address');
  const clerkErr = (e: any) => e?.errors?.[0]?.longMessage || e?.errors?.[0]?.message || 'Something went wrong';
  if (isSignedIn) return <div className="panel p-6 max-w-md"><h1 className="font-display text-2xl font-semibold">Email verified</h1><p className="mt-2 text-sm text-muted">You're signed in.</p><Link className="btn-primary mt-5" to="/app">Open your workspace</Link></div>;
  if (!pending) return <div className="panel p-6 max-w-md"><h1 className="font-display text-2xl font-semibold">Verify your email</h1>
    <p className="mt-2 text-sm text-muted">There's no sign-up waiting for a code in this browser. Start from the sign-up page; we'll send the code right after you enter your email.</p>
    <div className="mt-5 flex gap-2"><Link className="btn-primary" to="/register">Create account</Link><Link className="btn-line" to="/login">Sign in</Link></div></div>;
  async function resend() { setErr(null); try { await signUp!.prepareEmailAddressVerification({ strategy: 'email_code' }); setSent(true); } catch (x) { setErr(clerkErr(x)); } }
  async function verify(e: React.FormEvent) {
    e.preventDefault(); setBusy(true); setErr(null);
    try { const r = await signUp!.attemptEmailAddressVerification({ code }); if (r.status === 'complete') { await setActive!({ session: r.createdSessionId }); nav('/onboarding'); } else setErr('Still missing: ' + r.missingFields.join(', ')); }
    catch (x) { setErr(clerkErr(x)); } finally { setBusy(false); }
  }
  return <form onSubmit={verify} className="panel p-6 max-w-md space-y-4">
    <h1 className="font-display text-2xl font-semibold">Check your inbox</h1>
    <p className="text-sm text-muted">Enter the 6-digit code sent to <b className="text-ink">{signUp!.emailAddress}</b>.</p>
    <Field label="Code" htmlFor="ve-code"><input id="ve-code" className="input font-mono tracking-[.3em]" inputMode="numeric" autoComplete="one-time-code" required value={code} onChange={(e) => setCode(e.target.value)} /></Field>
    {err && <p role="alert" className="text-sm text-danger">{err}</p>}
    <div className="flex gap-2"><button className="btn-primary flex-1" disabled={busy}>{busy ? 'Checking…' : 'Verify'}</button><button type="button" className="btn-line" onClick={resend}>{sent ? 'Sent again' : 'Resend'}</button></div>
  </form>;
}
export default function Auth({ mode }: { mode: 'login' | 'register' | 'forgot' | 'verify' }) {
  const [sp] = useSearchParams();
  const redirect = sp.get('redirect_url') && sp.get('redirect_url')!.startsWith('/') ? sp.get('redirect_url')! : undefined;
  return <Shell>
    {mode === 'login' && <div className="max-w-md"><SignIn routing="path" path="/login" signUpUrl="/register" forceRedirectUrl={redirect} fallbackRedirectUrl="/app" appearance={clerkAppearance()} />
      <p className="mt-4 text-sm text-muted">Forgot it? <Link className="link" to="/forgot-password">Reset your password</Link></p></div>}
    {mode === 'register' && <div className="max-w-md"><SignUp routing="path" path="/register" signInUrl="/login" fallbackRedirectUrl="/onboarding" appearance={clerkAppearance()} /></div>}
    {mode === 'forgot' && <ForgotPassword />}
    {mode === 'verify' && <VerifyEmail />}
  </Shell>;
}
