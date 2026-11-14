# Acceptance Criteria

## Acceptance Criteria

The SokoOS MVP passes when a business can be onboarded, staffed, stocked, sold to, replenished, transferred between branches and reconciled end-to-end, with every stock, money and permission transition enforced server-side, every critical action audited, and every deferred phase (supplier ecosystem, finance, AI, expansion, React Native, patient medical records) absent from the shipped product. Requirement IDs below are reused from `docs/03-cleaned-srs.md` (FR-001–FR-216, NFR-001–NFR-015) and business-rule IDs BR-001–BR-022 from `docs/02-product-requirements-document.md`; no ID is renumbered or redefined here.

Assumption: E2E scenarios A–G referenced by NFR-010 map to the seven scenarios in Part 1. The marketplace-order workflow named in the ledger is deferred with Phase 3 and is therefore not an MVP scenario.

### Part 1 — End-to-End System Pass

The system passes when each scenario below completes in staging without errors, with all data persisted, all notifications created and all audit entries written.

**Scenario A — Onboarding, tenancy and access**

1. Register with email + password meeting the policy → account created in `PENDING_VERIFICATION`, no business data readable (FR-001, FR-002, FR-004).
2. Register with an existing email → HTTP 409 (FR-003).
3. Verification code delivered by phone as primary channel; code expires after 10 minutes; 6th attempt rejected (FR-005, FR-006).
4. Successful verification → account `ACTIVE`; verification token hard-deleted (FR-007, FR-008).
5. Business registration creates tenant + owner Business Admin role assignment in one transaction, with business type retail/pharmacy/wholesale/distribution and a platform-unique slug, self-service with no approval step (FR-021, FR-022, FR-023, FR-024).
6. Branch created with name, code, address, phone and `is_warehouse` (FR-035); duplicate branch code within tenant rejected (FR-036).
7. Cashier invited with role + branch scope; invitation token single-use, 7-day expiry; invitee accepts, sets password, becomes bound by the role's MFA rule (FR-045, FR-046, FR-047).
8. Business Admin signs in and is challenged for MFA; Cashier signs in without MFA (FR-009, FR-059).
9. Dashboard returns today's sales total, transaction count, top items, low-stock count, pending transfer approvals, pending PO items and open cash session; Branch Manager sees branch-scoped values (FR-081, FR-082).
10. Audit entries exist for business profile change, branch creation, user invite, role assignment, sign-in and MFA challenge (FR-026, FR-044, FR-050, FR-100).

**Scenario B — Catalogue and opening stock**

1. Category and brand created; duplicate brand name rejected case-insensitively (FR-061, FR-064, FR-065).
2. Product created with name, category, brand, unit of measure, cost price, selling price, tax rate, `is_batch_tracked`, `reorder_level`; all amounts stored as integer minor units with explicit currency (FR-067, FR-068).
3. Variant created with SKU and barcode; duplicate SKU or duplicate barcode rejected (FR-071, FR-072, FR-073).
4. Product image uploaded via pre-signed URL to a tenant-prefixed key; non-image MIME or >5 MB rejected; read served through a short-lived signed URL (FR-075, FR-076, FR-077).
5. Opening stock imported from CSV/XLSX with per-row validation; error report lists row number, column, value and error (FR-207, FR-208, FR-209).
6. Balance list shows product/variant/batch/branch rows and each balance equals the sum of `stock_movements` for the same key (FR-101, FR-102).

**Scenario C — POS sale with mobile money payment**

1. Cashier searches by name, SKU or barcode scoped to the selling branch; a barcode resolves to exactly one variant or returns a clear not-found result without blocking the POS (FR-074, FR-155, FR-156).
2. Out-of-stock item is visible but not committable; an expired batch is never presented as sellable (FR-157, FR-158).
3. Cart line quantity editable; subtotal, tax and total recomputed server-side; client-supplied totals are display-only and never persisted (FR-159, FR-160).
4. Commit with an idempotency key creates `sales`, `sale_items`, stock movements and the payment link in one transaction; stock re-validated at commit with HTTP 409 on unavailability; a repeated key returns the original sale and creates no duplicate sale or movement (FR-162, FR-163, FR-164).
5. Sale lines resolve to batches first-expiry-first-out within non-expired batches (FR-165).
6. Mobile money payment initiated with `mtn_momo` or `airtel_money` in state `PENDING`; callback signature/reference verified, provider event id stored, repeated event rejected; payment moves to `SUCCEEDED`; the sale is never marked paid from a client signal alone (FR-179, FR-180, FR-181, FR-182, FR-185).
7. Receipt created with a tenant-unique number; print view and PDF rendered from stored sale data only; re-print creates no new sale or stock movement (FR-166, FR-167, FR-168).
8. Audit entries written for sale completion and for the payment state change (FR-178, FR-194).

**Scenario D — Purchasing and goods receiving**

1. Purchase order created `DRAFT` with supplier, branch, expected date and lines of product/variant, quantity, unit cost and tax; totals computed server-side; editable while draft (FR-137, FR-138, FR-139).
2. Submit requires a supplier and at least one line with quantity > 0 → `SUBMITTED`; editing afterwards blocked (FR-140, FR-141).
3. User holding `po.confirm` confirms → `CONFIRMED`, with actor and timestamp recorded and the requesting branch notified (FR-142, FR-143).
4. Goods receipt accepted only against `CONFIRMED` or `PARTIALLY_RECEIVED`; captures received quantity, unit cost, batch number and expiry per line; one transaction writes positive stock movements, creates or matches batches, records `goods_receipts` and `goods_receipt_items`, and increments received quantities on the PO (FR-145, FR-146, FR-147).
5. Partial receipt → `PARTIALLY_RECEIVED`; all ordered quantities received → `RECEIVED`; ordered, received and outstanding quantities visible per line (FR-150, FR-151).
6. Over-receipt requires explicit confirmation and is flagged; a line not on the PO is rejected (FR-148, FR-149).
7. Close from `RECEIVED`, or from `PARTIALLY_RECEIVED` with a stated shortfall reason; closed PO immutable (FR-152, FR-153).
8. Audit entries written for submission, confirmation, each goods receipt, cancellation and closure (FR-154).

**Scenario E — Multi-branch transfer**

1. Transfer created `REQUESTED` with origin branch, destination branch and lines of product/variant/batch and quantity; no stock movement written at request time (FR-116, FR-117).
2. Branch Manager approves or rejects; rejection requires a reason; only `REQUESTED → APPROVED` and `REQUESTED → REJECTED` accepted (FR-118, FR-119).
3. Dispatch writes negative movements at the origin inside a stock-checked transaction; insufficient origin stock rejects the entire dispatch with HTTP 409 (FR-120, FR-121).
4. Receipt writes positive movements at the destination; received quantity defaults to dispatched quantity; a shortfall requires a note and is stored as the transfer discrepancy (FR-122, FR-123).
5. Close allowed only after the discrepancy note is acknowledged; source and destination retained for the life of the transfer; closed transfer immutable (FR-124, FR-125).
6. Notifications created for transfer requested, approved, dispatched and received (FR-084).

**Scenario F — Stock replenishment**

1. Low-stock list compares balances to `reorder_level` per product/variant per branch (FR-104, FR-126).
2. A balance crossing to at or below `reorder_level` creates a notification; repeats suppressed for 24 hours until the balance rises above the threshold (FR-127, FR-128).
3. Purchase order raised from the low-stock list, confirmed and received; the balance rises above the reorder level and the item disappears from the low-stock report (FR-202).

**Scenario G — End-of-day reconciliation**

1. Cash session opens implicitly on the first cash payment of the day; cash payment records amount tendered, computes change server-side, moves directly to `SUCCEEDED` and is attributed to the open session (FR-183, FR-184, FR-193).
2. Day closure snapshots expected cash, counted cash, discrepancy and reason for a branch and business date; a non-zero discrepancy requires a reason; a second closure for the same branch and business date returns HTTP 409 (FR-204, FR-205).
3. Closed day is immutable and audited; corrections are recorded as new audited adjustment records (FR-206).
4. Sales report excludes refunds and shows refunds separately; stock report asserts closing balance equals the sum of movements and reports any drift; payment mismatch list shows payments without a completed sale and sales without a successful payment (FR-191, FR-196, FR-199).
5. Notification created for day closed (FR-084).

### Part 2 — Module-Level Criteria

**Auth, verification and sessions**

- [ ] Registration rejects an existing email with 409 and creates no partial tenant (FR-003, FR-021).
- [ ] Verification code expires after 10 minutes and rejects the 6th attempt (FR-006).
- [ ] Password reset returns HTTP 202 whether or not the email exists (FR-013).
- [ ] Reset token is single-use, expires in 30 minutes, and all existing sessions are invalidated on successful reset (FR-014).
- [ ] Sign-in issues a session with a rotating refresh token (FR-015).
- [ ] Session list shows device, IP and last-used timestamp; revoke takes one request (FR-016).
- [ ] Email locked for 15 minutes after 10 failed sign-ins within 15 minutes; lockout message does not disclose whether the email exists (FR-018, FR-019).
- [ ] Lockout and rate-limit events are logged and audited (FR-020).

**MFA**

- [ ] Business Admin and Branch Manager cannot sign in without completing MFA (FR-009, FR-059).
- [ ] Enrolment returns the secret and one-time recovery codes, with recovery codes displayed exactly once (FR-010).
- [ ] An admin-role user cannot disable MFA for that role (FR-011).
- [ ] Recovery code is single-use and its use is audited (FR-017).
- [ ] MFA enable and disable each write an audit entry (FR-012).

**Business, tenancy and settings**

- [ ] Business registration completes self-service after phone verification with no platform approval step (FR-024).
- [ ] Business slug is unique platform-wide (FR-023).
- [ ] Business Admin can update legal name, TIN, registration number, address, contact phone and currency; each change writes an audit entry with before and after values (FR-025, FR-026).
- [ ] One currency per tenant, defaulting to USD (FR-027).
- [ ] Business settings store currency, timezone, receipt footer text and default tax rate (FR-030).
- [ ] Subscription record returns plan, status and period start/end (FR-029).
- [ ] Active business/branch context is re-validated on every request; switching to a tenant with no role returns 403 (FR-032, FR-033).
- [ ] Business registration and tax information is readable only by the Business Admin role (FR-034).

**Branches**

- [ ] Branch code unique within tenant (FR-036).
- [ ] Deactivated branch blocks new sales while its history stays readable (FR-037).
- [ ] Branch list is scoped to the requester's tenant and branch access (FR-038).
- [ ] Branch can be flagged as a warehouse (FR-039).
- [ ] Users can be assigned to branches; creation, update, deactivation and assignment are audited (FR-040, FR-044).
- [ ] Negative-stock override is settable per branch (FR-043).

**Users, roles and permissions**

- [ ] Tenant user list shows roles and branch assignments (FR-048).
- [ ] Role replacement takes effect on the user's next request and is audited with actor and target (FR-049, FR-050).
- [ ] Four system roles exist per tenant: Business Admin, Branch Manager, Cashier, Inventory Clerk (FR-051).
- [ ] `role_permissions` is editable, but `admin.*` permissions cannot be removed from the Business Admin role (FR-052, FR-053).
- [ ] Permission catalogue is exposed for role configuration (FR-060).
- [ ] One account can hold roles in more than one business (FR-055).
- [ ] Deactivation revokes sessions and refresh tokens in one request; historical sales, receipts and movements keep the deactivated user's attribution (FR-056, FR-057).
- [ ] Deactivation and reactivation are audited (FR-058).

**Catalogue**

- [ ] Category names unique per tenant; hard deletion of an in-use category rejected; categories soft-deleted (FR-061, FR-062, FR-066).
- [ ] A product belongs to at most one category (FR-063).
- [ ] Brand names unique per tenant case-insensitively; brands soft-deleted (FR-065, FR-066).
- [ ] Selling price below cost price is allowed and flagged with a warning (FR-069).
- [ ] Products can be updated and soft-deleted (FR-070).
- [ ] Barcode scan resolves to exactly one variant or a clear not-found result (FR-074).
- [ ] Product search matches name, SKU or barcode within the tenant (FR-079).
- [ ] Catalogue price changes are audited (FR-080).
- [ ] CSV/XLSX catalogue import validates required columns, duplicate SKU/barcode, numeric prices and unknown categories per row (FR-078).

**Dashboard and notifications**

- [ ] Dashboard summary contains all seven required values (FR-081).
- [ ] Dashboard refreshes without a full page reload (FR-083).
- [ ] In-app notifications are created for transfer requested/approved/dispatched/received, PO submitted/confirmed/received, low-stock threshold crossed, refund issued and day closed (FR-084).
- [ ] Unread count is visible in the application header (FR-085).
- [ ] Mark-as-read works and is audited (FR-086).
- [ ] Preferences are configurable per event type and per channel; in-app is always enabled (FR-087, FR-088).
- [ ] WhatsApp is selectable only when the provider is enabled (FR-089).
- [ ] Notification delivery runs as a background job (FR-090).

**Audit log**

- [ ] Search by actor, action, target type, target id and date range (FR-091).
- [ ] Every entry stores actor, action, target, timestamp and context (FR-092).
- [ ] No API operation edits or deletes an audit entry (FR-093).
- [ ] Branch Manager sees only branch-scoped entries (FR-094).
- [ ] Critical actions covering stock, money, permissions, branches, catalogue price and settings each write an entry (FR-095).
- [ ] Entries are retained for the life of the tenant record (FR-096).
- [ ] Request id, IP address and user agent are recorded as context (FR-097).
- [ ] Filtering by branch and pagination both work (FR-098, FR-099).

**Inventory balances and movements**

- [ ] Balance list filters by branch, category, brand, product and low-stock (FR-101).
- [ ] Expired batches are listed separately from sellable stock (FR-103).
- [ ] Movement list shows movement type, signed quantity, reference, batch, actor and timestamp, and filters by branch, product, movement type and date range (FR-105, FR-107).
- [ ] Each movement links to its originating sale, goods receipt, transfer or adjustment (FR-108).
- [ ] No endpoint or UI path updates or deletes a `stock_movements` row (FR-106).

**Stock adjustments and counts**

- [ ] Adjustment without a reason is rejected (FR-109).
- [ ] Adjustment requires product/variant, branch, quantity delta and, for batch-tracked products, a batch (FR-110).
- [ ] Each adjustment writes exactly one stock movement and one audit entry (FR-111).
- [ ] Adjustment without permission returns 403 (FR-112).
- [ ] Negative balance renders in red when negative stock is enabled (FR-115).
- [ ] Stock count records counted quantities per product/variant/batch for a branch, raises one `STOCK_COUNT` adjustment per line and never sets a balance directly (FR-129, FR-130).

**Batches and expiry**

- [ ] Goods receipt captures batch number and expiry for batch-tracked products (FR-131).
- [ ] Expired batches are excluded from sale at the moment of sale and flagged for write-off (FR-132).

**Suppliers**

- [ ] Supplier CRUD covers name, contact person, phone, email, address, TIN and payment terms (FR-133).
- [ ] Supplier name unique per tenant; suppliers soft-deleted (FR-134).
- [ ] Suppliers have no login in MVP (FR-135).
- [ ] Supplier list supports search and pagination (FR-136).

**Purchase orders and goods receipts**

- [ ] Draft PO totals are computed server-side (FR-138).
- [ ] Cancellation is audited and requires a Business Admin (FR-144).
- [ ] Receiving against a line not on the PO is rejected (FR-149).
- [ ] Ordered, received and outstanding quantities and the current state are shown per line (FR-150).

**POS, sales, receipts and refunds**

- [ ] POS search is scoped to the selling branch (FR-155).
- [ ] Line discount requires `sales.discount` and is capped at the configured maximum percentage (FR-161).
- [ ] Sale history filters by date range, branch, cashier, payment method, state and receipt number (FR-173).
- [ ] Branch-scoped user sees only their own branch's sales (FR-174).
- [ ] A sale can be split across at most two payment methods (FR-175).
- [ ] Parked sales live only in the POS client session; no server-side parked-sale entity exists (FR-176).
- [ ] Reloading the POS page discards an unpaid cart (FR-177).
- [ ] Discounts above the configured threshold are audited (FR-178).
- [ ] Refund records `refunds` plus refund lines against the original sale (FR-169).
- [ ] Refund writes reversing movements to the original batch for batch-tracked products (FR-170).
- [ ] Sale state becomes `REFUNDED` or `PARTIALLY_REFUNDED` after refund (FR-171).
- [ ] Refund quantity exceeding sold quantity net of prior refunds is rejected (FR-172).
- [ ] Refund is recorded against the original payment method (FR-188).

**Payments and cash**

- [ ] Payment states `PENDING`, `SUCCEEDED`, `FAILED`, `EXPIRED`, `ORPHANED` are all reachable and stored (FR-189).
- [ ] A payment success arriving after refund or sale cancellation is recorded `ORPHANED` without altering the sale (FR-186).
- [ ] A payment still `PENDING` after 15 minutes is marked `EXPIRED` by a background job (FR-187).
- [ ] Payment report groups by provider, state and date with sale references (FR-190).
- [ ] Manual payment correction creates an audited adjustment record instead of editing the payment (FR-192).

**Reporting and day closure**

- [ ] Sales report groups by day, week or month with filters for branch, cashier, category and payment method (FR-195).
- [ ] All report values derive from stored sale and refund records (FR-197).
- [ ] Stock report shows opening balance, movements by type, closing balance and valuation at cost per product/variant/branch (FR-198).
- [ ] Purchasing report groups by supplier and period and shows ordered value, received value, outstanding quantities and open PO count (FR-200, FR-201).
- [ ] Low-stock report shows quantity, reorder level and last movement date per branch and is exportable through the export job (FR-202, FR-203).

**Jobs, imports, exports and attachments**

- [ ] Exports, notifications, payment expiry and payment reconciliation run as Redis-backed background jobs (FR-213).
- [ ] Job status returns `queued`, `running`, `succeeded` or `failed` with error detail (FR-214).
- [ ] Export enqueues a job, returns a job id and exposes the file through an authenticated link (FR-215).
- [ ] A failed job retries a bounded number of times and then surfaces the failure in the UI (FR-216).
- [ ] Import job types `products`, `suppliers`, `categories` and `opening_stock` are supported (FR-207).
- [ ] Import applies rows row-by-row in a transaction and retains the error report (FR-209).
- [ ] Attachments attach to a record by entity type and entity id (FR-210).

### Part 3 — Role-Level Criteria

| Role | Passes when |
|---|---|
| Business Admin | Can manage business profile, branches, users, roles, catalogue, suppliers, purchase orders, reports and the audit log; cannot remove `admin.*` from its own role; cannot sign in without MFA; cannot read another tenant's data (FR-009, FR-025, FR-035, FR-045, FR-049, FR-053, FR-091). |
| Branch Manager | Can run branch operations and approvals; sees only own-branch balances, sales, transfers and audit entries; can approve or reject transfers and close received transfers; cannot sign in without MFA (FR-009, FR-042, FR-094, FR-118, FR-124, FR-174). |
| Cashier | Can search, sell, take payment, print and re-print receipts and issue refunds within permission; receives 403 on any branch-scoped operation without a branch assignment; MFA optional (FR-041, FR-059, FR-155, FR-166, FR-169). |
| Inventory Clerk | Can view balances and movements, adjust stock with a reason, raise and receive transfers, receive goods and record stock counts; receives 403 without a branch assignment; MFA optional (FR-041, FR-059, FR-109, FR-116, FR-129, FR-146). |
| Deactivated user | Sessions and refresh tokens revoked in one request; historical attribution preserved; cannot authenticate (FR-056, FR-057). |
| Multi-business user | Can hold roles in more than one business and switch context; switching to a tenant with no role returns 403 (FR-033, FR-055). |

### Part 4 — Security Acceptance Criteria

- [ ] Server-side authorization is enforced on every protected endpoint with default deny; no client-side-only permission check exists (FR-054, NFR-005).
- [ ] A user lacking permission receives 403, never 404 or 500 (FR-054).
- [ ] Every read and write of a business-owned record is tenant-scoped server-side; cross-tenant access is blocked (FR-028).
- [ ] A branch-scoped user cannot read another branch's balances, sales or transfers (FR-042).
- [ ] Password policy of at least 10 characters with mixed character classes is enforced on registration and reset (FR-002).
- [ ] Verification, reset, invitation and refresh tokens are hard-deleted on use or expiry (FR-008).
- [ ] Payment callbacks verify the provider signature/reference, store the provider event id and reject repeated events (FR-185).
- [ ] No card data is stored and no card processing or third-party checkout provider is integrated (ledger: mobile money via MTN MoMo and Airtel Money only).
- [ ] Object storage keys are tenant-prefixed; MIME allowlist is PDF, JPEG, PNG, XLSX, CSV; maximum file size enforced; access requires an authenticated short-lived signed URL; downloads are audited (FR-211, FR-212).
- [ ] No secrets are committed to the repository and no passwords, tokens or full payment credentials appear in logs (NFR-007).
- [ ] Audit entries are append-only with no edit or delete API (FR-093).
- [ ] Business registration and tax information is restricted to the Business Admin role (FR-034).
- [ ] Personal, financial and business registration data handling complies with the Ugandan Data Protection and Privacy Act 2019 (NFR-014).
- [ ] No unresolved P0 or P1 findings remain from security review at launch (NFR-005).

### Part 5 — Business-Rule and Data-Integrity Criteria

| Rule | Passes when |
|---|---|
| Immutable stock movement ledger (BR-001) | No endpoint or UI path updates or deletes a `stock_movements` row; the movement list is read-only (FR-106). |
| No negative stock unless configured (BR-002) | A commit that would take a balance negative while negative stock is disabled is rejected atomically with HTTP 409 and a machine-readable reason; negative stock is permitted only when the business or branch explicitly enables it (FR-113, FR-114). |
| Adjustments require a reason (BR-003) | Every adjustment carries a non-empty reason and writes exactly one movement and one audit entry (FR-109, FR-111). |
| Batch identity preserved (BR-004) | Batches are created or matched on receipt, resolved on sale and reversed to the original batch on refund (FR-147, FR-165, FR-170). |
| Expired batches excluded from sale (BR-005) | Expired batches never appear as sellable in POS and are flagged for write-off (FR-132, FR-158). |
| Transfers keep source and destination (BR-006) | Origin and destination are retained for the life of the transfer and a closed transfer is immutable (FR-125). |
| Balances reconcile to the ledger (BR-007) | Every balance equals the sum of movements for the same product/variant/batch/branch, and the stock report asserts this and reports drift (FR-102, FR-199). |
| No overselling (BR-008) | Stock is re-validated at the selling branch at commit time and unavailable stock returns HTTP 409 (FR-163). |
| Financial records deterministic from events (BR-009) | Reports derive from stored sale and refund records; client-supplied totals are never persisted (FR-160, FR-197). |
| AI never alters financial records or writes without confirmation (BR-010) | Not exercised in MVP: no AI endpoints, jobs or model providers are wired (Phase 5 deferred). |
| Tenant isolation and permissions server-side (BR-011) | Tenant scoping and permission checks are enforced on every request (FR-028, FR-054). |
| Audit all critical actions (BR-012) | Stock, money, permission, branch, catalogue price and settings actions each produce an audit entry (FR-095). |
| Idempotency and duplicate prevention | A repeated sale idempotency key returns the original sale; a repeated provider event id is rejected (FR-164, FR-185). |
| Transactional transitions | Every stock, money and state transition runs inside a database transaction (NFR-006). |
| Soft delete and retention | Business records are soft-deleted via `deleted_at`; tokens are hard-deleted; daily backups are retained 14 days (FR-031, FR-008, NFR-004). |

### Part 6 — Non-Functional Criteria

| ID | Acceptance criterion | Verification |
|---|---|---|
| NFR-001 | p95 ≤ 500 ms for reads and ≤ 1 s for writes at 50 concurrent users | Load test against staging with MVP data volumes |
| NFR-002 | Modular monolith, stateless API, connection pooling, pagination and indexed queries, with a retained path to horizontal scaling | Architecture review plus load test |
| NFR-003 | 99.5% monthly availability, subject to the hosting provider tier | Provider SLA plus uptime monitoring |
| NFR-004 | Daily automated backups retained 14 days; restoration tested in staging before launch | Backup job log plus recorded restore test |
| NFR-005 | No unresolved P0/P1 security findings; server-side authorization on all protected endpoints | Security review, automated scan, RBAC test suite |
| NFR-006 | Transactions for every stock, money and state transition; idempotency keys on sale submission; provider event ids on callbacks | Integration tests |
| NFR-007 | Centralized logging, error monitoring and audit logs with actor, action, target, timestamp and context; no passwords, tokens or full payment credentials logged | Log audit plus error-monitoring integration test |
| NFR-008 | WCAG 2.1 Level AA on all authenticated screens | Automated axe scan plus manual screen-reader pass on POS, sale, purchase order, transfer and dashboard |
| NFR-009 | Last two versions of Chrome, Firefox and Edge, Safari 14+, current Android Chrome; installable as a PWA | Cross-browser manual test plus PWA installability check |
| NFR-010 | Unit, integration and E2E suites exist as specified in Part 7 | CI test report |
| NFR-011 | All API errors return `{ error: { code, message, details, requestId } }` with no stack traces or secrets in production responses | API error review in staging |
| NFR-012 | English-only and i18n-ready, all user-facing strings externalized, UTC timestamps in API responses, USD display currency | Code review plus API response check |
| NFR-013 | All endpoints under `/v1/` and documented with OpenAPI; breaking changes require a new version prefix | Spec review plus contract test |
| NFR-014 | Ugandan Data Protection and Privacy Act 2019 compliance for personal, financial and business registration data | Data inventory plus retention and deletion review |
| NFR-015 | Release gated on financial correctness, stock reconciliation, duplicate prevention, E2E scenarios, verified backups and import error handling | Release checklist evidence |

### Part 7 — Testing Criteria

- [ ] Unit tests exist and pass for stock, pricing, tax, refund, purchase order, payment and permission logic (NFR-010).
- [ ] Integration tests exist and pass for sale + inventory, purchase order + receiving, transfers, supplier lifecycle, payment reconciliation and import (NFR-010).
- [ ] E2E scenarios A–G pass in staging against the deployed build (NFR-010).
- [ ] CI is green on every merge to the main branch; a red pipeline blocks merge (NFR-015).
- [ ] Release gates are evidenced: financial correctness, stock reconciliation, duplicate prevention, E2E scenarios, verified backups and import error handling (NFR-015).
- [ ] Tests never depend on live mobile money providers; provider callbacks are simulated with signed fixtures (FR-185).
- [ ] Assumption: forecasting unit tests and AI-authorization integration tests are recorded as not applicable in MVP, because forecasting and AI are deferred with Phase 5; the suite reports them explicitly rather than silently omitting them (NFR-010).
- [ ] Assumption: the coverage gate is ≥ 80% line coverage on backend/core business-logic modules (stock, pricing, tax, refund, purchase order, payment, permissions), measured by the CI coverage report.

### Part 8 — Documentation Criteria

- [ ] `README.md` documents local setup, required environment variables, run commands and the test commands.
- [ ] `AGENTS.md` documents the repository conventions an AI coding agent must follow.
- [ ] The OpenAPI document matches the implemented `/v1/` endpoints, with no documented endpoint that does not exist and no implemented endpoint that is undocumented (NFR-013).
- [ ] `.env.example` lists every variable the application reads. Assumption: names follow the patterns `DATABASE_URL`, `REDIS_URL`, `OBJECT_STORAGE_*`, `MTN_MOMO_*`, `AIRTEL_MONEY_*`, `WHATSAPP_*`, plus session/token secrets.
- [ ] Deployment documentation covers the managed Node host (Render or Railway) with managed PostgreSQL, the staging and production environments, and the CI/CD pipeline that builds and tests in Docker while the runtime path uses no Docker.
- [ ] Observability documentation describes centralized logging, error monitoring and the audit-log field set (actor, action, target, timestamp, context) (NFR-007).
- [ ] Runbooks exist for backup and restore, payment callback failures, stuck or failed background jobs, and rollback.
- [ ] Documentation states MVP limits explicitly and identifies the deferred phases (supplier ecosystem, finance, AI, expansion, React Native, patient medical records) instead of implying those endpoints or workflows are complete.
- [ ] Documentation states that the email channel is deferred and that phone verification plus WhatsApp are the notification channels in scope.

### Part 9 — Release-Readiness Criteria

- [ ] Staging and production environments are separate, each with its own database and object-storage partition.
- [ ] Health, readiness and version endpoints respond successfully in both environments.
- [ ] Smoke checks cover health, readiness, version and frontend reachability after every deploy.
- [ ] Database migrations are applied forward-only; no destructive migration ships without a documented forward fix.
- [ ] Backup and point-in-time-recovery expectations are stated explicitly, and the most recent restore test result is recorded (NFR-004).
- [ ] Rollback guidance distinguishes application rollback from schema forward fixes.
- [ ] Assumption: a single release command (`pnpm verify`) runs lint, typecheck, unit tests, integration tests and the smoke suite, and exits 0 before release.
- [ ] Any blocked verification gate is recorded with a classification of pre-existing or introduced by the change.

### Part 10 — Explicitly Out of Scope for MVP

No acceptance criterion may be claimed for the following; their absence is itself a pass condition.

- [ ] Phase 3 supplier ecosystem: marketplace listings, offers, marketplace orders, supplier-facing surfaces, and the marketplace-order workflow (deferred).
- [ ] Phase 4 finance: finance accounts, journal entries, expenses (deferred).
- [ ] Phase 5 AI capabilities: no AI endpoints, jobs or model providers, including the AI model orchestration layer (deferred).
- [ ] Phase 6 expansion (deferred).
- [ ] Dedicated React Native application (deferred); the responsive PWA is the only client.
- [ ] Patient medical records (explicitly out of scope).
- [ ] Email notification channel (deferred); no email provider is integrated.
- [ ] Subscription billing and collection.
- [ ] Platform-operator interface; internal support works through server-side tooling and managed database access, and such actions are audited.
- [ ] Card payments, card data storage and third-party checkout providers.
- [ ] Third-party authentication providers; authentication is built in-house.