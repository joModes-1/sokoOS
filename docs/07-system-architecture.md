# System Architecture

**Product:** SokoOS — interconnected business operating platform for B2B commerce, inventory management and business operations
**Release covered:** MVP = Phase 1 Foundation (FR-001–FR-060, FR-081–FR-100) + Phase 2 Business operations (FR-101–FR-216)
**Explicitly not covered:** Phase 3 supplier ecosystem/marketplace, Phase 4 finance accounts/journal entries/expenses, Phase 5 AI capabilities, Phase 6 expansion, dedicated React Native app, patient medical records, subscription billing and collection, platform-operator UI.

This document defines the structural components of SokoOS, their responsibilities and boundaries, how a request and a state transition flow through them, how external services are integrated, and how the system is deployed. It is the shared map referenced by the API specification, data model, security and testing documents.

**Architecture principles applied (non-negotiable):**

1. **Modular monolith** — one deployable API process with enforced module boundaries by convention; microservices are not introduced until scaling requires them (NFR-002).
2. **REST with URL versioning** — all endpoints under `/v1/`, documented with OpenAPI; breaking changes require a new prefix (NFR-013).
3. **Backend is authoritative** — every permission check, tenant scope, price, tax, total, change amount and stock decision is computed server-side; client-supplied totals are display-only and never persisted (FR-028, FR-054, FR-159, FR-160, FR-183).
4. **Immutable stock ledger** — `stock_movements` rows are append-only; no endpoint or UI updates or deletes them (FR-106). `inventory_balances` is a derived projection that must equal the sum of movements for the same product/variant/batch/branch (FR-102, FR-199).
5. **One database transaction per state transition** — sale commit, goods receipt, transfer dispatch/receive, refund, payment state change and day closure are each atomic (NFR-006).
6. **Idempotency at every money and stock boundary** — client idempotency keys on sale commit (FR-162, FR-164) and provider event ids on payment callbacks (FR-185).
7. **Tenant isolation server-side** — every business-owned row carries `tenant_id`; every query is scoped by the data-access layer, never by the client (FR-028, FR-033, FR-042).
8. **Audit everything critical** — append-only `audit_logs` with actor, action, target, timestamp and context (FR-092, FR-093, FR-095).
9. **Async by interface, not by accident** — notifications, exports, payment expiry and reconciliation run as Redis-backed jobs behind a dispatch interface (FR-090, FR-213).
10. **No third-party identity provider** — authentication is built in-house (email + password, phone/email verification, MFA, RBAC).

---

## Components

### Component inventory

| # | Component | Technology | Responsibility (one sentence) | Does NOT do |
|---|---|---|---|---|
| C1 | Web App | Next.js (App Router), React, TypeScript, Tailwind CSS, TanStack Query, React Hook Form, Zod; installable PWA | Renders all authenticated and public screens, holds no authoritative business state, calls the REST API for every read and write | Does not compute prices, tax, totals, change, stock availability or permissions; does not talk to PostgreSQL, Redis or object storage directly |
| C2 | API Server | Node.js + NestJS, TypeScript, REST under `/v1/`, OpenAPI 3.1 document generated from DTOs | Terminates HTTPS, authenticates, authorizes, validates DTOs, orchestrates domain modules and persists to PostgreSQL | Does not serve frontend assets; does not store file bytes; does not hold session state in memory |
| C3 | Auth & Guard Layer | NestJS guards + in-house JWT (access + rotating refresh), TOTP MFA, Argon2id password hashing | Verifies the access token, resolves user → tenant → branch context, enforces RBAC and branch scope, defaults to deny | Does not contain domain rules; does not decide business state transitions |
| C4 | Domain Modules | NestJS modules (see module table) | Own their tables, their invariants and their state machines | Do not read another module's tables directly; they call the owning module's service |
| C5 | Worker | Node.js process, BullMQ on Redis | Executes queued jobs: notifications, exports, payment expiry, payment reconciliation, import processing, low-stock evaluation | Does not serve HTTP; does not bypass module services or guards — jobs carry an explicit actor and tenant context |
| C6 | PostgreSQL | Managed PostgreSQL 15+ (single primary) | Single source of truth for all business, financial, stock and audit data | Is not accessed by the browser; is not accessed by the worker outside module services |
| C7 | Redis | Managed Redis | BullMQ queues, rate-limit counters, short-TTL cache of reference data (permissions catalogue, business settings) | Is never the source of truth for money, stock or state; cache loss must not change behaviour |
| C8 | Object Storage | S3-compatible object storage, tenant-prefixed keys | Stores product images and attachments as bytes; metadata lives in PostgreSQL | Is never publicly readable; no object key is exposed without a short-lived signed URL |
| C9 | Payment Adapters | `MtnMomoAdapter`, `AirtelMoneyAdapter` behind a `PaymentProvider` interface | Initiate a collection request, verify and normalize provider callbacks into internal payment events | Do not mutate sales, stock or receipts; do not mark a sale paid from a client signal (FR-182) |
| C10 | Notification Adapters | `InAppAdapter`, `WhatsAppAdapter`, `SmsAdapter` behind a `NotificationChannel` interface | Deliver a rendered notification payload over one channel | Do not decide who is notified; do not write business records |
| C11 | Observability | Centralized structured logging, error monitoring, `audit_logs` | Capture request-scoped logs with `requestId`, forward unexpected errors to error monitoring, persist audit entries | Never logs passwords, tokens, MFA secrets or full payment credentials (NFR-007) |
| C12 | CI/CD Pipeline | Docker images built in CI, migrations, automated backups, staging + production environments | Build, test, migrate and deploy; run release gates | Docker is not in the runtime path — production and staging run on managed Node hosting |

**Assumptions (smallest conventional option consistent with the ledger):**
- Assumption: the backend is NestJS rather than a modular Next.js backend, because the ledger permits either and NestJS gives explicit module boundaries and guards.
- Assumption: the ORM is Prisma; raw SQL is permitted only for reporting aggregates and reconciliation queries.
- Assumption: the job runner is BullMQ on Redis.
- Assumption: the object storage provider is an S3-compatible service; the concrete vendor is chosen at implementation time.
- Assumption: the phone-verification/SMS provider and the WhatsApp provider are "the chosen provider", selected at implementation time; WhatsApp is disabled by default (`WHATSAPP_ENABLED=false`) and the channel is only selectable when enabled (FR-089).
- Assumption: the error-monitoring provider is "the chosen provider"; the integration is a DSN-based SDK.
- Assumption: tenant scoping is enforced in the data-access layer (every repository method requires a `tenantId`), not by PostgreSQL row-level security.
- Assumption: access tokens live 15 minutes; refresh tokens rotate and live 30 days; MFA is TOTP with one-time recovery codes (FR-010, FR-015).
- Assumption: the repository is a pnpm-workspace monorepo with `apps/web`, `apps/api`, `apps/worker` and `packages/shared` (Zod schemas and generated API types).

### Backend modules and the tables they own

| Module | Owns (tables) | Key responsibilities | Requirement refs |
|---|---|---|---|
| `AuthModule` | `users`, `sessions`, `refresh_tokens`, `verification_tokens`, `password_reset_tokens`, `mfa_secrets`, `mfa_recovery_codes` | Registration, verification, sign-in, MFA challenge/enrolment, password reset, session listing and revocation, lockout | FR-001–FR-020, FR-100 |
| `TenancyModule` | `businesses`, `branches`, `business_settings`, `subscriptions`, `user_branch_assignments` | Business registration, profile, currency, branch CRUD, active business/branch context, soft delete | FR-021–FR-044 |
| `RbacModule` | `roles`, `permissions`, `role_permissions`, `user_roles`, `invitations` | Role catalogue, permission catalogue, invitations, role replacement, deactivation | FR-045–FR-060 |
| `CatalogueModule` | `products`, `product_variants`, `categories`, `brands`, `product_images` | Product/variant/category/brand CRUD, SKU and barcode uniqueness, search, price-change audit | FR-061–FR-080 |
| `InventoryModule` | `inventory_balances`, `stock_movements`, `stock_batches`, `stock_transfers`, `stock_transfer_lines`, `stock_counts`, `stock_count_lines`, `stock_adjustments` | Balance projection, movement ledger, batches and expiry, adjustments, transfers, counts, low-stock detection | FR-101–FR-132 |
| `PurchasingModule` | `suppliers`, `purchase_orders`, `purchase_order_lines`, `goods_receipts`, `goods_receipt_items` | Supplier CRUD, PO lifecycle, goods receiving, over-receipt confirmation, closure | FR-133–FR-154 |
| `SalesModule` | `sales`, `sale_items`, `receipts`, `refunds`, `refund_lines`, `cash_sessions`, `day_closures` | POS search, cart pricing, sale commit, receipts, refunds, sale history, cash sessions, day closure | FR-155–FR-178, FR-193, FR-204–FR-206 |
| `PaymentsModule` | `payments`, `payment_events`, `payment_adjustments` | Mobile money initiation, callback verification, payment state machine, mismatch list, manual corrections | FR-179–FR-192, FR-194 |
| `ReportingModule` | `report_exports` (read-only projections over other modules' tables) | Sales, stock, purchasing and low-stock reports; reconciliation assertions | FR-195–FR-203 |
| `NotificationsModule` | `notifications`, `notification_preferences` | Notification creation, unread count, mark-as-read, per-event/per-channel preferences | FR-084–FR-090 |
| `AuditModule` | `audit_logs` | Append-only audit writes, search and filtering, branch scoping | FR-091–FR-100 |
| `ImportsModule` | `import_jobs`, `import_rows` | CSV/XLSX validation, row-by-row application, error report retention | FR-078, FR-207–FR-209 |
| `AttachmentsModule` | `attachments` | Attachment metadata, MIME/size allowlist, tenant-prefixed keys, signed-URL issuance, download audit | FR-075–FR-077, FR-210–FR-212 |
| `JobsModule` | `jobs` | Job enqueue, status, bounded retry, failure surfacing | FR-213–FR-216 |
| `HealthModule` | — | Liveness and readiness probes | NFR-003 |

**Not built in MVP (no module, no table, no endpoint):** marketplace listings/offers/orders, finance accounts/journal entries/expenses, AI orchestration and model providers, subscription billing, platform-operator UI, patient medical records.

### Frontend structure

| Route group | Screens | Primary roles |
|---|---|---|
| `(auth)` | `/login`, `/register`, `/verify`, `/mfa`, `/forgot-password`, `/reset-password`, `/accept-invitation` | All |
| `(app)/dashboard` | `/dashboard` — today's sales total, transaction count, top items, low-stock count, pending transfer approvals, pending PO items, open cash session (FR-081–FR-083) | All |
| `(app)/catalogue` | `/catalogue/products`, `/catalogue/products/[id]`, `/catalogue/categories`, `/catalogue/brands`, `/catalogue/import` | Business Admin |
| `(app)/inventory` | `/inventory/balances`, `/inventory/movements`, `/inventory/adjustments`, `/inventory/transfers`, `/inventory/transfers/[id]`, `/inventory/counts`, `/inventory/batches` | Inventory Clerk, Branch Manager, Business Admin |
| `(app)/purchasing` | `/purchasing/suppliers`, `/purchasing/purchase-orders`, `/purchasing/purchase-orders/[id]`, `/purchasing/goods-receipts/[id]` | Branch Manager, Business Admin |
| `(app)/pos` | `/pos` — scan/search, cart, payment, receipt (FR-155–FR-168) | Cashier, Branch Manager |
| `(app)/sales` | `/sales`, `/sales/[id]`, `/receipts/[id]` (print view + PDF) | Cashier, Branch Manager, Business Admin |
| `(app)/payments` | `/payments`, `/payments/mismatches` | Branch Manager, Business Admin |
| `(app)/reports` | `/reports/sales`, `/reports/stock`, `/reports/purchasing`, `/reports/low-stock` | Branch Manager, Business Admin |
| `(app)/day-closure` | `/day-closure` — cash count, discrepancy, closure (FR-204–FR-206) | Cashier, Branch Manager |
| `(app)/settings` | `/settings/business`, `/settings/branches`, `/settings/users`, `/settings/roles`, `/settings/notifications`, `/settings/sessions`, `/settings/imports` | Business Admin |
| `(app)/audit` | `/audit` — search by actor, action, target type, target id, date range, branch (FR-091–FR-099) | Business Admin, Branch Manager (branch-scoped) |

Navigation is role-aware and branch-aware: the shell renders only routes the current user's permissions allow, and every route re-checks server-side on data fetch (FR-054).

### Cross-cutting components

| Concern | Implementation | Requirement refs |
|---|---|---|
| Authentication | In-house JWT access token (15 min) + rotating refresh token (30 days); TOTP MFA required for Business Admin and Branch Manager, optional otherwise | FR-009–FR-012, FR-015, FR-059 |
| Authorization | `AuthGuard` → `TenantGuard` → `BranchScopeGuard` → `PermissionGuard`, evaluated in that order, default deny | FR-028, FR-033, FR-041, FR-042, FR-054 |
| Validation | Zod schemas in `packages/shared`, reused by React Hook Form on the client and by a NestJS `ZodValidationPipe` on the server | FR-002, FR-068 |
| Error handling | Domain exceptions carry a stable code; a global exception filter maps them to the standard error envelope | NFR-011 |
| Audit | `AuditService.record({ actorId, tenantId, branchId, action, targetType, targetId, context })` called inside the same transaction as the state change | FR-092, FR-095, FR-097 |
| Jobs | `JobsService.enqueue(type, payload, { tenantId, actorId, idempotencyKey })`; worker resolves the same module services | FR-090, FR-213–FR-216 |
| Money | Integer minor units + explicit currency on every monetary column; no floating point anywhere | FR-068 |
| Time | UTC timestamps in all API responses; business date derived from the tenant timezone for day closure and reports | NFR-012, FR-204 |

---

## Data Flow

### Data architecture

| Aspect | Decision |
|---|---|
| Primary store | PostgreSQL, single primary, single source of truth for business, stock, financial and audit data |
| Access layer | Prisma ORM; raw SQL only for reporting aggregates and the balance-reconciliation assertion (FR-199) |
| Tenant scoping | Every business-owned table has `tenant_id NOT NULL`; every repository method requires `tenantId`; cross-tenant reads are impossible by construction (FR-028) |
| Branch scoping | Branch-owned tables carry `branch_id`; `BranchScopeGuard` injects the allowed branch set into the query filter for Cashier and Inventory Clerk (FR-041, FR-042) |
| Stock truth | `stock_movements` is append-only and authoritative; `inventory_balances` is updated in the same transaction and asserted equal to the movement sum by a reconciliation job and by the stock report (FR-102, FR-199) |
| Money truth | `sales`, `sale_items`, `payments`, `refunds`, `purchase_orders`, `goods_receipts` store integer minor units; totals are recomputed server-side on every read of a draft (FR-138, FR-159) |
| Deletes | Business records soft-delete via `deleted_at`; tokens (`verification_tokens`, `password_reset_tokens`, `refresh_tokens`, `invitations`) hard-delete on use or expiry (FR-008, FR-031) |
| Cache | Redis caches the permission catalogue and business settings with a 60-second TTL; cache miss falls through to PostgreSQL; no money or stock value is ever cached |
| Files | Bytes in object storage under `tenant/{tenantId}/{entityType}/{entityId}/{uuid}.{ext}`; metadata in `attachments` / `product_images`; reads via short-lived signed URLs (FR-077, FR-211, FR-212) |

### Flow 1 — Sign-in with MFA (FR-015, FR-009, FR-018)

1. Browser → `POST /v1/auth/login` with `{ email, password }`.
2. `AuthModule` verifies the Argon2id hash; on failure increments the lockout counter in Redis (10 failures / 15 minutes → 15-minute lock, FR-018).
3. If the user's role requires MFA, the response is `202 { mfaRequired: true, challengeId }`; no access token is issued.
4. Browser → `POST /v1/auth/mfa/challenge` with `{ challengeId, code }`; a recovery code is accepted once and audited (FR-017).
5. On success the API issues an access token and a rotating refresh token, writes a `sessions` row (device, IP, last-used) and an audit entry (FR-016, FR-100).
6. Every subsequent request: `AuthGuard` verifies the token → `TenantGuard` loads `user_roles` for the active business → `BranchScopeGuard` resolves branch scope → `PermissionGuard` checks the required permission.

### Flow 2 — POS sale commit (FR-155–FR-168)

1. Browser → `GET /v1/products/search?q=&branchId=` scoped to the selling branch; barcode scan resolves to exactly one variant or returns a not-found result without blocking the POS (FR-074, FR-155, FR-156).
2. Cart is client state only; each change calls `POST /v1/sales/quote` which recomputes subtotal, tax and total server-side and returns display values plus the resolved batch allocation (FR-159, FR-160, FR-165).
3. Out-of-stock items render as visible but not committable; expired batches are never presented as sellable (FR-157, FR-158).
4. Browser → `POST /v1/sales` with `Idempotency-Key` header, cart lines, payment method(s) and discount inputs.
5. `SalesModule.commit()` opens one transaction:
   - re-validates stock at the selling branch and rejects with `409 STOCK_UNAVAILABLE` if insufficient (FR-163);
   - allocates batches first-expiry-first-out within non-expired batches (FR-165);
   - inserts `sales` and `sale_items`;
   - inserts negative `stock_movements` rows and updates `inventory_balances`;
   - inserts the `payments` row(s) — cash moves straight to `SUCCEEDED` with server-computed change and is attributed to the open cash session (FR-183, FR-184, FR-193); mobile money starts `PENDING` (FR-180);
   - inserts the `receipts` row with a tenant-unique number (FR-166);
   - writes audit entries for sale completion and any discount above the configured threshold (FR-178).
6. A repeated `Idempotency-Key` returns the original sale and creates no second sale or movement (FR-164).
7. Response `201 { saleId, receiptNumber, status, payment }`; the receipt view and PDF render from stored sale data only, and re-printing creates nothing (FR-167, FR-168).

### Flow 3 — Mobile money payment (FR-179–FR-189)

1. `POST /v1/sales` (or `POST /v1/payments`) creates a `payments` row in `PENDING` with provider `mtn_momo` or `airtel_money`, amount, currency, payer phone and sale reference (FR-179, FR-180).
2. `PaymentsModule` calls the provider adapter, which calls the provider's collection API and stores the provider reference on the payment.
3. The cashier screen polls `GET /v1/payments/{id}` every 3 seconds; the sale is never marked paid from the client (FR-182).
4. Provider → `POST /v1/webhooks/payments/mtn-momo` or `/v1/webhooks/payments/airtel-money`. The adapter verifies the signature/reference, extracts the provider event id, and inserts `payment_events` with a unique constraint on `(provider, provider_event_id)`; a repeated event is acknowledged and ignored (FR-185).
5. In one transaction the payment moves to `SUCCEEDED` or `FAILED`, the linked sale is marked paid, and an audit entry is written (FR-181, FR-194).
6. A success arriving after refund or sale cancellation sets the payment to `ORPHANED` without altering the sale (FR-186).
7. A job (`payment.expire`) runs every minute and moves payments still `PENDING` after 15 minutes to `EXPIRED` (FR-187).
8. A job (`payment.reconcile`) builds the mismatch list of payments without a completed sale and sales without a successful payment; manual corrections create an audited `payment_adjustments` row and never edit the payment (FR-191, FR-192).

### Flow 4 — Goods receiving (FR-145–FR-151)

1. `POST /v1/purchase-orders` creates a `DRAFT` with server-computed totals (FR-137, FR-138); `POST /v1/purchase-orders/{id}/submit` requires a supplier and at least one line with quantity > 0 and moves `DRAFT → SUBMITTED` (FR-140).
2. `POST /v1/purchase-orders/{id}/confirm` requires `po.confirm` and moves `SUBMITTED → CONFIRMED`, recording actor and timestamp and notifying the requesting branch (FR-142, FR-143).
3. `POST /v1/goods-receipts` is accepted only against a `CONFIRMED` or `PARTIALLY_RECEIVED` PO (FR-145); lines carry received quantity, unit cost, batch number and expiry (FR-146).
4. One transaction: insert `goods_receipts` + `goods_receipt_items`; create or match `stock_batches`; insert positive `stock_movements`; update `inventory_balances`; increment received quantities on `purchase_order_lines`; recompute PO state to `PARTIALLY_RECEIVED` or `RECEIVED` (FR-147, FR-151).
5. A receipt exceeding the ordered quantity requires explicit confirmation and is flagged (FR-148); a line not on the PO is rejected (FR-149).
6. `POST /v1/purchase-orders/{id}/close` is allowed from `RECEIVED`, or from `PARTIALLY_RECEIVED` with a shortfall reason; a closed PO is immutable (FR-152, FR-153).

### Flow 5 — Multi-branch stock transfer (FR-116–FR-125)

| Step | Endpoint | State change | Stock effect |
|---|---|---|---|
| Request | `POST /v1/transfers` | — → `REQUESTED` | None; no movement is written at request time (FR-117) |
| Approve / reject | `POST /v1/transfers/{id}/approve` \| `/reject` | `REQUESTED → APPROVED` \| `REJECTED` (reason required on reject) | None (FR-118, FR-119) |
| Dispatch | `POST /v1/transfers/{id}/dispatch` | `APPROVED → DISPATCHED` | Negative movements at the origin branch inside a stock-checked transaction; insufficient origin stock rejects the whole dispatch with `409` (FR-120, FR-121) |
| Receive | `POST /v1/transfers/{id}/receive` | `DISPATCHED → RECEIVED` | Positive movements at the destination branch; per-line received quantity defaults to dispatched; a shortfall requires a note and is stored as the transfer discrepancy (FR-122, FR-123) |
| Close | `POST /v1/transfers/{id}/close` | `RECEIVED → CLOSED` | None; requires discrepancy acknowledgement; the transfer becomes immutable (FR-124, FR-125) |

Source and destination branch are retained for the whole life of the transfer (FR-125). Each transition writes an audit entry and enqueues a notification (FR-084).

### Flow 6 — Day closure (FR-204–FR-206)

1. `GET /v1/day-closures/preview?branchId=&businessDate=` returns expected cash from `payments` attributed to the branch's cash sessions.
2. `POST /v1/day-closures` snapshots expected cash, counted cash, discrepancy and reason; a non-zero discrepancy requires a reason; a second closure for the same branch and business date returns `409 DAY_ALREADY_CLOSED` (FR-205).
3. The closure is immutable and audited; later corrections are new audited adjustment records (FR-206).

### Flow 7 — Background job (FR-213–FR-216)

1. A module calls `JobsService.enqueue(type, payload, { tenantId, actorId, idempotencyKey })`; a `jobs` row is written with status `queued`.
2. The worker picks the job from the BullMQ queue, sets status `running`, and executes the handler with the tenant and actor context attached.
3. On success the job is `succeeded`; on failure it retries with exponential backoff up to `JOB_MAX_ATTEMPTS` (default 5), then becomes `failed` with error detail surfaced in the UI (FR-216).
4. `GET /v1/jobs/{id}` returns `queued | running | succeeded | failed` with error detail (FR-214); export jobs produce a file downloadable through an authenticated short-lived link (FR-215).
5. Job types in MVP: `notification.dispatch`, `export.generate`, `payment.expire`, `payment.reconcile`, `import.process`, `lowstock.evaluate`, `stock.reconcile`.

### Transaction boundaries

| Operation | Single transaction covers | Requirement refs |
|---|---|---|
| Business registration | `businesses` + owner `user_roles` + default branch + `business_settings` | FR-021 |
| Sale commit | `sales`, `sale_items`, `stock_movements`, `inventory_balances`, `payments`, `receipts`, audit | FR-162 |
| Refund | `refunds`, `refund_lines`, reversing `stock_movements`, `inventory_balances`, sale state, audit | FR-169–FR-172 |
| Goods receipt | `goods_receipts`, `goods_receipt_items`, `stock_batches`, `stock_movements`, `inventory_balances`, PO line quantities, PO state, audit | FR-147 |
| Transfer dispatch / receive | `stock_transfers` state, `stock_movements`, `inventory_balances`, audit | FR-120, FR-122 |
| Stock adjustment | one `stock_movements` row + `inventory_balances` + one audit entry | FR-111 |
| Payment callback | `payment_events`, `payments` state, sale paid flag, audit | FR-181, FR-185 |
| Day closure | `day_closures` + audit | FR-204 |

### Error propagation

1. Domain services throw typed exceptions (`InsufficientStockError`, `InvalidStateTransitionError`, `TenantScopeError`, `PermissionDeniedError`, `IdempotencyConflictError`).
2. A global exception filter maps each to an HTTP status and a stable machine-readable code, and returns the envelope `{ error: { code, message, details, requestId } }` (NFR-011).
3. Validation failures return `422` with field-level `details` derived from the shared Zod schema.
4. Expected domain failures (insufficient stock, duplicate idempotency key, invalid transition, closed day) are logged at `warn` with the `requestId` and are not sent to error monitoring.
5. Unexpected failures are logged at `error` with the `requestId` and forwarded to error monitoring; the response contains no stack trace and no secret (NFR-007, NFR-011).
6. A failed job never leaves a partially applied state: the handler's transaction rolls back and the job is retried or marked `failed` (FR-216).

---

## Integrations

| Integration | Direction | Protocol / mechanism | Authentication | Failure behaviour | Requirement refs |
|---|---|---|---|---|---|
| MTN MoMo | Outbound initiate + inbound callback | REST collection request; webhook `POST /v1/webhooks/payments/mtn-momo` | Provider subscription key + API user/key; callback signature verified | Initiation failure → payment `FAILED`; no callback within 15 min → `EXPIRED` by job; sale remains unpaid and the cashier can retry or switch method | FR-179–FR-182, FR-185, FR-187 |
| Airtel Money | Outbound initiate + inbound callback | REST collection request; webhook `POST /v1/webhooks/payments/airtel-money` | Provider client id/secret; callback signature verified | Same as MTN MoMo | FR-179–FR-182, FR-185, FR-187 |
| WhatsApp notifications | Outbound | Provider HTTP API through `WhatsAppAdapter` | Provider token; channel gated by `WHATSAPP_ENABLED` | Delivery failure marks the notification `failed` and retries as a job; in-app notification is always written first, so no notification is lost (FR-088, FR-089) | FR-089, FR-090 |
| Phone verification / SMS | Outbound | Provider HTTP API through `SmsAdapter` | Provider API key | Verification code send failure surfaces an actionable error and allows resend; the account stays `PENDING_VERIFICATION` | FR-005, FR-006 |
| Email | Out of scope in MVP | — | — | The email channel is deferred; the verification code is sent by phone only, and no email provider is integrated | FR-005 |
| Object storage | Outbound | S3-compatible API; pre-signed PUT for upload, pre-signed GET for read | Access key/secret held server-side only | Upload failure creates no `attachments`/`product_images` metadata row; a failed read returns `404` and the UI shows a placeholder | FR-075–FR-077, FR-211, FR-212 |
| CSV/XLSX import | Internal | Multipart upload to `POST /v1/imports`, processed as a job | Authenticated user with import permission | Per-row validation errors are retained in `import_rows` and reported with row number, column, value and error; valid rows are applied, invalid rows are skipped (FR-207–FR-209) | FR-078, FR-207–FR-209 |
| Error monitoring | Outbound | SDK DSN | DSN env var | If unavailable, errors are still written to centralized logs; the request path is unaffected | NFR-007 |
| Centralized logging | Outbound | Structured JSON log stream | Platform-managed | Buffered locally on the process; never blocks a request | NFR-007 |
| AI model providers | Out of scope in MVP | — | — | Phase 5 is deferred: no AI endpoints, jobs or model providers are wired | — |
| Card processing / third-party checkout | Out of scope | — | — | No card processing, no card data storage, no third-party checkout provider | — |
| Maps | Out of scope | — | — | No maps capability is required by any MVP flow | — |
| Third-party identity provider | Out of scope | — | — | Authentication is built in-house; no external identity provider is used | FR-001–FR-020 |

**Integration rules:**

1. Every external call is made from a module service through an adapter interface; no provider SDK type leaks into domain code.
2. Every outbound call has a timeout (10 s) and a bounded retry (3 attempts, exponential backoff) for idempotent operations only.
3. Every inbound callback is verified before it is trusted, is stored with its provider event id, and is deduplicated on `(provider, provider_event_id)` (FR-185).
4. No integration can write to `sales`, `stock_movements`, `inventory_balances` or `receipts` directly; only module services can, inside a transaction.
5. Provider credentials live only in environment variables and are never returned by any endpoint or written to logs.

---

## Deployment View

### Environments

| Environment | Purpose | Data | Notes |
|---|---|---|---|
| Local | Development | Seeded local PostgreSQL + Redis | `pnpm dev` runs web, api and worker |
| Staging | Pre-release verification, backup-restore drill, E2E scenarios A–G | Anonymized seed data | Payment providers run against sandbox credentials; WhatsApp disabled |
| Production | Live tenants | Real tenant data | Payment providers run against live credentials; daily backups retained 14 days |

### Runtime topology

```text
                    ┌──────────────────────────────┐
  Browser / PWA ───▶│ Web (Next.js)  managed Node  │
                    └───────────────┬──────────────┘
                                    │ HTTPS  /v1/
                    ┌───────────────▼──────────────┐
                    │ API (NestJS)  managed Node   │
                    │ guards → modules → Prisma    │
                    └───┬────────┬─────────┬───────┘
                        │        │         │
        ┌───────────────▼──┐  ┌──▼──────┐  ┌▼─────────────────────┐
        │ PostgreSQL       │  │ Redis   │  │ Object storage       │
        │ (managed)        │  │ (queues │  │ (tenant-prefixed)    │
        └──────────────────┘  │ + cache)│  └──────────────────────┘
                              └──┬──────┘
                    ┌────────────▼─────────────────┐
                    │ Worker (BullMQ) managed Node │
                    └────────────┬─────────────────┘
                                 │
        MTN MoMo · Airtel Money · WhatsApp provider · SMS provider
        Error monitoring · Centralized logging
```

| Process | Instances (MVP) | Scaling unit | Stateless |
|---|---|---|---|
| Web (Next.js) | 1 | Horizontal | Yes |
| API (NestJS) | 1 | Horizontal | Yes — no in-memory session state; tokens are self-contained and refresh tokens live in PostgreSQL |
| Worker (BullMQ) | 1 | Horizontal | Yes — job claiming is atomic in Redis |
| PostgreSQL | 1 managed primary | Vertical, then read replica for reports | — |
| Redis | 1 managed instance | Vertical | — |

### Environment variables

| Variable | Used by | Purpose |
|---|---|---|
| `NODE_ENV` | all | `development` \| `staging` \| `production` |
| `PORT` | api, web | Listen port |
| `APP_BASE_URL` | api, web | Public web origin, used in links and CORS allowlist |
| `API_BASE_URL` | web | API origin for the browser client |
| `DATABASE_URL` | api, worker | PostgreSQL connection string (pooled) |
| `REDIS_URL` | api, worker | Redis connection string for queues, rate limits and cache |
| `JWT_ACCESS_SECRET` | api | Access-token signing key |
| `JWT_REFRESH_SECRET` | api | Refresh-token signing key |
| `ACCESS_TOKEN_TTL` | api | Default `15m` |
| `REFRESH_TOKEN_TTL` | api | Default `30d` |
| `MFA_ENCRYPTION_KEY` | api | Encrypts TOTP secrets at rest |
| `PASSWORD_HASH_MEMORY_COST` | api | Argon2id cost parameter |
| `LOCKOUT_MAX_ATTEMPTS` | api | Default `10` |
| `LOCKOUT_WINDOW_MINUTES` | api | Default `15` |
| `OBJECT_STORAGE_ENDPOINT` | api, worker | S3-compatible endpoint |
| `OBJECT_STORAGE_BUCKET` | api, worker | Bucket name |
| `OBJECT_STORAGE_ACCESS_KEY_ID` | api, worker | Access key |
| `OBJECT_STORAGE_SECRET_ACCESS_KEY` | api, worker | Secret key |
| `OBJECT_STORAGE_SIGNED_URL_TTL_SECONDS` | api | Default `300` |
| `MTN_MOMO_BASE_URL` | api | Provider base URL |
| `MTN_MOMO_SUBSCRIPTION_KEY` | api | Provider subscription key |
| `MTN_MOMO_API_USER` | api | Provider API user |
| `MTN_MOMO_API_KEY` | api | Provider API key |
| `MTN_MOMO_CALLBACK_SECRET` | api | Callback signature verification |
| `AIRTEL_MONEY_BASE_URL` | api | Provider base URL |
| `AIRTEL_MONEY_CLIENT_ID` | api | Provider client id |
| `AIRTEL_MONEY_CLIENT_SECRET` | api | Provider client secret |
| `AIRTEL_MONEY_CALLBACK_SECRET` | api | Callback signature verification |
| `PAYMENT_EXPIRY_MINUTES` | api, worker | Default `15` |
| `WHATSAPP_ENABLED` | api, worker | Default `false`; gates the WhatsApp channel |
| `WHATSAPP_PROVIDER_BASE_URL` | worker | Provider base URL |
| `WHATSAPP_PROVIDER_TOKEN` | worker | Provider token |
| `SMS_PROVIDER_BASE_URL` | api | Verification provider base URL |
| `SMS_PROVIDER_API_KEY` | api | Verification provider key |
| `ERROR_MONITORING_DSN` | api, worker, web | Error monitoring endpoint |
| `LOG_LEVEL` | all | `debug` \| `info` \| `warn` \| `error` |
| `JOB_MAX_ATTEMPTS` | worker | Default `5` |
| `JOB_BACKOFF_MS` | worker | Default `5000` |
| `BACKUP_RETENTION_DAYS` | platform | Default `14` |
| `DEFAULT_DISPLAY_CURRENCY` | api | Default `USD` |

### Build, migrate and run commands

| Command | Purpose |
|---|---|
| `pnpm install` | Install workspace dependencies |
| `pnpm prisma generate` | Generate the Prisma client |
| `pnpm prisma migrate deploy` | Apply migrations (run in CI before release, never in the request path) |
| `pnpm build` | Build web, api and worker |
| `pnpm start:api` | Start the API process |
| `pnpm start:worker` | Start the BullMQ worker process |
| `pnpm start:web` | Start the Next.js server |
| `pnpm lint` | Lint all packages |
| `pnpm test` | Unit tests (stock, pricing, tax, refund, PO, payment, permissions) |
| `pnpm test:integration` | Integration tests (sale+inventory, PO+receiving, transfers, supplier lifecycle, payment reconciliation, import) |
| `pnpm test:e2e` | E2E scenarios A–G |
| `pnpm openapi:generate` | Regenerate the OpenAPI 3.1 document from DTOs |
| `pnpm db:seed` | Seed staging/local reference data |

### CI/CD pipeline

1. **Build** — install, lint, typecheck, build all packages inside a Docker image for reproducibility. Docker is used in CI only; the runtime path on managed Node hosting uses native buildpacks (no Docker in production).
2. **Test** — unit, integration and E2E suites run against ephemeral PostgreSQL and Redis services.
3. **Migrate** — `prisma migrate deploy` runs against staging, then production, before the new revision receives traffic.
4. **Deploy** — staging first, then production; the API and worker deploy together so job handlers and DTOs stay in step.
5. **Verify** — `GET /v1/health` (liveness) and `GET /v1/health/ready` (database, Redis and object-storage reachability) must pass before the revision is promoted.
6. **Release gates (NFR-015)** — financial correctness, stock reconciliation, duplicate prevention, E2E scenarios A–G, verified backup restore and import error handling must all pass; no unresolved P0/P1 security finding may remain (NFR-005).

### Backups, retention and recovery

| Item | Policy |
|---|---|
| Database backup | Daily automated, retained 14 days (NFR-004) |
| Restore drill | Performed in staging before launch and after any schema change to backup tooling |
| Soft-deleted records | Retained with `deleted_at`; excluded from all reads by default |
| Hard-deleted records | Verification, reset, invitation and refresh tokens only (FR-008) |
| Audit logs | Retained for the life of the tenant record; append-only, no delete endpoint (FR-093, FR-096) |
| Object storage | Versioning enabled on the bucket; deleted metadata does not delete bytes within the retention window |
| Compliance | Ugandan Data Protection and Privacy Act 2019 obligations apply to personal, financial and business registration data (NFR-014) |

### Scaling and failure handling

| Concern | MVP approach | Scale path |
|---|---|---|
| API throughput | Stateless API, connection pooling, pagination on every list endpoint, indexes on all filter and sort columns | Add API instances behind the platform load balancer |
| Read load | Single primary | Add a read replica for `ReportingModule` queries |
| Job load | One worker | Add worker instances; BullMQ claims jobs atomically |
| Cache | Short-TTL Redis cache for permission catalogue and business settings | Extend to reference data only; never cache money or stock |
| Payment provider outage | Payments stay `PENDING`, then `EXPIRED`; cash remains fully usable | Add provider failover selection at the POS |
| Database outage | API returns `503` with the standard error envelope; no partial writes because every transition is transactional | Managed failover |
| Object storage outage | Uploads fail without creating metadata; reads fall back to a placeholder | Multi-region bucket |
| Duplicate submissions | Idempotency keys on sale commit; unique provider event ids on callbacks | Unchanged |
| Availability target | 99.5% monthly, subject to the hosting tier (NFR-003) | Raise with multi-instance deployment and managed failover |