# SokoOS — Findings Register (living document)

Updated as work progresses. Status values: `OPEN`, `CONFIRMED`, `FIXED`, `VERIFIED-FIXED`,
`WONTFIX (documented)`, `CANNOT-TEST`.

> **Numbering:** IDs here (`F-01`…) are local to **this** audit pass. They are **distinct from**
> the earlier audit at `docs/audit/AUDIT.md`, whose IDs are referenced here as `BA-F-01`…
> `BA-F-25`. Where a finding here repeats or re-verifies an earlier one, the earlier ID is cited.
> **Method:** no application code is changed before a finding is written down and reproduced.


| ID | Severity | Status | Title |
|---|---|---|---|
| F-01 | High | VERIFIED-FIXED | Six top-level app sections returned HTTP 404 |
| F-02 | High | VERIFIED-FIXED | ~79 of 85 industry nav paths pointed at non-existent routes |
| F-03 | Medium | OPEN | `test:integration` references a missing Jest config |
| F-04 | High | PARTIALLY FIXED | Frontend had zero tests and no `test` script |
| F-05 | Medium | OPEN | CI sets the wrong secret env var → API boot/validate fails in CI |
| F-06 | Low | OPEN | `docker/` and `scripts/` are empty but referenced by docs/package.json |
| F-07 | Medium | OPEN | `packages/api-client` is empty; three divergent client copies exist |
| F-08 | Medium | OPEN | Auth tokens persisted in `sessionStorage`/`localStorage` |
| F-09 | Low | OPEN (accepted) | Repository is not a git repo — no change history / diff review possible |
| F-10 | Low | OPEN | 12 pre-existing ESLint unused-variable warnings in `apps/web` |
| F-11 | Medium | OPEN | Mobile app calls `/purchasing/orders…` but the API exposes `/purchasing/purchase-orders…` |
| F-12 | High | VERIFIED-FIXED | Sales report rendered `UGX 0` / `UGX NaN` — API returned raw Prisma `groupBy` rows |
| F-13 | Medium | OPEN | Report endpoints deviate from the paths in docs/10 |
| F-14 | Medium | VERIFIED-FIXED | `/reports/sales` daily-trend chart drew no bars (percentage height against an auto-height parent) |
| F-15 | Medium | FIXED | Settings sub-screens unreachable — `/settings/branches`, `/settings/roles` and `/settings/notifications` had no inbound link anywhere in the UI |
| F-16 | Medium | FIXED | Accent colour was not changeable: the brand token was duplicated and five components pinned their accent hover to a literal orange |


### Fix log

| Finding | Change | Verified by |
|---|---|---|
| F-01, F-02 | New `apps/web/src/lib/routes.ts` route registry; `(app)/layout.tsx` now resolves every nav path through it and drops unimplemented items; dashboard "Inventory →" link repointed; `next.config.mjs` redirects the six legacy section URLs | `tests/e2e/specs/navigation.spec.ts` — 2/2 pass |
| F-04 | Added the navigation E2E spec (regression test for F-01/F-02) | same |
| F-12 | `ReportsService.getSalesReport` rewritten to return the shape the screens render (named branches, `*Minor` units, `byDay`), bucket in Africa/Kampala, and treat the range as inclusive at both ends | `apps/api/src/modules/reports/__tests__/reports.service.spec.ts` — 4 tests; API suite 9 suites / 36 tests; sales-report screenshot |
| F-14 | Daily-trend bars sized in pixels (matching the mobile screen) instead of a percentage height, and the day label taken from the date string rather than a timezone-dependent `new Date()` | `/reports/sales` screenshot; E2E 4/4 |
| F-15 | New `apps/web/src/components/settings-nav.tsx` tab strip, rendered by `(app)/layout.tsx` on every `/settings/*` route | E2E settings walk — every tab resolves, correct tab marked `aria-current` |
| F-16 | `tailwind.config.ts` maps the `sunset` accent family to the `--brand*` CSS variables; `globals.css` gained channel mirrors plus eight `:root[data-brand='…']` presets; new `src/lib/theme.ts` and `/settings/appearance`; the five literal-orange hovers replaced with the `sunset-hover` token | E2E asserts `--brand` and two components' computed backgrounds change together and survive a reload |



---

## F-01 — Six top-level app sections return HTTP 404

**Severity:** High · **Status:** CONFIRMED (reproduced live)

**Repro**
1. Sign in to the web app (`http://localhost:3000/login`).
2. In the sidebar click **Catalogue** (or **Inventory**, **Purchasing**, **Finance**,
   **Reports**, **Settings**).

**Expected** the section opens (optionally landing on its first sub-page).
**Actual** Next.js renders `404 — This page could not be found.`

**Evidence** live HTTP probe against the running dev server:

```
/inventory  => HTTP 404      /catalogue   => HTTP 404
/purchasing => HTTP 404      /finance     => HTTP 404
/reports    => HTTP 404      /settings    => HTTP 404
/dashboard  => HTTP 200      /sales       => HTTP 200   /pos => HTTP 200
/users      => HTTP 200      /transfers   => HTTP 200   /notifications => HTTP 200
```

Note the sub-routes *do* exist and return 200 (`/inventory/movements`,
`/reports/sales`, `/settings/business` all return 200).

**Root cause** these six directories contain only child folders
(`inventory/{adjustments,balances,batches,counts,movements}/page.tsx`) and have **no
`page.tsx` of their own**, so the bare section URL has no route to match.

**Fix direction** add a section landing page at each missing index that presents the existing
sub-pages (no invented features, no fake data), consistent with the UI spec's IA.

---

## F-02 — ~79 of 85 industry nav paths point at non-existent routes

**Severity:** High · **Status:** CONFIRMED

**Evidence** `apps/web/src/lib/industries.ts` defines 60+ industry configs whose `nav` arrays
reference **85 distinct paths**. Only ~29 routes exist. The sidebar (`(app)/layout.tsx`) renders
`getIndustryConfig(businessType).nav` verbatim — every industry-specific item
(`/floor`, `/kitchen`, `/recipes`, `/patients`, `/vehicles`, `/pumps`, `/farmers`, `/classes`,
`/students`, `/housekeeping`, `/maintenance`, …) is a dead link.

**Repro** set `sessionStorage.sokoos_industry` to e.g. `RESTAURANT`, reload — the sidebar shows
Floor / Kitchen / Menu / Recipes, none of which route.

**Impact** Appears as "the app is broken" to any non-retail user. Note these modules are
partly *deferred* in the spec, so the honest fix is to (a) make the six core sections work
(F-01) and (b) not advertise modules that were never built.

---

## F-03 — `test:integration` references a missing Jest config

**Severity:** Medium · **Status:** CONFIRMED

`apps/api/package.json` → `"test:integration": "jest --config jest.integration.json"`, but
`apps/api/jest.integration.json` does not exist (`Test-Path` → False). The documented
integration suites (sale+inventory, PO+receiving, transfers, supplier lifecycle, payment
reconciliation, import) therefore cannot run. Root `package.json` also exposes
`test:integration` pointing at the same missing config.

---

## F-04 — Frontend has zero tests and no `test` script

**Severity:** High · **Status:** CONFIRMED

`apps/web/package.json` has no `test` script (`dev`, `build`, `start`, `lint`, `typecheck` only)
and there is no Jest/Vitest config or `__tests__`/`*.spec` file anywhere under `apps/web/src`.
Because `turbo.json` runs `test` per package, `pnpm turbo test` **silently skips the entire
frontend** — React components, hooks, the API client and the query layer are entirely
uncovered. This is why the F-01/F-02 navigation breakage went unnoticed.

---

## F-05 — CI sets the wrong secret env var

**Severity:** Medium · **Status:** CONFIRMED

`.github/workflows/ci.yml` (test job) sets `JWT_REFRESH_SECRET`, but
`apps/api/src/config/env.schema.ts` requires `REFRESH_TOKEN_SECRET` (min 32). Because
`ConfigModule.forRoot({ validate })` runs `envSchema.parse` at boot, the API fails to start in
CI. CI also never runs `test:integration` or the Playwright suite.

---

## F-06 — Empty `docker/` and `scripts/` directories

**Severity:** Low · **Status:** CONFIRMED

`docker/` and `scripts/` exist but contain no files. Root `package.json` exposes
`"smoke": "bash scripts/smoke.sh"` which therefore always fails. `docs/00-index.md` both says
"no Docker" and "CI/CD with Docker" — the spec is internally inconsistent here.

---

## F-07 — `packages/api-client` is an empty placeholder

**Severity:** Medium · **Status:** CONFIRMED

`packages/api-client/` contains only an empty `src/` directory (no `package.json`, so it is not
even a workspace package). The documentation says a shared typed client is reused across
clients, but there are three independent implementations:
`apps/web/src/lib/api-client.ts`, `apps/mobile/src/lib/api.ts`,
`apps/desktop/src/lib/api-client.ts`. Divergence risk: error handling and the 401 flow already
differ between them.

---

## F-08 — Auth tokens persisted in web storage

**Severity:** Medium · **Status:** CONFIRMED

`apps/web/src/lib/api-client.ts` stores `sokoos_access_token` and `sokoos_refresh_token` in
`sessionStorage`, and additionally in `localStorage` when "remember me" is selected. Any XSS
can exfiltrate them. The refresh token is long-lived (default `30d`). There is currently **no
refresh-token rotation call** wired into the web client: `request()` handles 401 by deleting the
token and redirecting to `/login` — it never calls `POST /v1/auth/refresh`, so a merely-expired
15-minute access token forces a full re-login (usability + it makes the "remember me" setting
partly meaningless).

---

## F-09 — Repository is not a git repository

**Severity:** Low (process) · **Status:** CONFIRMED

`git status` → `fatal: not a git repository`. There is no history, no diff review, and no
rollback. Not code-critical, but it means changes cannot be reverted mechanically; all edits in
this audit are made in small, individually-verified steps for that reason.

---

## F-10 — Pre-existing ESLint unused-variable warnings (Low)

**Severity:** Low · **Status:** OPEN (pre-existing, not introduced by this audit)

`pnpm --filter @sokoos/web build` reports 12 `@typescript-eslint/no-unused-vars` warnings across
9 files (`pos/page.tsx`, `transfers/page.tsx`, `reports/*`, `notifications/page.tsx`,
`inventory/movements/page.tsx`, `purchasing/purchase-orders/page.tsx`, `hooks/use-queries.ts`).
They do not fail the build. Deliberately **not** fixed here: removing imports across unrelated
files is an unrelated rewrite. Recorded so it is not mistaken for noise from this audit.

---

## F-11 — Mobile client calls a purchase-order path the API does not expose (Medium)

**Severity:** Medium · **Status:** OPEN (not verifiable in this environment)

`apps/mobile/src/screens/purchasing/*` call `/purchasing/orders`, `/purchasing/orders/{id}` and
`/purchasing/orders/{id}/goods-receipts`. The API exposes `/v1/purchasing/purchase-orders`,
`/v1/purchasing/purchase-orders/{id}` and `POST /v1/purchasing/goods-receipts` (confirmed from
the running server's OpenAPI document). The mobile purchasing screens therefore cannot work
against the real API.

Not fixed here because the mobile app cannot be built or run in this environment (Expo/React
Native toolchain absent), so a change could not be verified. Recorded for the mobile workstream.
The web client uses the correct paths (`usePurchaseOrders` → `/purchasing/purchase-orders`).

---

## F-12 — Sales report rendered `UGX 0` and `UGX NaN` (High)

**Severity:** High · **Status:** FIXED — reproduced live, then verified after the fix

**Repro** Screenshot `tests/e2e/screenshots/nav_reports_sales.png` taken during the navigation run:
`/reports/sales` showed Gross Sales `UGX 0`, Refunds `UGX 0`, Net Sales `UGX 0`, Transactions
`190`, and both breakdown cards showed `UGX NaN` with a single unnamed "Sales by Branch" row.
The database plainly held the sales, so the figure the page was printing had to be `undefined`.

**Root cause** `ReportsService.getSalesReport` returned raw Prisma rows —
`{ grossSales, refunds, netSales, byBranch: [{ _sum, _count }], byPaymentMethod: [{ _sum, _count }] }`,
with no `byDay` and no branch name — while both clients read `grossMinor`, `refundsMinor`,
`netMinor`, `byBranch[].branchName`, `byBranch[].netMinor`, `byPaymentMethod[].total` and `byDay`
(`apps/web/src/app/(app)/reports/sales/page.tsx`, `apps/mobile/src/screens/reports/SalesReportScreen.tsx`).
Every money field was therefore `undefined`: `formatMoney(undefined)` printed `UGX NaN`, and the
`?? 0` fallbacks printed `UGX 0`. `transactions` was the one key whose name happened to match, which
is why it alone was correct. The mobile screen hides the same defect behind a mock-data `catch`.

Two further defects in the same method:
- the range was built from `new Date(dateFrom)…new Date(dateTo)` while both arrive as bare
  `YYYY-MM-DD`, so the final day of the range was excluded at midnight UTC;
- `transactions` was counted without the `COMPLETED`/`PARTIALLY_REFUNDED` filter that the totals used.

**Fix** rewrote the method in the established style of `getDashboard` (`$queryRaw` + `Prisma.sql`,
`Africa/Kampala` bucketing): totals, one bucket per day/week/month via `date_trunc`, one row per
named branch, one row per payment method. Money is returned as numbers, dates as `YYYY-MM-DD`
strings. `groupBy` is clamped to `day|week|month`, `dateFrom`/`dateTo` are inclusive calendar dates
in business-local time, and unparseable or absent dates fall back to the last 30 days instead of
throwing a 500.

**Verified** `apps/api/src/modules/reports/__tests__/reports.service.spec.ts` (shape and
finite-number assertions, tenant + timezone scoping, `groupBy` clamping, date fallback); API suite
9 suites / 36 tests; and re-verified live from the regenerated `/reports/sales` screenshot.

**Contract change** `GET /v1/reports/sales` renamed its money keys (`grossSales`/`refunds`/`netSales`
→ `grossMinor`/`refundsMinor`/`netMinor`) and now always returns `byDay`. No consumer read the old
keys, so nothing else needed changing.

---

## F-13 — Report endpoints deviate from the paths in docs/10 (Medium)

**Severity:** Medium · **Status:** OPEN (documented deviation, not fixed here)

`docs/10-api-specification.md` lists `GET /reports/sales-summary`, `/reports/stock-valuation`,
`/reports/stock-movements`, `/reports/purchases`, `/reports/refunds` and `/reports/tax`. The API
implements `/reports/sales`, `/reports/stock`, `/reports/low-stock` (which docs/10 does not mention
at all) and `/reports/purchasing`.

Deliberately not renamed in this pass: web, mobile and desktop all call the implemented paths, so a
rename is a breaking change that must land together with all three clients and is a product naming
decision. Under the authority order in `AGENTS.md`, docs/10 outranks the implementation, so this is
recorded as a known deviation to be closed by an explicit rename task.

---

## F-14 — Sales-report daily-trend chart drew no bars (Medium)

**Severity:** Medium · **Status:** FIXED — found by screenshot review, re-verified by screenshot

**Repro** The first screenshot taken after F-12 was fixed showed correct figures (Gross `UGX 3.3M`,
217 transactions, and both breakdown cards populated) but the "Daily Sales Trend" card drew eight
flat 2px dashes along the baseline instead of a column chart — even though the API had returned
eight daily buckets.

**Root cause** each bar used `style={{ height: `${pct}%` }}`, but its parent is a `flex-col` column
with no height: the 128px `h-32` lives on the grandparent row and is not inherited, so the
percentage had no definite height to resolve against and collapsed to `minHeight: 2`. Every day
value was correct; only the drawing was broken. The day label also used
`new Date(day.date).getDate()`, which renders the previous day in any timezone behind UTC.

**Fix** bars are sized in pixels against a fixed 96px plot area (the approach the mobile
`SalesReportScreen` already uses), and the label is read straight from the `YYYY-MM-DD` string so it
is timezone-independent. Chart-rendering code is the only thing touched.

**Verified** regenerated `tests/e2e/screenshots/nav_reports_sales.png` shows eight proportional bars
with 5–12 labels; E2E suite 4/4.

---

## F-15 — Settings sub-screens are unreachable from the UI (Medium)

**Severity:** Medium · **Status:** FIXED

**Repro** sign in and try to reach Users & Roles or Notification settings by clicking. The sidebar
carries exactly one Settings entry, pointing at `/settings/business`; `(app)/layout.tsx` renders no
settings sub-navigation and no settings page links to its siblings. `/settings/branches`,
`/settings/roles` and `/settings/notifications` are implemented and return 200, but nothing in the
interface references them — they are URL-only screens.

**Impact** the same class of defect as F-01/F-02 (a screen that exists but cannot be reached), and a
blocker for anything that is not the business profile: branch setup, role editing and notification
preferences were all effectively hidden. It also explains why the earlier navigation audit found
nothing wrong — it walked the sidebar, which contains no link to these screens.

**Fix** `src/components/settings-nav.tsx` — a tab strip over the six settings destinations
(Business, Branches, Team, Roles, Notifications, Appearance) with the current tab marked
`aria-current="page"`. `(app)/layout.tsx` renders it above the page content whenever the path starts
with `/settings`, so future settings screens need no additional wiring.

**Verified** the E2E suite walks every tab, asserting each resolves to a real screen with the correct
tab active; screenshots in `tests/e2e/screenshots/`.

---

## F-16 — The accent colour could not be changed (Medium)

**Severity:** Medium · **Status:** FIXED

**Requirement** `docs/11-ui-ux-specification.md` states the design system keeps **one** accent colour
for brand identity, declared once as CSS custom properties and exposed to Tailwind so that no
component hard-codes a hex value. The requested behaviour — pick a colour in Settings and have every
component follow — is therefore only a matter of whether that single token is truly the one the
components read.

**Repro** it was not, in two ways:

1. **The token was duplicated.** `app/globals.css` declared `--brand: #C2410C`, while
   `tailwind.config.ts` declared `sunset: '#C2410C'` as a literal. Every `bg-sunset`, `text-sunset`,
   `border-sunset` and focus ring in the app came from the Tailwind copy, and every `.btn-primary`,
   `.badge-brand`, `.progress-fill` and `.nav-item.active` came from the CSS copy. They agreed by
   coincidence; changing either would have split the interface in half.
2. **Five components bypassed the token for hover states.**
   `apps/web/src/components/ui/index.tsx` (shared `Button`, `primary`) plus the login, register and
   verify screens used `hover:bg-orange-700` / `hover:text-orange-700` next to `bg-sunset` /
   `text-sunset`. A recoloured button turned orange on hover — the exact "one component doesn't
   follow" symptom, and a breach of `docs/19-coding-standards.md` ("no arbitrary hex colours").

**Fix**
- `tailwind.config.ts`: the `sunset` family (DEFAULT/hover/light/subtle) is now
  `rgb(var(--brand-rgb) / <alpha-value>)` and friends, so utilities — including alpha modifiers such
  as `bg-sunset/5` — resolve through CSS variables at render time.
- `app/globals.css`: `--brand*` kept for the CSS rules that consume a colour directly, with
  `--brand*-rgb` channel mirrors for Tailwind, and eight presets under `:root[data-brand='…']`
  (Sunset Savanna default, Ocean, Teal, Forest, Plum, Rose, Amber, Graphite). Each preset also
  re-points `--sidebar-active-bg` and `--border-focus`, so the sidebar highlight and input focus
  borders move with the accent. Neutral surfaces and the semantic colours are untouched — a "low
  stock" badge stays red in every colourway.
- `src/lib/theme.ts`: `BRAND_PRESETS`, plus `applyBrand` / `storeBrand` / `readStoredBrand` with the
  storage guarded in `try/catch`; the colour itself stays in CSS, so the module only carries ids.
- `src/app/(app)/settings/appearance/page.tsx`: the picker (swatch grid, live preview of a button,
  badges, link and progress bar, and a reset). Clicking applies immediately, no save button.
- `src/app/layout.tsx`: a small inline script applies the stored preset before first paint, so a
  reload never flashes the default orange.
- The five literal-orange hovers now use the `sunset-hover` token.

**Verified** `tests/e2e/specs/navigation.spec.ts` picks Ocean on `/settings/appearance` and asserts
that `--brand` becomes `#1d4ed8`, `<html data-brand>` is set, and that two independent components
sharing the token (the settings tab and the preview button) both compute to `rgb(29, 78, 216)`; a
reload preserves it. Screenshots `settings-appearance.png` and `settings-appearance-ocean.png`.

**Limitation** mobile (`apps/mobile`) and desktop (`apps/desktop`) carry their own copies of the
palette and are unaffected; they need the same treatment in their own workstreams.


