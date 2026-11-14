# API Specification

**Product:** SokoOS — interconnected business operating platform for B2B commerce, inventory management and business operations.
**Release covered:** MVP = Phase 1 Foundation (FR-001–FR-060, FR-081–FR-100) + Phase 2 Business operations (FR-101–FR-216).
**Explicitly not covered:** Phase 3 supplier ecosystem/marketplace, Phase 4 finance, Phase 5 AI capabilities, Phase 6 expansion, dedicated React Native app, patient medical records, subscription billing, platform-operator UI. No endpoint in this document references a deferred table, and no deferred table is reachable through the API.
Requirement IDs (FR-001–FR-216, NFR-001–NFR-015, BR-001–BR-022) are reused from `docs/03-cleaned-srs.md`, `docs/06-domain-model-and-glossary.md`, `docs/09-database-design.md` and `docs/12-authentication-authorization-and-permissions.md` and are not renumbered.

## API Design Principles

**Stack and shape.** REST over HTTPS, implemented in NestJS on Node.js, documented with OpenAPI 3.1 generated from decorators and Zod schemas (FR-054, NFR-005). URL versioning: the base path is `/v1` (api.style = REST with URL versioning). Additive changes (new optional fields, new endpoints, new enum values that are additive) ship inside `/v1`; a breaking change requires `/v2` and a deprecation window of one release. The OpenAPI document is served at `/v1/openapi.json` and the interactive reference at `/v1/docs`. Assumption: the docs UI is disabled in production unless `OPENAPI_UI_ENABLED=true`.

**Authentication.** Built in-house — email + password, phone verification, TOTP MFA, rotating refresh tokens (FR-001–FR-020). There is no third-party identity provider, no SSO, no social login, no magic link and no passwordless login. The access token is a short-lived JWT sent as `Authorization: Bearer <token>`; the refresh token is opaque and rotated on every use (FR-015). The email verification channel is out of scope in the MVP because the email integration is deferred, so verification is phone-only and `EMAIL_CHANNEL_ENABLED=false` (FR-005). Card processing, card storage and third-party checkout are out of scope.

**Authorization.** Every protected endpoint declares exactly one permission code from the catalogue in `docs/12-authentication-authorization-and-permissions.md`, and the enforcement chain runs server-side on every request: `AuthGuard` → `TenantGuard` → `BranchScopeGuard` → `PermissionGuard` (FR-054). Default deny: an endpoint with no declared permission is reachable only by an authenticated user with a valid tenant context, and an unrecognised permission code denies. Tenant scope is applied by construction — every repository call requires an explicit `tenantId`, so a cross-tenant read is impossible (FR-028). A reference to another tenant's record returns `404 RESOURCE_NOT_FOUND`, never `403`, so existence is not disclosed. Branch-scoped roles can never read or write another branch's balances, sales or transfers (FR-041, FR-042).

**Access notation used in the Endpoints table.** Every Access cell has the form `<roles> · <permission code> · <scope>`.

| Token | Meaning |
|---|---|
| `public` | No token required. |
| `public (token)` | No session; a single-use token is supplied in the request body. |
| `public (signature)` | No session; the request is authenticated by a provider signature over the raw body. |
| `authenticated` | Valid access token; no tenant context required. |
| `own` | The caller may act only on their own record. |
| `tenant` | Access token + active business context + the listed permission. |
| `branch` | As `tenant`, plus the caller's branch assignment must cover the target branch. |
| `none` | No permission code is required beyond the scope (used for self-service endpoints). |

Assumption: permission codes follow the `<module>.<action>` convention and are seeded into the platform-wide `permissions` catalogue (FR-060); the codes named in this document are the codes the enforcement chain resolves, and the authoritative role-to-permission matrix is `docs/12-authentication-authorization-and-permissions.md`.

**Tenant and branch context.** The active business is resolved from the `X-Business-Id` header when present, otherwise from the user's stored active context; the active branch is resolved from `X-Branch-Id` when present, otherwise from the user's stored active context. Both are re-validated against `user_roles` and `user_branches` on every request (FR-032). A switch to a tenant in which the caller holds no role returns `403 TENANT_ACCESS_DENIED` (FR-033). A branch-scoped role with no branch assignment returns `403 BRANCH_SCOPE_REQUIRED` (FR-041).

**Request and response conventions.**

| Concern | Rule |
|---|---|
| Content type | `application/json; charset=utf-8` for all bodies except file uploads, which go directly to object storage through a pre-signed URL (FR-075). |
| Identifiers | UUID v4 strings everywhere. No auto-increment integers are exposed. |
| Timestamps | ISO 8601 with an explicit UTC offset, e.g. `2025-03-14T09:21:07.000Z`. Business dates are `YYYY-MM-DD` in the tenant timezone. |
| Money | `{ "amountMinor": 125000, "currency": "USD" }` — integer minor units plus an explicit ISO-4217 code, never a float (FR-068, FR-027). |
| Quantity | Decimal string with up to three decimal places, e.g. `"12.500"`, so fractional units of measure survive JSON round-trips (FR-110). |
| Tax rate | Integer basis points, e.g. `1800` = 18% (FR-067). |
| Enumerations | Upper-snake-case strings identical to the PostgreSQL enum values in `docs/09-database-design.md`. |
| Field naming | `camelCase` in JSON; `snake_case` in the database. |
| Unknown fields | Rejected with `400 VALIDATION_ERROR`; the API never silently ignores an unrecognised field. |
| Null vs absent | `null` means "explicitly cleared"; an absent key means "not supplied, leave unchanged" on `PATCH`. |
| Soft delete | Deleted records are excluded from lists and return `404` on direct read (FR-031). |
| Immutability | `stock_movements`, `audit_logs`, `payment_webhook_events` and `import_rows` expose no update or delete operation; a request against such a path returns `405 METHOD_NOT_ALLOWED` (FR-093, FR-106). |

**List, filter, sort and pagination.** Every collection endpoint accepts `page` (default `1`), `pageSize` (default `25`, maximum `100`), `sort` (allowlisted per endpoint, `-` prefix for descending) and endpoint-specific filters. Filters and sort keys are allowlisted; an unknown filter or sort key returns `400 VALIDATION_ERROR`. Every list response uses the same envelope:

```json
{
  "items": [],
  "page": 1,
  "pageSize": 25,
  "total": 0,
  "totalPages": 0
}
```

**Idempotency.** `POST /v1/sales`, `POST /v1/sales/{id}/payments`, `POST /v1/goods-receipts`, `POST /v1/stock-transfers/{id}/dispatch` and `POST /v1/stock-transfers/{id}/receive` require an `Idempotency-Key` header (UUID v4). A replay with the same key and the same body returns the original response with `200`/`201` and header `Idempotency-Replayed: true`; a replay with the same key and a different body returns `409 IDEMPOTENCY_KEY_REUSED`. Keys are unique per tenant (FR-160, FR-189).

**Concurrency.** Mutable headers (`products`, `purchase_orders`, `stock_transfers`, `sales`, `businesses`, `branches`) return an `ETag`. A `PATCH` or state-transition request may send `If-Match`; a mismatch returns `409 STALE_RESOURCE`.

**State transitions.** Every lifecycle transition is an explicit action endpoint (`/submit`, `/confirm`, `/approve`, `/dispatch`, `/receive`, `/close`, `/cancel`), never a free-form `status` field on `PATCH`. An illegal transition returns `409 INVALID_STATE_TRANSITION` with the current state and the allowed transitions in `details` (FR-119, FR-141, FR-153).

**Audit.** Every mutating endpoint that touches stock, money, permissions, branches, catalogue price or settings writes an append-only `audit_logs` row with actor, action, target type, target id, timestamp and context (request id, IP address, user agent) (FR-092, FR-095, FR-097). Audit rows are never editable or deletable through the API (FR-093).

**Notifications.** In-app notifications are always enabled and are created by background jobs (FR-084, FR-088, FR-090). The WhatsApp channel is selectable only when the provider is enabled (`WHATSAPP_ENABLED=true`) and is delivered outbound by a job; there is no inbound WhatsApp webhook in the MVP (FR-089). Assumption: WhatsApp delivery is outbound-only and its provider is "the chosen provider".

**Payments.** Mobile money is collected through MTN MoMo and Airtel Money only; cash is recorded locally (FR-179, FR-183). Provider callbacks arrive at signature-verified webhook endpoints, are stored in `payment_webhook_events` with a unique `(provider, provider_event_id)` pair for de-duplication, and are processed idempotently (FR-185). Payments are never edited; corrections are recorded as audited `payment_adjustments` (FR-192).

**Files.** Product images and documents are uploaded directly to tenant-prefixed object storage through a pre-signed URL, then confirmed to the API, which stores an `attachments` row (FR-075, FR-211). Reads are served through short-lived signed URLs generated server-side after a permission and tenant check (FR-077). Uploads are restricted to image MIME types and 5 MB for product images (FR-076).

**Background work.** Long-running work (exports, imports, notification delivery, payment expiry, payment reconciliation) is queued in Redis and tracked in `jobs`; the client polls `GET /v1/jobs/{id}` (FR-090, FR-213).

**Rate limiting.** Authentication endpoints are rate-limited per email and per IP; limits and lockout thresholds are the ones in `docs/12-authentication-authorization-and-permissions.md` (FR-018, FR-020). A limited request returns `429 RATE_LIMITED` with `Retry-After`. Responses carry `X-RateLimit-Limit`, `X-RateLimit-Remaining` and `X-RateLimit-Reset`.

**Observability.** Every response carries `X-Request-Id`; a client-supplied `X-Request-Id` is honoured when it is a valid UUID. The same value appears in the error envelope and in centralized logs (NFR-005, ops.observability).

**Performance.** Read endpoints target p95 < 500 ms and write endpoints p95 < 1 s at 50 concurrent users (NFR-001). List endpoints are keyset-friendly: `page`/`pageSize` are supported, and every list is backed by an index named in `docs/09-database-design.md`.

## Endpoints

The table below is the complete MVP surface. Paths are relative to the `/v1` base path. Every endpoint returns the standard error envelope defined in the Error Format section, and every endpoint that mutates stock, money, permissions, branches, catalogue price or settings writes an audit entry.

| Method | Path | Purpose | Access |
|---|---|---|---|
| GET | `/health`, `/health/live`, `/health/ready` | Liveness and readiness probes for the hosting platform | `public` · none · none |
| GET | `/version` | Release metadata: build SHA, release tag, migration version | `public` · none · none |
| GET | `/metrics` | Prometheus-compatible metrics for centralized monitoring | `public (ops token)` · none · none |
| POST | `/auth/register` | Create an account in `PENDING_VERIFICATION` with email, password and phone (FR-001–FR-004) | `public` · none · none |
| POST | `/auth/verify` | Complete phone verification with the 6-digit code; moves the account to `ACTIVE` (FR-005–FR-008) | `public` · none · none |
| POST | `/auth/verify/resend` | Issue a new verification code and invalidate the previous one (FR-005, FR-006) | `public` · none · none |
| POST | `/auth/login` | Verify email and password; return an MFA challenge or a token pair (FR-015, FR-018) | `public` · none · none |
| POST | `/auth/mfa/challenge` | Complete the MFA challenge with a TOTP code or a single-use recovery code (FR-009, FR-017) | `public (challengeId)` · none · none |
| POST | `/auth/mfa/enrol` | Return the TOTP secret and one-time recovery codes, shown exactly once (FR-010) | `authenticated` · none · own |
| POST | `/auth/mfa/enrol/confirm` | Activate MFA after the first valid code; writes an audit entry (FR-010, FR-012) | `authenticated` · none · own |
| POST | `/auth/mfa/disable` | Disable MFA; rejected for roles that require it (FR-011, FR-012) | `authenticated` · none · own |
| POST | `/auth/password/forgot` | Request a password reset; always returns `202` (FR-013) | `public` · none · none |
| POST | `/auth/password/reset` | Reset the password with a single-use token and revoke all sessions (FR-014) | `public (token)` · none · none |
| POST | `/auth/refresh` | Rotate the refresh token and issue a new access token (FR-015) | `public (refresh token)` · none · own |
| POST | `/auth/logout` | Revoke the current session (FR-016) | `authenticated` · none · own |
| GET | `/auth/sessions` | List the caller's active sessions with device, IP address and last-used timestamp (FR-016) | `authenticated` · none · own |
| DELETE | `/auth/sessions/{id}` | Revoke one of the caller's sessions in a single request (FR-016) | `authenticated` · none · own |
| POST | `/invitations/accept` | Accept an invitation, set a password and bind the assigned role and branches (FR-046, FR-047) | `public (token)` · none · none |
| GET | `/me` | Current profile, active business, active branch, roles and effective permissions (FR-032) | `authenticated` · none · own |
| PATCH | `/me` | Update the caller's own name, phone and locale preferences | `authenticated` · none · own |
| POST | `/me/context` | Set the active business and active branch; re-validated on every later request (FR-032, FR-033) | `authenticated` · none · own |
| GET | `/me/notification-preferences` | List the caller's per-event, per-channel notification preferences (FR-087) | `authenticated` · none · own |
| PATCH | `/me/notification-preferences` | Update notification preferences; the IN_APP channel stays enabled (FR-087, FR-088) | `authenticated` · none · own |
| POST | `/businesses` | Register a business tenant, its Business Admin role assignment, default branch and settings in one transaction (FR-021, FR-024) | `authenticated` · none · own |
| GET | `/businesses` | List the businesses in which the caller holds a role (FR-055) | `authenticated` · none · own |
| GET | `/businesses/{id}` | Business profile including legal name, TIN, registration number, address and currency (FR-025, FR-034) | `Business Admin` · `admin.business.manage` · tenant |
| PATCH | `/businesses/{id}` | Update the business profile; writes before/after values to the audit log (FR-025, FR-026) | `Business Admin` · `admin.business.manage` · tenant |
| DELETE | `/businesses/{id}` | Soft-delete the business tenant (FR-031) | `Business Admin` · `admin.business.manage` · tenant |
| GET | `/businesses/{id}/settings` | Business settings: currency, timezone, receipt footer, default tax rate, negative-stock policy (FR-030) | `Business Admin` · `admin.settings.manage` · tenant |
| PATCH | `/businesses/{id}/settings` | Update business settings; audited (FR-030, FR-095) | `Business Admin` · `admin.settings.manage` · tenant |
| GET | `/businesses/{id}/subscription` | Read-only subscription record with plan, status and period start/end (FR-029) | `Business Admin` · `admin.business.manage` · tenant |
| GET | `/branches` | List branches scoped to the caller's tenant and branch access (FR-038) | `Business Admin, Branch Manager` · `admin.branches.view` · tenant |
| POST | `/branches` | Create a branch with name, code, address, phone and warehouse flag (FR-035, FR-039) | `Business Admin` · `admin.branches.manage` · tenant |
| GET | `/branches/{id}` | Branch detail | `Business Admin, Branch Manager` · `admin.branches.view` · branch |
| PATCH | `/branches/{id}` | Update branch fields including the per-branch negative-stock override (FR-035, FR-043) | `Business Admin` · `admin.branches.manage` · tenant |
| POST | `/branches/{id}/deactivate` | Deactivate a branch; blocks new sales and keeps history readable (FR-037) | `Business Admin` · `admin.branches.manage` · tenant |
| POST | `/branches/{id}/activate` | Reactivate a branch | `Business Admin` · `admin.branches.manage` · tenant |
| DELETE | `/branches/{id}` | Soft-delete a branch (FR-031) | `Business Admin` · `admin.branches.manage` · tenant |
| GET | `/branches/{id}/users` | List users assigned to a branch (FR-040, FR-048) | `Business Admin` · `admin.users.manage` · tenant |
| POST | `/branches/{id}/users` | Assign a user to a branch; audited (FR-040, FR-044) | `Business Admin` · `admin.users.manage` · tenant |
| DELETE | `/branches/{id}/users/{userId}` | Remove a user's branch assignment (FR-040) | `Business Admin` · `admin.users.manage` · tenant |
| GET | `/users` | List the tenant's users with roles and branch assignments (FR-048) | `Business Admin` · `admin.users.manage` · tenant |
| GET | `/users/{id}` | User detail with roles, branches and MFA state | `Business Admin` · `admin.users.manage` · tenant |
| PATCH | `/users/{id}/roles` | Replace a user's role assignments; effective on the next request; audited (FR-049, FR-050) | `Business Admin` · `admin.users.manage` · tenant |
| PATCH | `/users/{id}/branches` | Replace a user's branch assignments (FR-040) | `Business Admin` · `admin.users.manage` · tenant |
| POST | `/users/{id}/deactivate` | Deactivate a user and revoke sessions and refresh tokens in the same request (FR-056, FR-058) | `Business Admin` · `admin.users.manage` · tenant |
| POST | `/users/{id}/reactivate` | Reactivate a user; audited (FR-058) | `Business Admin` · `admin.users.manage` · tenant |
| GET | `/invitations` | List pending invitations with role and branch scope (FR-045) | `Business Admin` · `admin.users.manage` · tenant |
| POST | `/invitations` | Invite a user by email or phone with a role and branch scope; 7-day single-use token (FR-045, FR-046) | `Business Admin` · `admin.users.manage` · tenant |
| DELETE | `/invitations/{id}` | Revoke a pending invitation (FR-046) | `Business Admin` · `admin.users.manage` · tenant |
| GET | `/roles` | List the four system roles of the tenant (FR-051) | `Business Admin` · `admin.roles.manage` · tenant |
| GET | `/roles/{id}/permissions` | List the permissions granted to a role (FR-052) | `Business Admin` · `admin.roles.manage` · tenant |
| PUT | `/roles/{id}/permissions` | Replace a role's permission set; `admin.*` cannot be removed from Business Admin (FR-052, FR-053) | `Business Admin` · `admin.roles.manage` · tenant |
| GET | `/permissions` | Expose the platform-wide permission catalogue for role configuration (FR-060) | `Business Admin` · `admin.roles.manage` · tenant |
| GET | `/categories` | List tenant categories with search and pagination (FR-061) | `Business Admin, Branch Manager, Inventory Clerk` · `catalogue.categories.view` · tenant |
| POST | `/categories` | Create a category; name unique per tenant (FR-061) | `Business Admin` · `catalogue.categories.manage` · tenant |
| GET | `/categories/{id}` | Category detail | `Business Admin, Branch Manager, Inventory Clerk` · `catalogue.categories.view` · tenant |
| PATCH | `/categories/{id}` | Update a category (FR-061) | `Business Admin` · `catalogue.categories.manage` · tenant |
| DELETE | `/categories/{id}` | Soft-delete a category; rejected while a product references it (FR-062, FR-066) | `Business Admin` · `catalogue.categories.manage` · tenant |
| GET | `/brands` | List tenant brands with search and pagination (FR-064) | `Business Admin, Branch Manager, Inventory Clerk` · `catalogue.brands.view` · tenant |
| POST | `/brands` | Create a brand; name unique per tenant, case-insensitively (FR-064, FR-065) | `Business Admin` · `catalogue.brands.manage` · tenant |
| GET | `/brands/{id}` | Brand detail | `Business Admin, Branch Manager, Inventory Clerk` · `catalogue.brands.view` · tenant |
| PATCH | `/brands/{id}` | Update a brand (FR-064) | `Business Admin` · `catalogue.brands.manage` · tenant |
| DELETE | `/brands/{id}` | Soft-delete a brand (FR-066) | `Business Admin` · `catalogue.brands.manage` · tenant |
| GET | `/products` | Search products by name, SKU or barcode within the tenant, with category, brand and active filters (FR-079) | `Business Admin, Branch Manager, Cashier, Inventory Clerk` · `catalogue.products.view` · tenant |
| POST | `/products` | Create a product with pricing, tax, batch tracking and reorder level (FR-067, FR-069) | `Business Admin` · `catalogue.products.manage` · tenant |
| GET | `/products/{id}` | Product detail with variants, images and current price (FR-070) | `Business Admin, Branch Manager, Cashier, Inventory Clerk` · `catalogue.products.view` · tenant |
| PATCH | `/products/{id}` | Update a product; price changes are audited (FR-070, FR-080) | `Business Admin` · `catalogue.products.manage` · tenant |
| DELETE | `/products/{id}` | Soft-delete a product (FR-070) | `Business Admin` · `catalogue.products.manage` · tenant |
| GET | `/products/{id}/variants` | List the variants of a product | `Business Admin, Branch Manager, Cashier, Inventory Clerk` · `catalogue.products.view` · tenant |
| POST | `/products/{id}/variants` | Create a variant with SKU and optional barcode; both unique per tenant (FR-071–FR-073) | `Business Admin` · `catalogue.products.manage` · tenant |
| PATCH | `/product-variants/{id}` | Update a variant's SKU, barcode, attributes or price override (FR-071) | `Business Admin` · `catalogue.products.manage` · tenant |
| DELETE | `/product-variants/{id}` | Soft-delete a variant (FR-070) | `Business Admin` · `catalogue.products.manage` · tenant |
| GET | `/product-variants/resolve` | Resolve a scanned barcode to exactly one variant, or return a clear not-found result without blocking the POS (FR-074) | `Cashier, Business Admin, Branch Manager` · `sales.create` · branch |
| POST | `/products/{id}/images/upload-url` | Issue a pre-signed upload URL for a tenant-prefixed object key; images only, 5 MB maximum (FR-075, FR-076) | `Business Admin` · `catalogue.products.manage` · tenant |
| POST | `/products/{id}/images` | Confirm an uploaded image and create the attachment record (FR-075) | `Business Admin` · `catalogue.products.manage` · tenant |
| DELETE | `/products/{id}/images/{attachmentId}` | Detach and soft-delete a product image | `Business Admin` · `catalogue.products.manage` · tenant |
| POST | `/imports` | Queue a CSV/XLSX catalogue import with per-row validation (FR-078, FR-208) | `Business Admin` · `catalogue.import` · tenant |
| GET | `/imports/{jobId}` | Import job status with valid, invalid and imported row counts (FR-208) | `Business Admin` · `catalogue.import` · tenant |
| GET | `/imports/{jobId}/rows` | Per-row validation results with error column, value and message (FR-209) | `Business Admin` · `catalogue.import` · tenant |
| GET | `/imports/{jobId}/errors.csv` | Download the error report as CSV (FR-209) | `Business Admin` · `catalogue.import` · tenant |
| GET | `/dashboard/summary` | Today's sales total, transaction count, top items, low-stock count, pending transfer approvals, pending PO items and open cash session (FR-081) | `Business Admin, Branch Manager` · `reports.view` · branch |
| GET | `/notifications` | List in-app notifications with unread filter and pagination (FR-084) | `Any authenticated user` · `notifications.view` · own |
| GET | `/notifications/unread-count` | Unread notification count for the application header (FR-085) | `Any authenticated user` · `notifications.view` · own |
| POST | `/notifications/{id}/read` | Mark one notification as read; audited (FR-086) | `Any authenticated user` · `notifications.view` · own |
| POST | `/notifications/read-all` | Mark all of the caller's notifications as read (FR-086) | `Any authenticated user` · `notifications.view` · own |
| GET | `/audit-logs` | Search the audit log by actor, action, target type, target id, branch and date range, paginated (FR-091, FR-098, FR-099) | `Business Admin` · `admin.audit.view` · tenant |
| GET | `/audit-logs` | Branch-scoped audit entries only, for a Branch Manager (FR-094) | `Branch Manager` · `admin.audit.view` · branch |
| GET | `/audit-logs/{id}` | Single audit entry with full context: request id, IP address, user agent (FR-092, FR-097) | `Business Admin, Branch Manager` · `admin.audit.view` · branch |
| GET | `/inventory/balances` | List balances per product, variant, batch and branch with branch, category, brand, product and low-stock filters (FR-101, FR-104) | `Business Admin, Branch Manager, Inventory Clerk` · `inventory.balances.view` · branch |
| GET | `/inventory/balances/expired` | List expired batches separately from sellable stock (FR-103, FR-132) | `Business Admin, Branch Manager, Inventory Clerk` · `inventory.balances.view` · branch |
| GET | `/inventory/low-stock` | List items at or below their reorder level per product, variant and branch (FR-126) | `Business Admin, Branch Manager, Inventory Clerk` · `inventory.balances.view` · branch |
| GET | `/inventory/movements` | List the immutable stock ledger with movement type, signed quantity, reference, batch, actor and timestamp (FR-105, FR-107) | `Business Admin, Branch Manager, Inventory Clerk` · `inventory.movements.view` · branch |
| GET | `/inventory/movements/{id}` | Single stock movement with its originating sale, goods receipt, transfer or adjustment (FR-108) | `Business Admin, Branch Manager, Inventory Clerk` · `inventory.movements.view` · branch |
| POST | `/inventory/adjustments` | Write exactly one stock movement and one audit entry for an adjustment; a non-empty reason is required (FR-109–FR-111) | `Business Admin, Inventory Clerk` · `inventory.adjust` · branch |
| GET | `/inventory/adjustments` | List adjustments with reason code, actor and date filters | `Business Admin, Branch Manager, Inventory Clerk` · `inventory.movements.view` · branch |
| GET | `/inventory/adjustments/{id}` | Adjustment detail with its linked stock movement | `Business Admin, Branch Manager, Inventory Clerk` · `inventory.movements.view` · branch |
| GET | `/inventory/batches` | List batches with batch number, expiry date and status (FR-131) | `Business Admin, Branch Manager, Inventory Clerk` · `inventory.balances.view` · branch |
| POST | `/inventory/batches/{id}/write-off` | Flag an expired batch for write-off and raise the write-off adjustment (FR-132) | `Business Admin, Inventory Clerk` · `inventory.adjust` · branch |
| POST | `/stock-counts` | Open a physical stock count session for a branch (FR-129) | `Business Admin, Inventory Clerk` · `inventory.count` · branch |
| GET | `/stock-counts` | List stock count sessions with status and date filters | `Business Admin, Branch Manager, Inventory Clerk` · `inventory.count` · branch |
| GET | `/stock-counts/{id}` | Stock count detail with system, counted and delta quantities per line (FR-129) | `Business Admin, Branch Manager, Inventory Clerk` · `inventory.count` · branch |
| PATCH | `/stock-counts/{id}` | Record counted quantities per product, variant and batch (FR-129) | `Business Admin, Inventory Clerk` · `inventory.count` · branch |
| POST | `/stock-counts/{id}/apply` | Compute deltas and raise one `STOCK_COUNT` adjustment per line; never sets a balance directly (FR-130) | `Business Admin, Inventory Clerk` · `inventory.count` · branch |
| POST | `/stock-counts/{id}/cancel` | Cancel a draft stock count | `Business Admin, Inventory Clerk` · `inventory.count` · branch |
| POST | `/stock-transfers` | Create a transfer in `REQUESTED` with origin, destination and lines; writes no stock movement (FR-116, FR-117) | `Business Admin, Branch Manager, Inventory Clerk` · `inventory.transfer.request` · branch |
| GET | `/stock-transfers` | List transfers with status, origin, destination and date filters | `Business Admin, Branch Manager, Inventory Clerk` · `inventory.transfer.view` · branch |
| GET | `/stock-transfers/{id}` | Transfer detail with lines, actors and timestamps | `Business Admin, Branch Manager, Inventory Clerk` · `inventory.transfer.view` · branch |
| POST | `/stock-transfers/{id}/approve` | `REQUESTED → APPROVED` (FR-118, FR-119) | `Business Admin, Branch Manager` · `inventory.transfer.approve` · branch |
| POST | `/stock-transfers/{id}/reject` | `REQUESTED → REJECTED`; a reason is required (FR-118, FR-119) | `Business Admin, Branch Manager` · `inventory.transfer.approve` · branch |
| POST | `/stock-transfers/{id}/dispatch` | Write negative movements at the origin inside a stock-checked transaction (FR-120, FR-121) | `Business Admin, Branch Manager, Inventory Clerk` · `inventory.transfer.dispatch` · branch |
| POST | `/stock-transfers/{id}/receive` | Write positive movements at the destination; received quantities default to dispatched; a note is required on a shortfall (FR-122, FR-123) | `Business Admin, Branch Manager, Inventory Clerk` · `inventory.transfer.receive` · branch |
| POST | `/stock-transfers/{id}/close` | Close a received transfer after any discrepancy note is acknowledged (FR-124) | `Business Admin, Branch Manager` · `inventory.transfer.close` · branch |
| GET | `/suppliers` | List suppliers with search and pagination (FR-136) | `Business Admin, Branch Manager` · `purchasing.suppliers.view` · tenant |
| POST | `/suppliers` | Create a supplier with contact, TIN and payment terms; name unique per tenant (FR-133, FR-134) | `Business Admin` · `purchasing.suppliers.manage` · tenant |
| GET | `/suppliers/{id}` | Supplier detail with purchase order history | `Business Admin, Branch Manager` · `purchasing.suppliers.view` · tenant |
| PATCH | `/suppliers/{id}` | Update a supplier (FR-133) | `Business Admin` · `purchasing.suppliers.manage` · tenant |
| DELETE | `/suppliers/{id}` | Soft-delete a supplier (FR-134) | `Business Admin` · `purchasing.suppliers.manage` · tenant |
| GET | `/purchase-orders` | List purchase orders with status, supplier, branch and date filters (FR-150) | `Business Admin, Branch Manager, Inventory Clerk` · `purchasing.po.view` · branch |
| POST | `/purchase-orders` | Create a purchase order in `DRAFT` with server-computed totals (FR-137, FR-138) | `Business Admin, Branch Manager` · `purchasing.po.create` · branch |
| GET | `/purchase-orders/{id}` | Purchase order detail with ordered, received and outstanding quantities per line (FR-150) | `Business Admin, Branch Manager, Inventory Clerk` · `purchasing.po.view` · branch |
| PATCH | `/purchase-orders/{id}` | Edit a draft purchase order only (FR-139, FR-141) | `Business Admin, Branch Manager` · `purchasing.po.create` · branch |
| POST | `/purchase-orders/{id}/submit` | `DRAFT → SUBMITTED`; requires a supplier and at least one line with quantity greater than zero (FR-140) | `Business Admin, Branch Manager` · `purchasing.po.submit` · branch |
| POST | `/purchase-orders/{id}/confirm` | `SUBMITTED → CONFIRMED`; records actor and timestamp and notifies the requesting branch (FR-142, FR-143) | `Business Admin` · `po.confirm` · tenant |
| POST | `/purchase-orders/{id}/cancel` | Cancel a purchase order; audited (FR-144) | `Business Admin` · `purchasing.po.cancel` · tenant |
| POST | `/purchase-orders/{id}/close` | Close from `RECEIVED`, or from `PARTIALLY_RECEIVED` with a stated shortfall reason (FR-152) | `Business Admin` · `purchasing.po.close` · tenant |
| GET | `/purchase-orders/{id}/receipts` | List the goods receipts recorded against a purchase order | `Business Admin, Branch Manager, Inventory Clerk` · `purchasing.po.view` · branch |
| POST | `/goods-receipts` | Receive goods against a `CONFIRMED` or `PARTIALLY_RECEIVED` purchase order; writes movements, batches, receipt lines and received quantities in one transaction (FR-145–FR-147) | `Business Admin, Branch Manager, Inventory Clerk` · `purchasing.receipt.create` · branch |
| GET | `/goods-receipts` | List goods receipts with supplier, branch and date filters | `Business Admin, Branch Manager, Inventory Clerk` · `purchasing.po.view` · branch |
| GET | `/goods-receipts/{id}` | Goods receipt detail with batch number, expiry and over-receipt flags (FR-146, FR-148) | `Business Admin, Branch Manager, Inventory Clerk` · `purchasing.po.view` · branch |
| GET | `/pos/catalogue` | POS product search by name, SKU or barcode scoped to the selling branch, excluding expired batches (FR-155, FR-132) | `Cashier, Business Admin, Branch Manager` · `sales.create` · branch |
| POST | `/sales` | Commit a sale: resolve batches by FEFO, write movements, compute totals server-side, create the receipt (FR-156–FR-160, FR-165, FR-166) | `Cashier, Business Admin, Branch Manager` · `sales.create` · branch |
| GET | `/sales` | List sales with branch, cashier, status and date filters | `Business Admin, Branch Manager, Cashier` · `sales.view` · branch |
| GET | `/sales/{id}` | Sale detail with items, batch allocation, payments, refunds and receipt | `Business Admin, Branch Manager, Cashier` · `sales.view` · branch |
| GET | `/sales/{id}/receipt` | Read the tenant-unique receipt for a sale (FR-166) | `Business Admin, Branch Manager, Cashier` · `sales.view` · branch |
| POST | `/receipts/{id}/print` | Increment the print count; re-printing has no side effects (FR-168) | `Cashier, Business Admin, Branch Manager` · `sales.receipt.print` · branch |
| POST | `/sales/{id}/refunds` | Request a full or partial refund against an original sale (FR-169, FR-172) | `Business Admin, Branch Manager, Cashier` · `sales.refund.request` · branch |
| GET | `/refunds` | List refunds with status, branch and date filters | `Business Admin, Branch Manager` · `sales.view` · branch |
| GET | `/refunds/{id}` | Refund detail with lines, restock flags and approval trail | `Business Admin, Branch Manager` · `sales.view` · branch |
| POST | `/refunds/{id}/approve` | Approve a refund request (FR-188) | `Business Admin, Branch Manager` · `sales.refund.approve` · branch |
| POST | `/refunds/{id}/reject` | Reject a refund request with a reason | `Business Admin, Branch Manager` · `sales.refund.approve` · branch |
| POST | `/refunds/{id}/complete` | Complete an approved refund: restock movements, sale status update and notification (FR-172, FR-188) | `Business Admin, Branch Manager` · `sales.refund.approve` · branch |
| GET | `/customers` | List tenant customers with search and pagination | `Business Admin, Branch Manager, Cashier` · `sales.view` · tenant |
| POST | `/customers` | Create an optional customer record to attach to a sale | `Business Admin, Branch Manager, Cashier` · `sales.create` · branch |
| PATCH | `/customers/{id}` | Update a customer record | `Business Admin, Branch Manager` · `sales.view` · tenant |
| DELETE | `/customers/{id}` | Soft-delete a customer record | `Business Admin` · `sales.view` · tenant |
| POST | `/sales/{id}/payments` | Initiate a payment: cash, MTN MoMo or Airtel Money; idempotent (FR-179, FR-183, FR-189) | `Cashier, Business Admin, Branch Manager` · `payments.create` · branch |
| GET | `/payments` | List payments with method, status, branch and date filters | `Business Admin, Branch Manager` · `payments.view` · branch |
| GET | `/payments/{id}` | Payment detail with provider reference, status and expiry | `Business Admin, Branch Manager, Cashier` · `payments.view` · branch |
| POST | `/payments/{id}/adjustments` | Record an audited correction or reversal; payments are never edited (FR-192) | `Business Admin` · `payments.adjust` · tenant |
| GET | `/payments/reconciliation` | Reconciliation summary of provider references against recorded payments (FR-186) | `Business Admin` · `payments.view` · tenant |
| POST | `/webhooks/payments/mtn-momo` | Receive an MTN MoMo callback; signature verified and stored for de-duplication (FR-185) | `public (signature)` · none · none |
| POST | `/webhooks/payments/airtel-money` | Receive an Airtel Money callback; signature verified and stored for de-duplication (FR-185) | `public (signature)` · none · none |
| GET | `/cash-sessions/current` | Read the open cash session for the caller's branch and business date (FR-184) | `Cashier, Business Admin, Branch Manager` · `cash.session.view` · branch |
| GET | `/cash-sessions` | List cash sessions with branch, cashier and date filters | `Business Admin, Branch Manager` · `cash.session.view` · branch |
| POST | `/cash-sessions/{id}/close` | Close a cash session with counted cash and a discrepancy (FR-193) | `Cashier, Business Admin, Branch Manager` · `cash.session.close` · branch |
| POST | `/day-closures` | Close the business day for a branch with cash count, discrepancy and immutable snapshot (FR-204, FR-205) | `Business Admin, Branch Manager` · `day.close` · branch |
| GET | `/day-closures` | List day closures with branch and business-date filters | `Business Admin, Branch Manager` · `day.close` · branch |
| GET | `/day-closures/{id}` | Day closure detail with totals, discrepancy and discrepancy reason (FR-206) | `Business Admin, Branch Manager` · `day.close` · branch |
| GET | `/reports/sales-summary` | Sales totals, transaction counts and top items by branch and period (FR-081, FR-197–FR-207) | `Business Admin, Branch Manager` · `reports.view` · branch |
| GET | `/reports/stock-valuation` | Stock valuation from balances at cost and at selling price (FR-197–FR-207) | `Business Admin, Branch Manager` · `reports.view` · branch |
| GET | `/reports/stock-movements` | Movement summary by type, product and period, derived from the ledger (FR-197–FR-207) | `Business Admin, Branch Manager` · `reports.view` · branch |
| GET | `/reports/purchases` | Purchase order and goods receipt summary by supplier and period (FR-197–FR-207) | `Business Admin, Branch Manager` · `reports.view` · branch |
| GET | `/reports/refunds` | Refund summary by reason, branch and period (FR-197–FR-207) | `Business Admin, Branch Manager` · `reports.view` · branch |
| GET | `/reports/tax` | Tax collected by tax rate and period (FR-197–FR-207) | `Business Admin` · `reports.view` · tenant |
| POST | `/exports` | Queue a