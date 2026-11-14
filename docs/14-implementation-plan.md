# Implementation Plan

**Product:** SokoOS — interconnected business operating platform for B2B commerce, inventory management and business operations
**Release:** MVP = Phase 1 Foundation + Phase 2 Business operations (per `scope.mvp`)
**Out of scope for this plan:** Phase 3 Supplier ecosystem, Phase 4 Finance, Phase 5 AI capabilities, Phase 6 Expansion, the dedicated React Native app and patient medical records (`scope.deferred`). No task in this plan builds them.
**Execution model:** one developer with an AI coding agent (`timeline.target`). Tasks are sequential; a task starts only when every dependency passes all of its tests.
**Source of truth:** the decision ledger wins over this document. Requirement IDs FR-001–FR-216 and NFR-001–NFR-015 are reused from `docs/03-cleaned-srs.md` and are never renumbered here. Business rules BR-001–BR-022 are referenced, not restated.

**Standing assumptions (apply to every phase unless a phase states otherwise):**

| # | Assumption |
|---|---|
| A1 | Package manager is pnpm with a workspace of `apps/backend` (NestJS), `apps/frontend` (Next.js App Router) and `packages/shared` (Zod schemas, types, money/quantity helpers). Node 20 LTS. |
| A2 | Docker is used only for CI service containers (PostgreSQL, Redis) and never to host the application, per `ops.hosting` ("no Docker"). |
| A3 | No external identity provider is named in the ledger; authentication is implemented in the application (Argon2id password hashing, TOTP RFC 6238 for MFA). |
| A4 | SMS delivery for phone verification uses the chosen provider behind an `SmsProvider` port; the email channel is disabled because `integrations.email` is deferred. |
| A5 | Object storage uses the chosen S3-compatible provider behind a `StorageProvider` port; keys are prefixed with the tenant id. |
| A6 | Mobile money uses MTN MoMo and Airtel Money sandbox credentials supplied as environment variables. No card acquirer is integrated. |
| A7 | WhatsApp notifications are selectable only when the provider is enabled; in-app notifications are always on. |
| A8 | All user-facing strings are externalized, English only, UTC timestamps in API responses, USD as display currency. |

---

## Phases

| Phase | Name | Objective | Key deliverables | Verification | Requirements |
|---|---|---|---|---|---|
| 0 | Documentation and decisions | Freeze the decision ledger and the docs pack the build reads from | `docs/01`–`docs/14`, decision ledger, task plan | Every referenced doc exists; no open decision blocks Phase 1 | — |
| 1 | Repository, tooling and API conventions | One workspace, one error envelope, one versioning rule, one CI pipeline | pnpm workspace; `/v1` prefix; global exception filter; request-id middleware; `/v1/health`, `/v1/version`, `/v1/metrics`; OpenAPI 3.1; CI workflow | `pnpm lint && pnpm typecheck && pnpm test && pnpm build`; `GET /v1/health` → 200 | NFR-002, NFR-011, NFR-013 |
| 2 | Database, tenancy and append-only tables | Every MVP table exists with tenant ownership, soft delete and immutable ledgers | Prisma schema + migrations; tenant-leading indexes; `deleted_at`; revoked UPDATE/DELETE grants; enum types | `pnpm prisma migrate deploy && pnpm test:schema` | FR-027, FR-028, FR-031, FR-068, NFR-006, NFR-012, NFR-014 |
| 3 | Authentication and account lifecycle | A user can register, verify, sign in, enrol MFA and reset a password safely | `/v1/auth/*`; MFA; rotating refresh tokens; sessions; lockout and rate limits; auth audit | `pnpm test:auth` | FR-001–FR-020, FR-059, FR-100 |
| 4 | RBAC, tenancy and branch scope | Every protected endpoint is denied by default and scoped server-side | Guard chain Auth→Tenant→BranchScope→Permission; four system roles; permission catalogue; context switching | `pnpm test:rbac` | FR-028, FR-032, FR-033, FR-041, FR-042, FR-051–FR-055, FR-060, FR-094, NFR-005 |
| 5 | Business, branch and user management | A verified owner can stand up a tenant, branches and staff | `/v1/businesses`, `/v1/branches`, `/v1/invitations`, `/v1/users`; settings; subscription read | `pnpm test:tenancy` | FR-021–FR-050, FR-056–FR-058 |
| 6 | Catalogue, products, variants and media | Products, variants, prices and images are tenant-scoped and searchable | `/v1/catalogue/*`; product search; barcode resolution; pre-signed image upload/read | `pnpm test:catalogue` | FR-061–FR-080 |
| 7 | Inventory ledger, balances and adjustments | Stock is a derived, append-only ledger with reasoned adjustments | Movement writer; balances; movements; expired batches; low stock; stock counts | `pnpm test:inventory` | FR-101–FR-115, FR-126–FR-130 |
| 8 | Stock transfers | Multi-branch transfers move stock only at dispatch and receipt | `/v1/stock-transfers/*` lifecycle; stock-checked dispatch; discrepancy handling | `pnpm test:transfers` | FR-116–FR-125 |
| 9 | Purchasing and goods receiving | Suppliers, purchase orders and receipts drive stock in with batch identity | `/v1/suppliers`, `/v1/purchase-orders`, `/v1/goods-receipts`; PO state machine; over-receipt confirmation | `pnpm test:purchasing` | FR-131–FR-154 |
| 10 | Sales, POS and receipts | A sale commits atomically, idempotently and never oversells | `/v1/sales`, `/v1/receipts`, `/v1/refunds`; FEFO batch resolution; server-side totals; receipt render | `pnpm test:sales` | FR-155–FR-178 |
| 11 | Payments and reconciliation | Mobile money and cash payments reach a terminal state exactly once | `/v1/payments/*`; MoMo and Airtel initiation; callbacks; expiry job; mismatch list; adjustments | `pnpm test:payments` | FR-179–FR-194 |
| 12 | Reporting, dashboard and day closure | Operators see trustworthy numbers derived from stored records | `/v1/dashboard`; sales, stock, purchasing and low-stock reports; day closure | `pnpm test:reports` | FR-081–FR-083, FR-195–FR-206 |
| 13 | Imports, attachments, jobs, notifications and audit | Bulk data in, documents in/out, background work and a complete audit trail | `/v1/imports`, `/v1/attachments`, `/v1/jobs`, `/v1/notifications`, `/v1/audit-logs` | `pnpm test:jobs` | FR-084–FR-100, FR-207–FR-216 |
| 14 | Frontend application and PWA | Every MVP workflow is usable on phone and desktop without training | Next.js screens for all roles; TanStack Query; React Hook Form + Zod; Tailwind neutral design system; PWA manifest and service worker | `pnpm --filter frontend test:e2e` | NFR-008, NFR-009, NFR-012 |
| 15 | Testing, security hardening and release gates | The release gates are provably met | Full unit/integration/E2E suites; RBAC matrix; rate limits; security headers; upload hardening; dependency audit | `pnpm test:all && pnpm test:e2e` | NFR-005, NFR-010 |
| 16 | Deployment, observability and production readiness | Staging and production run on managed hosting with backups and monitoring | Render or Railway staging + production; managed PostgreSQL; Redis; object storage buckets; daily backups; centralized logging; error monitoring; runbooks | Staging smoke suite + restore drill | NFR-003, NFR-004, NFR-007 |

### Phase exit gates

| Phase | Exit gate (must be true before the next phase starts) | Blocking on |
|---|---|---|
| 1 | CI is green on an empty feature branch; the OpenAPI document lists every registered route under `/v1` | — |
| 2 | Migrations apply and roll back on an empty database; the application role cannot UPDATE or DELETE `stock_movements`, `audit_logs`, `payment_webhook_events` or `import_rows` | — |
| 3 | A Business Admin sign-in returns an MFA challenge, never tokens; every FR-100 event writes one audit row | SMS provider selected (A4) |
| 4 | A cross-tenant id returns 404 and a branch-scoped role without an assignment returns 403 on every protected route | — |
| 5 | Tenant creation is one transaction; a deactivated user cannot sign in and historical records still name them | — |
| 6 | SKU and barcode uniqueness hold per tenant; a non-image or >5 MB upload is rejected | Object storage provider selected (A5) |
| 7 | No endpoint or UI path updates or deletes a `stock_movements` row; a negative commit is rejected with 409 when negative stock is disabled | — |
| 8 | A dispatch with insufficient origin stock leaves zero partial movements | — |
| 9 | A closed purchase order is immutable; a receipt against a non-PO line is rejected | — |
| 10 | A repeated idempotency key returns the original sale and creates no duplicate movement | — |
| 11 | A repeated provider callback is rejected by stored event id; a late success becomes `ORPHANED` without altering the sale | MTN MoMo and Airtel Money sandbox credentials (A6) |
| 12 | The stock report asserts closing balance equals the sum of movements and reports drift | — |
| 13 | An import reports row number, column, value and error per failing row and applies rows transactionally | — |
| 14 | E2E scenarios A–G pass on a mobile viewport and a desktop viewport | — |
| 15 | No unresolved P0 or P1 security finding; all release gates below pass | — |
| 16 | A restore from the latest backup succeeds in staging; production health checks are green | Hosting provider chosen (Render or Railway) |

### Release gates (blocking, from `testing.strategy`)

| Gate | Evidence required |
|---|---|
| Financials | Payment and refund totals reconcile to stored `payments`, `refunds` and `payment_adjustments` rows; no report value is computed from client input |
| Stock reconciliation | For every product/variant/batch/branch, closing balance equals the sum of `stock_movements`; drift is zero |
| Duplicate prevention | Repeated sale idempotency key and repeated provider event id both produce exactly one record |
| E2E | Scenarios A–G as defined in `docs/11-testing-strategy.md` pass in CI |
| Backups | Daily backup exists for the last 14 days and a restore drill has been executed in staging |
| Import errors | A deliberately malformed CSV/XLSX produces a complete per-row error report and applies no partial row |

---

## Build Order

Tasks are executed in the order below. Each task ends with a green CI run on its branch and a short written result (commands run, outcomes, deviations). Verification commands are pnpm scripts defined in Phase 1:

| Command | Meaning |
|---|---|
| `pnpm lint` | ESLint + Prettier check across the workspace |
| `pnpm typecheck` | `tsc --noEmit` across the workspace |
| `pnpm test` | Unit tests |
| `pnpm test:integration` | API/integration tests against a disposable PostgreSQL and Redis |
| `pnpm test:e2e` | Playwright E2E scenarios A–G |
| `pnpm test:all` | Unit + integration + RBAC + security suites |
| `pnpm openapi:check` | Fails when the generated OpenAPI document differs from the committed one |
| `pnpm prisma migrate deploy` | Applies migrations to the target database |

| # | Task | Phase | Depends on | Requirements | Primary deliverable |
|---|---|---|---|---|---|
| 1 | Monorepo, API conventions and CI foundation | 1 | — | NFR-002, NFR-003, NFR-011, NFR-013 | Workspace, error envelope, health/version/metrics, OpenAPI, CI |
| 2 | PostgreSQL schema, tenant ownership and append-only tables | 2 | 1 | FR-027, FR-028, FR-031, FR-068, NFR-006, NFR-012, NFR-014 | Migrations for every MVP table with constraints and grants |
| 3 | Registration, verification, MFA, sessions and lockout | 3 | 2 | FR-001–FR-020, FR-059, FR-100 | `/v1/auth/*` complete with audit |
| 4 | Enforcement chain, roles, permissions and branch scope | 4 | 3 | FR-028, FR-032, FR-033, FR-041, FR-042, FR-051–FR-055, FR-060, FR-094, NFR-005 | Guard chain, four roles, permission catalogue |
| 5 | Business registration, branches, invitations and user lifecycle | 5 | 4 | FR-021–FR-050, FR-056–FR-058 | `/v1/businesses`, `/v1/branches`, `/v1/invitations`, `/v1/users` |
| 6 | Categories, brands, products, variants, search and product images | 6 | 4 | FR-061–FR-080 | `/v1/catalogue/*` and product search |
| 7 | Stock ledger, balances, low stock, counts and adjustments | 7 | 6 | FR-101–FR-115, FR-126–FR-130 | `/v1/inventory/*` |
| 8 | Multi-branch transfer lifecycle | 8 | 7 | FR-116–FR-125 | `/v1/stock-transfers/*` |
| 9 | Suppliers, purchase orders and goods receiving | 9 | 7 | FR-131–FR-154 | `/v1/suppliers`, `/v1/purchase-orders`, `/v1/goods-receipts` |
| 10 | POS sale commit, receipts and refunds | 10 | 9 | FR-155–FR-178 | `/v1/sales`, `/v1/receipts`, `/v1/refunds` |
| 11 | Mobile money and cash payments, callbacks and reconciliation | 11 | 10 | FR-179–FR-194 | `/v1/payments/*` and reconciliation jobs |
| 12 | Dashboard, reports and end-of-day closure | 12 | 11 | FR-081–FR-083, FR-195–FR-206 | `/v1/dashboard`, `/v1/reports/*`, `/v1/day-closures` |
| 13 | Imports, attachments, background jobs, notifications and audit search | 13 | 12 | FR-084–FR-100, FR-207–FR-216 | `/v1/imports`, `/v1/attachments`, `/v1/jobs`, `/v1/notifications`, `/v1/audit-logs` |
| 14 | Frontend application and PWA | 14 | 13 | NFR-008, NFR-009, NFR-012 | All MVP screens for all four roles |
| 15 | Testing, security hardening and release gates | 15 | 14 | NFR-005, NFR-010 | Full suites, hardening, gate evidence |
| 16 | Deployment, observability and production readiness | 16 | 15 | NFR-003, NFR-004, NFR-007 | Staging + production, backups, monitoring, runbooks |

### Task 1 — Monorepo, API conventions and CI foundation

**Goal:** Scaffold the SokoOS workspace and implement the shared API conventions: `/v1` versioning, error envelope, request id, health/version/metrics and OpenAPI generation.
**Depends on:** none.
**Areas:** `apps/backend`, `apps/frontend`, `packages/shared`, `.github/workflows`, `docs/10-api-specification.md`.
**Steps:**
1. Create the pnpm workspace with `apps/backend` (NestJS, TypeScript), `apps/frontend` (Next.js App Router, TypeScript, Tailwind CSS) and `packages/shared` (Zod schemas, types, money and quantity helpers).
2. Configure the backend global prefix `/v1` with URI versioning and a validation pipe that rejects unknown fields with `400 VALIDATION_ERROR`.
3. Implement a global exception filter emitting `{ error: { code, message, details, requestId } }` and never leaking stack traces or SQL in production.
4. Implement request-id middleware that honours a valid client `X-Request-Id`, echoes `X-Request-Id` on every response and attaches it to the logger context.
5. Implement `GET /v1/health`, `/v1/health/live`, `/v1/health/ready`, `/v1/version` and `/v1/metrics` (ops token) exactly as specified.
6. Configure the PostgreSQL connection pool and Redis client from environment variables; add `.env.example` containing placeholders only.
7. Generate the OpenAPI 3.1 document from decorators and Zod schemas, serve it at `/v1/openapi.json` and gate `/v1/docs` behind `OPENAPI_UI_ENABLED`.
8. Add a CI workflow running install, lint, typecheck, unit tests, build, OpenAPI diff check, dependency audit and secret scan.
9. Add structured JSON logging with redaction of passwords, tokens and full payment credentials.
**Acceptance criteria:**
- `GET /v1/health` returns HTTP 200 and every response carries `X-Request-Id`.
- An unrecognised body field returns 400 with code `VALIDATION_ERROR` and a `requestId` traceable to exactly one log entry.
- The OpenAPI document at `/v1/openapi.json` lists every registered endpoint under the `/v1` prefix.
- No secret or connection string is committed; `.env.example` contains placeholders only.
**Verification:** `pnpm install && pnpm lint && pnpm typecheck && pnpm test && pnpm build && pnpm openapi:check`.
**Stop and report if:** the OpenAPI toolchain cannot express the Zod schemas, or a required environment variable has no decided provider.

### Task 2 — PostgreSQL schema, tenant ownership and append-only tables

**Goal:** Create the PostgreSQL schema and migrations for every MVP table with tenant ownership, soft delete, append-only ledger and audit tables, integer minor-unit money and UTC timestamps.
**Depends on:** Task 1.
**Areas:** `apps/backend/prisma`, `apps/backend/src/database`, `docs/09-database-design.md`.
**Steps:**
1. Create migrations for identity tables: `users`, `sessions`, `refresh_tokens`, `verification_tokens`, `password_reset_tokens`, `mfa_recovery_codes`, `invitations`, `roles`, `permissions`, `role_permissions`, `user_roles`, `user_branches`.
2. Create migrations for tenant tables: `businesses`, `branches`, `subscriptions`, `business_settings`, `audit_logs`, `notifications`, `notification_preferences`, `attachments`, `jobs`, `import_jobs`, `import_rows`.
3. Create migrations for catalogue and stock tables: `categories`, `brands`, `products`, `product_variants`, `inventory_balances`, `stock_movements`, `stock_batches`, `stock_counts`, `stock_count_lines`, `stock_transfers`, `stock_transfer_lines`.
4. Create migrations for purchasing, sales and payment tables: `suppliers`, `purchase_orders`, `purchase_order_lines`, `goods_receipts`, `goods_receipt_items`, `sales`, `sale_items`, `payments`, `payment_webhook_events`, `payment_adjustments`, `refunds`, `refund_lines`, `receipts`, `cash_sessions`, `day_closures`.
5. Add `tenant_id` to every business-owned table with a composite index leading with `tenant_id`, and `deleted_at` on every soft-deletable table.
6. Store every monetary column as `bigint` minor units with an explicit ISO-4217 currency column, quantities as `numeric(18,3)` and timestamps as `timestamptz`.
7. Add unique constraints: business slug, branch code per tenant, category name per tenant, brand name per tenant case-insensitive, SKU per tenant, barcode per tenant when present, supplier name per tenant, receipt number per tenant, `(provider, provider_event_id)` and `(branch_id, business_date)` on `day_closures`, and idempotency key per tenant.
8. Revoke UPDATE and DELETE grants on `stock_movements`, `audit_logs`, `payment_webhook_events` and `import_rows` from the application database role.
9. Add the enum types matching the API spec for purchase order, transfer, sale, payment, job and movement states.
10. Write a migration test that applies all migrations to an empty database and asserts the constraints and grants.
**Acceptance criteria:**
- Every business-owned table carries `tenant_id` and a tenant-leading index.
- The application database role has no UPDATE or DELETE grant on `stock_movements`, `audit_logs`, `payment_webhook_events` or `import_rows`.
- All monetary columns are integer minor units with an explicit currency column.
- Soft-deletable tables expose `deleted_at` and no business row is hard-deleted.
**Verification:** `pnpm prisma migrate deploy && pnpm test:schema`.
**Stop and report if:** an FR needs a table or column that `docs/09-database-design.md` does not define — report rather than inventing schema.

### Task 3 — Registration, verification, MFA, sessions and lockout

**Goal:** Implement registration, phone verification, password reset, sign-in, MFA enrolment and challenge, rotating refresh tokens, session management, lockout and rate limiting, with an audit entry for every authentication event.
**Depends on:** Task 2.
**Areas:** `apps/backend/src/modules/auth`, `apps/backend/src/modules/audit`, `docs/10-api-specification.md` `/auth` rows, `docs/12-authentication-authorization-and-permissions.md`.
**Steps:**
1. Implement `POST /v1/auth/register` creating a user in `PENDING_VERIFICATION` with an Argon2id hash, enforcing the ≥10-character three-class password policy and returning `409 EMAIL_EXISTS` on a duplicate email.
2. Implement `POST /v1/auth/verify` and `/v1/auth/verify/resend` with a 6-digit code, 10-minute TTL, at most 5 attempts, resend invalidating the previous code, hard-delete of the token on use or expiry, and the move to `ACTIVE` on success.
3. Implement `POST /v1/auth/password/forgot` returning 202 unconditionally with uniform timing, and `POST /v1/auth/password/reset` with a single-use 30-minute token that revokes all sessions.
4. Implement `POST /v1/auth/login` verifying email and password, returning an MFA challenge for roles that require MFA and a token pair otherwise, with non-disclosing errors.
5. Implement `POST /v1/auth/mfa/enrol`, `/enrol/confirm`, `/challenge` and `/disable` with TOTP, hashed single-use recovery codes shown exactly once, and `409 MFA_REQUIRED_FOR_ROLE` when an admin role attempts to disable MFA.
6. Implement `POST /v1/auth/refresh` with rotating refresh tokens hashed at rest; reuse of a rotated token revokes the session family.
7. Implement `POST /v1/auth/logout`, `GET /v1/auth/sessions` and `DELETE /v1/auth/sessions/{id}`.
8. Implement lockout after 10 failed sign-ins in 15 minutes per email, per-email and per-IP rate limits on auth endpoints with `429 RATE_LIMITED` and `Retry-After`, and Redis counters that fail closed for writes and open for reads.
9. Write an audit entry for sign-in, MFA challenge, MFA enable and disable, recovery-code use, lockout, rate-limit and password reset.
**Acceptance criteria:**
- A new account is created in `PENDING_VERIFICATION` and exposes no business data before verification completes.
- A successful verification moves the account to `ACTIVE` and hard-deletes the verification token.
- Sign-in for a Business Admin or Branch Manager returns an MFA challenge instead of tokens.
- A repeated refresh token revokes the session family.
- Every authentication event listed in FR-100 writes an audit entry with actor, action, target, timestamp and context.
**Verification:** `pnpm test:auth && pnpm test:integration -- auth`.
**Stop and report if:** the SMS provider is not selected (A4) — verification delivery cannot be exercised end to end.

### Task 4 — Enforcement chain, roles, permissions and branch scope

**Goal:** Implement the server-side enforcement chain AuthGuard → TenantGuard → BranchScopeGuard → PermissionGuard, the four system roles and permission catalogue, and branch-scoped query injection with 404 for cross-tenant references.
**Depends on:** Task 3.
**Areas:** `apps/backend/src/modules/rbac`, `apps/backend/src/common/guards`, `apps/backend/src/modules/audit`, `docs/12-authentication-authorization-and-permissions.md`.
**Steps:**
1. Seed the platform permission catalogue and the four system roles (Business Admin, Branch Manager, Cashier, Inventory Clerk) per tenant.
2. Implement `AuthGuard` validating the access token and attaching the user to the request.
3. Implement `TenantGuard` resolving the active business from `X-Business-Id` or the stored context, re-validating `user_roles` on every request and returning `403 TENANT_ACCESS_DENIED` on a switch to a tenant with no role.
4. Implement `BranchScopeGuard` resolving the active branch from `X-Branch-Id` or the stored context, returning `403 BRANCH_SCOPE_REQUIRED` when a branch-scoped role has no assignment, and injecting the allowed branch set into the request.
5. Implement `PermissionGuard` resolving exactly one declared permission per endpoint with default deny and returning `403 FORBIDDEN` for a missing or unrecognised permission.
6. Make every repository method require an explicit `tenantId` and apply the branch set to branch-scoped queries, returning `404 RESOURCE_NOT_FOUND` for a cross-tenant or other-branch reference.
7. Implement `POST /v1/me/context` and `GET /v1/me` returning profile, active business, active branch, roles and effective permissions.
8. Implement `GET /v1/settings/roles` and `PATCH role_permissions` with `409 ADMIN_PERMISSION_IMMUTABLE` when an `admin.*` permission is removed from the Business Admin role, auditing every change.
9. Apply branch-scoped audit-log visibility for a Branch Manager in the audit query layer.
**Acceptance criteria:**
- Every protected endpoint runs AuthGuard, TenantGuard, BranchScopeGuard and PermissionGuard server-side.
- A user holding roles in two businesses can switch context and is re-validated on every later request.
- A cross-tenant reference returns 404 and never discloses existence.
- The permission catalogue is exposed for role configuration and every role change is audited.
**Verification:** `pnpm test:rbac && pnpm test:integration -- tenancy`.
**Stop and report if:** an endpoint in `docs/10-api-specification.md` declares no permission — report the gap rather than defaulting it open.

### Task 5 — Business registration, branches, invitations and user lifecycle

**Goal:** Implement business registration and profile/settings, branch management, user invitations, role and branch assignment, and user deactivation and reactivation.
**Depends on:** Task 4.
**Areas:** `apps/backend/src/modules/businesses`, `.../branches`, `.../users`, `.../invitations`, `docs/10-api-specification.md` `/businesses` `/branches` `/users` `/invitations` rows.
**Steps:**
1. Implement `POST /v1/businesses` creating the tenant, the owner's Business Admin role assignment, the default branch and settings in one transaction, capturing the business type (retail, pharmacy, wholesale, distribution) and enforcing a unique slug.
2. Implement `GET /v1/businesses`, `GET/PATCH/DELETE /v1/businesses/{id}` with before and after audit values, and `GET/PATCH /v1/businesses/{id}/settings` for currency, timezone, receipt footer, default tax rate and negative-stock policy.
3. Implement `GET /v1/businesses/{id}/subscription` returning plan, status and period start/end read-only.
4. Implement branch CRUD: `GET/POST /v1/branches`, `GET/PATCH/DELETE /v1/branches/{id}`, `POST /v1/branches/{id}/activate` and `/deactivate`, with branch code uniqueness per tenant and the `is_warehouse` flag.
5. Enforce that a deactivated branch blocks new sales while its history stays readable, and allow the per-branch negative-stock override.
6. Implement `GET/POST /v1/branches/{id}/users` and `DELETE /v1/branches/{id}/users/{userId}` for branch assignment.
7. Implement `POST /v1/invitations` with email or phone, role and branch scope, issuing a single-use hashed token that expires in 7 days, plus list and revoke endpoints.
8. Implement `POST /v1/invitations/accept` binding the assigned role and branches, setting the password and applying the MFA rules of the assigned role.
9. Implement `GET /v1/users`, `GET /v1/users/{id}`, `PATCH` role and branch assignments effective on the next request, and `POST /v1/users/{id}/deactivate` and `/reactivate` revoking sessions and refresh tokens in one request.
10. Preserve attribution of a deactivated user's historical sales, receipts and stock movements, and audit branch changes, user assignment, role changes, deactivation and reactivation.
**Acceptance criteria:**
- Business registration completes self-service after phone verification with no platform approval step.
- A Business Admin can update legal name, TIN, registration number, address, contact phone and currency, and the audit entry contains before and after values.
- A branch-scoped user list shows only the branches the caller may access.
- A deactivated user cannot sign in and their historical records still name them as the actor.
**Verification:** `pnpm test:tenancy && pnpm test:integration -- businesses branches invitations users`.
**Stop and report if:** the invitation delivery channel is unavailable because `integrations.email` is deferred and no SMS template is approved — report the fallback (invitation link surfaced to the Business Admin) before building it.

### Task 6 — Categories, brands, products, variants, search and product images

**Goal:** Implement categories, brands, products, variants, product search, price-change auditing and tenant-prefixed product image upload and read.
**Depends on:** Task 4.
**Areas:** `apps/backend/src/modules/catalogue`, `apps/backend/src/modules/storage`, `docs/10-api-specification.md` catalogue rows.
**Steps:**
1. Implement category CRUD scoped to the tenant with unique names per tenant, soft delete and 409 when deleting a category in use by a product.
2. Implement brand CRUD scoped to the tenant with case-insensitive name uniqueness and soft delete.
3. Implement product create, update and soft-delete with name, category (at most one), brand, unit of measure, cost price, selling price, tax rate in basis points, `is_batch_tracked` and `reorder_level`.
4. Store all prices as integer minor units with the tenant currency and reject float input.
5. Return a warning flag, not an error, when the selling price is below the cost price.
6. Implement variant create and update with SKU and optional barcode, enforcing SKU uniqueness per tenant and barcode uniqueness per tenant when present.
7. Implement `GET /v1/products` search by name, SKU or barcode within the tenant with pagination and allowlisted filters.
8. Implement barcode resolution returning exactly one variant or a clear not-found result that does not block the POS.
9. Implement product image upload through a pre-signed URL to a tenant-prefixed object key, restricted to image MIME types and 5 MB, writing an `attachments` row on confirm.
10. Serve image reads through short-lived signed URLs generated after a permission and tenant check.
11. Audit every catalogue price change.
**Acceptance criteria:**
- A product can be assigned to at most one category and carries cost price, selling price, tax rate, `is_batch_tracked` and `reorder_level`.
- SKU and barcode uniqueness are enforced per tenant.
- A barcode scan resolves to exactly one variant or returns a not-found result without blocking the POS.
- Product images are stored under a tenant-prefixed key and read only through a short-lived signed URL.
**Verification:** `pnpm test:catalogue && pnpm test:integration -- catalogue`.
**Stop and report if:** the object storage provider is not selected (A5) — pre-signed URL generation cannot be implemented.

### Task 7 — Stock ledger, balances, low stock, counts and adjustments

**Goal:** Implement the immutable stock movement ledger, derived balances, expired-batch separation, low-stock detection and notifications, stock counts and reasoned adjustments with negative-stock control.
**Depends on:** Task 6.
**Areas:** `apps/backend/src/modules/inventory`, `apps/backend/src/modules/notifications`, `docs/10-api-specification.md` `/inventory` rows.
**Steps:**
1. Implement the stock movement writer: one append-only row per movement with type, signed quantity, product, variant, batch, branch, reference and actor, inside the caller's transaction.
2. Implement `GET /v1/inventory/balances` with filters for branch, category, brand, product and low-stock, computing each balance as the sum of `stock_movements` for the same product, variant, batch and branch.
3. Implement `GET /v1/inventory/movements` with filters for branch, product, movement type and date range, and `GET /v1/inventory/movements/{id}` linking to the originating sale, goods receipt, transfer or adjustment.
4. Expose no update or delete operation for stock movements and return `405 METHOD_NOT_ALLOWED` on such paths.
5. Implement `GET /v1/inventory/expired` listing expired batches separately from sellable stock with a write-off action.
6. Implement `GET /v1/inventory/low-stock` comparing balances to `reorder_level` per product, variant and branch.
7. Create a low-stock notification when a balance crosses to at or below `reorder_level`, suppressing repeats for 24 hours until the balance rises above the threshold.
8. Implement `POST /v1/inventory/adjustments` requiring product/variant, branch, quantity delta, a batch for batch-tracked products and a non-empty reason, writing exactly one movement and one audit entry.
9. Reject atomically with `409 INSUFFICIENT_STOCK` and a machine-readable reason any commit that would take a balance negative while negative stock is disabled, and permit negative stock only when the business or branch has enabled it.
10. Implement stock counts: create a session, capture counted quantities per product/variant/batch, compute the delta and raise one adjustment per line with reason `STOCK_COUNT`, never setting a balance directly.
**Acceptance criteria:**
- Every balance is derived from `stock_movements` and no endpoint or UI updates or deletes a movement.
- An adjustment without a reason is rejected and an adjustment without permission returns 403.
- Expired batches are listed separately from sellable stock.
- A stock count produces adjustments rather than direct balance writes.
**Verification:** `pnpm test:inventory && pnpm test:integration -- inventory`.
**Stop and report if:** a caller needs a balance write that is not expressible as a movement — report rather than adding a mutable balance column.

### Task 8 — Multi-branch transfer lifecycle

**Goal:** Implement the transfer lifecycle requested → approved/rejected → dispatched → received → closed with stock-checked dispatch, idempotency and discrepancy handling.
**Depends on:** Task 7.
**Areas:** `apps/backend/src/modules/transfers`, `docs/10-api-specification.md` `/stock-transfers` rows.
**Steps:**
1. Implement `POST /v1/stock-transfers` creating a transfer in `REQUESTED` with origin branch, destination branch and lines of product/variant/batch and quantity, writing no stock movement.
2. Implement `POST /v1/stock-transfers/{id}/approve` and `/reject` with a mandatory reason on rejection, accepting only `REQUESTED → APPROVED` and `REQUESTED → REJECTED` and returning `409 INVALID_STATE_TRANSITION` otherwise.
3. Implement `POST /v1/stock-transfers/{id}/dispatch` writing negative movements at the origin branch inside a stock-checked transaction and requiring an `Idempotency-Key`.
4. Reject the entire dispatch with `409 INSUFFICIENT_STOCK` when origin stock is insufficient, leaving no partial movements.
5. Implement `POST /v1/stock-transfers/{id}/receive` writing positive movements at the destination branch, with received quantities defaulting to the dispatched quantity.
6. Require a note on a shortfall and store the shortfall as the transfer discrepancy.
7. Implement `POST /v1/stock-transfers/{id}/close` allowed only after any discrepancy note is acknowledged.
8. Retain source and destination branch for the whole life of the transfer and make a closed transfer immutable.
9. Implement `GET /v1/stock-transfers` and `GET /v1/stock-transfers/{id}` with status, origin, destination and date filters, branch-scoped.
10. Create in-app notifications for transfer requested, approved, dispatched and received.
**Acceptance criteria:**
- Requesting a transfer writes no stock movement.
- A dispatch with insufficient origin stock returns 409 and leaves zero partial movements.
- A repeated dispatch with the same idempotency key returns the original result and writes no second set of movements.
- A closed transfer is immutable and retains its source and destination branch.
**Verification:** `pnpm test:transfers && pnpm test:integration -- transfers`.
**Stop and report if:** a transfer line references a batch that does not exist at the origin branch — report the data gap rather than auto-creating a batch.

### Task 9 — Suppliers, purchase orders and goods receiving

**Goal:** Implement supplier management, the purchase order state machine and goods receiving that writes stock with batch identity and expiry.
**Depends on:** Task 7.
**Areas:** `apps/backend/src/modules/suppliers`, `.../purchasing`, `docs/10-api-specification.md` `/suppliers` `/purchase-orders` `/goods-receipts` rows.
**Steps:**
1. Implement supplier CRUD with name, contact person, phone, email, address, TIN and payment terms; enforce name uniqueness per tenant, soft delete, search and pagination; suppliers are non-user records with no login.
2. Implement `POST /v1/purchase-orders` creating a `DRAFT` with supplier, branch, expected date and lines of product/variant, quantity, unit cost and tax; compute totals server-side.
3. Allow draft editing; implement `POST /v1/purchase-orders/{id}/submit` requiring a supplier and at least one line with quantity greater than zero, moving `DRAFT → SUBMITTED`.
4. Block editing after submission and require cancellation plus a new purchase order for changes.
5. Implement `POST /v1/purchase-orders/{id}/confirm` gated by permission `po.confirm`, moving `SUBMITTED → CONFIRMED`, recording actor and timestamp and notifying the requesting branch.
6. Implement `POST /v1/purchase-orders/{id}/cancel` for a Business Admin with an audit entry.
7. Implement `POST /v1/goods-receipts` allowed only against a purchase order in `CONFIRMED` or `PARTIALLY_RECEIVED`, capturing received quantity, unit cost, batch number and expiry per line.
8. In one transaction: write positive stock movements, create or match batches, insert `goods_receipts` and `goods_receipt_items`, and increment received quantities on the purchase order.
9. Require explicit confirmation for a receipt exceeding the ordered quantity and flag the over-receipt; reject receiving against a line that is not on the purchase order.
10. Set `PARTIALLY_RECEIVED` when some but not all lines are fully received and `RECEIVED` when all ordered quantities are received; implement `POST /v1/purchase-orders/{id}/close` from `RECEIVED`, or from `PARTIALLY_RECEIVED` with a stated shortfall reason, and make a closed purchase order immutable.
11. Expose ordered, received and outstanding quantities per line with the current state, and audit submission, confirmation, each receipt, cancellation and closure.
**Acceptance criteria:**
- A goods receipt against a purchase order that is not `CONFIRMED` or `PARTIALLY_RECEIVED` returns 409.
- Receiving writes movements, batches, receipt rows and purchase order counters in one transaction or none at all.
- An over-receipt requires explicit confirmation and is flagged.
- A closed purchase order is immutable.
**Verification:** `pnpm test:purchasing && pnpm test:integration -- purchasing`.
**Stop and report if:** a batch-tracked product is received without a batch number or expiry — report rather than defaulting either value.

### Task 10 — POS sale commit, receipts and refunds

**Goal:** Implement the POS sale path end to end: search, cart, server-side totals, idempotent atomic commit, FEFO batch resolution, receipts and refunds.
**Depends on:** Task 9.
**Areas:** `apps/backend/src/modules/sales`, `.../pos`, `.../receipts`, `.../refunds`, `docs/10-api-specification.md` `/sales` `/receipts` `/refunds` rows.
**Steps:**
1. Implement `GET /v1/pos/products` searching by name, SKU or barcode scoped to the selling branch, and barcode add-to-cart resolving the exact variant.
2. Display out-of-stock items as visible but not committable, and never present an expired batch as sellable.
3. Implement the cart with editable line quantity and recompute subtotal, tax and total server-side; treat client-supplied totals as display-only and never persist them.
4. Require permission `sales.discount` for a line discount and cap the discount at a configurable maximum percentage.
5. Implement `POST /v1/sales` with an `Idempotency-Key`, creating `sales`, `sale_items`, stock movements and the payment link in one transaction.
6. Re-validate stock at the selling branch at commit time and reject with `409 INSUFFICIENT_STOCK` when stock is unavailable.
7. Return the original sale for a repeated idempotency key and never create a duplicate sale or movement.
8. Resolve sale lines to batches using first-expiry-first-out within non-expired batches.
9. Create a `receipts` record with a tenant-unique number on sale completion; render the receipt print view and PDF from stored sale data only; allow re-print without creating a new sale or movement.
10. Implement `POST /v1/refunds` recording a full or partial refund as `refunds` plus refund lines against the original sale, writing reversing movements to the original batch for batch-tracked products, setting the sale to `REFUNDED` or `PARTIALLY_REFUNDED`, and rejecting a refund quantity exceeding the sold quantity net of prior refunds.
11. Implement `GET /v1/sales` search by date range, branch, cashier, payment method, state and receipt number, branch-scoped; support a sale split across at most two payment methods; keep parked sales in the POS client session only with no server-side entity.
12. Audit sale completion, discounts above the configured threshold and refunds.
**Acceptance criteria:**
- A repeated idempotency key returns the original sale and creates no duplicate sale or movement.
- A commit that would oversell returns 409 and writes nothing.
- Batch allocation follows first-expiry-first-out and never selects an expired batch.
- A receipt re-print creates no new sale and no new movement.
- A refund beyond the net sold quantity is rejected.
**Verification:** `pnpm test:sales && pnpm test:integration -- sales refunds`.
**Stop