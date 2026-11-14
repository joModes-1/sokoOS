# Hardening pass report — navigation + sales report

Scope: `# SOKOOS` web app, API and E2E harness, following the system audit in
`project-docs/audit/00-SYSTEM-AUDIT.md`. Findings and the running fix log live in
`project-docs/audit/FINDINGS.md`; this file records the pass itself.

## 1. What changed

### Web (`apps/web`)

| File | Change |
|---|---|
| `src/lib/routes.ts` | **New.** Route registry: `SECTION_HOME`, `IMPLEMENTED_ROUTES`, `resolveNavPath()`. Single source of truth for which nav paths exist. |
| `src/app/(app)/layout.tsx` | Nav items are resolved through the registry; items whose destination is not implemented are no longer rendered. |
| `src/app/(app)/dashboard/page.tsx` | "Inventory →" link repointed at `/inventory/balances`. |
| `next.config.mjs` | Permanent redirects from the six legacy section URLs (`/catalogue`, `/inventory`, `/purchasing`, `/finance`, `/reports`, `/settings`) to their real first screens. |
| `src/app/(app)/reports/sales/page.tsx` | Daily-trend chart: bars sized in pixels inside a fixed 128px plot area, axis labels horizontal and unclipped, day label read from the date string. |

### API (`apps/api`)

| File | Change |
|---|---|
| `src/modules/reports/reports.service.ts` | `getSalesReport` rewritten (see below). |

`getSalesReport` now returns the shape the screens actually render — `grossMinor`, `refundsMinor`,
`netMinor`, `transactions`, `byBranch[]` with `branchName`/`netMinor`, `byPaymentMethod[]` with
`total`, and `byDay[]` — instead of raw Prisma `groupBy` rows. Aggregates run through `$queryRaw`
with `Prisma.sql`, bucket in `Africa/Kampala` (`date_trunc` by day/week/month), treat `dateFrom`/
`dateTo` as inclusive calendar dates, and fall back to the last 30 days for missing or unparseable
dates rather than throwing. This matches the convention already used by `getDashboard` and fixes the
same defect on the mobile `SalesReportScreen`.

### Tests

| File | Change |
|---|---|
| `tests/e2e/specs/navigation.spec.ts` | **New.** Walks every sidebar link, asserts none 404s, asserts each top-level section lands on a real screen, and saves screenshots (with a network-idle settle before capture). |
| `apps/api/src/modules/reports/__tests__/reports.service.spec.ts` | **New.** 4 tests pinning the sales-report contract. |

## 2. Verification (re-run in this order)

```powershell
pnpm --filter @sokoos/api test     # 9 suites / 36 tests
pnpm --filter @sokoos/api build    # nest build
pnpm --filter @sokoos/web build    # next build (12 pre-existing eslint warnings, none new)
# restart both servers, then:
pnpm --filter e2e test             # 4/4
```

Results: API **9 suites / 36 tests passed**; web build **succeeded**; E2E **4/4 passed**; screenshots
in `tests/e2e/screenshots/` visually confirmed — `/catalogue` shows the product list, `/inventory`
shows live balances, `/reports/sales` shows `UGX 3.3M` gross, 217 transactions, per-branch and
per-payment-method rows and eight proportional chart bars.

## 3. Environment notes

- `:3000` is served by `next start` from a **production build**, and `:3001` by `node dist/main`, so
  every source edit needs a rebuild plus a server restart before it can be observed.
- Long builds are launched detached (`Start-Process ... -WindowStyle Hidden`) writing to a log file;
  polling them from a foreground command kills the running build.
- The repository is not a git repo (F-09), so there is no diff to review — changes were made in
  small, individually verified steps.

## 4. Assumptions

- The web/mobile client field names are the intended API contract (both clients and `docs/11`
  describe the same fields), so the API was aligned to them rather than the reverse.
- `SECTION_HOME` targets are the first concrete screen of each section in `docs/11`, because the
  specification defines no section-index screens.
- Report paths were **not** renamed to the `docs/10` names; that is recorded as F-13, since it is a
  breaking change across three clients and a product naming decision.

## 5. Blockers

None outstanding. F-03, F-05, F-06, F-07, F-08, F-10, F-11 and F-13 remain open in `FINDINGS.md`;
F-05 (CI secret env var), F-06 (empty `docker/` and `scripts/`) and F-07 (`packages/api-client`) are
tooling/packaging work rather than application defects, and F-11 needs the mobile toolchain, which
is not present in this environment.
