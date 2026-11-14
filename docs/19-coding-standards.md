# Coding Standards

**Product:** SokoOS — interconnected business operating platform for B2B commerce, inventory management and business operations
**Release covered:** MVP = Phase 1 Foundation (FR-001–FR-060, FR-081–FR-100) + Phase 2 Business operations (FR-101–FR-216)
**Document status:** Build-ready. Requirement IDs (FR-001–FR-216, NFR-001–NFR-014) and business-rule IDs (BR-001–BR-022) are reused from `docs/03-cleaned-srs.md` and `docs/08-technology-stack-and-adrs.md` and are not renumbered. Where a rule is not decided by the decision ledger it is marked **Assumption**.

## Standards

### 1. General principles

| # | Rule | Rationale / ref |
|---|---|---|
| G1 | Small, reviewable changes. One coherent concern per pull request. | Reviewability |
| G2 | Simple, maintainable code over clever code. No abstraction without a second caller. | One developer + AI agent builds the MVP |
| G3 | No unrelated rewrites, reformatting or dependency bumps inside a feature pull request. | Reviewability |
| G4 | Business rules live in domain services, never in controllers, React components, jobs or SQL triggers. | BR-001–BR-022 |
| G5 | Every stock, money and state transition runs inside one database transaction. | NFR-006 |
| G6 | Server is the only authority for prices, tax, totals, change, stock availability and permissions. | FR-159, FR-160, FR-183 |
| G7 | Default deny: an endpoint with no declared permission is unreachable. | FR-054 |
| G8 | Every business-owned read and write is scoped by `tenantId` in the data-access layer. | FR-028, ADR-009 |
| G9 | Deferred scope (Phase 3 supplier ecosystem, Phase 4 finance, Phase 5 AI, Phase 6 expansion, native React Native app, patient medical records) is never implemented, stubbed or scaffolded. | Ledger `scope.deferred` |
| G10 | No secrets, credentials, tokens or connection strings in source, tests, fixtures or logs. | NFR-007 |

### 2. Repository layout and package boundaries

pnpm-workspace monorepo (Assumption A4 in `docs/08-technology-stack-and-adrs.md`).

| Path | Contents | May import from |
|---|---|---|
| `apps/web` | Next.js App Router UI, PWA manifest, print views | `packages/shared` |
| `apps/api` | NestJS HTTP API, guards, controllers, domain services, Prisma client | `packages/shared` |
| `apps/worker` | BullMQ processors; imports API module services, never duplicates them | `packages/shared`, `apps/api` domain services |
| `packages/shared` | Zod schemas, permission constants, error codes, money/quantity helpers, generated API types | nothing internal |

| Boundary rule | Enforcement |
|---|---|
| A module never reads another module's tables directly; it calls that module's exported service. | ADR-008; ESLint `no-restricted-imports` on `apps/api/src/modules/*/repository` |
| `apps/web` never imports from `apps/api` or `apps/worker`. | ESLint boundary rule |
| `packages/shared` never imports Prisma, NestJS or React. | ESLint boundary rule |
| Cross-module transactions are composed in the owning module's service, not in a controller. | FR-147, FR-162 |

### 3. TypeScript conventions

| Rule | Detail |
|---|---|
| Strictness | `"strict": true`, `noUncheckedIndexedAccess`, `noImplicitOverride`, `exactOptionalPropertyTypes` in every `tsconfig.json`. |
| `any` | Forbidden. Use `unknown` plus a Zod parse at the boundary. ESLint `@typescript-eslint/no-explicit-any: error`. |
| Non-null assertion | Forbidden (`!`). Narrow explicitly. |
| Type vs interface | `type` for unions, DTO shapes and function signatures; `interface` only for declaration merging. |
| Exports | Named exports only. No default exports except Next.js route files that require them. |
| Enums | Use `as const` object maps plus a derived union type, not TypeScript `enum`. |
| Imports | Absolute imports via path aliases (`@api/*`, `@shared/*`, `@web/*`); no `../../..` chains beyond one level. |
| Async | `async`/`await` only; no raw `.then()` chains; no floating promises (`@typescript-eslint/no-floating-promises: error`). |
| Immutability | `const` by default; `readonly` on DTO and domain value fields. |
| Money and quantity | Use the `Money` and `Quantity` helpers from `packages/shared`; never `number` arithmetic on money. |

### 4. Naming conventions

| Element | Convention | Example |
|---|---|---|
| Variable, function, method | `camelCase` | `recomputeSaleTotals`, `tenantId` |
| Class, type, interface, React component | `PascalCase` | `StockMovementService`, `SaleCommitResult`, `PosCart` |
| Constant, env-var key, permission string | `SCREAMING_SNAKE_CASE` / dotted lowercase | `MAX_IMAGE_BYTES`, `sales.discount` |
| Database table, column, index, constraint | `snake_case` | `stock_movements`, `tenant_id`, `uq_products_tenant_sku` |
| Prisma model | `PascalCase` mapped to `snake_case` via `@@map` / `@map` | `model StockMovement { @@map("stock_movements") }` |
| API path segment | plural `kebab-case` | `/v1/purchase-orders`, `/v1/stock-movements` |
| Query parameter | `camelCase` | `?branchId=&pageSize=` |
| Job type | dotted lowercase | `payment.expire`, `lowstock.evaluate` |
| Audit action | dotted lowercase `entity.verb` | `purchase_order.confirmed`, `stock.adjusted` |
| React hook | `use` prefix | `useLowStockReport` |
| TanStack Query key | array, tenant- and branch-scoped | `['sales', tenantId, branchId, filters]` |
| Test file | mirrors source name | `stock-movement.service.spec.ts` |

### 5. File and module naming

| Layer | Pattern | Example |
|---|---|---|
| Nest module | `<name>.module.ts` | `inventory.module.ts` |
| Nest controller | `<name>.controller.ts` | `stock-movements.controller.ts` |
| Nest service | `<name>.service.ts` | `stock-movement.service.ts` |
| DTO / Zod schema | `<name>.dto.ts` in `apps/api`, schema in `packages/shared/src/schemas/` | `create-adjustment.dto.ts` |
| Repository | `<name>.repository.ts` | `inventory-balance.repository.ts` |
| Guard / pipe / interceptor | `<name>.guard.ts`, `<name>.pipe.ts`, `<name>.interceptor.ts` | `branch-scope.guard.ts` |
| Unit test | `<name>.spec.ts` | `stock-movement.service.spec.ts` |
| Integration test | `<name>.int-spec.ts` under `apps/api/test/` | `sales-commit.int-spec.ts` |
| E2E scenario | `scenario-<a..g>.spec.ts` under `apps/web/e2e/` | `scenario-c-transfer.spec.ts` |
| React page | `app/<segment>/page.tsx` | `app/(app)/pos/page.tsx` |
| React component | `PascalCase.tsx` | `PosCartLine.tsx` |
| Prisma migration | `<timestamp>_<snake_case_description>` | `20260114120000_add_stock_movements` |

### 6. Backend (NestJS) conventions

| Rule | Detail |
|---|---|
| Module ownership | Each of the 16 domain modules owns its tables and exports exactly one service facade. |
| Controller thinness | Controllers parse input, call one service method, map the result to a response DTO. No branching on business state. |
| Validation | Every request body, query and path parameter is parsed by `ZodValidationPipe` using a schema from `packages/shared`. No hand-written validation. |
| Guard chain | Declared in order on every protected controller: `AuthGuard` → `TenantGuard` → `BranchScopeGuard` → `PermissionGuard`. | 
| Permission declaration | `@RequirePermission('inventory.adjust')` on every protected route. Missing decorator = denied (FR-054). |
| Transactions | `prisma.$transaction(async (tx) => …)` with the interactive form; the `tx` client is passed explicitly into every repository call. |
| Repository signature | First parameter is always `tenantId: string`; no repository method may be called without it (FR-028). |
| Soft delete | Repositories expose `softDelete()`; default read helpers append `deleted_at: null`. |
| Append-only tables | `stock_movements` and `audit_logs` repositories expose `create` and read methods only — no `update`, `delete`, `updateMany` or `deleteMany` (FR-106, FR-093). |
| Idempotency | Mutating endpoints that can be retried accept `Idempotency-Key` and store it with the result (FR-162, FR-164). |
| OpenAPI | DTOs carry `@ApiProperty` metadata; the document is generated at build time and committed as `apps/api/openapi.json` (NFR-013). |
| Response mapping | Domain entities are never returned raw; a mapper produces the response DTO so internal fields (e.g. `tenant_id`, `deleted_at`, MFA secrets) cannot leak. |
| No business logic in guards | Guards answer "may this actor do this here?" only. |

### 7. Database and Prisma conventions

| Rule | Detail |
|---|---|
| Schema changes | Migrations only. `prisma migrate dev` locally, `prisma migrate deploy` in CI. Never edit an applied migration; never `prisma db push` outside a throwaway local database. |
| Forward-only | Migrations must be backward compatible with the previous release (ADR-011). Destructive changes ship in two releases: add nullable → backfill → drop. |
| Tenant column | `tenant_id UUID NOT NULL` on every business-owned table, with an index leading with `tenant_id`. |
| Primary keys | UUID v7 (`uuid` column, `@default(dbgenerated())` or application-generated). |
| Timestamps | `created_at`, `updated_at` as `timestamptz` in UTC; `deleted_at timestamptz NULL` for soft delete (FR-031). |
| Money | `BIGINT` minor units plus a `currency CHAR(3)` column on the same row. Never `FLOAT`, `REAL` or `DOUBLE PRECISION` (FR-068). |
| Quantity | `INTEGER` in the product's unit of measure. Assumption: fractional quantities are out of scope for MVP. |
| Tax rate | `INTEGER` basis points (e.g. `1800` = 18%). Assumption: basis points avoid floating-point tax drift. |
| Uniqueness | Enforced by database constraints, not application checks: SKU per tenant (FR-072), barcode per tenant when present (FR-073), branch code per tenant (FR-036), supplier name per tenant (FR-134), receipt number per tenant (FR-166), one day closure per branch and business date (FR-205). |
| Partial indexes | Use `WHERE deleted_at IS NULL` for uniqueness on soft-deletable rows; use `WHERE expiry_date < now()` for expired-batch queries (FR-103, FR-132). |
| Balance derivation | `inventory_balances` is a derived read model. The authoritative value is `SUM(stock_movements.quantity_delta)` for the same product, variant, batch and branch (FR-102, FR-199). |
| Raw SQL | Permitted only for reporting aggregates and the balance-reconciliation assertion (FR-199); must be parameterised and covered by a test. |
| Seed data | `prisma/seed.ts` creates the four system roles and the permission catalogue per tenant; it never creates demo business data in production. |

### 8. Money, quantity and time conventions

| Rule | Detail |
|---|---|
| Arithmetic | All money arithmetic uses the `Money` helper (integer minor units + currency). Adding two different currencies throws. |
| Rounding | Half-up to the minor unit, applied once at the line level and once at the sale total; never per intermediate step. |
| Serialization | Assumption: money is serialized in API responses as a JSON number of minor units accompanied by `currency`, because UGX and USD amounts stay far below `Number.MAX_SAFE_INTEGER`. |
| Client display | The web app formats minor units for display only; it never recomputes totals (FR-160). |
| Timestamps | `timestamptz` in UTC; API responses are ISO-8601 UTC strings (NFR-012). |
| Business date | Derived from the tenant timezone (`businesses.timezone`), never from the process timezone. Used by day closure (FR-204) and daily reports (FR-195). |
| Expiry | Batch expiry is compared against the current instant at the moment of sale, not against a cached value (FR-132, FR-158). |

### 9. API conventions

| Rule | Detail |
|---|---|
| Base path | `/v1/` on every endpoint. Breaking changes require a new prefix (NFR-013). |
| Auth | `Authorization: Bearer <access token>`; refresh via `POST /v1/auth/refresh` with a rotating refresh token (FR-015). |
| Error envelope | `{ "error": { "code", "message", "details", "requestId" } }` on every non-2xx response; no stack traces or secrets in production (NFR-011). |
| Error codes | `VALIDATION_ERROR` (400), `UNAUTHENTICATED` (401), `FORBIDDEN` (403), `NOT_FOUND` (404), `CONFLICT` (409), `INSUFFICIENT_STOCK` (409), `IDEMPOTENT_REPLAY` (200 with the original resource), `RATE_LIMITED` (429), `INTERNAL_ERROR` (500). |
| List envelope | `{ "items": [...], "page": 1, "pageSize": 20, "total": 150, "totalPages": 8 }`. |
| Pagination | `page` (default 1) and `pageSize` (default 20, max 100). |
| Filtering and sorting | Allowlisted per endpoint; unknown parameters return `VALIDATION_ERROR`. No free-form sort strings. |
| Idempotency | `Idempotency-Key` header required on `POST /v1/sales`; optional on other mutating endpoints. A repeated key returns the original resource with no new rows (FR-164). |
| Webhooks | Provider callbacks verify the signature/reference, store the provider event id and reject repeats (FR-185). |
| Audit side effects | Every mutating endpoint on a sensitive resource writes an audit entry in the same transaction (FR-095). |
| Status codes | 201 for creation, 200 for read/update, 202 for accepted asynchronous work (FR-013, FR-215), 204 for delete-with-no-body. |
| OpenAPI | Every endpoint appears in the generated document with its permission requirement and error codes. |

### 10. Authorization and tenancy conventions

| Rule | Detail |
|---|---|
| Permission strings | `<domain>.<action>`, lowercase, dotted. Fixed by the SRS: `sales.discount` (FR-161), `po.confirm` (FR-142), `admin.*` (FR-053). Assumption: the remaining catalogue follows the same pattern — `sales.create`, `sales.refund`, `inventory.read`, `inventory.adjust`, `inventory.transfer.request`, `inventory.transfer.approve`, `inventory.transfer.dispatch`, `inventory.transfer.receive`, `purchase_order.create`, `purchase_order.receive`, `purchase_order.cancel`, `catalogue.manage`, `supplier.manage`, `branch.manage`, `user.manage`, `role.manage`, `report.read`, `audit.read`, `settings.manage`, `payment.correct`. |
| Permission constants | Declared once in `packages/shared/src/permissions.ts`; never written as string literals in controllers or components. |
| Branch scope | `BranchScopeGuard` resolves the effective branch set from `user_roles` + branch assignments; a branch-scoped user with no assignment receives 403 (FR-041). |
| Cross-tenant access | Returns 403 or 404, never 200 with empty data. A context switch to a tenant where the user holds no role returns 403 (FR-033). |
| Role changes | Take effect on the user's next request; no cached permission set outlives a request (FR-049). |
| Cache | Permission catalogue and business settings may be cached in Redis with a 60 s TTL. Money and stock values are never cached. |
| Admin protection | `admin.*` permissions cannot be removed from the Business Admin role; the API rejects the attempt (FR-053). |
| MFA policy | Enforced per role at sign-in; a Business Admin or Branch Manager cannot disable MFA for that role (FR-009, FR-011). |

### 11. Security conventions

| Rule | Detail |
|---|---|
| Secrets | Read from environment variables only. `.env` is git-ignored; `.env.example` lists keys with empty values. |
| Passwords | Argon2id hashing; never logged, never returned, never included in audit context (NFR-007). |
| Tokens | Verification, reset, invitation and refresh tokens are stored hashed and hard-deleted on use or expiry (FR-008, FR-014, FR-046). |
| MFA secrets | Encrypted at rest; recovery codes shown exactly once and stored hashed (FR-010, FR-017). |
| Logging | Structured JSON with `requestId`, `tenantId`, `actorId`, `route`, `status`, `durationMs`. Never log passwords, tokens, MFA secrets, full payment credentials or signed URLs (NFR-007). |
| Rate limiting | Redis-backed limiter on `/v1/auth/*`, webhook routes and export endpoints; lockout after 10 failed sign-ins in 15 minutes (FR-018). |
| File uploads | Pre-signed PUT to a tenant-prefixed key; MIME allowlist PDF/JPEG/PNG/XLSX/CSV; product images capped at 5 MB (FR-076, FR-211). |
| File reads | Short-lived signed GET only; download events audited (FR-077, FR-212). |
| Webhooks | Signature/reference verified before any state change; provider event id stored for deduplication (FR-185). |
| Payment state | Never marked paid from a client signal; only a verified callback or a server-side reconciliation job changes payment state (FR-182). |
| Personal data | Access to business registration and tax information restricted to the Business Admin role (FR-034); Ugandan Data Protection and Privacy Act 2019 obligations apply (NFR-014). |
| Out of scope | No third-party identity provider, no card processing, no email provider, no AI provider in MVP. |

### 12. Background job conventions

| Rule | Detail |
|---|---|
| Enqueue | `JobsService.enqueue(type, payload, { tenantId, actorId, idempotencyKey })`; the call also writes a `jobs` row for status queries (FR-214). |
| Job types | `notification.dispatch`, `export.generate`, `payment.expire`, `payment.reconcile`, `import.process`, `lowstock.evaluate`, `stock.reconcile`. |
| Handler shape | One processor per job type; the handler opens a transaction, calls domain services, and leaves no partially applied state on failure. |
| Context | Jobs carry explicit `tenantId` and `actorId`; a job never bypasses tenant scoping or permission checks. |
| Retries | Exponential backoff up to `JOB_MAX_ATTEMPTS` (default 5), then status `failed` with error detail surfaced in the UI (FR-216). |
| Idempotency | Every handler is safe to run twice: payment expiry checks current state, notification dispatch deduplicates on `(eventType, entityId, recipientId)`, import rows are applied by row key. |
| Status | `queued` → `running` → `succeeded` | `failed` (FR-214). |
| Scheduling | Repeating jobs (`payment.expire`, `lowstock.evaluate`, `stock.reconcile`) are registered once in the worker bootstrap, not per request. |

### 13. Frontend conventions

| Rule | Detail |
|---|---|
| Rendering | Server components by default; `'use client'` only for POS, cart, print view, forms and interactive tables. |
| Server state | TanStack Query for all server data. Query keys always include `tenantId` and `branchId` so a context switch cannot serve stale cross-branch data (ADR-014). |
| Mutations | `useMutation` invalidates the affected query keys; no manual cache writes for money or stock data. |
| Forms | React Hook Form with a Zod resolver using the schema from `packages/shared`; the same schema validates on the API. |
| Business computation | None in the browser. Prices, tax, totals, change, stock availability and permissions come from the API (FR-159, FR-160, FR-183). |
| Cart | Component-local state only; discarded on reload; no server-side parked-sale entity (FR-176, FR-177). |
| API client | One typed client generated from `apps/api/openapi.json`; no ad-hoc `fetch` calls in components. |
| Styling | Tailwind utility classes with tokens from `tailwind.config.ts`. No arbitrary hex colours, no inline `style` except for dynamic print widths. |
| Components | Presentational components take props and render; data fetching lives in route-level containers or hooks. |
| Error display | API errors render `error.message` with the `requestId` shown for support; `VALIDATION_ERROR` details map to field-level messages. |
| Loading and empty states | Every data-bound screen defines loading, empty, error and success states; no blank screens. |
| Print | Receipt print view and PDF render from stored sale data only; re-printing creates no sale or movement (FR-167, FR-168). |
| PWA | Manifest, icons and service worker registered in the App Router root; installable on Android Chrome (NFR-009). |

### 14. Accessibility and i18n conventions

| Rule | Detail |
|---|---|
| Standard | WCAG 2.1 Level AA on all authenticated screens (NFR-008). |
| Keyboard | Every action reachable by keyboard; POS search, cart quantity and payment are fully keyboard-operable; visible focus ring on all interactive elements. |
| Semantics | Native elements first (`button`, `label`, `table`); ARIA only to fill gaps; one `h1` per screen. |
| Contrast | Text and UI tokens meet 4.5:1 / 3:1; negative balances use a token that meets contrast in red (FR-115). |
| Forms | Every input has a programmatically associated label; errors are announced via `aria-live` and linked with `aria-describedby`. |
| Motion | No animation that cannot be disabled by `prefers-reduced-motion`. |
| Strings | All user-facing strings externalized through the i18n layer; English only in MVP, i18n-ready (NFR-012). No concatenated sentences. |
| Currency and dates | Display currency defaults to USD per tenant (FR-027); dates render in the tenant timezone from UTC API values. |

### 15. Error handling and logging

| Rule | Detail |
|---|---|
| Domain errors | Thrown as typed domain errors (`InsufficientStockError`, `InvalidStateTransitionError`, `TenantScopeError`) and mapped to HTTP codes by a single exception filter. |
| Negative stock | A commit that would take a balance negative while negative stock is disabled is rejected atomically with 409 and a machine-readable reason (FR-114). |
| State transitions | Only the transitions listed in the lifecycle tables are accepted; anything else returns 409 `CONFLICT` with the current state in `details`. |
| Logging | Structured JSON via one logger; `requestId` correlates logs, error-monitoring events and audit entries (NFR-007). |
| Error monitoring | The chosen provider, initialised from `ERROR_MONITORING_DSN`; unhandled rejections and 5xx responses are reported with `requestId`. |
| Audit | Append-only `audit_logs` with actor, action, target, timestamp and context (request id, IP, user agent) (FR-092, FR-097). No API operation edits or deletes audit rows (FR-093). |
| User-facing messages | Plain language, no internal identifiers, no stack traces, no provider payloads. |

### 16. Testing conventions

| Level | Scope | Location |
|---|---|---|
| Unit | Stock movement math, pricing, tax, refunds, purchase-order totals and state machine, payment state machine, permission evaluation, money helpers, business-date derivation | `*.spec.ts` beside the source |
| Integration | Sale + inventory commit, PO + goods receiving, transfer request→approve→dispatch→receive, supplier lifecycle, payment reconciliation, CSV/XLSX import, cross-tenant denial per module | `apps/api/test/*.int-spec.ts` against ephemeral PostgreSQL and Redis |
| RBAC | Every protected endpoint called with a wrong role or missing permission returns 403; every endpoint called without a token returns 401 | `apps/api/test/rbac.int-spec.ts` |
| E2E | Scenarios A–G: A POS sale + receipt, B purchasing + receiving, C multi-branch transfer, D stock replenishment, E end-of-day reconciliation, F catalogue import, G refund | `apps/web/e2e/scenario-*.spec.ts` (Playwright) |

| Rule | Detail |
|---|---|
| Test data | Factories in `apps/api/test/factories/` create tenants, branches, users, products and variants; no shared mutable fixtures. |
| Isolation | Every integration test runs in a transaction that is rolled back, or against a freshly migrated schema. |
| Determinism | No `sleep`; time is injected through a `Clock` provider; payment and SMS providers are replaced by in-process fakes. |
| Assertions on money and stock | Tests assert exact minor-unit values and exact movement rows, not rounded approximations. |
| Duplicate prevention | Every idempotent endpoint has a test that calls it twice and asserts one row set (FR-164, FR-185). |
| Coverage | Assumption: 80% line coverage on domain services, and 100% of permission-matrix rows exercised by at least one test. |
| Release gates | A release is blocked unless financials, stock reconciliation, duplicate prevention, E2E scenarios A–G, backup restore and import-error reporting all pass (NFR-010). |
| Deferred tests | AI authorization tests are deferred with Phase 5; no AI test scaffolding is added in MVP. |

### 17. Git, branch and commit conventions

| Rule | Detail |
|---|---|
| Branch names | `feat/<scope>`, `fix/<scope>`, `chore/<scope>`, `docs/<scope>` — e.g. `feat/inventory-transfer-dispatch`. |
| Commits | Conventional Commits: `type(scope): imperative summary` — e.g. `feat(sales): commit sale with idempotency key`. |
| Commit size | One logical change per commit; migrations committed separately from the code that uses them. |
| Generated files | `apps/api/openapi.json` and the generated API client are committed in the same pull request as the DTO change. |
| Migrations | Never edited after merge; a correction is a new migration. |
| Secrets | Never committed; a leaked secret is rotated immediately. |
| History | No force-push to `main`; squash-merge feature branches. |

### 18. Pull request checklist

| # | Check |
|---|---|
| 1 | Scope is clear and matches the linked requirement IDs (FR-xxx / NFR-xxx). |
| 2 | No deferred-scope code (Phase 3–6, native app, AI, finance, marketplace). |
| 3 | Tests added or updated at the correct level; RBAC and validation tests present for new endpoints. |
| 4 | Migration reviewed: forward-only, backward compatible, indexed, tenant-scoped. |
| 5 | Security considered: guards declared, tenant scope applied, no secrets, no sensitive logging. |
| 6 | Money and stock changes use the shared helpers and run in a transaction. |
| 7 | OpenAPI document and generated client regenerated. |
| 8 | Docs updated (`docs/` and any affected README section). |
| 9 | Verification commands listed in the description and passing locally. |
| 10 | Accessibility checked for new or changed screens (keyboard path, labels, contrast). |

### 19. Definition of done

A task is done when all of the following hold:

| # | Condition |
|---|---|
| 1 | The requirement is met and its acceptance criteria are demonstrably true. |
| 2 | `pnpm lint`, `pnpm typecheck`, `pnpm test` and `pnpm build` pass. |
| 3 | Integration tests for the affected flow pass against ephemeral PostgreSQL and Redis. |
| 4 | RBAC tests cover the new or changed endpoints (401 without a token, 403 without the permission). |
| 5 | Tenant-isolation test asserts cross-tenant denial for the new or changed resource. |
| 6 | Audit entries are written for every critical action introduced (FR-095). |
| 7 | OpenAPI document and generated client are current. |
| 8 | Documentation is updated; no TODO, TBD or placeholder text remains. |
| 9 | Security implications are addressed and recorded in the pull request. |
| 10 | Any blocker or known limitation is documented in the pull request description. |

### 20. Forbidden patterns

| Forbidden | Why | Ref |
|---|---|---|
| `UPDATE` or `DELETE` on `stock_movements` | The stock ledger is immutable | FR-106, BR-001 |
| `UPDATE` or `DELETE` on `audit_logs` | Audit is append-only | FR-093 |
| Editing a payment row to correct it | Corrections are new audited adjustment records | FR-192 |
| Persisting a client-supplied total, tax or change | Server is the only authority | FR-160 |
| Marking a sale paid from a client signal | Payment state comes from a verified callback | FR-182 |
| Committing a sale without re-validating stock | Prevents overselling | FR-163, BR-008 |
| Selling an expired batch | Expired batches are excluded at sale time | FR-132, FR-158 |
| A stock adjustment without a reason | Reason is mandatory | FR-109 |
| A repository call without `tenantId` | Tenant isolation is server-side | FR-028 |
| An endpoint without a permission declaration | Default deny | FR-054 |
| Floating-point money | Integer minor units only | FR-068 |
| Hard-deleting a business record | Soft delete via `deleted_at` | FR-031 |
| Hard-deleting a user's historical attribution | Sales, receipts and movements keep the actor | FR-057 |
| Editing a submitted purchase order | Cancel and re-create instead | FR-141 |
| Editing a closed purchase order or closed transfer | Closed records are immutable | FR-153, FR-125 |
| A second day closure for the same branch and business date | Rejected with 409 | FR-205 |
| Logging passwords, tokens, MFA secrets, payment credentials or signed URLs | Sensitive data | NFR-007 |
| Hardcoding secrets, connection strings or provider keys | Secrets come from the environment | NFR-007 |
| Adding a third-party identity, email, card or AI provider | Not in the ledger | Ledger |
| Docker in the production runtime path | Managed Node hosting | ADR-010 |
| Cross-module direct table access | Module boundaries | ADR-008 |

### 21. Tooling and commands

| Purpose | Command |
|---|---|
| Install | `pnpm install` |
| Lint | `pnpm lint` |
| Format | `pnpm format` |
| Typecheck | `pnpm typecheck` |
| Unit tests | `pnpm test` |
| Integration tests | `pnpm test:integration` |
| E2E scenarios A–G | `pnpm e2e` |
| Local database migrate | `pnpm --filter api prisma migrate dev` |
| Apply migrations in CI | `pnpm --filter api prisma migrate deploy` |
| Seed roles and permissions | `pnpm --filter api prisma db seed` |
| Generate OpenAPI | `pnpm --filter api openapi:generate` |
| Generate API client | `pnpm --filter web api:generate` |
| Run API locally | `pnpm --filter api start:dev` |
| Run worker locally | `pnpm --filter worker start:dev` |
| Run web locally | `pnpm --filter web dev` |
| Build all | `pnpm build` |

### 22. Assumptions recorded for this document

| # | Assumption | Basis |
|---|---|---|
| CS1 | Permission strings follow `<domain>.<action>`; only `sales.discount`, `po.confirm` and `admin.*` are fixed by the SRS. | FR-053, FR-142, FR-161 |
| CS2 | Money is serialized as a JSON number of minor units plus `currency`. | FR-068 |
| CS3 | Quantities are integers in the product's unit of measure; fractional quantities are out of scope for MVP. | FR-067, FR-110 |
| CS4 | Tax rates are stored as integer basis points. | FR-067, FR-159 |
| CS5 | Primary keys are UUID v7. | FR-028, ADR-009 |
| CS6 | Domain-service line coverage target is 80%, with 100% permission-matrix coverage. | NFR-010 |
| CS7 | ESLint + Prettier are the lint and format tools; boundary rules are enforced with ESLint. | ADR-008 |
| CS8 | The SMS/phone-verification provider, WhatsApp provider and error-monitoring provider are "the chosen provider", selected at implementation time. | Ledger `integrations.other`, `notifications.channels`, `ops.observability` |
| CS9 | Email integration is out of scope in MVP, so no email-sending code or provider client is written. | Ledger `integrations.email` = deferred |
| CS10 | AI model providers and the orchestration layer are out of scope in MVP, so no AI code, endpoints or tests are written. | Ledger `scope.deferred` |