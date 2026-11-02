# Byawastha (व्यवस्था)

**Every management system your organisation runs, in one workspace.**
Live: https://byawastha.sites.tab.bot/

Byawastha is a multi-tenant SaaS: one login (Clerk), many organisations, and a marketplace of **231 management modules in 17 categories** that each organisation switches on as it needs. Every module runs on the same schema-driven engine, so each one already has real create / edit / delete, search, filters, sorting, pagination, CSV import and export, per-role permissions, an audit trail and a module dashboard, stored in a real database.

This repository is **Phase 1** (foundation). What is real and what is still to come is listed honestly in [docs/STATUS.md](docs/STATUS.md); the roadmap for phases 2 to 8 is in [docs/PLAN.md](docs/PLAN.md).

## What works today

- **Auth (Clerk):** sign up, sign in, Google, email verification codes, password reset, new-device check, sessions, profile, sign out, protected routes. Routes: `/login` `/register` `/forgot-password` `/verify-email` `/onboarding`. No passwords are stored in our database.
- **Backend verifies the Clerk session JWT on every protected request** (RS256 against Clerk's JWKS; issuer, expiry, not-before, authorised party and subject checked), maps the Clerk user id to a DB user, and resolves the organisation from the caller's own membership, never from client input.
- **Organisations / tenants:** onboarding creates an org with industry-matched starter modules; invites by verified email; departments; suspend/activate from the super-admin panel.
- **RBAC:** 12 built-in roles (Owner, Admin, Manager, Department Head, Accountant, HR, Staff, Teacher, Student, Patient, Vendor, Customer) plus **custom roles** with workspace permissions, a default module grant and per-category overrides. Per-module permission matrix for every role. Portal roles (Student, Patient, Vendor, Customer) only see records they created. The super-admin role is platform-level.
- **Module Marketplace:** browse/search 231 modules by category, view each module's tables and fields, activate / deactivate (records are kept), configure defaults and permissions.
- **Module workspace:** table with search, status and field filters, sortable columns, page sizes, bulk delete, form modal with server-side validation, CSV template / import (row-level errors) / export, module overview charts.
- **App shell:** glass sidebar and top bar, command palette (Ctrl/⌘ K) with global record search across every module you can view, notifications, dark / light / system theme, four workspace accents.
- **Audit log** on every write (who, what, when, IP), **notifications** to admins on deletions, imports, role and module changes, **support tickets** with replies.
- **Super-admin panel:** organisations, users, module-activation analytics, sign-up chart, platform audit, feature flags, support inbox, system health. Revenue reads **Rs 0 because billing is disabled**, and the panel says so.
- **Security:** CSP and security headers on every page, same-origin check on writes, JSON-only bodies, D1-backed rate limits, CSV formula-injection guard, cross-tenant reference checks.

## Stack

- **Frontend:** React 18, Vite 5, TypeScript, Tailwind CSS 3, React Router 6, TanStack Query 5, Zustand, Framer Motion, Recharts, Phosphor icons, Clerk React. Fonts: Bricolage Grotesque, Plus Jakarta Sans, JetBrains Mono (self-hosted via Fontsource).
- **Backend:** one Cloudflare Worker (`api/src/worker.ts`) serving the API and the built SPA.
- **Database: Cloudflare D1 (SQLite) replaces PostgreSQL** from the original brief. It is free, runs next to the Worker, and needs no separate server. The schema is plain SQL in `api/src/schema.ts`; module records are stored as validated JSON rows with a generated search column, scoped by `org_id`. Moving to PostgreSQL later means porting that file and the query layer; the API contract stays the same.
- **Cost:** $0 (Clerk development instance, Cloudflare free tier).

## Categories

| Category | Modules |
|---|---|
| Education | 15 |
| Business & Office | 15 |
| Finance & Accounting | 14 |
| Healthcare | 12 |
| Hotel & Restaurant | 12 |
| Retail & E-commerce | 16 |
| Real Estate | 12 |
| Transport & Logistics | 14 |
| Manufacturing | 12 |
| Agriculture | 12 |
| Sports & Fitness | 14 |
| Organizations & Events | 12 |
| IT & Technology | 16 |
| Music & Entertainment | 14 |
| Government & Public Services | 12 |
| Personal & Daily Life | 13 |
| Professional Services | 16 |
| **Total** | **231** (358 tables) |

## Run it locally

```bash
npm install
cp .env.example .env      # set VITE_CLERK_PUBLISHABLE_KEY
npm test                  # 28 API tests (auth middleware with a test JWKS, RBAC, tenant isolation, CSV, audit)
npm run build             # tsc + vite build + worker bundle into dist/site
```

`npm run build` writes `dist/site/` with `_worker.js` and the static assets. Deploy it as a Cloudflare Worker with a D1 binding named `DB` and an assets binding named `ASSETS`; the schema is created on first request.

Environment:

| Variable | Where | Notes |
|---|---|---|
| `VITE_CLERK_PUBLISHABLE_KEY` | build time | public key, baked into the bundle |
| `CLERK_SECRET_KEY` | never in this repo | only used for admin scripts and QA outside the app |
| `CLERK_WEBHOOK_SECRET` | not used yet | user sync happens on each verified request |

## Project layout

```
shared/registry.ts   module registry: 231 modules, 17 categories, typed fields (one compact DSL)
shared/rbac.ts       roles, permissions, custom-role validation
api/src/worker.ts    the API + static host
api/src/jwt.ts       Clerk JWT verification (JWKS, RS256)
api/src/schema.ts    D1 schema
api/src/csv.ts       RFC 4180 CSV with formula guard
api/test/            vitest suite against an in-memory SQLite D1 shim
src/                 React app (pages, shell, components)
docs/                status, plan, QA report, design notes
```

## Licence

MIT. See [LICENSE](LICENSE).
