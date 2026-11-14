# Existing System Architecture — SokoOS Desktop Track

**Purpose:** Describe the actual existing platform this desktop application extends. This document is written from the repository and from commands actually run in this workspace, not from assumptions.

**Audience:** Desktop architect, implementation engineer, QA.

**Status:** Living. Update when the existing platform changes materially.

---

## 1. Product at a glance

SokoOS is an interconnected business operating platform for B2B commerce, inventory management and business operations, starting in Uganda. It is a multi-tenant web platform, not a single-tenant desktop product today. The desktop track keeps that platform intact and adds a Tauri 2 installable application that reuses it.

- Primary users: retailers, pharmacies, wholesalers, distributors, business administrators, and shop attendants who use only basic POS operations.
- MVP scope in this codebase: auth, business registration, multi-tenancy, branches, user permissions, catalogue, inventory/stock movements, purchasing (suppliers, POs, goods receipts), sales/POS, receipts/refunds, payments, transfers, dashboard, reports, day closure, audit, notifications, jobs/imports, attachments.
- Runtime stack chosen by the existing project: Next.js web, NestJS API on Fastify, Prisma 6, PostgreSQL, Redis, TanStack Query, RHF + Zod, Tailwind. No Docker. Managed Node hosting (Render/Railway) in the existing plan. No mobile/desktop runtime was part of the initial architecture.

---

## 2. Repository topology

| Path | What it is | Relevance to desktop track |
|---|---|---|
| `apps/web` | Next.js 15 App Router React 19 frontend. `src/lib/api-client.ts` talks to the API; token stored in `sessionStorage`. | Source of UI components, Zod forms, money/format helpers, industry config, API client patterns, and the brand/theme tokens. |
| `apps/api` | NestJS 10 on Fastify, Prisma 6, Zod schemas re-exported from `@sokoos/shared`. Global prefix `/v1`, Swagger at `/docs`, port 3001. | The reality the desktop app will talk to. Auth, tenancy, RBAC, modules, and financial semantics all live here. |
| `apps/worker` | BullMQ + Prisma processors (payment expiry, notifications, low stock, exports, imports). | Not directly reused by the desktop app, but its job topics matter for sync/async behavior and reconciliation reality. |
| `apps/mobile` | Expo/React Native app (separate). | Not reused by a desktop app; relevant only as evidence that the platform already has a non-web client surface. |
| `packages/shared` | Zod schemas, money helpers, error codes, permissions and business-type constants. | The strongest reuse candidate: types, validation, money math, and permission names should be shared with the desktop frontend. |
| `packages/config` | Present. | Review for shared config conventions. |
| `packages/api-client` | Not present. | Existing docs reference it, but the web app owns its own client. Desktop should not assume a shared npm package exists there. |
| `tests/e2e` | Playwright scenarios (login/dashboard and POS sale/receipt in current state). | Reference for real user journeys and expected data shapes. |
| `docs/` | Full project documentation pack, `00-index.md` is the decision authority. | Desktop docs must respect this authority order. |
| `docs/audit/AUDIT.md` | Independent audit report for the existing stack. | Important context for financial integrity assumptions and known residual risks. |

---

## 3. Web application architecture

### 3.1 Framework and rendering model
- Next.js 15 App Router with React 19.
- Route groups are used: `(app)` for the authenticated app shell, `(public)` for login/register/verify/reset-password/accept-invitation, plus dynamic routes like `sales/[id]`, `purchasing/purchase-orders/[id]`, `transfers/[id]`, `print/receipts/[id]`, `finance/day-closure`, `settings/business`, and so on.
- SSR/hydration model: the app shell (`(app)/layout.tsx`) is a client component, and some pages use `useSearchParams`, which requires Suspense boundaries.
- State management: TanStack Query for server state, React state for UI, React Hook Form + Zod for forms.

### 3.2 API client
- `apps/web/src/lib/api-client.ts` is a typed fetch client:
  - Base URL defaults to `http://localhost:3001` unless `NEXT_PUBLIC_API_URL` is set.
  - Attaches `Authorization: Bearer ...`, `X-Business-Id`, and `X-Branch-Id` from session/local storage.
  - Throws `ApiError` with machine-readable `code`, `message`, `httpStatus`, optional `details` and `requestId`.
  - On 401, clears tokens and redirects to `/login?returnTo=...`.
- This client is a strong candidate for reuse, but the desktop app must decide whether to keep the exact same client or a Tauri-aware variant that uses the same schemas and error mapping.

### 3.3 UI and theming
- Tailwind CSS with a defined color/token system (sidebar, surfaces, borders, text, brand, semantic colors, layout tokens).
- Component layer exists: `apps/web/src/components/ui`, `features`, `forms`, `inventory`, `pos`, `layout`, `charts`.
- A `providers.tsx` wraps TanStack Query + React Query DevTools.
- Branding is more than colors: there is an `industries.ts` config and a font/icon concept (`Inter` + `Space Grotesk`, SVG icons inline in the app shell).

### 3.4 Authentication model
- Email + password, with email/phone verification, MFA, password reset, and invitation acceptance.
- Login page handles both the normal login and an MFA challenge step.
- After login, the client stores `accessToken`/`refreshToken` and business/branch context in session storage, then navigates to `/dashboard`.
- Important desktop implication: the web app currently authenticates per browser session storage, so a desktop app cannot simply inherit that model unchanged. The desktop app needs its own secure credential/session handling.

---

## 4. Backend architecture

### 4.1 Framework
- NestJS 10 on Fastify.
- `main.ts` registers Helmet, CORS (from `FRONTEND_URL`), global prefix `/v1`, a global `ValidationPipe`, a global exception filter, and global guards in this order: **JwtAuthGuard → TenantGuard → PermissionGuard**.
- Swagger/OpenAPI available at `/docs`.
- Health endpoint at `/v1/health`; version endpoint exists too.

### 4.2 Authentication and authorization
- JWT strategy uses only `sub` in the token and then loads the user’s roles/permissions.
- The existing behavior of `JwtStrategy.validate` historically unioned roles/permissions across all business memberships on the token subject. The recent audit fixed that so the principal is scoped per business rather than unioned across businesses.
- Tenant enforcement: `TenantGuard` is expected to narrow the active business. The audit found and fixed a critical path where absence of a business header/parameter could result in tenant leakage. It now resolves membership and fails closed with `TENANT_REQUIRED` / `TENANT_ACCESS_DENIED`.
- RBAC: roles, permissions, role_permissions, user_roles, user_branches. Branch-level restrictions are enforced server-side.
- Permissions are shared from `packages/shared/src/constants/PERMISSIONS` and `ROLE_DEFAULTS`, which is exactly the kind of constant the desktop app should reuse.

### 4.3 Module structure
The API is modular. Core modules include at least:
- Auth / onboarding
- RBAC / users / invitations
- Catalogue (products, variants, categories, brands)
- Inventory (balances, movements, batches, adjustments, low stock)
- Sales (POS sale commit, receipts, refunds)
- Payments + cash + day closure
- Transfers
- Purchasing (suppliers, POs, goods receipts)
- Reports / dashboard
- Audit logs
- Notifications
- Jobs / imports / attachments

### 4.4 Database model
- PostgreSQL via Prisma 6.
- Core entities include users, roles, permissions, businesses, branches, subscriptions, products, product_variants, categories, brands, inventory_balances, stock_movements, stock_batches, sales, sale_items, payments, refunds, refund_items, receipts, suppliers, purchase_orders, purchase_order_items, goods_receipts, goods_receipt_items, stock_transfers, stock_transfer_items, finance accounts, journal entries, expenses, audit_logs, notifications, attachments, jobs.
- Important modeling rules from the existing docs/architecture decisions (authority order in `docs/00-index.md`):
  - Immutable stock movement ledger.
  - No negative stock unless configured; adjustments require reason.
  - Batch identity preserved; expired batches excluded from sale.
  - Transfers keep source/destination identity.
  - Balances reconcile to ledger.
  - No overselling.
  - Financial records deterministic from events.
  - AI never alters financial records or executes writes without confirmation.
  - Tenant isolation and permissions enforced server-side.
  - Audit all critical actions.
- Soft delete for business records; hard delete for tokens; daily backups kept 14 days in the existing assumptions.
- Money is integer minor units. `packages/shared/src/money/index.ts` enforces minor-unit arithmetic and rejects floats for money fields.

### 4.5 Data integrity notes relevant to a desktop offline app
- The existing backend is the system of record for financial and inventory data.
- The audit’s financial fixes are relevant: sale totals equal the sum of line totals; payments must sum exactly to the sale total; refunds have cumulative quantity/amount caps; stock decrement is atomic and conditional; transfer approval rejects insufficient stock; goods receipt status is computed from all PO lines; day closure is branch-scoped and uses Kampala day boundaries.
- Any offline desktop sync must preserve these invariants. The local SQLite store is a cache/offline workspace, not a second source of truth for financial history.

---

## 5. How business types actually work in this codebase

### 5.1 What exists
- `packages/shared/src/constants/BUSINESS_TYPES` lists industry codes with labels, icons, and descriptions.
- `packages/shared/src/constants/BUSINESS_SIZES` lists size tiers with worker ranges, descriptions, and prices.
- Auth registration uses `RegisterBusinessSchema` with a `businessType` enum and a `businessSize` enum.
- The web app shell builds navigation from an industry config via `getIndustryConfig(...)`, so different industries can render different navigation items today.
- There is a backend concept of different business types, and registration captures a business type.

### 5.2 What is confirmed vs assumed
- Confirmed: the platform has industry constants, a registration form with businessType/businessSize, and a frontend mechanism that maps industry code to navigation/ui.
- Assumed/unverified from docs alone: whether each business type unconditionally gets the same modules, or whether module enablement is dynamic per business/subscription. The docs describe a modular platform, but module availability in this codebase should be verified against the actual controllers, permissions, and business/subscription features rather than assumed.
- This matters enormously for the desktop app: if module availability is already configurable per business, the desktop client should respect that config. If it is not yet fully implemented, the desktop app still must be designed around the idea that a business may enable only a subset of modules.

---

## 6. Roles, permissions, and multi-tenancy

### 6.1 Roles
Existing default role sets are defined in `packages/shared/src/constants/ROLE_DEFAULTS`:
- `BUSINESS_ADMIN`
- `BRANCH_MANAGER`
- `CASHIER`
- `INVENTORY_CLERK`

These map to meaningful operational differences even today:
- Cashiers can create sales and view inventory, with strong limits.
- Branch managers have broader operations, approvals, receiving, finance view/close, reports, and user invite.
- Inventory clerks focus on inventory, transfers, receiving, and counts.

### 6.2 Permissions
Permission names are shared from `packages/shared/src/constants/PERMISSIONS`, including:
- `sales.create`, `sales.refund`, `sales.discount`, `sales.view`
- `inventory.view`, `inventory.adjust`, `inventory.count`
- `transfer.request`, `transfer.approve`, `transfer.dispatch`, `transfer.receive`
- `po.create`, `po.submit`, `po.confirm`, `po.receive`
- `catalogue.manage`
- `finance.view`, `finance.close`
- `reports.view`
- `users.manage`, `users.invite`
- `admin.*`

Desktop app implementation should reference these exact permission strings rather than inventing its own.

### 6.3 Tenancy
- Every business-owned record has tenant ownership.
- Isolation is enforced server-side through guards, not just UI.
- Branches add a second scoping dimension for stock, sales, POs, and transfers.
- The desktop app must preserve this model. A user may belong to multiple businesses; a desktop session must choose one active business and one active branch for scoped operations where required.

---

## 7. Important constraints and existing defects to respect

From the independent audit (`docs/audit/AUDIT.md`):
- The existing stack was audited and repaired for several critical/high issues: tenant isolation, cross-business privilege escalation, branch scope, stock atomicity, sale totals, payment enforcement, refund caps, transfer approval/dispatch/receive/close, over-receipt, fake mobile-money success, MFA attempt limits, and web/API contract mismatches for core flows.
- Residual findings remain and must not be regressed:
  - Token storage without a refresh flow (F-16).
  - Sequential numbering still racy (F-17).
  - Audit metadata and auth-event auditing incomplete (F-19).
  - Worker processors are placeholders in places (F-20).
  - Invitation token still not returned/sent (F-21).
  - Adjustment race still partially open (F-22).
  - Receipt print count side effect (F-23).
  - Missing `packages/api-client` (F-25).
- The desktop track must not depend on undocumented or unfixed backend behaviors for financial correctness. Where a backend change is needed for sync, it must be identified before implementation.

---

## 8. What the existing platform is good for reuse

Strong reuse candidates:
- Shared Zod schemas in `packages/shared/src/schemas`.
- Money helpers and format utilities in `packages/shared/src/money`.
- Permission and role constants in `packages/shared/src/constants`.
- API error code vocabulary in `packages/shared/src/errors`.
- UI component patterns and design tokens from `apps/web/src/components`.
- The API contract itself for all modules the desktop app supports.
- The existing Playwright journeys as cross-checks for real flows.

Reuse with caution:
- The web’s `sessionStorage`-based auth and React Query devtools setup. Desktop will have its own auth and persistence concerns.
- Any SSR-specific behavior. The desktop app is a client-side Tauri app, so SSR assumptions should not leak in.
- Mock data or test helpers that do not reflect the real API.

Not reused as-is:
- Next.js routing or server-side data fetching patterns.
- Browser-only storage assumptions.
- Any code that depends on being served from a web server at runtime.

---

## 9. Current health of the existing platform

From the audit verification pass in this workspace:
- API typecheck: pass.
- Web typecheck: pass.
- Shared typecheck and build: pass.
- API tests: 8 suites, 32 tests, pass.
- Lint: root, API, shared, web pass.
- API build: pass.
- Web build: pass.
- Playwright E2E: 2/2 pass against the running stack today.
- No Prisma migrations exist in the repository; integration tests are not runnable from source. This is a known blocker for some runtime verifications and is not specific to the desktop track, but it affects how confidently we can claim backend behavior without running migrations.

The desktop track should not assume the backend is perfect; it should assume the audited behavior and residual risks documented above.

---

## 10. Implications for the desktop track

1. **Reuse the data and business contracts, not the web runtime.** The richest reuse is in shared schemas, money, permissions, error codes, and API behavior.
2. **Design offline around the real modules.** Stock, sales, payments, refunds, transfers, and purchasing are the operationally critical modules and the ones with the strictest integrity constraints.
3. **Do not treat SQLite as another ledger.** Local SQLite is for offline work and sync staging; the server remains authoritative for financial history.
4. **Plan for auth and multi-business early.** The desktop app must handle login, session persistence, business selection, branch scoping, and permission-gated UI without relying on browser storage semantics.
5. **Identify backend changes before building sync.** If sync needs idempotency keys, conflict metadata, incremental change feeds, or new endpoints, that work belongs on the backend first and must be documented here as a dependency.

## 11. Backend dependency watchlist for the desktop track

Before the desktop app can claim reliable offline sync, the following backend capabilities should be verified or added. These are listed here so architecture and implementation choices do not silently depend on something that does not exist yet.

| Capability | Why it matters | Current assumption |
|---|---|---|
| Stable idempotency key semantics across devices | Offline-created sales/payments/refunds must replay safely without creating duplicates | Exists for sale commit and payments; confirm it is safe for offline-generated keys |
| Conflict/version metadata on mutable records | Needed to detect server-side changes since last sync | Not confirmed yet |
| Reliable incremental change feed or last-sync cursor | Needed for efficient server→desktop sync of mirrored entities | Not confirmed yet |
| Dedicated endpoints/fields for offline-created records | Makes staged records reconcile cleanly and predictably | Not confirmed yet |
| Safer retry semantics for sensitive mutations | Payments and other financial mutations must not be duplicated by retries | Exists in limited form; must be confirmed for desktop retry patterns |
| Module/feature availability query if dynamic | Lets the desktop app hide unavailable modules per business | Not confirmed as a clean backend capability |

These are dependencies to verify before sync implementation, not reasons to delay the rest of the desktop track.
