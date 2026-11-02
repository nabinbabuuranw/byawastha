# Byawastha Phase 1: what is real, what is placeholder

Live: https://byawastha.sites.tab.bot/ · Date: 2 November 2026

Nothing in the app shows invented data. Every number on a dashboard is counted from the database; an empty workspace shows empty states.

Labels: **Done + tested** (automated test and/or live E2E), **Done, untested** (built, not covered by a test yet), **Placeholder**, **Not started**.

## Built

| Area | Status | Notes |
|---|---|---|
| Clerk auth: sign up, sign in, Google, email codes, forgot password, new-device check, sessions, profile, sign out | Done + tested | Clerk app "Byawastha" (development instance), separate from NEXA. Sign-in with email + password + new-device email code tested live in a real browser |
| Protected routes + backend JWT verification on every API call | Done + tested | RS256 / JWKS, issuer, exp, nbf, azp, sub. Tampered and missing tokens refused live |
| Clerk user to DB user mapping, no passwords stored | Done + tested | users table keyed by Clerk id |
| Organisations, onboarding, starter modules by industry | Done + tested | |
| Invites by email (accepted only by a verified matching email) | Done + tested (invite part) / Not started (email) | Invite is stored and shows up for the person after they sign up; **no invite email is sent yet** (copy-link instead) |
| Departments | Done, untested | |
| RBAC: 12 built-in roles + custom roles + per-module permission matrix + own-records-only portal roles | Done + tested | Enforced on the server on every request |
| Tenant isolation | Done + tested | Org resolved from the caller's membership; cross-org reads, writes and references refused (tested locally and live) |
| Module registry: 231 modules, 17 categories, 358 tables | Done + tested | Each module has 1–4 domain tables with typed fields (text, money, dates, choices, links to other records…) |
| Marketplace: browse, search, category filter, module detail, activate / deactivate, configure | Done + tested | |
| Module workspace: CRUD, validation, search, filters, sort, pagination, bulk delete | Done + tested | Same engine for all 231 modules |
| CSV export / import (template, row errors, formula guard) | Done + tested | Up to 1,000 rows per import |
| Module overview charts, workspace dashboard, super-admin analytics | Done + tested | Counted live |
| Command palette + global search across all visible modules | Done + tested | |
| Audit log on every write, notifications, support tickets | Done + tested | |
| Super-admin panel: orgs, users, suspend, flags, tickets, health, platform audit | Done + tested (API); UI untested live | Only for `nexamusic.np@gmail.com` with a verified email |
| Dark / light / system theme, workspace accent | Done + tested (live screenshots) | |
| Terms, Privacy | Done, untested (content) | Written for this product; not reviewed by a lawyer |

## Placeholder or not built yet (labelled in the app)

| Area | Status |
|---|---|
| Module-specific logic (auto-billing, payroll maths, timetables, stock deduction on sale, appointment slots, etc.) | **Not started.** Every module is a well-typed record system today. The marketplace detail says so on each module ("Standard module… domain-specific automations are planned"). Phases 2–8 add it category by category (PLAN.md) |
| Billing, subscriptions, premium modules | **Placeholder (off).** Flag `billing` is false; plan shows "Free"; revenue shows Rs 0 with the reason. No payment provider is connected |
| Invite emails | Not started; owner copies the sign-up link |
| Clerk webhooks | Not started; users are synced on each verified request instead |
| File uploads / attachments in modules | Not started |
| Clerk production instance | Development instance (shows Clerk's "Development mode" badge, has dev limits). Moving to production needs a domain |
| Super-admin login | Works once Nabin signs up on the new Clerk app with `nexamusic.np@gmail.com` (not yet done; I did not create an account in his name) |

## Database note

The brief named PostgreSQL. **Cloudflare D1 (SQLite) replaces it** so the whole product runs at $0 on one Worker. Records are JSON rows validated against the module schema, with a search column, all scoped by `org_id`. Porting to PostgreSQL later changes `api/src/schema.ts` and the query layer, not the API.
