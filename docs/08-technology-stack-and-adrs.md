# Technology Stack and ADRs

**Product:** SokoOS — interconnected business operating platform for B2B commerce, inventory management and business operations
**Release covered:** MVP = Phase 1 Foundation (FR-001–FR-060, FR-081–FR-100) + Phase 2 Business operations (FR-101–FR-216)
**Document status:** Build-ready. Every choice below is either confirmed by the decision ledger or recorded as an explicit assumption. Requirement IDs (FR-001–FR-216, NFR-001–NFR-014) are reused from `docs/03-cleaned-srs.md` and are not renumbered.

## Stack

Next.js + React + TypeScript; NestJS + TypeScript; PostgreSQL + Prisma; REST `/v1/` + OpenAPI 3.1; Tailwind CSS; React Hook Form + Zod; TanStack Query; Redis + BullMQ; S3-compatible object storage; MTN MoMo + Airtel Money; in-house auth (email + password, phone/email verification, TOTP MFA); Render or Railway managed Node hosting with managed PostgreSQL; Docker in CI only; centralized logging + error monitoring + append-only audit logs; unit + integration + E2E testing.

### Stack at a glance

| Layer | Choice | Notes | Requirement refs |
|---|---|---|---|
| Language | TypeScript (strict) in web, api, worker and shared packages | One language across the stack; shared Zod schemas | NFR-002 |
| Frontend framework | Next.js (App Router) + React | Role-aware shell, POS, print views, installable PWA | NFR-008, NFR-009 |
| Styling / design system | Tailwind CSS with a simple neutral design system | No Figma; tokens defined in `tailwind.config.ts` | — |
| Forms & validation | React Hook Form + Zod | Zod schemas live in `packages/shared` and are reused by the API's `ZodValidationPipe` | FR-002, FR-068 |
| Server state | TanStack Query | Query keys always include `tenantId` and `branchId` | FR-083 |
| Backend framework | Node.js + NestJS | Modular monolith, DI, guards, pipes | NFR-002 |
| API style | REST under `/v1/`, OpenAPI 3.1 generated from DTOs | Breaking changes require a new prefix | NFR-013 |
| Database | Managed PostgreSQL 15+ (single primary) | Single source of truth for business, stock, financial and audit data | NFR-006 |
| ORM | Prisma | Assumption: raw SQL only for reporting aggregates and the balance-reconciliation assertion | FR-199 |
| Cache & queues | Managed Redis + BullMQ | Permission catalogue and business settings cached with 60 s TTL; no money or stock value cached | FR-213 |
| Object storage | S3-compatible object storage, tenant-prefixed keys | Pre-signed PUT for upload, short-lived signed GET for read | FR-075–FR-077, FR-211, FR-212 |
| Payments | MTN MoMo and Airtel Money behind a `PaymentProvider` interface | Collection request out, verified webhook in | FR-179–FR-189 |
| Notifications | In-app (always on) + WhatsApp (gated by `WHATSAPP_ENABLED`) | Email channel deferred; SMS used only for verification codes | FR-005, FR-088, FR-089 |
| Email | Out of scope in MVP | No email provider is integrated; the verification code is sent by phone | FR-005 |
| SMS / phone verification | The chosen provider, behind an `SmsAdapter` | Assumption: provider selected at implementation time | FR-005, FR-006 |
| AI model providers | Out of scope in MVP | Phase 5 deferred; no AI endpoints, jobs or providers are wired | — |
| Hosting | Render or Railway managed Node hosting + managed PostgreSQL | No Docker in the runtime path | NFR-003 |
| CI/CD | Docker images built in CI; staging and production environments | Assumption: the CI provider is GitHub Actions | NFR-004 |
| Observability | Centralized structured logging, error monitoring (the chosen provider, DSN-based SDK), append-only `audit_logs` | `requestId` correlates logs, errors and audit entries | NFR-007 |
| Testing | Unit + integration + E2E scenarios A–G, with release gates | Playwright for E2E | NFR-010 |
| Repository layout | pnpm-workspace monorepo: `apps/web`, `apps/api`, `apps/worker`, `packages/shared` | Assumption: single repo, shared types | NFR-002 |
| Accessibility | WCAG 2.1 Level AA on all authenticated screens | Keyboard-operable POS, focus management, contrast tokens | NFR-008 |
| i18n & currency | English only, i18n-ready, USD display currency | All user-facing strings externalized; UTC timestamps in API responses | NFR-012 |

### Explicitly not in the stack

| Not used | Reason |
|---|---|
| Microservices, service mesh, Kubernetes | Modular monolith is confirmed; microservices only when scaling requires (NFR-002) |
| GraphQL, tRPC, gRPC | REST with URL versioning is confirmed (NFR-013) |
| Third-party identity provider | Authentication is built in-house; no external identity provider is named in the ledger |
| Card processing or third-party checkout | Only mobile money (MTN MoMo, Airtel Money) and cash are in scope |
| Email provider | Email integration is deferred; the email verification channel is disabled |
| Native React Native app | Deferred; the MVP ships a responsive PWA |
| AI orchestration layer and model providers | Phase 5 deferred |
| PostgreSQL row-level security | Tenant scoping is enforced in the data-access layer instead |
| Docker in production runtime | Managed Node hosting is confirmed; Docker is a CI build artifact only |
| Marketplace, finance, subscription billing, platform-operator UI | Phase 3/4 and later; no module, table or endpoint in MVP |

### Environment variables

| Variable | Purpose | Default |
|---|---|---|
| `NODE_ENV` | Runtime mode | `development` |
| `APP_BASE_URL` | Absolute URL used in links and signed-URL redirects | — |
| `DATABASE_URL` | PostgreSQL connection string (pooled) | — |
| `REDIS_URL` | Redis connection string for BullMQ, rate limits and cache | — |
| `JWT_ACCESS_SECRET` | Signs access tokens | — |
| `JWT_REFRESH_SECRET` | Signs refresh tokens | — |
| `ACCESS_TOKEN_TTL` | Access token lifetime | `15m` |
| `REFRESH_TOKEN_TTL` | Refresh token lifetime | `30d` |
| `MFA_ISSUER` | TOTP issuer label shown in authenticator apps | `SokoOS` |
| `LOGIN_MAX_ATTEMPTS` | Failed sign-ins before lockout | `10` |
| `LOGIN_LOCKOUT_MINUTES` | Lockout duration | `15` |
| `VERIFICATION_CODE_TTL_MINUTES` | Verification code lifetime | `10` |
| `VERIFICATION_MAX_ATTEMPTS` | Attempts per verification code | `5` |
| `PASSWORD_RESET_TTL_MINUTES` | Password reset token lifetime | `30` |
| `INVITATION_TTL_DAYS` | Invitation token lifetime | `7` |
| `STORAGE_ENDPOINT` | S3-compatible endpoint | — |
| `STORAGE_BUCKET` | Bucket holding product images and attachments | — |
| `STORAGE_ACCESS_KEY_ID` / `STORAGE_SECRET_ACCESS_KEY` | Server-side storage credentials | — |
| `STORAGE_SIGNED_URL_TTL_SECONDS` | Signed URL lifetime for reads and uploads | `300` |
| `MAX_IMAGE_BYTES` | Product image size cap | `5242880` |
| `MTN_MOMO_SUBSCRIPTION_KEY`, `MTN_MOMO_API_USER`, `MTN_MOMO_API_KEY`, `MTN_MOMO_CALLBACK_SECRET` | MTN MoMo collection API and callback verification | — |
| `AIRTEL_MONEY_CLIENT_ID`, `AIRTEL_MONEY_CLIENT_SECRET`, `AIRTEL_MONEY_CALLBACK_SECRET` | Airtel Money collection API and callback verification | — |
| `PAYMENT_PENDING_TTL_MINUTES` | Age at which a pending payment is expired by job | `15` |
| `SMS_PROVIDER_API_KEY` | Phone verification code delivery | — |
| `WHATSAPP_ENABLED` | Enables the WhatsApp notification channel | `false` |
| `WHATSAPP_PROVIDER_TOKEN` | WhatsApp provider credential | — |
| `ERROR_MONITORING_DSN` | Error monitoring SDK DSN | — |
| `LOG_LEVEL` | Structured log level | `info` |
| `JOB_MAX_ATTEMPTS` | Bounded job retries before `failed` | `5` |
| `NEGATIVE_STOCK_DEFAULT` | Tenant default for allowing negative stock | `false` |
| `TZ` | Process timezone; business dates derive from tenant timezone | `UTC` |

### Assumptions recorded for this document

| # | Assumption | Basis |
|---|---|---|
| A1 | Backend is NestJS rather than a modular Next.js backend | The ledger permits either; NestJS gives explicit module boundaries and guards |
| A2 | ORM is Prisma | The ledger names PostgreSQL but not an ORM |
| A3 | Job runner is BullMQ on Redis | The ledger names Redis for caching and job queues |
| A4 | Repository is a pnpm-workspace monorepo | Smallest conventional layout for shared Zod schemas and generated API types |
| A5 | CI provider is GitHub Actions | The ledger confirms CI/CD with Docker but names no provider |
| A6 | Object storage vendor is an S3-compatible service chosen at implementation time | The ledger confirms object storage, not a vendor |
| A7 | SMS/phone-verification provider, WhatsApp provider and error-monitoring provider are "the chosen provider", selected at implementation time | The ledger names the capabilities, not the vendors |
| A8 | Passwords are hashed with Argon2id; MFA is TOTP with one-time recovery codes | Smallest conventional option consistent with FR-010 and FR-015 |
| A9 | Access tokens live 15 minutes; refresh tokens rotate and live 30 days | Smallest conventional option consistent with FR-015 and FR-016 |
| A10 | Tenant scoping is enforced in the data-access layer, not by PostgreSQL row-level security | Keeps isolation testable in application code (FR-028) |

## ADRs

### ADR-001 Frontend Framework

**Status**: Accepted

**Context**
SokoOS needs role-aware dashboards, a fast keyboard-driven POS, printable receipts, an audit and reporting surface, and installability as a PWA on Android Chrome (NFR-009). It must meet WCAG 2.1 AA (NFR-008) and be buildable by one developer with an AI coding agent.

**Decision**
Next.js (App Router) + React + TypeScript, styled with Tailwind CSS, with TanStack Query for server state and React Hook Form + Zod for forms.

**Alternatives Considered**

| Option | Why rejected |
|---|---|
| React SPA (Vite) | No routing/rendering conventions out of the box; PWA and print views must be assembled manually |
| Vue/Nuxt | Breaks TypeScript type sharing with the NestJS API and the shared Zod schemas |
| Remix | Smaller ecosystem and fewer AI-agent training examples for the same capability set |

**Consequences**
Gain: file-based routing, server/client rendering flexibility, one language across the stack, PWA support via a manifest and service worker.
Manage: server/client component boundaries must be explicit; the POS, cart and print view are client components that read stored sale data only (FR-167).
Manage: no business computation in the browser — prices, tax, totals, change and stock availability always come from the API (FR-159, FR-160, FR-183).

**Review Trigger**
If offline POS operation becomes a requirement, or if the REST API is replaced by server actions.

### ADR-002 Backend Framework

**Status**: Accepted

**Context**
The backend must host 16 domain modules with clear boundaries, enforce a four-stage guard chain, validate every DTO, and publish an OpenAPI document (NFR-013). The ledger permits NestJS or a modular Next.js backend.

**Decision**
Node.js + NestJS with TypeScript, REST controllers under `/v1/`, DTO validation through a `ZodValidationPipe`, and OpenAPI 3.1 generated from DTO metadata.

**Alternatives Considered**

| Option | Why rejected |
|---|---|
| Modular Next.js backend | Blurs the web/API boundary; guards, DI and module ownership are weaker; the worker would duplicate domain code |
| Express | No first-class modules, DI or guards; the guard chain would be hand-rolled |
| Fastify | Faster transport but no opinionated module/guard structure; NestJS can run on Fastify later if needed |
| Django / Laravel | Second language; loses shared TypeScript types with the frontend |

**Consequences**
Gain: dependency injection, declarative guards, module ownership of tables, generated OpenAPI, one language across web, api and worker.
Manage: more boilerplate than Express; module boundaries are enforced by convention and by boundary tests, not by the runtime.

**Review Trigger**
If p95 latency targets (NFR-001) cannot be met on the default HTTP adapter, switch the adapter rather than the framework.

### ADR-003 Database

**Status**: Accepted

**Context**
Every stock, money and state transition must be atomic (NFR-006); SKU and barcode uniqueness must hold per tenant (FR-072, FR-073); the stock ledger is append-only and must reconcile to a derived balance (FR-102, FR-199); the domain is strongly relational.

**Decision**
Managed PostgreSQL 15+ as the single primary and single source of truth for business, stock, financial and audit data.

**Alternatives Considered**

| Option | Why rejected |
|---|---|
| MySQL | Weaker JSON, window-function and partial-index ergonomics for reporting and reconciliation queries |
| MongoDB | No multi-statement transactions across the sale/stock/payment boundary; relational reporting is awkward |
| DynamoDB | No ad-hoc reporting or aggregate reconciliation; strong relational constraints are lost |

**Consequences**
Gain: ACID transactions per state transition, unique constraints per tenant, partial indexes for low-stock and expiry queries, mature backup tooling (NFR-004).
Manage: a single primary is a scaling ceiling; scale first with indexes, connection pooling and pagination (NFR-002), then read replicas for reporting.

**Review Trigger**
If write throughput or database size approaches the managed tier's limits, or if reporting load degrades transactional latency.

### ADR-004 ORM and Data Access

**Status**: Accepted

**Context**
The data-access layer must make tenant scoping impossible to forget (FR-028) and must support interactive transactions spanning several modules' tables (FR-147, FR-162).

**Decision**
Prisma as the ORM, with every repository method requiring an explicit `tenantId` argument. Raw SQL is permitted only for reporting aggregates and the balance-reconciliation assertion (FR-199).

**Alternatives Considered**

| Option | Why rejected |
|---|---|
| TypeORM | Weaker type inference and migration ergonomics; decorator-heavy entities duplicate the schema |
| Drizzle | Good types but a thinner migration and transaction story for a 40+ table schema |
| Raw SQL everywhere | No compile-time safety; slow to build with an AI agent; error-prone for money and stock writes |

**Consequences**
Gain: type-safe queries, generated migrations, interactive transactions for sale commit, goods receipt, transfer dispatch/receive and refunds.
Manage: complex reporting queries fall back to raw SQL and must be covered by tests; Prisma's query engine adds a connection-pooling consideration on managed hosting.

**Review Trigger**
If reporting queries dominate database load, or if Prisma cannot express a required constraint and a migration must be hand-written.

### ADR-005 API Style

**Status**: Accepted

**Context**
The web app, the worker, payment webhooks and future integrations all consume the same surface. The ledger confirms REST with URL versioning.

**Decision**
REST with URL versioning under `/v1/`, an OpenAPI 3.1 document generated from DTOs, cursor or offset pagination on every list endpoint, and a single error envelope `{ error: { code, message, details, requestId } }` (NFR-011).

**Alternatives Considered**

| Option | Why rejected |
|---|---|
| GraphQL | Adds schema/resolver complexity and caching ambiguity for a CRUD-heavy domain; webhooks are still REST |
| tRPC | Couples client and server; blocks third-party and provider integrations |
| gRPC | Poor browser support; no benefit for a single first-party client |

**Consequences**
Gain: simple, cacheable, integration-friendly endpoints; webhooks are ordinary REST routes; the OpenAPI document drives client types.
Manage: pagination, filtering and sorting conventions must be consistent across modules; breaking changes require a `/v2/` prefix (NFR-013).

**Review Trigger**
If the web client needs many round trips per screen, add purpose-built aggregate endpoints rather than changing the style.

### ADR-006 Authentication

**Status**: Accepted

**Context**
The system needs registration, phone/email verification, password reset, session management, lockout and MFA (FR-001–FR-020, FR-100). The ledger names no identity provider, and the Ugandan Data Protection and Privacy Act 2019 applies to personal data.

**Decision**
First-party authentication. Argon2id password hashing; a JWT access token (15 minutes) plus a rotating refresh token (30 days); TOTP MFA with one-time recovery codes, required for Business Admin and Branch Manager and optional otherwise (FR-009, FR-059); verification codes delivered by phone, with the email channel disabled while email integration is deferred (FR-005); lockout after 10 failed attempts in 15 minutes (FR-018). No third-party identity provider is used.

**Alternatives Considered**

| Option | Why rejected |
|---|---|
| Third-party identity provider | Not named in the ledger; adds a production dependency and a data-residency question under the DPPA 2019 |
| Magic-link only | Unsuitable for shop attendants on shared devices and for B2B admin accounts requiring MFA |
| SSO/OAuth only | Most Ugandan SMEs have no identity provider to federate with |
| Long-lived non-rotating tokens | Fails the session-revocation requirement (FR-016, FR-056) |

**Consequences**
Gain: no external login dependency, full control of lockout, MFA policy per role and session revocation, and no personal data leaving the platform for identity purposes.
Manage: security-critical code is in-house and must clear the security review with no unresolved P0/P1 findings (NFR-005); MFA secrets and recovery codes are encrypted at rest and recovery codes are shown exactly once (FR-010); tokens are hard-deleted on use or expiry (FR-008).

**Review Trigger**
If the security review finds unresolved P0/P1 issues in the auth module, or if enterprise SSO becomes a sales requirement.

### ADR-007 Authorization Model

**Status**: Accepted

**Context**
Four system roles per tenant must be enforced server-side with branch-level restrictions, defaulting to deny (FR-051, FR-054). Cashiers and Inventory Clerks must not read another branch's balances, sales or transfers (FR-042).

**Decision**
Role-based access control with `roles`, `permissions`, `role_permissions` and `user_roles`, plus a guard chain evaluated in order: `AuthGuard` → `TenantGuard` → `BranchScopeGuard` → `PermissionGuard`. Every endpoint declares the permission it requires; absence of a declaration denies the request. `admin.*` permissions cannot be removed from the Business Admin role (FR-053).

**Alternatives Considered**

| Option | Why rejected |
|---|---|
| Attribute-based policy engine (OPA, Casbin) | Extra runtime dependency and policy language for four roles and a fixed permission catalogue |
| Ad-hoc per-endpoint checks | The exact failure mode the requirement set forbids; unauditable and untestable |
| PostgreSQL row-level security | Moves authorization into the database, where it is harder to test and to reason about per request |

**Consequences**
Gain: one testable permission matrix, branch scope applied uniformly, and a permission catalogue that can be exposed for role configuration (FR-060).
Manage: the permission catalogue must be versioned with the code; every new endpoint needs a permission declaration and a matrix test; role changes take effect on the user's next request (FR-049).

**Review Trigger**
If tenants need custom roles beyond the four system roles, or if permissions must vary by branch rather than by role.

### ADR-008 Architecture Style

**Status**: Accepted

**Context**
Sale commit alone spans sales, inventory, payments, receipts and audit tables in one transaction (FR-162). The MVP is built by one developer with an AI coding agent.

**Decision**
A modular monolith: one deployable API process plus one worker process, with 16 domain modules that own their tables and expose services. Modules never read another module's tables directly.

**Alternatives Considered**

| Option | Why rejected |
|---|---|
| Microservices | Distributed transactions across sale/stock/payment would be required immediately; operational cost is unjustifiable for one developer |
| Separate repositories per app | Loses shared Zod schemas and generated API types; slows the build |
| Serverless functions per endpoint | Cold starts threaten p95 targets (NFR-001); connection pooling to PostgreSQL becomes a problem |

**Consequences**
Gain: single-transaction state changes, one deployment, shared types, simple local development.
Manage: module boundaries are enforced by convention, lint rules and boundary tests; the worker imports module services rather than duplicating logic.

**Review Trigger**
If a single module's load profile diverges enough to justify independent scaling, or if team size grows beyond what one deployable supports.

### ADR-009 Multi-Tenancy Isolation

**Status**: Accepted

**Context**
Every business-owned record carries tenant ownership, isolation is enforced server-side, branch restrictions apply, and file storage is partitioned by tenant (FR-028, FR-033, FR-042).

**Decision**
Shared schema with `tenant_id NOT NULL` on every business-owned table. Every repository method requires a `tenantId`; the active business context is re-validated on every request (FR-032); object keys are prefixed `tenant/{tenantId}/…`.

**Alternatives Considered**

| Option | Why rejected |
|---|---|
| Schema per tenant | Migration fan-out across hundreds of schemas; connection pooling becomes unmanageable |
| Database per tenant | Highest isolation but the highest operational cost for an MVP with self-service onboarding (FR-024) |
| PostgreSQL row-level security | Isolation becomes invisible in application code and harder to test per endpoint |

**Consequences**
Gain: one migration path, simple cross-tenant platform reporting, and isolation that is testable by asserting that a cross-tenant read returns 403 or 404.
Manage: a missing `tenantId` scope is a P0 defect; a dedicated integration test suite asserts cross-tenant denial for every module; a context switch to a tenant where the user holds no role returns 403 (FR-033).

**Review Trigger**
If a tenant contractually requires physical data separation, or if tenant count makes shared-table indexes ineffective.

### ADR-010 Hosting

**Status**: Accepted

**Context**
The ledger confirms managed Node hosting (Render or Railway) with managed PostgreSQL, no Docker in the runtime path, daily backups retained 14 days, and 99.5% monthly availability (NFR-003, NFR-004).

**Decision**
Deploy the web app, API and worker to Render or Railway managed services with managed PostgreSQL and managed Redis. Docker is used only to build CI artifacts.

**Alternatives Considered**

| Option | Why rejected |
|---|---|
| AWS ECS/RDS | More control, materially more operational work for one developer |
| Single VPS | No managed backups, no managed failover; violates the backup requirement in practice |
| Kubernetes | Unjustified complexity for three processes |

**Consequences**
Gain: managed backups, managed TLS, simple environment promotion, no container orchestration to operate.
Manage: uptime and point-in-time recovery depend on the provider tier; the backup-restore drill must be executed in staging before launch (NFR-004); the worker must be a separate service so job load cannot starve HTTP traffic.

**Review Trigger**
If the provider cannot meet 99.5% availability, or if a data-residency requirement forces a specific region or provider.

### ADR-011 CI/CD and Release Gates

**Status**: Accepted

**Context**
The ledger confirms CI/CD with Docker, automated database backups, centralized logging, error monitoring, and production and staging environments. Release gates are defined on financials, stock reconciliation, duplicate prevention, E2E, backups and import errors.

**Decision**
A single pipeline: install → lint → typecheck → unit tests → integration tests against ephemeral PostgreSQL and Redis → build Docker image → run migrations on staging → deploy staging → run E2E scenarios A–G → manual approval → run migrations on production → deploy production. Migrations are forward-only and backward compatible with the previous release. Assumption: the CI provider is GitHub Actions.

**Alternatives Considered**

| Option | Why rejected |
|---|---|
| Manual deploys | No reproducible gate on financial or stock correctness |
| Deploy directly to production from a branch | No staging verification of migrations or E2E scenarios |
| Blue/green with dual databases | Unnecessary complexity at MVP scale; migrations are backward compatible instead |

**Consequences**
Gain: every release passes the same gates; migrations are rehearsed on staging; the backup-restore drill is a scheduled pipeline job.
Manage: CI runtime must stay short enough to run on every pull request; a failing gate blocks release by design; secrets live only in the CI provider's secret store.

**Review Trigger**
If CI duration exceeds a tolerable pull-request feedback loop, split the pipeline into fast and nightly stages rather than dropping gates.

### ADR-012 Background Jobs

**Status**: Accepted

**Context**
Notifications, exports, payment expiry, payment reconciliation, import processing, low-stock evaluation and stock reconciliation must run outside the request path (FR-090, FR-213), with status visible to users and bounded retries (FR-214, FR-216).

**Decision**
BullMQ on Redis, executed by a dedicated worker process. Jobs are enqueued through `JobsService.enqueue(type, payload, { tenantId, actorId, idempotencyKey })`, mirrored in a `jobs` table for status queries, and retried with exponential backoff up to `JOB_MAX_ATTEMPTS` (default 5). MVP job types: `notification.dispatch`, `export.generate`, `payment.expire`, `payment.reconcile`, `import.process`, `lowstock.evaluate`, `stock.reconcile`.

**Alternatives Considered**

| Option | Why rejected |
|---|---|
| Synchronous in-request execution | Notification and export latency would break p95 targets (NFR-001); payment expiry needs a scheduler |
| pg-boss | Keeps one datastore but the ledger already provides Redis for queues |
| Temporal | Operationally heavy for seven job types |
| Cloud queue service | Adds a provider dependency the ledger does not name |

**Consequences**
Gain: request paths stay fast, retries are bounded and observable, and the worker reuses module services so business rules are not duplicated.
Manage: jobs carry explicit tenant and actor context and never bypass guards; a failed job must leave no partially applied state — handlers run inside a transaction; the worker is a separate deployable that must be monitored.

**Review Trigger**
If job volume requires priority queues or dedicated workers per job type, or if Redis loss causes unacceptable job loss.

### ADR-013 File Storage

**Status**: Accepted

**Context**
Product images and attachments must be stored with tenant partitioning, restricted by MIME type and size, and readable only through authenticated short-lived links (FR-075–FR-077, FR-211, FR-212).

**Decision**
S3-compatible object storage. Bytes live under `tenant/{tenantId}/{entityType}/{entityId}/{uuid}.{ext}`; metadata lives in `product_images` and `attachments` in PostgreSQL. Uploads use a pre-signed PUT; reads use a short-lived signed GET (`STORAGE_SIGNED_URL_TTL_SECONDS`, default 300). MIME allowlist: PDF, JPEG, PNG, XLSX, CSV; product images capped at 5 MB.

**Alternatives Considered**

| Option | Why rejected |
|---|---|
| Local disk on the app server | Lost on redeploy; no tenant partitioning; breaks horizontal scaling |
| Bytes in PostgreSQL | Bloats backups and the primary database; poor streaming behaviour |
| Public bucket with unguessable keys | Violates the requirement that attachment access is authenticated and audited |

**Consequences**
Gain: cheap, durable, tenant-partitioned storage; no file bytes pass through the API process.
Manage: upload failure creates no metadata row, so the UI must retry; download events are audited (FR-212); signed URLs must never be logged; orphaned objects are cleaned by a scheduled job.

**Review Trigger**
If storage egress cost dominates, or if a tenant requires storage in a specific jurisdiction.

### ADR-014 Client State and Validation

**Status**: Accepted

**Context**
The client must not hold authoritative business state, must not persist client-computed totals (FR-160), and must discard an unpaid cart on reload (FR-177). Validation rules must be identical on client and server.

**Decision**
TanStack Query for all server state; React Hook Form + Zod for forms; Zod schemas defined once in `packages/shared` and reused by the API's `ZodValidationPipe`. The POS cart is component-local state only; there is no server-side parked-sale entity (FR-176).

**Alternatives Considered**

| Option | Why rejected |
|---|---|
| Redux Toolkit for everything | Duplicates server state and invites client-side computation of totals |
| Zustand global store | Useful for UI preferences only; not needed for MVP cart scope |
| Server actions instead of REST | Conflicts with the confirmed REST API style (ADR-005) |
| Hand-written validation on both sides | Guaranteed drift between client and server rules |

**Consequences**
Gain: one validation source of truth, automatic refetch and cache invalidation, no duplicated server state.
Manage: query keys must include `tenantId` and `branchId` so a context switch cannot serve stale cross-branch data; mutations invalidate the affected keys; the cart is intentionally lost on reload.

**Review Trigger**
If offline POS becomes a requirement, introduce a local persistence layer with an explicit sync and conflict policy.

### ADR-015 Money and Time Representation

**Status**: Accepted

**Context**
Every monetary amount must be an integer in minor units with an explicit currency (FR-068); totals are recomputed server-side (FR-138, FR-159); timestamps are UTC in API responses and business dates derive from the tenant timezone (NFR-012, FR-204).

**Decision**
Store all money as `BIGINT` minor units plus a `currency` column; never use floating point. Store all timestamps as `timestamptz` in UTC. Derive the business date for day closure and reports from the tenant's configured timezone. Format for display only at the edge.

**Alternatives Considered**

| Option | Why rejected |
|---|---|
| `NUMERIC`/decimal columns | Correct but slower and easier to mix with floats in application code |
| Floating point | Rounding errors in totals, tax and change are unacceptable |
| Storing formatted strings | Unsortable, unaggregatable, and impossible to reconcile |
| Local timestamps | Ambiguous across daylight-saving and multi-branch reporting |

**Consequences**
Gain: exact arithmetic, deterministic reconciliation, and one currency per tenant (FR-027).
Manage: every DTO and UI component must convert minor units explicitly; tax and discount rounding rules are centralized in one pricing service and unit-tested (NFR-010).

**Review Trigger**
If a tenant requires multi-currency transactions rather than a single display currency.

### ADR-016 Testing Strategy

**Status**: Accepted

**Context**
The ledger requires unit tests for stock, pricing, tax, refund, purchase order, payment, forecasting and permission logic; integration tests for sale+inventory, PO+receiving, transfers, supplier lifecycle, payment reconciliation, import and AI authorization; E2E scenarios A–G; and release gates on financials, stock reconciliation, duplicate prevention, E2E, backups and import errors (NFR-010).

**Decision**
Tests are written alongside implementation. Unit tests cover pure domain logic with no database. Integration tests run against ephemeral PostgreSQL and Redis and assert transaction boundaries, idempotency and tenant isolation. E2E scenarios A–G run with Playwright against staging. Release gates block deployment on any failure.

**Alternatives Considered**

| Option | Why rejected |
|---|---|
| Manual QA only | Cannot gate financial or stock correctness at release |
| Lower coverage with E2E only | Slow feedback and poor failure localization |
| Contract tests between web and api | Unnecessary inside a monorepo with shared Zod schemas |

**Consequences**
Gain: regressions in stock, money and permissions are caught before release; the reconciliation assertion (FR-199) is exercised continuously.
Manage: CI must stay fast and reliable; test data factories are required; E2E depends on a seeded staging environment with sandbox payment credentials.

**Review Trigger**
If CI duration blocks the pull-request loop, split suites by runtime rather than removing coverage.

### ADR-017 Observability

**Status**: Accepted

**Context**
The system must provide centralized application logging, error monitoring and audit logs containing actor, action, target, timestamp and context, and must never log passwords, tokens or full payment credentials (NFR-007).

**Decision**
Structured JSON logs with a `requestId` on every request, forwarded to a centralized log stream; unexpected errors forwarded to an error-monitoring SDK via `ERROR_MONITORING_DSN`; append-only `audit_logs` in PostgreSQL for business-critical actions. Expected domain failures (insufficient stock, invalid transition, duplicate idempotency key, closed day) log at `warn` and are not sent to error monitoring.

**Alternatives Considered**

| Option | Why rejected |
|---|---|
| Log files on the host only | No correlation across web, api and worker; lost on redeploy |
| Full APM vendor | Cost and setup disproportionate for MVP; the ledger names logging and error monitoring only |
| Audit entries written from logs | Audit must be queryable, branch-scoped and append-only in the database (FR-091–FR-099) |

**Consequences**
Gain: one `requestId` traces a request across logs, errors and audit entries; production responses never contain stack traces or secrets (NFR-011).
Manage: a redaction list must be maintained for passwords, tokens, MFA secrets, recovery codes and payment credentials; the error-monitoring provider is "the chosen provider" and is optional at runtime — if unavailable, errors still reach centralized logs.

**Review Trigger**
If incident diagnosis requires distributed tracing, add it without changing the log schema.

### ADR-018 Payments Integration

**Status**: Accepted

**Context**
Mobile money via MTN MoMo and Airtel Money is the confirmed payment integration. Payments must be idempotent, callback-verified, and must never mark a sale paid from a client signal (FR-179–FR-189).

**Decision**
Two adapters, `MtnMomoAdapter` and `AirtelMoneyAdapter`, behind a `PaymentProvider` interface. Outbound collection requests carry amount, currency, payer phone and sale reference. Inbound callbacks arrive at `POST /v1/webhooks/payments/mtn-momo` and `POST /v1/webhooks/payments/airtel-money`, are signature-verified, and are deduplicated on a unique `(provider, provider_event_id)` constraint in `payment_events`. Payment states are `PENDING`, `SUCCEEDED`, `FAILED`, `EXPIRED`, `ORPHANED`. Cash payments move directly to `SUCCEEDED` with server-computed change (FR-183, FR-184).

**Alternatives Considered**

| Option | Why rejected |
|---|---|
| Card processing or a third-party checkout | Not in the ledger; adds PCI scope |
| Cash only | Excludes the dominant payment method for the target market |
| A payment aggregator | The ledger names the two providers directly |
| Trusting the client's payment result | Explicitly forbidden (FR-182) |

**Consequences**
Gain: one internal payment model regardless of provider; provider SDK types never leak into domain code.
Manage: two callback verifiers and two sets of credentials must be maintained; sandbox credentials are used in staging; a payment pending beyond 15 minutes is expired by job (FR-187); a success arriving after refund or cancellation becomes `ORPHANED` without altering the sale (FR-186); manual corrections create audited `payment_adjustments` rows and never edit the payment (FR-192).

**Review Trigger**
If a third provider is added, or if provider callback semantics change such that signature verification is insufficient.

### ADR-019 Notifications

**Status**: Accepted

**Context**
In-app notifications are required for transfer, purchase order, low-stock, refund and day-closure events; the in-app channel is always enabled; WhatsApp is selectable only when the provider is enabled; email integration is deferred (FR-084–FR-090).

**Decision**
A `NotificationChannel` interface with `InAppAdapter` (always on), `WhatsAppAdapter` (gated by `WHATSAPP_ENABLED`, default `false`) and `SmsAdapter` (used only for verification codes). Delivery runs as the `notification.dispatch` job. The in-app notification row is always written first, so a channel failure never loses a notification. Users configure preferences per event type and per channel.

**Alternatives Considered**

| Option | Why rejected |
|---|---|
| WhatsApp only | The provider is not guaranteed; the in-app channel must always work |
| Email channel in MVP | Email integration is deferred by the ledger |
| Synchronous delivery in the request | Would break p95 targets and couple business transactions to provider availability |

**Consequences**
Gain: no notification is lost when an external channel fails; channel enablement is a configuration change, not a code change.
Manage: WhatsApp delivery failures mark the notification `failed` and retry as a job; the WhatsApp and SMS providers are "the chosen provider" and are selected at implementation time.

**Review Trigger**
If the WhatsApp provider is confirmed and enabled in production, or if email integration is un-deferred.

### ADR-020 UI Platform

**Status**: Accepted

**Context**
The application must be usable on mobile and desktop, installable as a PWA, and meet WCAG 2.1 AA; a native React Native app is deferred (NFR-008, NFR-009).

**Decision**
A single responsive Next.js web application with PWA support (manifest, service worker, installable on Android Chrome). No native app in MVP. Receipt printing uses a dedicated print stylesheet and a PDF generated from stored sale data (FR-167).

**Alternatives Considered**

| Option | Why rejected |
|---|---|
| Native React Native app | Deferred by the ledger; doubles the surface for one developer |
| Desktop-only web app | Shop attendants and branch staff work on phones and tablets |
| Separate mobile web app | Duplicates screens and diverges from the single design system |

**Consequences**
Gain: one codebase, one design system, installable on the devices the personas actually use.
Manage: POS controls must be touch-sized and keyboard-operable; layouts must be tested at phone, tablet and desktop widths; offline behaviour is limited to shell caching, not offline transactions.

**Review Trigger**
If offline transaction capture becomes a requirement, or if the native app is un-deferred.

### ADR-021 Internationalization and Currency

**Status**: Accepted

**Context**
The MVP is English-only and i18n-ready, with all user-facing strings externalized, UTC timestamps in API responses and USD as the display currency (NFR-012). One currency is stored per tenant (FR-027).

**Decision**
English-only UI with all strings externalized into a message catalogue keyed by identifier; no hardcoded currency symbols or date formats; formatting performed by a single shared formatter that reads the tenant currency and timezone.

**Alternatives Considered**

| Option | Why rejected |
|---|---|
| Hardcoded English strings | Retrofitting i18n later touches every component |
| Multi-language in MVP | Not required; adds translation workflow overhead |
| Per-user currency | The ledger stores one currency per tenant |

**Consequences**
Gain: adding a language later is a catalogue addition, not a refactor; currency and date rendering are consistent everywhere.
Manage: a lint rule rejects literal user-facing strings in components; the message catalogue is part of the shared package.

**Review Trigger**
If a launch market requires a second language or a currency other than USD.

### ADR-022 AI Capabilities Deferral

**Status**: Accepted

**Context**
Phase 5 AI capabilities are deferred, and the business rules state that AI never alters financial records and never executes writes without confirmation.

**Decision**
No AI endpoints, jobs, model providers or orchestration layer are built in the MVP. The `packages/shared` and module boundaries are kept free of AI-specific coupling so a later orchestration layer can call read-only module services.

**Alternatives Considered**

| Option | Why rejected |
|---|---|
| Ship an AI assistant in MVP | Deferred by the ledger; would require the confirmation and audit machinery before it is needed |
| Wire model providers behind a flag | Adds credentials, cost and a security surface with no MVP consumer |
| Let AI write directly to domain tables | Violates the business rules on financial records and unconfirmed writes |

**Consequences**
Gain: no AI-related security surface, no provider credentials, no cost, and no risk of AI-driven writes to stock or financial records.
Manage: when AI is introduced, it must read through module services, must never write without explicit user confirmation, and every AI-initiated action must be audited like any other critical action.

**Review Trigger**
If Phase 5 is scheduled, or if a customer requires AI-assisted forecasting before then.

### ADR-023 Audit Logging

**Status**: Accepted

**Context**
Critical actions covering stock, money, permissions, branches, catalogue price and settings must be audited with actor, action, target, timestamp and context; audit entries are append-only with no edit or delete API; Branch Managers see only branch-scoped entries; entries are retained for the life of the tenant (FR-091–FR-099).

**Decision**
An append-only `audit_logs` table written by `AuditService.record({ actorId, tenantId, branchId, action, targetType, targetId, context })` inside the same database transaction as the state change it records. No endpoint updates or deletes audit rows. Search supports actor, action, target type, target id, date range and branch, with pagination.

**Alternatives Considered**

| Option | Why rejected |
|---|---|
| Audit written from application logs | Not queryable, not branch-scoped, not transactional with the change |
| Database triggers | Invisible to the application, hard to test, and cannot capture actor context reliably |
| Asynchronous audit via a queue | An audit entry could be lost while the state change commits |
| Mutable audit rows | Violates the append-only requirement |

**Consequences**
Gain: an audit entry exists if and only if the state change committed; branch scoping and search are ordinary queries.
Manage: audit writes add rows inside hot transactions, so the table needs indexes on `(tenant_id, created_at)`, `(tenant_id, actor_id)`, `(tenant_id, target_type, target_id)` and `(tenant_id, branch_id)`; `requestId`, IP address and user agent are stored as context (FR-097); retention follows the tenant record (FR-096).

**Review Trigger**
If audit volume degrades transactional latency, partition the table by month rather than relaxing the transactional guarantee.