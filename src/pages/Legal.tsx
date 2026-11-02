import { Link } from 'react-router-dom';
import { Wordmark } from '../components/Brand';
function Doc({ title, updated, children }: { title: string; updated: string; children: React.ReactNode }) {
  return <div className="contours min-h-full"><div className="relative z-10 mx-auto max-w-3xl px-4 py-8 sm:px-6">
    <Link to="/"><Wordmark /></Link>
    <article className="panel mt-8 p-6 sm:p-10 text-[15px] leading-relaxed text-ink-2 [&_h2]:mt-8 [&_h2]:font-display [&_h2]:text-xl [&_h2]:font-semibold [&_h2]:text-ink [&_p]:mt-3 [&_li]:mt-1.5 [&_ul]:mt-3 [&_ul]:list-disc [&_ul]:pl-5">
      <h1 className="font-display text-3xl font-semibold text-ink">{title}</h1><p className="text-sm text-muted">Last updated {updated}</p>{children}</article></div></div>;
}
export function Terms() {
  return <Doc title="Terms of Service" updated="2 November 2026">
    <p>These terms cover your use of Byawastha (the “service”), a web workspace for managing organisations. By creating an account you agree to them.</p>
    <h2>The service</h2><p>Byawastha gives organisations a workspace with management modules, roles, an audit log and CSV import and export. It is offered free of charge while billing is switched off. Features may change; we will say what changed in the app.</p>
    <h2>Accounts</h2><ul><li>Sign-in is provided by Clerk. Keep your login safe; you are responsible for activity under your account.</li><li>The person who creates a workspace is its Owner and controls who joins it and what roles they get.</li><li>You must give accurate information and be allowed to act for the organisation you set up.</li></ul>
    <h2>Your data</h2><p>Records you put into a workspace belong to that organisation. You can export them to CSV at any time your role allows. We do not sell your data or use it to advertise to you.</p>
    <h2>Acceptable use</h2><ul><li>No illegal content, malware, or attempts to reach another organisation's data.</li><li>No automated scraping or load that harms the service for others; rate limits apply.</li><li>No storing actual passwords or card numbers in module fields. The “Passwords” module is an index of where logins live, not a vault.</li></ul>
    <h2>Availability and liability</h2><p>The service runs on free hosting tiers and is provided “as is”, without warranty of uninterrupted availability. Keep your own exports of critical records. To the extent the law allows, our liability is limited to the amount you paid us in the last 12 months, which today is zero.</p>
    <h2>Suspension and closing</h2><p>We may suspend a workspace or account that breaks these terms. You can stop using the service at any time; ask through Help & support to have your account and workspaces deleted.</p>
    <h2>Law</h2><p>These terms are governed by the laws of Nepal. Questions: use Help & support inside the app.</p>
  </Doc>;
}
export function Privacy() {
  return <Doc title="Privacy Policy" updated="2 November 2026">
    <p>This explains what Byawastha collects, why, and who processes it.</p>
    <h2>What we collect</h2><ul><li><b>Account:</b> your Clerk user ID, name and email address, received in your signed session token. We never receive or store your password.</li><li><b>Workspace data:</b> the records, members, roles and settings you and your colleagues enter.</li><li><b>Security logs:</b> an audit trail of changes (who, what, when) and the IP address of the request, and rate-limit counters.</li><li><b>Preferences:</b> theme and the last workspace you opened.</li></ul>
    <h2>Why</h2><p>To run the service: sign you in, keep each organisation's data separate, enforce roles, show you your data, and protect the service from abuse. No advertising, no selling of data, no tracking scripts.</p>
    <h2>Processors</h2><ul><li><b>Clerk</b> handles sign-in, sessions and email verification codes.</li><li><b>Cloudflare</b> hosts the app and its D1 database.</li></ul>
    <h2>Who can see your records</h2><p>Members of your organisation, according to their roles. Portal roles (Student, Patient, Vendor, Customer) see only the records they created. The platform administrator can see organisation names, member counts and audit metadata to run the service, and can suspend accounts that break the Terms.</p>
    <h2>Retention and deletion</h2><p>Records stay until someone with the right role deletes them; deleted records remain in the audit log of that organisation. Ask through Help & support to delete your account and the workspaces you own.</p>
    <h2>Your rights</h2><p>You can view and export your data, correct your profile in Account settings, and ask for deletion. Contact us through Help & support.</p>
  </Doc>;
}
