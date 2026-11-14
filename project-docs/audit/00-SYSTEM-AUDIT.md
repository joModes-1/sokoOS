# SokoOS — Full System Audit (Phase 1: Understand the Codebase)

**Auditor role:** senior architect / QA automation / full-stack / security review
**Date started:** 2026-11-13
**Status:** Phase 1 complete. Phase 2 (feature map) → `01-FEATURE-MAP-AND-JOURNEYS.md`.
Findings register → `FINDINGS.md` (living document).
**Method:** read the repository directly; do **not** trust the documentation. Every claim
below was verified against source files, the running stack, or the OpenAPI document the API
itself serves. Documentation claims are marked "[doc]" and explicitly checked.

---

## 1. How to read this audit

| Tag | Meaning |
|---|---|
| ✅ Verified working | reproduced successfully against the running stack |
| ⚠️ Partially verified | works but with caveats / not fully exercised |
| ❌ Tested but failing | reproduced failure with evidence |
| ⬜ Not tested | no test exists and not manually exercised |

Severity: **Critical** (security / data loss / system-wide), **High** (major feature or
workflow broken), **Medium** (partially broken / significant usability), **Low** (minor).

---

## 2. What the repository actually is

A pnpm + Turborepo monorepo. pnpm 12.6.0, Turbo 2.x, Node ≥20 (v24.16.0 present), TypeScript
5.7, ESLint 9 flat config.

```
sokoos/
  apps/api        NestJS 10 + Fastify 4 + Prisma 6 + PostgreSQL + Redis/BullMQ
  apps/web        Next.js 15 (App Router) + React 19 + TanStack Query 5 + Tailwind 3
  apps/mobile     Expo + React Native (screens only; no native config)
  apps/worker     BullMQ workers (export, low-stock, notification, payment-expire)
  apps/desktop    Tauri 2 + React 19 (scaffold; Tauri shell unverified — no Rust toolchain)
  packages/shared workspace:* — schemas (zod), money, errors, constants
  packages/config eslint.base.js + tsconfig.base.json
  packages/api-client  EMPTY (only an empty src/ dir — no package.json)
  tests/e2e       Playwright specs (2 files) + a screenshot helper
  docs/           the build-ready documentation pack (the specification)
  project-docs/   desktop + audit working documents (this file)
  docker/         EMPTY directory
  scripts/        EMPTY directory
  .github/workflows/  ci.yml, deploy-staging.yml
```

### Documentation vs reality (independent check)

| Doc claim | Reality |
|---|---|
| [doc] REST API under `/v1/` | ✅ true (`setGlobalPrefix('v1')`; 75 operations confirmed via `/docs-json`) |
| [doc] "no Docker" for hosting | ⚠️ true, but `docker/` exists and is empty while `docs/00-index.md` also says "CI/CD with Docker" — the spec contradicts itself |
| [doc] shared API client reused across clients | ❌ `packages/api-client` is empty; web, mobile and desktop each have their own copy (three divergent implementations) |
| [doc] unit tests for stock/pricing/tax/refund/PO/payment/forecasting/permissions | ⚠️ partial — see §6 |
| [doc] integration tests | ❌ the script targets `apps/api/jest.integration.json`, which **does not exist** |
| [doc] E2E scenarios A–G | ❌ only 2 Playwright specs exist |
| [doc] smoke test | ❌ root `smoke` script runs `bash scripts/smoke.sh`; `scripts/` is empty |

---

## 3. Backend (apps/api) — 16 controllers, 75 operations

Taken from the API's own OpenAPI document (`GET /docs-json` on the running server):

- `auth` (13): register, login, login/mfa, verify-email, resend-verification, verify-phone,
  forgot-password, reset-password, refresh, sessions/{id} DELETE, mfa/enrol, mfa/confirm, me
- `businesses` (4): POST /businesses, GET/PATCH /{id}, PATCH /{id}/settings
- `branches` (5): GET/POST, PATCH /{id}, GET/POST /{id}/users
- `rbac` (4): roles, permissions, users, invitations
- `catalogue` (7): categories GET/POST, categories/{id} DELETE, brands GET/POST,
  products GET/POST, products/{id} PATCH, products/{id}/variants POST, lookup/barcode/{barcode}
- `inventory` (6): balances, movements, batches, low-stock, adjustments POST,
  batches/{batchId}/write-off POST
- `transfers` (7): GET/POST, {id} GET, {id}/approve|reject|dispatch|receive|close PATCH
- `purchasing` (8): suppliers GET/POST, purchase-orders GET/POST, {id} GET,
  {id}/submit|confirm|cancel|close PATCH, goods-receipts POST
- `sales` (4): POST/GET, {id} GET, {id}/receipt GET, {id}/refunds POST
- `payments` (4): POST/GET, {id} GET, day-closure POST
- `notifications` (4): GET, unread-count, {id}/read PATCH, read-all PATCH
- `reports` (5): dashboard, sales, stock, low-stock, purchasing
- `jobs` (2), `imports` (2), `attachments` (1), `audit-logs` (1), `health` (1), `version` (1)

**Cross-cutting:** global `JwtAuthGuard` → `TenantGuard` → `PermissionGuard` (registered as
`APP_GUARD` in that order); global `ValidationPipe{whitelist, forbidNonWhitelisted, transform}`;
global `HttpExceptionFilter`; `RequestIdInterceptor` + `LoggingInterceptor`; Helmet; CORS locked
to `FRONTEND_URL`; Throttler 100 req/min; `@Public()` escape hatch for health only.

**Note:** money BigInts are serialised with `BigInt.prototype.toJSON = Number` (main.ts:13) — a
global monkey-patch with no precision guard (safe for UGX minor units today, unsafe above 2^53).

**Env validation** (`src/config/env.schema.ts`): zod; requires `DATABASE_URL`, `JWT_SECRET`
(min 32 chars), `REFRESH_TOKEN_SECRET` (min 32). ⚠️ CI sets `JWT_REFRESH_SECRET` instead, so
the CI "Tests" job would fail env validation (finding F-05).

---

## 4. Database (Prisma / PostgreSQL) — 50 models

Verbatim model list: User, AuthSession, AuthToken, MfaFactor, MfaRecoveryCode, Business,
BusinessSettings, Branch, Subscription, Role, Permission, RolePermission, UserRole, UserBranch,
UserInvitation, Category, Brand, Product, ProductVariant, StockBatch, StockMovement,
InventoryBalance, StockAdjustment, StockCount, StockCountItem, StockTransfer,
StockTransferItem, Supplier, PurchaseOrder, PurchaseOrderItem, GoodsReceipt, GoodsReceiptItem,
Customer, Sale, SaleItem, Receipt, Refund, RefundItem, Payment, PaymentWebhookEvent,
PaymentAdjustment, CashSession, DayClosure, Notification, NotificationPreference, AuditLog,
Job, ImportJob, ImportRow, Attachment.

Tenancy: business-owned tables carry `businessId`; `TenantGuard` enforces isolation server-side.
Immutable ledger: `StockMovement` is append-only; `InventoryBalance` is derived from it.

---

## 5. Frontend (apps/web) — the primary UI under audit

Next.js 15 App Router. Two route groups: `(public)` (login, register, verify,
forgot-password, reset-password, accept-invitation) and `(app)` (the authenticated shell).
A `/print/receipts/[id]` route sits outside the groups, for the receipt printer.

**Implemented `(app)` routes (have a `page.tsx`):**

| Section | Routes that exist |
|---|---|
| Dashboard | `/dashboard` |
| POS | `/pos` |
| Sales | `/sales`, `/sales/[id]` |
| Inventory | `/inventory/adjustments`, `/inventory/balances`, `/inventory/batches`, `/inventory/counts`, `/inventory/movements` |
| Catalogue | `/catalogue/products`, `/catalogue/categories`, `/catalogue/brands` |
| Purchasing | `/purchasing/purchase-orders`, `/purchasing/purchase-orders/[id]`, `/purchasing/goods-receipts`, `/purchasing/suppliers` |
| Finance | `/finance/payments`, `/finance/day-closure` |
| Reports | `/reports/sales`, `/reports/stock`, `/reports/low-stock`, `/reports/purchasing` |
| Settings | `/settings/business`, `/settings/branches`, `/settings/users`, `/settings/roles`, `/settings/notifications` |
| Transfers | `/transfers`, `/transfers/[id]` |
| Other | `/users`, `/notifications`, `/audit-logs` |

**Sections that are navigation dead-ends (❌ no `page.tsx` → HTTP 404):**
`/inventory`, `/catalogue`, `/purchasing`, `/finance`, `/reports`, `/settings`.
Verified live: all six return `HTTP 404` from the running web server (finding **F-01**).

**State/data layer:** `lib/api-client.ts` (fetch wrapper + `ApiError`), `hooks/use-business.ts`
(context from sessionStorage), `hooks/use-queries.ts` (TanStack Query hooks),
`lib/query-keys.ts`. Auth tokens live in `sessionStorage` (optionally `localStorage` when
"remember me" is ticked) — see the security section of `FINDINGS.md` (F-08).

**Navigation:** `(app)/layout.tsx` builds the sidebar from `lib/industries.ts`
(`getIndustryConfig(businessType).nav`). **85 distinct paths** are referenced across the 60+
industry configs; only ~29 routes exist. **~79 of 85 nav paths (≈93%) point at routes that do
not exist and will render a 404** (finding **F-02**). This is the cause of the reported
"Catalogue → 404" and "Inventory → 404".

---

## 6. Existing testing coverage and gaps

| Layer | Exists | Count | Gap |
|---|---|---|---|
| API unit (Jest) | ✅ | 8 spec files: auth, inventory, payments, purchasing, sales, transfers, permission.guard, tenant.guard | no specs for catalogue, catalogue import, rbac, notifications, reports, businesses, branches, audit; nothing for tax, refunds, forecasting |
| Shared unit (Jest) | ✅ | 1 file: `money.spec.ts` | schemas (zod) untested |
| Web unit / component | ❌ | 0 | no test runner configured for web at all |
| API integration | ❌ | 0 | `jest.integration.json` referenced by `test:integration` **does not exist** (F-03) |
| Database integrity | ❌ | 0 | no reconciliation tests |
| E2E (Playwright) | ⚠️ | 2 specs: `dashboard.spec.ts`, `pos-receipt.spec.ts` | no config for auto-starting the stack; specs assume web:3000 + api:3001 already running; scenarios A–G absent |
| Desktop | ⚠️ | 2 vitest specs (new scaffold) | Tauri shell unverified (no Rust toolchain) |

`turbo.json` wires `test` → `dependsOn: ["^build"]`. `apps/web` has **no `test` script**, so
`pnpm turbo test` silently skips the whole frontend (finding **F-04**).

---

## 7. Dependency and integration map

```
web (:3000)  ──HTTP /v1──▶  api (:3001)  ──Prisma──▶  PostgreSQL
mobile       ──HTTP /v1──▶       │                        ▲
desktop      ──HTTP /v1──▶       │                        │
                                 ├─Redis/BullMQ──────────▶ worker (4 processors)
                                 ├─nodemailer (SMTP)  → email
                                 ├─otpauth + qrcode   → MFA
                                 └─object storage (S3-compatible) → attachments/images
```

External integrations and their current state:

| Integration | Code present | Configured | Exercised |
|---|---|---|---|
| PostgreSQL | ✅ Prisma | ✅ `DATABASE_URL` in `apps/api/.env` | ✅ live (743 demo sales visible) |
| Redis / BullMQ | ✅ api + worker | `REDIS_URL` defaults to localhost:6379 | ⬜ unverified |
| MTN MoMo / Airtel Money | ✅ env keys + `payments` module | optional env | ⬜ mock/`mock` providers only |
| SMTP email | ✅ `apps/worker/src/services/mailer.ts` + nodemailer | optional env | ⬜ unverified |
| Object storage | ✅ `attachments` module | optional env | ⬜ unverified |
| WhatsApp / SMS | ✅ enum `mock` | default `mock` | ⬜ untouched |

Secret handling: ✅ no secrets in source; `.env` files are git-ignored (repo is not a git repo
here, but `.gitignore`-style separation exists via `apps/web/.env.local` and `apps/api/.env`).

---

## 8. Initial technical risk list (Phase 1 conclusion)

| # | Risk | Severity | Evidence |
|---|---|---|---|
| R1 | Six top-level navigation sections are 404 dead ends | **High** | F-01, live HTTP probe |
| R2 | Industry nav links 93% dead; app is largely un-navigable outside the few built pages | **High** | F-02, 85 paths vs 29 routes |
| R3 | No frontend tests at all + no `test` script in web → frontend regressions are invisible | **High** | F-04 |
| R4 | Integration-test script points at a non-existent config; CI never runs integration or E2E | **Medium** | F-03, F-05 |
| R5 | Auth tokens in `sessionStorage`/`localStorage` → XSS-exfiltratable | **Medium** | F-08 |
| R6 | Three divergent API clients (web/mobile/desktop) instead of the shared package | **Medium** | `packages/api-client` empty |
| R7 | Empty `docker/` and `scripts/` while docs+scripts reference them | **Low** | F-06 |
| R8 | `BigInt.toJSON = Number` global patch — silent precision loss above 2^53 | **Low** | main.ts:13 |
| R9 | `apps/web` dashboard + list pages rely on `?limit` defaults; no pagination UI verified | **Low** | ⬜ not yet tested |
| R10 | Desktop Tauri shell unverified (no Rust toolchain) | **Low** | prior phase report |

Phase 1 conclusion: the backend is the strongest part of the system (coherent guards, 75
documented operations, 50 well-shaped models). **The frontend's information architecture is the
weakest part** — the shell renders a nav that leads to 404s. That is where testing and repair
start.


