# Byawastha: plan for phases 2–8

Phase 1 (done, 2 Nov 2026): platform foundation. Auth, tenants, RBAC, the schema engine with all 231 modules registered as working record systems, marketplace, shell, audit, super-admin, landing, legal.

Each later phase turns one group of categories from "standard module" (records + permissions + CSV + dashboard) into **deep modules** with the domain logic people pay for. Estimates are honest working hours for one builder at the pace of Phase 1, including tests and live QA; real-world review and fixes after you use it are extra.

| Phase | Scope | Deep features (examples) | Estimate |
|---|---|---|---|
| **2. Business & Finance core** | Business & Office, Finance & Accounting | Invoices with VAT 13% and PDF, payments against invoices, receivables ageing, expense approval flow, double-entry ledger with trial balance, payroll run (salary + SSF + TDS) feeding the ledger, quotation → invoice, recurring bills | 10–14 h |
| **3. Education + Healthcare** | Education, Healthcare | Class / section timetables, attendance by period, fee structures and dues per student, exam marks → grade sheets, student/parent portal; patient registration → appointment slots → visit notes → billing, pharmacy stock with expiry, lab orders and results | 12–16 h |
| **4. Retail, Hotel & Restaurant, Inventory** | Retail & E-commerce, Hotel & Restaurant, Manufacturing (stock side) | POS screen with barcode, stock movements on sale / purchase / return, low-stock alerts, purchase orders; table orders and KOT, room booking calendar with check-in/out and folio; bill of materials | 12–16 h |
| **5. Operations** | Transport & Logistics, Real Estate, Agriculture, Manufacturing (production) | Trips and fuel logs, vehicle maintenance schedule, shipment tracking; property units, leases and rent dues; crop / livestock cycles and yields; production orders and QC | 10–14 h |
| **6. People & community** | Sports & Fitness, Organizations & Events, Government & Public Services, Professional Services | Memberships with renewals, class bookings, tournaments and fixtures; event registration and ticket check-in; ward-office service requests with status, recommendation letters; case / matter management with time tracking and billing | 10–14 h |
| **7. IT, Media, Personal** | IT & Technology, Music & Entertainment, Personal & Daily Life | Helpdesk with SLA timers, asset register, project boards; royalties split statements, release and booking calendars; personal budget, habits, documents | 8–12 h |
| **8. Platform & money** | Cross-cutting | Billing and subscriptions once a payment provider is available (Khalti / eSewa / Stripe where legal), premium modules, Clerk production instance on a real domain, invite emails, Clerk webhooks, file attachments (R2), scheduled reports and email digests, public API keys, PostgreSQL port if scale demands it | 10–14 h |

**Total for phases 2–8: about 72–100 hours.** Working at roughly one phase per day or two, that is two to three weeks.

Order can change: if one industry matters most to you (for example schools or clinics), that phase moves up. Each phase ends the same way Phase 1 did: tests, live desktop + mobile E2E, the 30-point audit, a status update, and a push to the same repo.

Things that need you, not code:
- A domain for the Clerk production instance and the app (Phase 8). Free subdomains work for now.
- A payment account (Khalti / eSewa merchant, or Stripe if available to you) before billing can go on.
- Sign up once on the new app with nexamusic.np@gmail.com so the super-admin panel opens for you.
