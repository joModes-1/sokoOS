# SokoOS Independent Audit — Phase 1 & 2

Date: 2026-11-12
Auditor: Buffy (independent code/QA/security review)
Scope: entire repository at `sokoos/` (API, web, worker, shared packages, tests, build tooling)
Rule: no application code was modified before this document was written.

> Evidence in this document comes from reading the repository and from commands actually run in this
> workspace. Anything not executed is labelled **Not tested**, not "passing". Findings marked
> **Open** have not been fixed at the time of writing.

---

## 1. System map

| Layer | Location | Technology | Notes |
|---|---|---|---|
| Web UI | `apps/web` | Next.js 15 App Router, React 19, Tailwind, TanStack Query, RHF + Zod | Talks to API via `src/lib/api-client.ts`; token in `sessionStorage` |
| API | `apps/api` | NestJS 10 on Fastify, Prisma 6, Zod schemas from `@sokoos/shared` | Global prefix `/v1`, Swagger at `/docs`, port 3001 |
| Worker | `apps/worker` | BullMQ + Prisma | Processors for payment expiry, notifications, low stock, exports, imports |
| Shared | `packages/shared` | Zod schemas, money helpers, constants, errors | Source imported through workspace `dist`/paths |
| Mobile | `apps/mobile` | Expo/React Native (separate) | Not part of web/API audit scope except shared-schema consistency |
| E2E | `tests/e2e` | Playwright | Requires running web + API + seeded DB |
| Tooling | root | pnpm workspaces + Turborepo | `turbo run typecheck|lint|test|build` |

### Runtime composition
`main.ts` registers Helmet, CORS from `FRONTEND_URL`, global prefix `v1`, a global `ValidationPipe`
(which does nothing useful because controllers parse Zod manually), a global exception filter, and
global guards in this order: **JwtAuthGuard → TenantGuard → PermissionGuard**.

### Tenancy model
`Business` → `Branch` → stock/sales/POs. Access is expressed by `UserRole (userId, businessId, roleId)`,
`RolePermission`, and `UserBranch (userId, businessId, branchId)`. The JWT contains only `sub`.
`JwtStrategy.validate` loads **all** roles across **all** businesses and unions their permissions.
`TenantGuard` is expected to narrow that to the active business; it does not.

---

## 2. Feature → endpoint → table → journey matrix

| Feature | API routes | Core tables | Primary journey | Web screen(s) |
|---|---|---|---|---|
| Auth / onboarding | `/v1/auth/*`, `POST /v1/businesses` | users, auth_tokens, auth_sessions, mfa_factors, mfa_recovery_codes, businesses, branches | register → verify → login → create business | login, register, verify, onboarding |
| RBAC / users | `/v1/roles`, `/v1/users`, `/v1/invitations` | roles, permissions, role_permissions, user_roles, user_branches, user_invitations | invite user → accept → branch assign | users, settings/roles |
| Catalogue | `/v1/catalogue/products|categories|brands` | products, product_variants, categories, brands | create product+variant → sell | catalogue/* |
| Inventory | `/v1/inventory/balances|movements|batches|adjustments|low-stock` | stock_movements, inventory_balances, stock_adjustments, stock_batches | receive/adjust → balance projection | inventory/*, reports/stock |
| Sales / POS | `/v1/sales`, `/v1/sales/:id`, `/receipt`, `/refunds` | sales, sale_items, receipts, payments, refunds, refund_items | cart → commit → receipt | pos, sales, print/receipts |
| Payments / cash | `/v1/payments`, `/v1/payments/day-closure` | payments, day_closures, cash_sessions | cash/mobile payment → day close | finance/payments, finance/day-closure |
| Transfers | `/v1/transfers`, `/:id/approve|reject|dispatch|receive|close` | stock_transfers, stock_transfer_items, stock_movements | request → approve → dispatch → receive | transfers, transfers/[id] |
| Purchasing | `/v1/purchasing/suppliers|purchase-orders|goods-receipts` | suppliers, purchase_orders, purchase_order_items, goods_receipts, goods_receipt_items, stock_batches | PO → confirm → receive → stock | purchasing/* |
| Reports | `/v1/reports/*` | sales, sale_items, payments, inventory_balances | dashboard + sales/stock/purchasing reports | dashboard, reports/* |
| Audit | `/v1/audit-logs` | audit_logs | admin reviews actions | audit-logs |
| Notifications | `/v1/notifications` | notifications | unread badge, list | shell notifications |
| Jobs / imports / files | `/v1/jobs`, `/v1/imports`, `/v1/attachments` | jobs, import_jobs, attachments | async import/export, uploads | settings/imports |

---

## 3. Baseline quality gates (actually executed)

| Check | Command | Result | Evidence |
|---|---|---|---|
| API typecheck | `pnpm --filter @sokoos/api typecheck` | **PASS** (exit 0) | `tsc --noEmit`, tests excluded by tsconfig |
| Web typecheck | `pnpm -r typecheck` / `tsc --noEmit` | **FAIL** | Many TS2786: `Input`/`Select`/`Textarea`/`Button` cannot be used as JSX components — React type identity mismatch |
| Lint | `pnpm -r lint` | **FAIL** | `packages/shared`: `'eslint' is not recognized`; package declares a lint script but no ESLint dependency/config |
| API unit tests | `pnpm --filter @sokoos/api exec jest --runInBand` | **FAIL — 0 tests executed** | (1) `sales.service.spec.ts` compile error: `Property 'sale' does not exist`; (2) `inventory.service.spec.ts` cannot resolve `../../prisma/prisma.service.js` — Jest has no `.js` → `.ts` mapper. Both suites fail before running. |
| Build | Not executed yet | **Not tested** | Will be run after gates are repaired |
| E2E | Not executed | **Blocked / Not tested** | `prisma/migrations` is empty; no verified PostgreSQL/Redis; cannot seed or run the app against a schema |
| Prisma schema validity | `prisma validate` | Not executed | Requires `DATABASE_URL`; schema drift already visible (below) |

### Confirmed schema/code drift
`schema.prisma`'s `GoodsReceiptItem` (lines 885–903) has **no `purchaseOrderItemId`**, yet
`purchasing.service.ts:139` writes `purchaseOrderItemId` and the code typechecks. Therefore the
generated Prisma client in `node_modules` was generated from a different schema than the checked-in
one. A clean `prisma generate` would break the API build. The database design document is the
authority for the correct column; this must be reconciled before any migration.

### Tooling defects
- `pnpm-workspace.yaml` contains invalid YAML placeholders: `allowBuilds: '@nestjs/core': set this to true or false`. A clean `pnpm install` will not parse this.
- Root scripts reference `scripts/smoke.sh` and `scripts/export-openapi.ts`; `scripts/` is empty.
- `packages/shared` has no `test` script, `apps/web` has no `test` script, while root `test` runs `turbo run test`.
- API Jest config lacks a module name mapper for ESM-style `.js` imports used throughout the API.

---

## 4. Findings (classified, with evidence)

### Critical

**F-01 — Cross-tenant data access when `X-Business-Id` is absent.**
`TenantGuard.canActivate` returns `true` when no business header/param is present
(`tenant.guard.ts:32`). Controllers then call services with `user.businessId!`, which is `undefined`.
Prisma treats `where: { businessId: undefined }` as *no filter*, so `GET /v1/sales`,
`/inventory/balances`, `/purchasing/purchase-orders`, `/audit-logs`, etc. can return rows from every
tenant. This is a direct confidentiality breach, not just a UX issue.
Repro (once DB is available): authenticate as a user of business A, call any list endpoint without
`X-Business-Id`, observe rows belonging to business B. Status: **Open**.

**F-02 — Privilege escalation across businesses.**
`JwtStrategy` unions roles and permissions from every business membership; `PermissionGuard` then
returns `true` for any user whose union contains `BUSINESS_ADMIN` (`permission.guard.ts:22`).
A user who is admin of business A and cashier of business B can exercise admin permissions in B.
Status: **Open**.

### High

**F-03 — Branch scope not enforced.**
`X-Branch-Id` is copied into `user.branchId` without verifying that the branch belongs to the active
business or that the user is assigned to it (`tenant.guard.ts:38-40`). `UserBranch` is never consulted
by the guards, so branch-restricted roles can read/write other branches by changing a header or query
parameter. Status: **Open**.

**F-04 — Sales stock check is outside the transaction and non-atomic.**
`commitSale` reads balances before `$transaction` and never conditionally decrements; concurrent sales
can oversell. Stock deduction uses read-then-increment (`upsertBalance`). Status: **Open**.

**F-05 — Sale line items do not sum to the sale total.**
Header-level `discountMinor` is added to `totalDiscountMinor` but never allocated to lines; line
`taxMinor` is recomputed *without* the line discount
(`sales.service.ts:161-166` vs `:170-179`). Receipts and reports therefore disagree with the header.
Status: **Open**.

**F-06 — No validation that payments cover the sale.**
`CommitSaleSchema` makes payments optional; `commitSale` records whatever is sent. A sale can be
COMPLETED with zero payment or underpayment. Status: **Open**.

**F-07 — Refunds allow repeated over-refund and store zero amounts.**
`createRefund` compares each request only to the original sold quantity, never against prior refunds;
refund totals ignore tax/discount and every `RefundItem.amountMinor` is written as `0n`. Status: **Open**.

**F-08 — Transfer approval ignores insufficient stock.**
`approve()` builds `conflicts` and then approves unconditionally (`transfers.service.ts:44-64`).
`dispatch()` does not re-check stock or negative-stock policy; `close()` has no state or permission
check. Status: **Open**.

**F-09 — Goods receipt over-receipt is not enforced.**
`createGoodsReceipt` never compares cumulative received quantity with ordered quantity;
`overReceiptConfirmed` is only copied to a flag. Items not belonging to the PO are silently skipped,
and status is computed only from the submitted subset, so a PO can be marked RECEIVED prematurely.
Status: **Open**.

**F-10 — Mobile-money payments are fabricated as successful.**
`initiatePayment` schedules `setTimeout(..., 5000)` to mark PENDING payments SUCCEEDED, with the
comment “TODO: Call MTN MoMo / Airtel Money API” (`payments.service.ts:51-59`). This records money
that was never collected and is unacceptable for financial data. Status: **Open**.

**F-11 — Payment amounts not matched to the sale; idempotency not tenant-scoped.**
`initiatePayment` looks up idempotency keys without `businessId` and accepts any amount, including
overpayment or payment against another tenant's `saleId` (sale lookup is scoped, but existing payment
lookup is not). Status: **Open**.

**F-12 — Day closure aggregates the wrong day and branch.**
It filters payments by `createdAt` over a UTC 24h window starting at `new Date(businessDate)` and
never filters `branchId`; “expected cash” therefore includes other branches and the wrong local day
for Uganda (UTC+3). Missing discrepancy reason throws a generic `Error` (500) rather than a 4xx.
Status: **Open**.

**F-13 — Suspended/deleted users can sign in.**
`login` blocks only `PENDING_VERIFICATION` (`auth.service.ts:102-104`); `SUSPENDED` and `DELETED`
users still receive sessions. Status: **Open**.

**F-14 — MFA challenge is brute-forceable.**
`verifyMfa` scans every unconsumed `EMAIL_VERIFICATION` token (`auth.service.ts:177-181`), never checks
`attemptCount`, and leaves the challenge valid after failures. TOTP secrets are stored as plaintext
bytes in `secretEncrypted` (`auth.service.ts:281`, `:299`, `:307`). Status: **Open**.

**F-15 — Web/API contract mismatches break core screens.**
API list endpoints return `{ data, total, page, limit }`; most web hooks type and render
`{ items, total }`. `usePurchaseOrders` calls `/purchasing/orders` while the API exposes
`/purchasing/purchase-orders`; the PO create modal sends `variantId`/`qty` instead of
`productVariantId`/`quantityOrdered` and multiplies cost by 100; transfer create sends
`variantId`/`qty` instead of `productVariantId`/`requestedQuantity`. `useInventoryBalances` sends
`lowStock=1` while the API reads `lowStockOnly=true`. Result: lists are empty or crash, and creates
fail validation. Status: **Open**.

### Medium

- **F-16** Tokens in `sessionStorage`/`localStorage`, no refresh-token flow; any 401 just clears the token.
- **F-17** Sequential numbers (`saleNumber`, `receiptNumber`, `poNumber`, `transferNumber`,
  `receiptNumber` for GRN) are `count + 1`, which races and collides; no unique constraint on sale
  number/receipt number.
- **F-18** Payments and transfers controllers have missing permissions on read/close endpoints
  (`transfers.list/getOne/close`, all payments routes). Any authenticated tenant member can close a
  day or read payments.
- **F-19** Audit logs hardcode `actorRoleCode: 'SYSTEM'` and don't include IP/user agent; authentication
  events are not audited. `AuditLog` lookups are tenant-scoped but the controller has no permission check.
- **F-20** Worker processors simulate work (`export.processor.ts` sleeps 100ms; notifications are TODO);
  reports and low-stock run on request rather than jobs.
- **F-21** Invitation flow creates only a token hash and never returns/sends the raw token, so invitations
  cannot be accepted.
- **F-22** Stock adjustments validate negative stock before the transaction; concurrent adjustments can
  still drive stock negative.
- **F-23** `receipt.update` on every print increments `printCount` without tenant check (sale lookup is
  scoped, so lower risk) and `getReceipt` is not idempotent.
- **F-24** API typecheck excludes tests, so the TS error in the existing sales test was never caught;
  zero API tests have run successfully.
- **F-25** `packages/api-client` is referenced by docs/tooling but not present; web uses its own client.

### Low
- `pnpm-workspace.yaml` invalid placeholders; missing `scripts/` targets; duplicate/competing UI
  adapters (`lib/mock.ts` unused-looking); dev logs include verification codes (guarded by NODE_ENV).

---

## 5. Testing plan (Phase 3)

### 5.1 Test layers and scope
1. **Unit (Jest, `apps/api`)** — pure/DI-mocked service logic:
   - sales totals: line discount allocation, tax, payment sum, idempotent replay;
   - refunds: cumulative quantity cap, tax-inclusive amounts, restock;
   - transfers: approve conflict, dispatch stock guard, receive over-quantity;
   - purchasing: over-receipt rejection, full-PO status, item ownership;
   - guards: tenant required, branch assignment, per-business permissions;
   - auth: suspended/deleted rejection, MFA attempt cap;
   - money helpers: basis points, inclusive tax, quantity rounding.
2. **Integration (Jest + real PostgreSQL, `jest.integration.json`)** — deferred until a database is
   available and migrations exist: sale + inventory atomicity, PO + receiving, transfer lifecycle,
   refunds, payment reconciliation, import errors, RBAC.
3. **E2E (Playwright, `tests/e2e`)** — deferred until the stack runs: login → POS sale → receipt,
   inventory adjustment, transfer lifecycle, PO receipt, refund, day closure, reports, RBAC denials.
4. **Security checks** — tenant isolation (no header, foreign header, foreign branch), permission
   matrix per role, IDOR on IDs, auth lockout/MFA, input validation, mass assignment.

### 5.2 Test data isolation
- Unit tests use mocks only; no database.
- Integration/E2E must use a dedicated database (`sokoos_test`) created from migrations, seeded with
  two businesses (A and B), two branches per business, and one user per role. Tests create records with
  unique prefixes and clean up by business id; never touch production data.
- No test may depend on ordering with other tests.

### 5.3 Release gates (docs/15 + AGENTS.md)
- `lint`, `typecheck`, `test`, `build` all green.
- Financial invariants: Σ sale_items.line_total = sale.total; Σ payments = sale.total; Σ refunds ≤ sale.total;
  stock movement sum = balance per branch/variant/batch.
- Duplicate prevention: same idempotency key returns the same sale; unique PO/GRN/sale numbers.
- Tenant isolation: zero cross-tenant rows for list/detail endpoints with and without headers.
- E2E scenarios A–G pass; backups and import-error handling verified (blocked here).

### 5.4 Exit criteria for this audit pass
- Every Critical/High finding either fixed with a regression test or documented as blocked with reason.
- All checks that can run locally are run and reported with exact commands/results.
- No test is weakened or deleted to make a gate pass.

---

## 6. Assumptions and limitations
- The repository has **no Prisma migrations**; the database schema cannot be recreated from source.
  Integration/E2E and migration verification are blocked until migrations are generated from the
  authoritative `docs/09-database-design.md`. This is reported as a blocker, not silently worked around.
- PostgreSQL/Redis availability was not verified. E2E is therefore **Not tested**.
- `docs/10` is the API contract authority; where web hooks disagree, the web is wrong (F-15).
- Uganda business day is assumed to be `Africa/Kampala` (UTC+3) for day-closure boundaries.
- The audit does not modify financial semantics defined by docs; fixes preserve documented behaviour
  and add the missing invariants.

---

## 7. Repair log

| Finding | Status | Change | Regression test |
|---|---|---|---|
| F-01 tenant leak | Fixed | `TenantGuard` resolves a membership and fails closed with `TENANT_REQUIRED`/`TENANT_ACCESS_DENIED`; never calls services with `businessId: undefined` | `tenant.guard.spec.ts` (missing tenant, foreign tenant) |
| F-02 RBAC escalation | Fixed | JWT principal no longer unions roles/permissions; `TenantGuard` scopes them per business; `PermissionGuard` removed the `BUSINESS_ADMIN` bypass | `tenant.guard.spec.ts`, `permission.guard.spec.ts` |
| F-03 branch scope | Fixed | Header branch must belong to the business and to the user's assignments; `branchId`/`originBranchId`/`destinationBranchId` in query/body validated; single-branch users are forced to their branch | `tenant.guard.spec.ts` (header + body) |
| F-04 stock race | Fixed | `InventoryService.decrementBalance` performs a conditional `UPDATE ... WHERE quantity >= ?` inside the sale/transfer transaction; all lines roll back together | `sales.service.spec.ts` (atomic reservation) |
| F-05 line/total mismatch | Fixed | Order discount allocated across lines with largest-remainder distribution; each line stores discount/tax/line total; `Σ lineTotal = sale.total` | `sales.service.spec.ts` |
| F-06 unpaid sale | Fixed | Payments must sum exactly to the total; cash tender checked; mobile payments require a phone | `sales.service.spec.ts`, `payments.service.spec.ts` |
| F-07 refunds | Fixed | Cumulative refunded quantity and amount caps; tax-inclusive proportional amounts stored on `RefundItem` | `sales.service.spec.ts` (repeat + partial amount) |
| F-08 transfers | Fixed | Approval throws `INSUFFICIENT_STOCK`; dispatch re-checks atomically; receive validates ownership/count/over-quantity; close requires `RECEIVED` | `transfers.service.spec.ts` |
| F-09 over-receipt | Fixed | PO line/variant ownership checked; duplicate lines rejected; over-receipt requires explicit confirmation; status computed from all PO lines | `purchasing.service.spec.ts` |
| F-10 fake MoMo success | Fixed | Removed the `setTimeout` auto-success; unconfigured providers return `PAYMENT_PROVIDER_NOT_CONFIGURED` and create no payment | `payments.service.spec.ts` |
| F-11 payment idempotency/amount | Fixed | Idempotency lookup scoped by `businessId`; amount capped at outstanding balance; cash tender checked | `payments.service.spec.ts` |
| F-12 day closure | Fixed | Branch-scoped aggregation, `Africa/Kampala` day boundaries, typed `DISCREPANCY_REASON_REQUIRED` error, tenant-scoped duplicate check | Not directly unit-tested (requires DB dates); manually inspected |
| F-13 suspended login | Fixed | `SUSPENDED`/`DELETED` rejected before password/session creation | `auth.service.spec.ts` |
| F-14 MFA brute force/secrets | Partially fixed | Challenge/session attempt limits (5) and challenge invalidation; TOTP secrets encrypted with AES-256-GCM keyed from `JWT_SECRET` (legacy plaintext readable); recovery-code login and admin-MFA enforcement remain open | Not directly unit-tested; code inspected |
| F-15 web/API contract | Fixed for core flows | API page → UI adapters for products/balances/movements/transfers/POs/sales/audit; correct endpoints for POs, goods receipts, day closure; correct create/refund payloads; sale/PO/transfer detail screens bound to real shapes | Web typecheck + production build |
| F-16 token storage/refresh | Open | Not changed in this pass | — |
| F-17 number races | Open | Sequential `count+1` numbering still racy; sale/receipt uniqueness partially constrained in schema | — |
| F-18 missing permissions | Fixed | Added `sales.create`/`finance.view`/`finance.close` to payments and transfer list/detail/close permissions | Code inspection; API typecheck |
| F-19 audit metadata | Open | `actorRoleCode` still hardcoded; auth events not audited | — |
| F-20 worker stubs | Open | Export/notification processors remain simulated | — |
| F-21 invitations | Open | Raw invitation token is still not returned/sent; cannot be accepted end-to-end | — |
| F-22 adjustment race | Partial | Negative-stock check still precedes the transaction; sales/transfers are atomic | — |
| F-23 receipt print count | Open | Re-print increments `printCount` (documented re-print is side-effect free) | — |
| F-24 tests never ran | Fixed | Jest `.js`→`.ts` mapper, corrected stale assertion, 32 tests across 8 suites | `jest --runInBand` 8/8 suites passing |
| F-25 missing api-client | Open | Not needed by current web code; docs/tooling reference remains | — |
| Schema drift | Partially fixed | Added nullable `goods_receipt_items.purchase_order_item_id` + relation to match the already-generated Prisma client; no migration exists yet | `prisma validate` (requires env) |
| Tooling | Fixed | Root `packageManager`, valid `allowBuilds`, flat ESLint config, React 19 type pin for web, Suspense boundaries for `useSearchParams`, removed runtime Google Fonts `@import` that prevented network idle | Root/typecheck/lint/build; E2E 2/2 |

---

## 8. Verification results after repairs

Commands run in this workspace on 2026-11-12:

| Command | Result |
|---|---|
| `pnpm --filter @sokoos/api typecheck` | **Pass** |
| `pnpm --filter @sokoos/web typecheck` | **Pass** |
| `pnpm --filter @sokoos/shared typecheck` / `build` | **Pass** |
| `pnpm --filter @sokoos/api exec jest --runInBand` | **Pass — 8 suites, 32 tests** |
| `pnpm --filter @sokoos/api lint` | **Pass (warnings only)** |
| `pnpm --filter @sokoos/shared lint` | **Pass (warnings only)** |
| `pnpm --filter @sokoos/web lint` | **Pass (warnings only)** |
| `pnpm --filter @sokoos/api build` | **Pass** |
| `pnpm --filter @sokoos/web build` | **Pass** |
| Playwright E2E | **Pass — 2/2** (`dashboard.spec.ts`, `pos-receipt.spec.ts`) against the local stack |
| Integration tests | **Not run** — no migration/test-database setup |

Root `turbo run typecheck|lint|test` was blocked by the missing `packageManager` field; fixed. After restarting the stale `next start`/API processes and removing the runtime Google Fonts `@import` (which kept `networkidle` from ever settling), both Playwright scenarios passed in 17.1s. The POS scenario also verified stock deduction (20 → 18) and the printable receipt.

Current live state after audit pass: API on `:3001`, Next web on `:3000`, both healthy today. API health is `{"status":"ok",...}` and the two Playwright journeys still pass against the running app.

## 9. Residual risks / blockers

1. **No Prisma migrations.** The database cannot be created from source. Integration/E2E and any migration-based verification are blocked until migrations are generated from the authoritative schema. The schema/code drift for `goods_receipt_items.purchase_order_item_id` is reconciled in `schema.prisma`, but no migration applies it.
2. **Integration coverage still missing.** A local PostgreSQL-backed stack was available (API health and both Playwright journeys passed), but the repository has no test-database setup, seed isolation or integration suite. Cross-tenant runtime proofs were covered at the guard-unit level, not against two live tenants.
3. **Payment providers.** Mobile money remains unintegrated by design; the API now fails honestly instead of fabricating success. Webhook handling/reconciliation is still absent.
4. **Invitations.** `F-21` still blocks the invite → accept journey.
5. **Background jobs.** Worker processors for exports/notifications are still placeholders.
6. **Audit trail.** Auth events and actor role/IP/user-agent are not yet recorded.
7. **Token handling.** Tokens remain in browser storage with no refresh flow.
