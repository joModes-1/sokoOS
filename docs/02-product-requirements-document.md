# Product Requirements Document

**Product:** SokoOS — interconnected business operating platform for B2B commerce, inventory management and business operations
**Release:** MVP = Phase 1 Foundation + Phase 2 Business operations
**Document status:** Build-ready. Requirement IDs FR-001–FR-216 and NFR-001–NFR-015 are reused from `docs/01-executive-summary.md` and are not renumbered here. Business-rule IDs BR-001–BR-022 are introduced in this document.

## Vision

Enable retailers, pharmacies, wholesalers and distributors in Uganda to run commerce on one record of truth by giving shop-floor staff (cashier, inventory clerk) a fast, no-training operational surface for sales, stock and transfers; giving branch managers a place to approve and reconcile; and giving business administrators visibility, control over users, branches and permissions, and an auditable history of every action that moves stock or money.

The product exists because fragmented operations corrupt each other: the same physical stock and the same cash flow through inventory, sales, purchasing and reporting, so an error in one area silently breaks the others. SokoOS connects them into a single tenant-scoped system in which a sale, a goods receipt and a branch transfer all write to the same immutable stock movement ledger, the same balances and the same audit trail.

### Goals

1. Digitize daily commerce operations — catalogue, stock, purchasing, POS sales, receipts and refunds — in one tenant-scoped system with a single record of truth.
2. Make stock provably correct: balances derived from an immutable movement ledger, batch identity and expiry preserved, no overselling, no negative stock unless a business explicitly configures it.
3. Let a shop attendant complete a sale (scan or search, take payment, issue receipt) with no technical training and no dependency on connectivity being perfect at the moment of confirmation.
4. Give administrators governance: branches, users, roles and permissions enforced server-side, MFA for administrative roles, and audit logs with actor, action, target, timestamp and context.
5. Produce deterministic end-of-day numbers: cash count, discrepancy handling and a closure record that reconciles takings to recorded payments and sales.
6. Accept mobile money payments in the market's dominant channels (MTN MoMo and Airtel Money) alongside cash and other recorded methods.

### Product principles that constrain every requirement

| Principle | Consequence in this document |
|---|---|
| Interconnected, not modular silos | A sale writes a sale, sale items, a payment, a receipt and stock movements in one transaction; a goods receipt writes a receipt, movements, batches and PO quantities in one transaction |
| Inventory is derived, never typed in | Users never edit `inventory_balances`; balances are computed and reconciled from `stock_movements` |
| Simple enough for an attendant | POS default flow is ≤ 3 taps from scan to payment; every operation has a keyboard/scanner path |
| Tenant isolation server-side | Every endpoint re-checks tenant, role, permission and branch; client-side hiding is display-only |
| Deterministic finance and stock | Financial and stock records are derivable from stored events; no client-supplied totals are trusted |
| Deferred means not built | Phase 3–6 entities (marketplace listings/offers/orders, finance accounts/journal entries/expenses, AI, expansion) have no tables, screens or endpoints in MVP |

## Personas

| Persona | SokoOS role | Role title in the business | Main problems | Key needs |
|---|---|---|---|---|
| Retail shop owner | Business Admin | Owner / director | Cannot see true stock or daily takings across shops; loses money to untracked sales and shrinkage; staff turnover breaks spreadsheets | One dashboard for sales, stock and low-stock items; control of staff, branches and permissions; audit history |
| Pharmacy operator | Business Admin | Superintendent pharmacist | Batch and expiry control on paper; risk of selling expired medicine; no batch traceability to a supplier | Batch-tracked stock, expiry excluded from sale at the moment of sale, mandatory adjustment reasons, auditable movement ledger |
| Wholesaler / distributor manager | Business Admin | General manager | Bulk orders promised against unverified stock; inconsistent pricing across customers; outstanding purchase orders untracked | Accurate branch and warehouse balances, no overselling, purchase orders with receiving and outstanding quantities |
| Branch manager | Branch Manager | Branch / store manager | Approves transfers and corrections with no paper trail; cannot reconcile the till at close | Branch-scoped operations, approval queue with recorded decisions, end-of-day cash count and closure |
| Cashier / shop attendant | Cashier | Cashier / shop attendant | Slow tills, handwritten receipts, stock counts that never match sales; unfamiliar software | Scan-or-search POS, mobile money and cash payment, printed or sent receipt, no training required, retry-safe on poor connectivity |
| Inventory clerk / store keeper | Inventory Clerk | Store keeper | Manual stock cards, no transfer record, no reason trail for adjustments, no expiry visibility | Stock movements, batch receiving with expiry, transfer request/dispatch/receive, mandatory adjustment reasons, low-stock list |
| Support operator (internal) | No application role in MVP | Founding team | Needs to diagnose tenant issues without a product surface | Assumption: internal support works through managed database access and server-side tooling; no platform-operator UI in MVP |

### Role capability matrix (backend-authoritative)

| Capability | Business Admin | Branch Manager | Cashier | Inventory Clerk |
|---|---|---|---|---|
| Manage business profile, registration/tax details | Yes | No | No | No |
| Manage branches and assign users to branches | Yes | No | No | No |
| Invite users, assign roles, manage role permissions | Yes | No | No | No |
| Manage catalogue (categories, brands, products, variants, images) | Yes | Branch price/reorder-level edits only (assumption: `catalogue.branch.update`) | Read-only lookup in POS | Read-only lookup |
| Record stock adjustment | Yes | Yes | No | Yes |
| Approve / reject stock transfer | Yes | Yes | No | No |
| Request / dispatch / receive stock transfer | Yes | Yes | No | Yes |
| Create, submit, confirm purchase order | Yes | Yes | No | Create draft only (assumption: `po.create`) |
| Receive goods against a PO | Yes | Yes | No | Yes |
| Complete a sale in POS | Yes | Yes | Yes | No |
| Issue a refund | Yes | With `sales.refund` permission (assumption: Branch Manager holds it) | No | No |
| Record stock count | Yes | Yes | No | Yes |
| Perform cash count and close the day | Yes | Yes | Yes (own till session) | No |
| View dashboard and reports | All branches | Own branch | Own branch, own till | Own branch |
| View audit log | Yes | Branch-scoped | No | No |
| Modify MFA requirement | Yes | No | No | No |

| Role | Access scope | MFA |
|---|---|---|
| Business Admin | Full access to the business, all branches | Required |
| Branch Manager | Branch operations and approvals | Required (assumption: admin-level approvals) |
| Cashier | POS, sales, own till session | Optional |
| Inventory Clerk | Stock and transfers | Optional |

Assumption: one user account may hold roles in more than one business, resolved through `user_roles`; the interface shows one active business and one active branch at a time, selected in a header switcher and stored on the session.

## User Stories

Priority: **P0** = required for launch and a release gate; **P1** = important, shippable without; **P2** = nice to have.

### Identity and access (FR-001–FR-020)

| ID | Story | Priority | Acceptance criteria | FR |
|---|---|---|---|---|
| US-001 | As a business owner, I want to sign up with email and password so that I can create an account for my business. | P0 | `POST /v1/auth/register` validates email format and password policy (min 10 chars, mixed classes); duplicate email returns `409`; account created in `PENDING_VERIFICATION`; no business data visible before verification | FR-001 |
| US-002 | As a new user, I want to verify my account by phone (primary) and email (when the email channel is enabled) so that my identity is confirmed. | P0 | Verification code sent through the chosen messaging provider; code expires in 10 minutes (assumption); max 5 attempts; account moves `PENDING_VERIFICATION → ACTIVE`; expired/consumed tokens rejected; verification token hard-deleted after use | FR-005 |
| US-003 | As an admin user, I want MFA on sign-in so that my account and my business data are protected. | P0 | Sign-in for Business Admin and Branch Manager returns `mfa_required` and a short-lived challenge; MFA cannot be disabled for admin roles; enabling/disabling MFA writes an audit entry | FR-009 |
| US-004 | As a user, I want to reset a forgotten password so that I can regain access. | P0 | Reset request returns `202` whether or not the email exists; reset token single-use, expires in 30 minutes (assumption); successful reset invalidates all existing sessions | FR-013 |
| US-005 | As a user, I want to see and revoke my active sessions so that I can end access on a lost device. | P1 | `GET /v1/auth/sessions` lists device, IP, last-used timestamp; `DELETE /v1/auth/sessions/{id}` revokes that session within 1 request | FR-016 |
| US-006 | As an admin, I want MFA enrolment and recovery so that a lost device does not lock the business out. | P0 | `POST /v1/auth/mfa/enroll` returns a secret and recovery codes shown once; recovery code use is single-use and audited; assumption: loss of all recovery codes requires a second Business Admin to reset the enrolment | FR-010 |
| US-007 | As the platform, I want failed sign-ins rate-limited and locked so that credential stuffing fails. | P0 | Assumption: 10 failed attempts per email per 15 minutes triggers a 15-minute lockout; lockout and rate-limit events are logged and audited; lockout message does not disclose whether the email exists | FR-018 |

### Business registration and tenancy (FR-021–FR-034)

| ID | Story | Priority | Acceptance criteria | FR |
|---|---|---|---|---|
| US-008 | As an owner, I want to register my business so that I get an isolated tenant workspace. | P0 | `POST /v1/businesses` creates `businesses` row plus owner `user_roles` as Business Admin in one transaction; business type captured (retail, pharmacy, wholesale, distribution); slug/identifier unique; assumption: self-service with no platform approval step | FR-021 |
| US-009 | As an admin, I want to maintain my business profile, registration and tax details so that records are compliant and correct. | P0 | `PATCH /v1/businesses/{id}` accepts legal name, TIN, registration number, address, contact phone, currency; every change writes an audit entry with before/after | FR-025 |
| US-010 | As an admin, I want to see my subscription record so that I know my plan and status. | P1 | `GET /v1/businesses/{id}/subscription` returns plan, status, period start/end; assumption: subscription billing and collection are not implemented in MVP | FR-029 |
| US-011 | As a user with roles in more than one business, I want to switch the active business so that I work in the right tenant. | P1 | `POST /v1/auth/active-context` sets business and branch; server re-validates membership on every subsequent request; a switch to a tenant the user has no role in returns `403` | FR-032 |

### Branch management (FR-035–FR-044)

| ID | Story | Priority | Acceptance criteria | FR |
|---|---|---|---|---|
| US-012 | As an admin, I want to create and edit branches so that each location transacts separately. | P0 | `POST /v1/branches` and `PATCH /v1/branches/{id}`; fields name, code (unique per tenant), address, phone, `is_warehouse` flag; deactivating a branch blocks new sales there but keeps history readable | FR-035 |
| US-013 | As an admin, I want to assign users to branches so that branch restrictions are enforced. | P0 | `POST /v1/branches/{id}/users` creates branch assignment; a Cashier or Inventory Clerk with no branch assignment receives `403` on branch-scoped operations; a branch-scoped user cannot read another branch's balances, sales or transfers | FR-040 |

### Users, roles and permissions (FR-045–FR-060)

| ID | Story | Priority | Acceptance criteria | FR |
|---|---|---|---|---|
| US-014 | As an admin, I want to invite a user with a role and branch so that staff can start working. | P0 | Invitation created with email/phone, role, branch scope; invite token single-use and expiring (assumption: 7 days); invited user accepts, sets password, is bound by MFA rules of the assigned role | FR-045 |
| US-015 | As an admin, I want to change a user's role so that access tracks responsibility. | P0 | `POST /v1/users/{id}/roles` replaces `user_roles`; change takes effect on the user's next request; role change audited with actor and target | FR-049 |
| US-016 | As an admin, I want to manage what each role can do so that I can adapt SokoOS to my business. | P1 | `GET /v1/roles`, `POST /v1/roles`, `PUT /v1/roles/{id}/permissions` write `role_permissions`; assumption: the four system roles exist per tenant and are editable except that `admin.*` permissions cannot be removed from Business Admin | FR-052 |
| US-017 | As an admin, I want to deactivate a user so that a departed employee loses access immediately. | P0 | Deactivation revokes active sessions and refresh tokens within 1 request; the user's historical sales, receipts and movements remain attributable and readable; deactivation audited | FR-056 |

### Product catalogue (FR-061–FR-080)

| ID | Story | Priority | Acceptance criteria | FR |
|---|---|---|---|---|
| US-018 | As an admin, I want to manage categories so that my catalogue is organised. | P0 | `GET/POST/PATCH /v1/categories` with tenant scoping, name uniqueness per tenant, soft delete; a category in use cannot be hard-deleted | FR-061 |
| US-019 | As an admin, I want to manage brands so that products are attributable to suppliers' brands. | P0 | `GET/POST/PATCH /v1/brands`; soft delete; brand names unique per tenant (case-insensitive) | FR-064 |
| US-020 | As an admin, I want to create products with cost price, selling price, tax and unit so that sales and stock are valued correctly. | P0 | `POST /v1/products` accepts name, category, brand, unit of measure, cost price, selling price, tax rate/class, `is_batch_tracked`, `reorder_level`; selling price below cost is allowed but flagged with a warning; money stored as integer minor units with explicit currency | FR-067 |
| US-021 | As an admin, I want product variants with SKU and barcode so that scanning resolves the exact item. | P0 | `POST /v1/products/{id}/variants`; SKU unique per tenant; barcode unique per tenant when present; a barcode scan resolves to exactly one variant or returns a clear "not found" without blocking the POS | FR-071 |
| US-022 | As an admin, I want product images stored in tenant-partitioned object storage so that staff can identify items. | P1 | Upload via pre-signed URL to a tenant-prefixed object key; MIME type restricted to image types; max size enforced (assumption: 5 MB); reads served through short-lived signed URLs | FR-075 |
| US-023 | As an admin, I want to bulk import my catalogue from CSV/XLSX so that I do not retype hundreds of products. | P1 | See US-063; catalogue import validates required columns, duplicate SKU/barcode, numeric prices and unknown categories, and reports per-row errors without partially applying a failed row | FR-078 |

### Dashboard and notifications (FR-081–FR-090)

| ID | Story | Priority | Acceptance criteria | FR |
|---|---|---|---|---|
| US-024 | As an admin or branch manager, I want a dashboard of today's sales, low stock and pending approvals so that I can act without running reports. | P0 | `GET /v1/dashboard/summary` returns today's sales total, transaction count, top items, low-stock count, pending transfer approvals, pending PO items, open cash session; Branch Manager results are branch-scoped | FR-081 |
| US-025 | As a user, I want in-app notifications so that I learn about approvals, transfers, receipts and stock alerts. | P0 | Notifications created for: transfer requested/approved/dispatched/received, PO submitted/confirmed/received, low-stock threshold crossed, refund issued, day closed; unread count in the header; mark-as-read audited | FR-084 |
| US-026 | As a user, I want to choose my notification channels so that I am not flooded. | P1 | `GET/PATCH /v1/notification-preferences` per user, per event type, per channel; in-app is always on; WhatsApp is selectable when the provider is enabled (subject to provider) | FR-087 |

### Audit log (FR-091–FR-100)

| ID | Story | Priority | Acceptance criteria | FR |
|---|---|---|---|---|
| US-027 | As an admin, I want to search the audit log so that I can answer who did what, when and against which record. | P0 | `GET /v1/audit-logs` filters by actor, action, target type, target id and date range; each entry contains actor, action, target, timestamp and context; entries are append-only and never editable through the API; Branch Manager sees branch-scoped entries only | FR-091 |

### Inventory and stock (FR-101–FR-132)

| ID | Story | Priority | Acceptance criteria | FR |
|---|---|---|---|---|
| US-028 | As an inventory clerk, I want to see stock balances per product, variant, batch and branch so that I know what is on hand. | P0 | `GET /v1/inventory/balances` filters by branch, category, brand, product and low-stock; balance equals the sum of `stock_movements` for that product/variant/batch/branch; expired batches listed separately | FR-101 |
| US-029 | As an admin, I want to see the stock movement ledger so that I can trace how a balance was reached. | P0 | `GET /v1/stock-movements` returns movement type, quantity signed, reference (sale, goods receipt, transfer, adjustment), batch, actor, timestamp; movements are never updated or deleted through any endpoint or UI | FR-105 |
| US-030 | As an inventory clerk, I want to record a stock adjustment with a reason so that corrections are explained and auditable. | P0 | `POST /v1/stock-adjustments` requires a non-empty reason, product/variant, branch, quantity delta and (for batch-tracked products) batch; unapproved adjustment attempt without permission returns `403`; adjustment writes one movement and an audit entry | FR-109 |
| US-031 | As an admin, I want to allow negative stock at specific branches so that my operation is not blocked where it is normal. | P2 | Assumption: `businesses.allow_negative_stock` defaults `false`, overridable per branch; when enabled, the sale still records the movement and the balance is shown in red; when disabled, a commit that would go negative is rejected with `409` and a machine-readable reason | FR-113 |
| US-032 | As an inventory clerk, I want to request a stock transfer so that another branch can supply stock. | P0 | `POST /v1/stock-transfers` creates state `REQUESTED` with origin branch, destination branch, lines (product/variant/batch, quantity); source and destination are always retained; no movement is written at request time | FR-116 |
| US-033 | As a branch manager, I want to approve or reject a transfer so that stock movement is controlled. | P0 | `POST /v1/stock-transfers/{id}/approve` and `/reject`; rejection requires a reason; only `REQUESTED → APPROVED` or `REQUESTED → REJECTED` transitions accepted; decision recorded with actor and audit entry | FR-118 |
| US-034 | As a branch manager, I want to dispatch an approved transfer so that the source branch is debited. | P0 | `/dispatch` writes negative movements at the origin branch inside a transaction that checks availability; insufficient stock rejects the whole dispatch with `409`; state `APPROVED → DISPATCHED` | FR-120 |
| US-035 | As an inventory clerk, I want to receive a dispatched transfer so that the destination branch is credited. | P0 | `/receive` accepts received quantities per line (defaulting to dispatched) and writes positive movements at the destination branch; a shortfall requires a note and is recorded as the transfer discrepancy; batch identity is carried through unchanged; state `DISPATCHED → RECEIVED` | FR-122 |
| US-036 | As a branch manager, I want to close a received transfer so that it leaves the open list. | P1 | `/close` requires state `RECEIVED`; a transfer with an unresolved discrepancy cannot be closed until the note is acknowledged; state `RECEIVED → CLOSED`; closed transfers are immutable | FR-124 |
| US-037 | As an admin, I want a low-stock list so that I can replenish before I run out. | P0 | `GET /v1/inventory/low-stock` compares balances to `reorder_level` per product/variant per branch; crossing the threshold creates a notification and is visible on the dashboard | FR-126 |
| US-038 | As an inventory clerk, I want to record a stock count so that balances match physical reality. | P1 | `POST /v1/stock-counts` captures counted quantities per product/variant/batch for a branch; the system computes the delta and raises an adjustment per line with reason `STOCK_COUNT`; the count cannot directly set a balance | FR-129 |
| US-039 | As a pharmacy operator, I want batches with expiry dates so that expired medicine is never sold. | P0 | Batches captured on goods receipt with batch number and expiry; `GET /v1/inventory/batches` shows expiry and days remaining; expiry is evaluated at the moment of sale, not only at receiving; expired batches are excluded from sale and flagged for write-off | FR-131 |

### Purchasing (FR-133–FR-154)

| ID | Story | Priority | Acceptance criteria | FR |
|---|---|---|---|---|
| US-040 | As an admin, I want to manage suppliers so that purchase orders are attributed and repeatable. | P0 | `GET/POST/PATCH /v1/suppliers` with name, contact person, phone, email, address, TIN, payment terms; soft delete; supplier names unique per tenant; assumption: suppliers are not SokoOS users in MVP | FR-133 |
| US-041 | As an admin, I want to create a draft purchase order so that I can build an order over time. | P0 | `POST /v1/purchase-orders` creates state `DRAFT` with supplier, branch, expected date, lines (product/variant, quantity, unit cost, tax); draft totals computed server-side; drafts are editable | FR-137 |
| US-042 | As an admin, I want to submit a purchase order so that it becomes a commitment. | P0 | `/submit` requires at least one line with quantity > 0 and a supplier; state `DRAFT → SUBMITTED`; submission audited; submitted POs are not editable (changes require cancellation and a new PO — assumption: cancellation is admin-only and audited) | FR-140 |
| US-043 | As a branch manager, I want to confirm a purchase order so that receiving can start. | P0 | `/confirm` requires permission `po.confirm`; state `SUBMITTED → CONFIRMED`; confirmation records actor and timestamp and notifies the requesting branch | FR-142 |
| US-044 | As an inventory clerk, I want to receive goods against a PO into batches so that stock and payables quantities match reality. | P0 | `POST /v1/goods-receipts` references a `CONFIRMED` or `PARTIALLY_RECEIVED` PO; per line captures received quantity, unit cost, batch number and expiry where batch-tracked; receiving writes positive movements plus batches, records `goods_receipts` and `goods_receipt_items`, and increments received quantities atomically; over-receipt beyond ordered quantity requires explicit confirmation (assumption) and is flagged | FR-145 |
| US-045 | As an admin, I want to see PO status and outstanding quantities so that I know what is still owed. | P0 | PO detail shows ordered vs received vs outstanding per line and the current state; `PARTIALLY_RECEIVED` set when some but not all lines are fully received | FR-150 |
| US-046 | As an admin, I want to close a purchase order so that the record is final. | P1 | `/close` allowed from `RECEIVED` or from `PARTIALLY_RECEIVED` with a stated reason for the shortfall; state → `CLOSED`; closure audited | FR-152 |

### Sales and POS (FR-155–FR-178)

| ID | Story | Priority | Acceptance criteria | FR |
|---|---|---|---|---|
| US-047 | As a cashier, I want to scan or search for a product in POS so that I can add it to a sale fast. | P0 | `GET /v1/products/search?q=&branch_id=` matches name, SKU or barcode; scanner input adds the exact variant; out-of-stock items are visible but cannot be committed; expired batches never appear as sellable | FR-155 |
| US-048 | As a cashier, I want a cart with quantities, tax and discount so that the customer sees the right total. | P0 | Line quantity editable; server recomputes subtotal, tax and total (client totals are display-only); assumption: line discount requires `sales.discount` permission and is capped at a configurable maximum percentage | FR-159 |
| US-049 | As a cashier, I want to complete a sale so that the customer pays and stock is reduced. | P0 | `POST /v1/sales` with an idempotency key creates `sales` + `sale_items` + stock movements + payment link in one transaction; server re-validates stock at the selling branch and rejects with `409` if unavailable; a repeated idempotency key returns the original sale, never a duplicate; sale state `COMPLETED` | FR-162 |
| US-050 | As a cashier, I want to give the customer a receipt so that the sale is evidenced. | P0 | On completion a `receipts` record is created with a tenant-unique number; print view and PDF render from stored sale data only; receipt can be re-printed without creating a new sale or movement | FR-166 |
| US-051 | As a branch manager, I want to refund a sale fully or partially so that returns are handled correctly. | P0 | `POST /v1/sales/{id}/refunds` records `refunds` and refund lines, writes reversing stock movements to the original batch where batch-tracked, and updates the sale to `REFUNDED` or `PARTIALLY_REFUNDED`; a refund can never exceed the refundable quantity; refund requires permission and is audited | FR-169 |
| US-052 | As an admin, I want to search sale history so that I can answer customer and staff questions. | P1 | `GET /v1/sales` filters by date range, branch, cashier, payment method, state and receipt number; branch-scoped users see only their branch | FR-173 |
| US-053 | As a cashier, I want to park a sale and resume it so that a customer can fetch a forgotten item. | P2 | Assumption: parked sales are held client-side in the POS session only; no server-side parked-sale entity in MVP, so a page reload discards an unpaid cart | FR-176 |

### Payments, receipts and refunds (FR-179–FR-194)

| ID | Story | Priority | Acceptance criteria | FR |
|---|---|---|---|---|
| US-054 | As a cashier, I want to take a mobile money payment so that the customer pays the way they normally do. | P0 | `POST /v1/payments/mobile-money` with provider `mtn_momo` or `airtel_money`, amount, currency, payer phone and sale reference; payment created in `PENDING`; the provider's confirmation arrives by callback and moves it to `SUCCEEDED` or `FAILED`; the cashier screen polls the payment state and never marks a sale paid from a client signal alone | FR-179 |
| US-055 | As a cashier, I want to record a cash payment and see change so that cash sales are counted correctly. | P0 | Cash amount tendered recorded; change computed server-side; payment moves directly to `SUCCEEDED`; a cash payment is attributable to the cashier's open cash session | FR-183 |
| US-056 | As the platform, I want payment callbacks verified and idempotent so that duplicate provider events never double-count money. | P0 | Callback handler verifies the provider signature/reference, stores the provider event id and rejects repeats; a success arriving after a refund or after sale cancellation is recorded as `ORPHANED` for reconciliation and does not alter the sale; a payment in `PENDING` beyond a configurable window (assumption: 15 minutes) is marked `EXPIRED` by a background job | FR-186 |
| US-057 | As an admin, I want payments reconciled against sales daily so that mobile money settlement can be checked. | P0 | `GET /v1/reports/payments` lists payments by provider, state and date with sale references; mismatch list shows payments without a completed sale and sales without a successful payment; a manual correction creates an audited adjustment record rather than editing the payment | FR-190 |

### Reporting and end-of-day reconciliation (FR-195–FR-206)

| ID | Story | Priority | Acceptance criteria | FR |
|---|---|---|---|---|
| US-058 | As an admin, I want a sales report so that I can see performance by period, branch, cashier and item. | P0 | `GET /v1/reports/sales` groups by day/week/month with filters for branch, cashier, category, payment method; totals exclude refunds and show refunds separately; values derive from stored sale and refund records, not recomputation of client input | FR-195 |
| US-059 | As an admin, I want a stock report so that I can see valuation and movement over a period. | P0 | `GET /v1/reports/stock` returns opening balance, movements by type, closing balance and valuation at cost per product/variant/branch; a reconciliation check asserts closing balance equals the sum of movements and reports any drift | FR-198 |
| US-060 | As an admin, I want a purchasing report so that I can see supplier spend and open commitments. | P1 | `GET /v1/reports/purchasing` groups by supplier and period, showing ordered value, received value, outstanding quantities and open PO count | FR-200 |
| US-061 | As an admin, I want a low-stock report so that I can plan replenishment. | P0 | `GET /v1/reports/low-stock` lists items at or below reorder level by branch including quantity, reorder level and last movement date; assumption: the report can be exported through US-066 | FR-202 |
| US-062 | As a branch manager, I want to count cash and close the day so that discrepancies are found the same day. | P0 | `POST /v1/day-closures` snapshots expected cash (cash payments minus cash refunds for the branch and session), records counted cash, computes the discrepancy, requires a reason when the discrepancy is non-zero, and moves the closure to `CLOSED`; a closed day is immutable and audited; a new closure for the same branch and date is rejected | FR-204 |

### Data import, attachments and background jobs (FR-207–FR-216)

| ID | Story | Priority | Acceptance criteria | FR |
|---|---|---|---|---|
| US-063 | As an admin, I want to import data from CSV/XLSX with clear error reporting so that migration does not corrupt my data. | P0 | `POST /v1/imports` with a job type (`products`, `suppliers`, `categories`, `opening_stock`); file type and size validated; each row validated independently; a report lists row number, column, value and error; the import is applied row-by-row in a transaction with the error report retained; the import-error release gate applies | FR-207 |
| US-064 | As a user, I want to attach documents to records so that supporting evidence lives with the record. | P1 | `POST /v1/attachments` with entity type and id; MIME allowlist (PDF, JPEG, PNG, XLSX, CSV); max size enforced; object key prefixed by tenant id; access requires an authenticated short-lived signed URL; downloads audited | FR-210 |
| US-065 | As an admin, I want long-running work handled in the background so that the app stays responsive. | P0 | Redis-backed jobs for exports, notifications, payment expiry and reconciliation; `GET /v1/jobs/{id}` returns queued/running/succeeded/failed with error detail; a failed job is retried a bounded number of times and then surfaced in the UI | FR-213 |
| US-066 | As an admin, I want to export a report to CSV/XLSX so that I can work with it offline. | P1 | `POST /v1/exports` enqueues a job and returns a job id; when the job succeeds the file is downloadable through an authenticated link; exports respect the requester's tenant and branch scope | FR-215 |

## Workflows

### W1 — POS sale (scan/search → payment → receipt)

Roles: Cashier (Business Admin or Branch Manager may also operate POS).

1. Cashier signs in and opens POS at an assigned branch; the branch is fixed by session context.
2. Cashier scans a barcode or types a search term; `GET /v1/products/search` resolves the exact variant, showing sellable quantity at that branch (expired batches excluded).
3. Product added to cart; cashier adjusts quantity; discount applied only with permission; totals recomputed server-side.
4. Cashier selects payment method(s): mobile money (MTN MoMo or Airtel Money) or cash; a sale may be split across methods (assumption: at most two tenders per sale).
5. `POST /v1/sales` with an idempotency key commits `sales`, `sale_items`, stock movements (one per line, batch-resolved, FEFO within non-expired batches — assumption), payment records, and a `receipts` record in one transaction. If available stock is insufficient and negative stock is not configured, the whole request fails with `409` and no partial write.
6. For mobile money, the sale waits in `AWAITING_PAYMENT` while `POST /v1/payments/mobile-money` initiates the collection; the screen polls payment state; the provider callback confirms; the sale moves to `COMPLETED`. On failure or timeout, the cashier may retry the tender or switch to cash; stock movements are only committed on the successful sale transaction.
7. Receipt is printed or shared; re-printing reads stored sale data only. Sale state: `COMPLETED`. Later: `PARTIALLY_REFUNDED` / `REFUNDED` / `RETURNED`.
8. Audit entries written for sale completion, discount above threshold, refund, and payment state changes.

### W2 — Purchasing (PO creation → goods receiving)

Roles: Business Admin, Branch Manager, Inventory Clerk.

1. Inventory Clerk or Branch Manager identifies a need (often from the low-stock list, `GET /v1/inventory/low-stock`).
2. `POST /v1/purchase-orders` creates a `DRAFT` with supplier, destination branch, expected date and lines (product/variant, quantity, unit cost, tax).
3. `/submit` moves `DRAFT → SUBMITTED` and audits the submission.
4. Business Admin (or Branch Manager with `po.confirm`) calls `/confirm`: `SUBMITTED → CONFIRMED`; the requesting branch is notified.
5. Goods arrive; Inventory Clerk creates a goods receipt: `POST /v1/goods-receipts` with per-line received quantity, unit cost, batch number and expiry (mandatory for batch-tracked products).
6. The receipt transaction writes positive stock movements, creates or matches `stock_batches`, records `goods_receipts` and `goods_receipt_items`, and updates received quantities on the PO.
7. PO state becomes `PARTIALLY_RECEIVED` when some lines are incomplete and `RECEIVED` when all ordered quantities are received.
8. Business Admin calls `/close` from `RECEIVED`, or from `PARTIALLY_RECEIVED` with a stated shortfall reason: `CLOSED`. Closed POs are immutable. Audit entries on submit, confirm, each receipt and close.

### W3 — Multi-branch stock transfer (request → approval → dispatch → receipt)

Roles: Inventory Clerk (request, dispatch, receive), Branch Manager (approve/reject, close).

1. Inventory Clerk at the destination branch calls `POST /v1/stock-transfers`: state `REQUESTED`, with origin and destination branch, lines with product/variant/batch and quantity. No movements are written.
2. Origin-branch Branch Manager reviews the request and calls `/approve` or `/reject` (rejection requires a reason). `REQUESTED → APPROVED` or `REQUESTED → REJECTED`.
3. On approval, origin branch dispatches with `/dispatch`: negative movements written at the origin inside a stock-checked transaction. Insufficient stock rejects the whole dispatch with `409`. `APPROVED → DISPATCHED`.
4. Destination branch receives with `/receive`: positive movements at the destination; received quantities may be less than dispatched, requiring a note; the discrepancy is stored on the transfer. `DISPATCHED → RECEIVED`.
5. Branch Manager closes the transfer with `/close` after any discrepancy is acknowledged: `RECEIVED → CLOSED`.
6. Source and destination branches are retained on the transfer for its entire life; a closed transfer cannot transition again. Audit entries on request, approve/reject, dispatch, receive and close.

### W4 — Stock replenishment (low stock detection → PO)

Roles: Automated detection, then Business Admin / Branch Manager / Inventory Clerk.

1. Every committed movement (sale, dispatch, adjustment) re-evaluates the affected product/variant balance at that branch against `reorder_level`.
2. When the balance crosses to at or below `reorder_level`, a low-stock notification is created and the item appears on the dashboard and in `GET /v1/reports/low-stock`. Re-notification is suppressed until the balance rises above the threshold (assumption: a 24-hour suppression window prevents notification storms).
3. An operator opens the low-stock list, selects items and creates a draft purchase order pre-filled with the default supplier and a suggested quantity (assumption: suggested quantity = reorder level − current balance, rounded up to the order multiple).
4. The draft continues through workflow W2 from step 3.
5. On goods receipt, the balance rises above the threshold and the item clears from the low-stock list.

### W5 — End-of-day reconciliation (cash count → discrepancy → closure)

Roles: Cashier (own session), Branch Manager, Business Admin.

1. Cashier stops taking new sales on the till session (assumption: a cash session is opened implicitly on the first cash payment of the day and closed at day closure).
2. Branch Manager opens the end-of-day screen and reviews expected cash: cash payments received minus cash refunds paid, for that branch and session.
3. Manager enters counted cash per denomination or as a single total; the system computes the discrepancy server-side.
4. A non-zero discrepancy requires a reason and optionally an attachment; the discrepancy and reason are stored on the closure record.
5. Manager confirms closure: `POST /v1/day-closures` snapshots the day's sales totals, payment totals by method, refund totals, expected cash, counted cash, discrepancy and reason; state becomes `CLOSED`.
6. A closed day is immutable; corrections are new audited adjustment records. A second closure for the same branch and business date is rejected with `409`. Audit entry written for the closure and for any discrepancy above the configured tolerance (assumption: tolerance defaults to zero, configurable per branch).

### W6 — Marketplace order (deferred; recorded for traceability only)

The marketplace order workflow named in the decision ledger — search, compare, order, accept/reject, dispatch, receipt — belongs to Phase 3 Supplier ecosystem. It is **not implemented in MVP**: no marketplace listing, offer, marketplace order, or supplier-facing surface exists. The MVP deliberately builds the primitives it depends on: catalogue with variants and pricing, branch balances, immutable movements, transfers with dispatch and receipt, and purchase orders. See **Deferred**.

### Illustrative state machines

| Entity | States | Allowed transitions (MVP) |
|---|---|---|
| `purchase_orders` | DRAFT, SUBMITTED, CONFIRMED, PARTIALLY_RECEIVED, RECEIVED, CLOSED | DRAFT→SUBMITTED; SUBMITTED→CONFIRMED; CONFIRMED→PARTIALLY_RECEIVED; CONFIRMED→RECEIVED; PARTIALLY_RECEIVED→PARTIALLY_RECEIVED; PARTIALLY_RECEIVED→RECEIVED; RECEIVED→CLOSED; PARTIALLY_RECEIVED→CLOSED (with shortfall reason) |
| `stock_transfers` | REQUESTED, APPROVED, REJECTED, DISPATCHED, RECEIVED, CLOSED | REQUESTED→APPROVED; REQUESTED→REJECTED; APPROVED→DISPATCHED; DISPATCHED→RECEIVED; RECEIVED→CLOSED |
| `sales` | AWAITING_PAYMENT, COMPLETED, PARTIALLY_REFUNDED, REFUNDED, RETURNED | AWAITING_PAYMENT→COMPLETED; AWAITING_PAYMENT→CANCELLED (assumption); COMPLETED→PARTIALLY_REFUNDED; COMPLETED→REFUNDED; COMPLETED→RETURNED; PARTIALLY_REFUNDED→REFUNDED |
| `payments` | PENDING, SUCCEEDED, FAILED, EXPIRED, ORPHANED | PENDING→SUCCEEDED; PENDING→FAILED; PENDING→EXPIRED; SUCCEEDED→ORPHANED (only when the linked sale is cancelled or refunded) |
| `users` | PENDING_VERIFICATION, ACTIVE, SUSPENDED, DEACTIVATED | PENDING_VERIFICATION→ACTIVE; ACTIVE→SUSPENDED; ACTIVE→DEACTIVATED; SUSPENDED→ACTIVE |
| `day_closures` | OPEN, CLOSED | OPEN→CLOSED |

## Business Rules

These invariants hold regardless of user action, client behaviour or request shape. Each is enforced server-side; the enforcement column names the controlled point.

| ID | Rule | Enforcement point |
|---|---|---|
| BR-001 | The stock movement ledger is immutable: a `stock_movements` row is never updated or deleted. Corrections are new movements with their own reason and actor. | Movement service exposes insert and read only; no update/delete endpoints; database privilege denies UPDATE/DELETE on the table for the application role |
| BR-002 | Balances are derived: `inventory_balances` must equal the sum of movements for the same product, variant, batch and branch. Balances are never edited directly by a user. | Balance projection updated inside the same transaction as every movement; reconciliation check in the stock report and release gate |
| BR-003 | No negative stock unless the business (or branch override) has explicitly enabled it. Any commit that would go negative is rejected atomically with `409` and a machine-readable reason. | Stock availability check inside the sale, dispatch, adjustment and transfer transactions |
| BR-004 | Every stock adjustment requires a non-empty reason and an attributable actor. | `POST /v1/stock-adjustments` validation plus audit entry |
| BR-005 | Batch identity is preserved end to end: receiving, transfers, sales and refunds carry the batch; batches are never merged, renamed or split. | Batch id is a required field on batch-tracked movements; transfer lines and sale lines store batch ids |
| BR-006 | Expired batches are excluded from sale. Expiry is evaluated at sale time, not only at receiving or dispatch. | Product search and sale commit filter `expires_at > now()`; expired batch stock is listed separately for write-off |
| BR-007 | A transfer always retains its source and destination branch, and both dispatch and receipt are recorded. A transfer without a receipt cannot be closed. | Transfer entity fields are non-null; state machine blocks RECEIVED→CLOSED without receipt data |
| BR-008 | No overselling: confirmation of a sale or dispatch requires available stock at the responsible branch at the moment of commit. | Server-side check in the same transaction as the write; idempotency key prevents duplicate confirmations |
| BR-009 | Financial records are deterministic from events: sale totals, receipt totals, refund totals and day closure totals are derived from stored records, never trusted from the client and never recomputed differently in two places. | Single pricing service used by POS, receipts, refunds and reports; all money as integer minor units with an explicit currency |
| BR-010 | A sale that has money against it cannot silently change: refunds are the only way to reduce a completed sale, and refunded quantity can never exceed sold quantity net of prior refunds. | Refund service validates against `sale_items` and prior `refunds` inside a transaction |
| BR-011 | Payments are idempotent: a repeated provider callback or repeated sale submission never creates a second payment, sale or stock movement. | Idempotency key on sale submission; provider event id uniqueness on callbacks |
| BR-012 | A payment success that arrives after cancellation, refund or expiry is recorded as `ORPHANED` and surfaced for reconciliation; it never mutates the sale. | Callback handler state guard; reconciliation report |
| BR-013 | Tenant isolation is absolute: every query for a business-owned record is scoped by tenant id, and a cross-tenant read or write returns `404` or `403` and never leaks existence. | Tenant-scoped repository layer; automated isolation tests per endpoint |
| BR-014 | Branch restrictions are enforced server-side: a branch-scoped user cannot read or write another branch's balances, movements, transfers, sales, receipts, closures or reports. | Branch scope resolved from `user_roles` and branch assignment on every request |
| BR-015 | Permissions are authoritative on the server: client-side hiding is display-only. Every endpoint checks role and permission, defaulting to deny. | Permission guard on every controller action |
| BR-016 | Audit is mandatory for critical actions: writes to stock, money, permissions, branches, catalogue price and settings produce an audit entry with actor, action, target, timestamp and context. | Audit interceptor on the enumerated action list; append-only storage |
| BR-017 | Business records are soft-deleted; verification, reset, invitation and refresh tokens are hard-deleted. | `deleted_at` on business entities; token tables purge on use or expiry |
| BR-018 | Money is stored and reported in one currency per tenant with explicit currency on every amount; the display default is USD per the decision ledger. No implicit FX conversion exists in MVP. | Currency column on all monetary rows; no cross-currency arithmetic path |
| BR-019 | AI never alters financial records and never executes writes without confirmation. AI capabilities are Phase 5 and no AI write path exists in MVP. | No AI endpoints, jobs or model providers wired in MVP |
| BR-020 | A purchase order cannot receive against lines that are not on the PO, and receiving never exceeds the ordered quantity without an explicit over-receipt confirmation that is flagged and audited. | Goods receipt validation against PO lines in the same transaction |
| BR-021 | A day closure is unique per branch per business date and immutable once `CLOSED`; corrections are new audited adjustment records. | Unique constraint plus state guard on `day_closures` |
| BR-022 | Product and variant identity is unambiguous within a tenant: SKU is unique per tenant and barcode, when present, resolves to exactly one variant. | Unique constraints per tenant on `products`, `product_variants` |

Additional MVP rules derived from product decisions:

- A user must hold a Business Admin role to manage branches, users, roles, the business profile, or to view the full audit log.
- MFA is required for Business Admin and Branch Manager and cannot be self-disabled by those roles; it is optional for Cashier and Inventory Clerk.
- Assumption: no platform-operator interface exists in MVP; internal support is performed through server-side tooling and managed database access, and every such action is audited at the administration level.
- Assumption: business registration is self-service after phone (and, when enabled, email) verification, with no platform approval step.
- Assumption: notification email is not a channel in MVP; in-app notifications are guaranteed and WhatsApp is enabled only when the provider is confirmed.

## MVP Scope

### In scope: modules, requirement ranges, screens

| Module | Phase | FR IDs | Primary screens / routes |
|---|---|---|---|
| Identity and access | 1 | FR-001–FR-020 | `/register`, `/verify`, `/login`, `/login/mfa`, `/forgot-password`,