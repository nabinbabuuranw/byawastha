# Byawastha (व्यवस्था): design

Live: https://byawastha.sites.tab.bot/ · Proof files: `design-proof/` (in this folder) · Screenshots: `screenshots/`

## 1. Name

**Byawastha** (व्यवस्था) is Nepali for "system, order, arrangement". It says what the product does (it is the system an organisation runs on) and it is a word every Nepali user already knows. A web search found no software product by that name. Considered and dropped: Sabai, Prabandha, Ekai, Sarbatra (taken).

## 2. Workflow and proof

| Step | What I did | Proof |
|---|---|---|
| Research | Looked at how multi-module admin suites (ERP / school / clinic suites) structure navigation, marketplace and dense tables | notes inside the UI UX Pro Max queries below |
| UI UX Pro Max | Generated a design system for "Byawastha" and ran 5 domain searches: liquid glass dashboard style, KPI/trend charts, dense admin data tables with filters, command palette UX, enterprise typography | `design-proof/design-system/byawastha/MASTER.md`, `design-proof/uiuxpromax-*.txt` |
| 21st.dev | 6 component searches: collapsible sidebar, command palette, data table with filters + pagination, stat widgets, sign-in page, liquid glass. Reviewed the top results and their previews (IDs 24865, 24939, 29334, 2075, 40104, 23522, 28327, 31861, 27325, 19070, 4157, 35089, 39096, 2429, 3042, 2759, 4567) | `design-proof/21st-search-*.txt`, `21st-search-results.json`, `21st-*.png` |
| Coolors | Opened coolors.co **signed in as Nabin** and browsed trending, purple, dark, gradient palettes. Picked **Dark Sunset**, shortlisted two others | `design-proof/coolors-01..07-*.png`, `coolors-explore.json` |

What I took from each, and what I did not:

- **UI UX Pro Max** recommended Liquid Glass with conditions: use it on navigation and controls only, keep 4.5:1 text contrast, visible focus, and honour reduced motion / reduced transparency. All four are implemented. Its default palette (trust blue + orange) and single-font typography were **not** used: blue SaaS is the generic look the brief asks to avoid.
- **21st.dev**: the sidebar uses the "nav group with collapsible category" pattern (24865/24939) so 231 modules never flood the navigation: only the organisation's active modules appear, grouped by category. The command palette follows 2075/40104 (grouped results, keyboard first, recent actions). The data table follows 28327/31861 (toolbar with search + filters on one line, bulk-select bar, page-size selector, footer range "1–25 of N"). The sign-in page follows the split layout of 39096. The free plan had no component downloads left, so everything was written by hand to match our tokens rather than pasted.
- **Coolors**: palette below.

## 3. Palette: Coolors "Dark Sunset"

https://coolors.co/palette/335c67-fff3b0-e09f3e-9e2a2b-540b0e

| Swatch | Hex | Use |
|---|---|---|
| Slate teal | `#335C67` | primary buttons, active states, charts (light) |
| Vanilla | `#FFF3B0` | glass edges and contour lines (dark), vanilla accent |
| Fulvous saffron | `#E09F3E` | brand accent; deepened to `#B07016` on light paper for 4.5:1 |
| Auburn | `#9E2A2B` | danger / destructive, auburn accent |
| Oxblood | `#540B0E` | chart series, deep accent |

Surfaces are derived, not pure white: light paper `#F6F1E7` / `#FBF8F1`, dark `#0B1619` / `#13252A`. Why this palette: warm saffron and auburn read as Nepali (temple wood, sindoor) without being a flag; teal keeps it calm enough for an all-day work tool. It is different from the earlier platforms (Chukta: sky blue; Palo: pine / sindoor / paper). Users can switch the workspace accent between the four palette presets in Settings.

## 4. Type, icons, shape

- **Bricolage Grotesque** (display: page titles, numbers on KPI cards), **Plus Jakarta Sans** (UI and body), **JetBrains Mono** (IDs, audit actions, IPs). Self-hosted through Fontsource; no Inter / Geist / Space Grotesk.
- **Phosphor** icons (duotone for category marks, regular for actions). Each of the 17 categories has its own icon. No emoji in the UI, no sparkle icons.
- Radii are deliberately small (7 px controls, 10 px panels, 14 px sheets); shadows are short and tinted, never heavy.

## 5. Liquid Glass, and where it is not

Nabin asked for Liquid Glass, which is item 5 on the 30-point anti-AI list. The reasoned exception: glass is used **only on chrome** (sidebar, top bar, command palette, modals, toasts, landing nav and the module directory demo). Every content surface that holds data (tables, forms, cards, charts) is an opaque panel, so numbers are always read against a solid background. The glass sits over a **static contour-line map** (a hill-map SVG used as a mask), never over gradients or orbs. `prefers-reduced-transparency` swaps glass for solid surfaces; `prefers-reduced-motion` turns off animations.

## 6. Layout and motion

- **Landing**: glass pill navigation; hero with the **real module directory** (the same registry the app runs on, searchable) instead of a mock screenshot; an indexed list of the 17 categories (editorial index, not a card grid); a numbered "how a workspace runs" sequence; an honest dark "what works today / what does not" table; FAQ; legal links. No pricing tiers, no testimonials, no customer counts.
- **App**: glass sidebar (workspace switcher, dashboard, marketplace, active modules by category, audit, settings, help), glass top bar (global search that opens the command palette, theme toggle, notifications, Clerk user menu). Mobile: sidebar becomes a drawer.
- **Motion**: scroll reveals on the landing that reverse when scrolling back up, animated tab underline, modal and palette transitions, chart draw-in, skeleton loaders on every data view. Hover effects only where something is clickable.

## 7. Dark and light

Both themes are complete token sets (see `src/styles.css`), with a system option. Screenshots of each are in `screenshots/` (19–22 dark).
