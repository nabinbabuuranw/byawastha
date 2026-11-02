# Byawastha Phase 1: QA report

Date: 2 November 2026 · Live: https://byawastha.sites.tab.bot/ · Build tested: publish version 8

## Summary

| Check | Result |
|---|---|
| API test suite (vitest, in-memory SQLite D1 shim, test JWKS) | **28 / 28 pass** |
| TypeScript `tsc --noEmit` | **0 errors** |
| Production build (vite + worker bundle) | **OK** |
| Live API E2E with real Clerk session tokens against the deployed Worker | **28 / 28 pass** (1 failed on the first run, fixed, re-checked) |
| Live browser E2E, desktop 1440×900 | **Pass**: real Clerk sign-in incl. new-device email code, all main screens, create record, validation, search, palette, dark mode, sign-out redirect |
| Live browser E2E, mobile 390×844 | **Pass**: no horizontal overflow on landing, dashboard, marketplace, module, members (after one fix) |
| JavaScript errors captured in the browser across all runs | **0** |
| 30-point anti-AI audit | **29 pass, 1 reasoned exception** (Liquid Glass, requested) |
| Secret scan of the repository | **0 findings** |

## 1. Automated tests (`npm test`)

Auth middleware with a test JWKS: missing / expired / wrong issuer / wrong azp / bad signature / wrong algorithm / not-before tokens refused; valid token maps the Clerk user to a DB user with no password stored; cross-origin writes refused. Orgs and records: CRUD with validation, search, filter, sort, pagination; inactive modules refused; references must stay inside the same org; **tenant isolation (org B cannot list, read, edit, delete or reference org A records, or open org A at all)**; CSV export / import with row errors and formula guard. RBAC: invite accept only with a verified matching email; staff cannot delete, export or manage members; per-module overrides; custom role create / assign / enforce / refuse delete while in use; student portal role sees only own records; last owner cannot be demoted. Audit on every write, admin notifications, super admin only for the verified super-admin email (an unverified token with the same email is refused), support ticket round trip, non-JSON bodies refused.

## 2. Live API E2E (real Clerk tokens, deployed Worker + D1)

Three test users were created in the Byawastha Clerk app (`…+clerk_test@example.com`, Clerk's test-mode addresses) and session tokens were minted through Clerk's Backend API, so these requests carry exactly what a browser sends.

| Check | Result |
|---|---|
| no token -> 401 | PASS |
| garbage token -> 401 | PASS |
| tampered signature -> 401 | PASS |
| real Clerk JWT accepted, user mapped | PASS |
| A creates org | PASS |
| B creates org | PASS |
| A creates CRM lead | PASS |
| A creates deal | PASS |
| search finds lead | PASS |
| ISOLATION: B cannot open A org | PASS |
| ISOLATION: B cannot list A leads | PASS |
| ISOLATION: B cannot fetch A lead id via own org | PASS |
| ISOLATION: B cannot edit A lead | PASS |
| A lead intact | PASS |
| A invites S as staff | PASS |
| S sees invite | PASS |
| S accepts invite | PASS |
| staff creates task | PASS |
| RBAC: staff cannot delete | PASS |
| RBAC: staff cannot manage members | PASS |
| super admin panel refused to normal owner | PASS |
| CSV export | PASS |
| CSV import 1 in 1 rejected | PASS |
| audit has record events | PASS |
| non-JSON body refused | PASS |
| cross-origin write refused | PASS |
| security headers on HTML (CSP, nosniff, frame deny) | PASS |
| record created in the browser UI is in D1 (read back by API) | PASS |

## 3. Live browser E2E

Real Chrome session (remote browser), fresh profile, against the live URL.

Desktop 1440×900: landing (light / dark) → `/login` → Clerk email + password → Clerk "new device" email code step (Device Trust is on) → dashboard → marketplace search and activate → CRM leads table → empty-form save shows field errors → filled form saves → table search finds it → module overview charts → module permission matrix → command palette (Ctrl K) finds the new record → members → roles → audit log → super-admin panel refuses a normal owner → dark theme across settings / dashboard / module / landing → sign out → protected route redirects to `/login?redirect_url=…`.

Mobile 390×844 (2× DPR): landing, dashboard, navigation drawer, marketplace, module table, form modal, members.

Screenshots: `screenshots/` (31 files; `m…` are 390 px).

## 4. Bugs found during QA and fixed

| Bug | Fix |
|---|---|
| Security headers (CSP, frame deny, nosniff) missing on HTML pages: the hosting asset layer served `index.html` before the Worker ran | `index.html` is now shipped as `app-shell.html`, so every page route goes through the Worker and gets the headers (verified live) |
| Landing hero overflowed horizontally on desktop (grid column grew to the width of the category chip row) | `minmax(0, …)` columns and `min-w-0` |
| Marketplace page 3,408 px wide on a 390 px phone (category rail) | `min-w-0` on the rail; verified 0 overflow |
| Table filters rendered 590 px wide and stacked on desktop | fixed widths, toolbar no-wrap at desktop |
| Visible scrollbars on tab strips and chip rows | hidden scrollbar on horizontal strips |
| Audit items 14 and 17: hover-nudging arrow, inset left-stripe active states | removed |
| Pagination "1 / 1" wrapped; first column truncated on phones | no-wrap, min width |

## 5. 30-point anti-AI audit

| # | Rule | Result | Note |
|---|---|---|---|
| 1 | Harsh gradients | Pass | Only a soft chart fill under the area line; no gradient backgrounds or buttons |
| 2 | Pure white backgrounds | Pass | Paper #F6F1E7 / #FBF8F1, dark #0B1619 |
| 3 | Rainbow colouring | Pass | Five-colour Coolors palette, status colours limited to ok / warn / danger |
| 4 | Heavy drop shadows | Pass | Short tinted shadows only on glass chrome |
| 5 | Liquid glass | Reasoned exception | Requested by Nabin. Chrome only (sidebar, top bar, palette, modals, toasts); data panels opaque; reduced-transparency fallback |
| 6 | Generic purple + black | Pass | Teal / saffron / auburn |
| 7 | Radial orbs | Pass | Static contour-line map instead |
| 8 | Excessive neon | Pass | None |
| 9 | Basic pastel palettes | Pass | Deep, warm palette |
| 10 | Default Lucide icons | Pass | Phosphor, one icon per category |
| 11 | Emojis as UI icons | Pass | None |
| 12 | Inter / Geist / Space Grotesk | Pass | Bricolage Grotesque + Plus Jakarta Sans + JetBrains Mono |
| 13 | Unnecessary sparkle icons | Pass | None |
| 14 | Animated arrows | Pass | Removed the one hover-nudging arrow on the dashboard during QA |
| 15 | Hover animation on every element | Pass | Colour change on interactive elements only |
| 16 | Three-feature-card layouts | Pass | Landing uses a live directory, an indexed list and numbered rows |
| 17 | Coloured left stripes on cards | Pass | Removed two inset left-stripe active states (sidebar, marketplace) during QA |
| 18 | Repetitive bento grids | Pass | None |
| 19 | Unnecessary terminal mockups | Pass | None |
| 20 | Generic three-tier pricing | Pass | No pricing section; billing is off and says so |
| 21 | Soft rounded corners everywhere | Pass | 7 / 10 / 14 px scale, pills only for chips and the landing nav |
| 22 | Dot-grid backgrounds | Pass | Contour lines, not dots |
| 23 | Excessive em dashes | Pass | 0 em dashes in UI source (grep) |
| 24 | "It's not X, it's Y" copy | Pass | None |
| 25 | Repetitive checkmark bullet lists | Pass | None |
| 26 | Fake testimonials | Pass | None; no customer counts or logos |
| 27 | Missing real product demo | Pass | Landing hero is the real searchable module registry |
| 28 | Missing skeleton loaders | Pass | Skeletons on dashboard, tables, marketplace, settings, admin |
| 29 | Missing Terms of Service | Pass | /terms |
| 30 | Missing Privacy Policy | Pass | /privacy |

## 6. Security checks

- Clerk JWT verified on every protected route (RS256 via JWKS; iss / exp / nbf / azp / sub); tampered token refused live.
- Org always taken from the caller's own active membership; suspended users and orgs refused.
- CSP, X-Frame-Options DENY, nosniff, Referrer-Policy, Permissions-Policy, HSTS on pages; same-origin check and JSON-only on writes; D1 rate limits.
- Secret scan: the 8 secret values from the local secret files plus patterns (`sk_test_/sk_live_`, `whsec_`, private keys, GitHub / AWS / Slack tokens, Clerk testing tokens) checked against every file pushed: 0 hits. `.env` and `secret/` are git-ignored; only the publishable key (public by design) is baked into the build.

## 7. Known limitations

- Clerk **development** instance: shows Clerk's "Development mode" badge and has dev rate limits. A production instance needs a domain.
- Deep module logic is not in Phase 1 (see STATUS.md / PLAN.md); every module is a typed record system with permissions, CSV and dashboards.
- Invite emails are not sent (copy link). No file uploads yet.
- Super-admin panel UI was not opened live, because that needs Nabin's own sign-in; it is covered by API tests.
- Test data: the live database holds two QA organisations ("QA Acme Traders", "QA Beta Clinic") made by the E2E runs. They can be suspended or left; they are only visible to their QA owners and the super admin.
