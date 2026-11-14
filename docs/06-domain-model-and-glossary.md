# Domain Model and Glossary

**Product:** SokoOS — interconnected business operating platform for B2B commerce, inventory management and business operations.
**Scope of this document:** the MVP only — Phase 1 Foundation (auth, business registration, multi-tenancy, branch management, user permissions, dashboard, product catalogue) and Phase 2 Business operations (inventory, stock movements, purchasing, sales, POS, receipts, basic reporting). Phase 3–6 entities are listed for traceability and marked deferred.
**Requirement IDs** (FR-001–FR-216, NFR-001–NFR-015, BR-001–BR-022) are reused from `docs/03-cleaned-srs.md` and are not renumbered.

## Entities

Every entity below is a persisted table unless its description says otherwise. `business_id` is the tenant key on every business-owned record (FR-028); `branch_id` is present wherever the record is branch-scoped (FR-042). All monetary columns are integers in minor units with an explicit `currency` column (FR-068). All business records carry `created_at`, `updated_at` and `deleted_at` (soft delete, FR-031); tokens and sessions are hard-deleted (FR-008).

| Entity | Description | Key fields |
|---|---|---|
| users | Human account; one per person; may hold roles in more than one business (FR-055) | id, email (unique, case-insensitive), phone, password_hash, full_name, status, email_verified_at, phone_verified_at, mfa_enabled, last_login_at, deleted_at |
| auth_sessions | One signed-in device session with a rotating refresh token (FR-015, FR-016) | id, user_id, refresh_token_hash, device_label, ip_address, user_agent, last_used_at, expires_at, revoked_at |
| auth_tokens | Single-use, short-lived tokens for phone/email verification, password reset and invitations; hard-deleted on use or expiry (FR-008, FR-014, FR-046) | id, user_id, token_type (PHONE_VERIFICATION, EMAIL_VERIFICATION, PASSWORD_RESET), token_hash, attempt_count, expires_at, consumed_at |
| mfa_factors | Enrolled TOTP factor per user (FR-010) | id, user_id, secret_encrypted, confirmed_at, disabled_at |
| mfa_recovery_codes | Single-use recovery codes, displayed once at enrolment (FR-010, FR-017) | id, mfa_factor_id, code_hash, used_at |
| roles | The four system roles per tenant (FR-051) | id, business_id, code (BUSINESS_ADMIN, BRANCH_MANAGER, CASHIER, INVENTORY_CLERK), name, is_system |
| permissions | Platform-wide permission catalogue (FR-060) | id, code (e.g. `sales.discount`, `po.confirm`, `admin.*`), category, description |
| role_permissions | Role-to-permission join (FR-052, FR-053) | role_id, permission_id |
| user_roles | Role assignment scoped to one business (FR-049) | id, user_id, business_id, role_id, granted_by, granted_at |
| user_branches | Branch assignment for a user inside a business (FR-040, FR-041) | id, user_id, business_id, branch_id, assigned_by |
| user_invitations | Pending invitation with role and branch scope (FR-045, FR-046, FR-047) | id, business_id, email, phone, role_id, branch_ids, token_hash, invited_by, expires_at, accepted_at, revoked_at |
| businesses | Tenant root; self-service registration with no platform approval step (FR-021, FR-024) | id, legal_name, slug (unique platform-wide), business_type (RETAIL, PHARMACY, WHOLESALE, DISTRIBUTION), tin, registration_number, address, contact_phone, currency, timezone, status, owner_user_id, deleted_at |
| business_settings | One settings row per business (FR-030) | business_id, currency, timezone, receipt_footer_text, default_tax_rate_bp, allow_negative_stock, max_discount_percent, low_stock_suppression_hours |
| branches | Selling or storage location inside a tenant (FR-035, FR-039) | id, business_id, name, code (unique per tenant), address, phone, is_warehouse, allow_negative_stock (nullable override, FR-043), status, deleted_at |
| subscriptions | Read-only plan record in MVP; no billing or collection (FR-029) | id, business_id, plan_code, status, period_start, period_end |
| categories | Tenant-scoped product category; a product has at most one (FR-061, FR-063) | id, business_id, name (unique per tenant), deleted_at |
| brands | Tenant-scoped brand (FR-064, FR-065) | id, business_id, name (unique per tenant, case-insensitive), deleted_at |
| products | Catalogue master (FR-067, FR-070) | id, business_id, name, category_id, brand_id, unit_of_measure, cost_price_minor, selling_price_minor, currency, tax_rate_bp, tax_class, is_batch_tracked, reorder_level, is_active, deleted_at |
| product_variants | Sellable unit with SKU and optional barcode (FR-071, FR-072, FR-073) | id, business_id, product_id, sku (unique per tenant), barcode (unique per tenant when present), variant_name, attributes, cost_price_minor, selling_price_minor, is_active, deleted_at |
| stock_batches | Batch identity for batch-tracked products; identity is preserved for the life of the batch (FR-131) | id, business_id, product_variant_id, batch_number, expiry_date, supplier_id, received_at, status (ACTIVE, EXPIRED, WRITTEN_OFF); unique (business_id, product_variant_id, batch_number) |
| stock_movements | The immutable stock ledger; append-only, never updated or deleted (FR-105, FR-106, BR-001) | id, business_id, branch_id, product_variant_id, batch_id, movement_type (SALE, SALE_REVERSAL, GOODS_RECEIPT, TRANSFER_OUT, TRANSFER_IN, ADJUSTMENT, STOCK_COUNT, OPENING_STOCK, WRITE_OFF), quantity_delta (signed), unit_cost_minor, reference_type, reference_id, reason, actor_user_id, occurred_at |
| inventory_balances | Derived read projection of the ledger, keyed by branch + variant + batch; recomputable from `stock_movements` (FR-102, FR-199) | business_id, branch_id, product_variant_id, batch_id, quantity_on_hand, last_movement_at, updated_at |
| stock_adjustments | One adjustment header per adjustment; exactly one movement and one audit entry per adjustment (FR-109, FR-110, FR-111) | id, business_id, branch_id, product_variant_id, batch_id, quantity_delta, reason_code (MANUAL, STOCK_COUNT, WRITE_OFF, DAMAGE, EXPIRY), reason_text, actor_user_id |
| stock_counts | Physical count session for a branch (FR-129) | id, business_id, branch_id, status, counted_by, counted_at, applied_at |
| stock_count_items | Counted quantity per variant and batch, with the computed delta (FR-129, FR-130) | id, stock_count_id, product_variant_id, batch_id, system_quantity, counted_quantity, delta_quantity |
| stock_transfers | Inter-branch transfer retaining origin and destination for its whole life (FR-116, FR-125) | id, business_id, origin_branch_id, destination_branch_id, status, requested_by, approved_by, rejection_reason, dispatched_by, dispatched_at, received_by, received_at, discrepancy_note, closed_by, closed_at |
| stock_transfer_items | Transfer lines (FR-116, FR-123) | id, stock_transfer_id, product_variant_id, batch_id, requested_quantity, dispatched_quantity, received_quantity, shortfall_quantity, note |
| suppliers | Non-user supplier record; no login in MVP (FR-133, FR-134, FR-135) | id, business_id, name (unique per tenant), contact_person, phone, email, address, tin, payment_terms, deleted_at |
| purchase_orders | Purchase order header with server-computed totals (FR-137, FR-138) | id, business_id, branch_id, supplier_id, po_number, status, expected_date, currency, subtotal_minor, tax_minor, total_minor, submitted_by, confirmed_by, confirmed_at, cancelled_by, cancel_reason, closed_by, closed_at, shortfall_reason |
| purchase_order_items | Purchase order lines with ordered and received quantities (FR-137, FR-150) | id, purchase_order_id, product_variant_id, quantity_ordered, quantity_received, unit_cost_minor, tax_rate_bp, line_total_minor |
| goods_receipts | Receipt of goods against a confirmed purchase order (FR-145, FR-147) | id, business_id, purchase_order_id, branch_id, status, received_by, received_at, over_receipt_confirmed, notes |
| goods_receipt_items | Receipt lines carrying batch number and expiry (FR-146, FR-148) | id, goods_receipt_id, purchase_order_item_id, product_variant_id, batch_id, quantity_received, unit_cost_minor, batch_number, expiry_date, is_over_receipt |
| sales | Completed sale header; totals always server-computed (FR-159, FR-160, FR-162) | id, business_id, branch_id, cashier_user_id, customer_id, sale_number, status, currency, subtotal_minor, discount_minor, tax_minor, total_minor, refunded_total_minor, idempotency_key (unique per tenant), completed_at |
| sale_items | Sale lines resolved to a batch by first-expiry-first-out (FR-165) | id, sale_id, product_variant_id, batch_id, quantity, unit_price_minor, discount_minor, tax_rate_bp, tax_minor, line_total_minor, unit_cost_minor |
| receipts | Tenant-unique receipt for a sale; re-printable without side effects (FR-166, FR-168) | id, business_id, sale_id, receipt_number (unique per tenant), footer_text, print_count, issued_at |
| refunds | Full or partial refund against an original sale (FR-169, FR-188) | id, business_id, sale_id, payment_id, status, reason_code, reason_text, refund_total_minor, requested_by, approved_by, completed_at |
| refund_items | Refund lines against original sale items (FR-169, FR-172) | id, refund_id, sale_item_id, quantity, amount_minor, restock |
| customers | Optional tenant-scoped customer record attached to a sale; walk-in sales have none | id, business_id, name, phone, email, notes, deleted_at |
| cash_sessions | Cash drawer session opened implicitly on the first cash payment of the day (FR-184, FR-193) | id, business_id, branch_id, cashier_user_id, business_date, status, opened_at, closed_at, expected_cash_minor, counted_cash_minor, discrepancy_minor |
| day_closures | Immutable end-of-day snapshot, one per branch and business date (FR-204, FR-205, FR-206) | id, business_id, branch_id, business_date, expected_cash_minor, counted_cash_minor, discrepancy_minor, discrepancy_reason, closed_by, closed_at; unique (branch_id, business_date) |
| payments | Payment attempt against a sale, by mobile money or cash (FR-179, FR-183, FR-189) | id, business_id, branch_id, sale_id, method (MTN_MOMO, AIRTEL_MONEY, CASH), provider, status, amount_minor, currency, payer_phone, provider_reference, idempotency_key, cash_session_id, amount_tendered_minor, change_minor, expires_at |
| payment_webhook_events | Stored provider callbacks with the provider event id used for de-duplication (FR-185) | id, provider, provider_event_id (unique), payment_id, signature_verified, payload, received_at, processed_at |
| payment_adjustments | Audited correction record; payments are never edited (FR-192) | id, business_id, payment_id, adjustment_type, amount_minor, reason, actor_user_id |
| audit_logs | Append-only audit trail with actor, action, target, timestamp and context (FR-092, FR-093, FR-097) | id, business_id, branch_id, actor_user_id, actor_role_code, action, target_type, target_id, before, after, request_id, ip_address, user_agent, created_at |
| notifications | In-app and WhatsApp notification records (FR-084, FR-088, FR-089) | id, business_id, user_id, event_type, title, body, channel (IN_APP, WHATSAPP), status (UNREAD, READ), delivery_status, read_at |
| notification_preferences | Per-user, per-event, per-channel preference (FR-087) | id, user_id, business_id, event_type, channel, enabled |
| attachments | File metadata for documents and product images; object keys are tenant-prefixed (FR-075, FR-210, FR-211) | id, business_id, entity_type, entity_id, object_key, file_name, mime_type, size_bytes, checksum, visibility, uploaded_by, deleted_at |
| jobs | Redis-backed background job record for exports, notifications, payment expiry, payment reconciliation and imports (FR-213, FR-214, FR-216) | id, business_id, job_type (EXPORT, NOTIFICATION, PAYMENT_EXPIRY, PAYMENT_RECONCILIATION, IMPORT), status, payload, attempts, max_attempts, last_error, result_object_key, queued_at, started_at, finished_at |
| import_rows | Per-row import validation result and error report (FR-208, FR-209) | id, job_id, row_number, raw_row, status, error_column, error_value, error_message |
| marketplace_listings | Deferred — Phase 3 Supplier ecosystem; no table created in MVP | — |
| marketplace_offers | Deferred — Phase 3; no table created in MVP | — |
| marketplace_orders | Deferred — Phase 3; no table created in MVP | — |
| finance_accounts | Deferred — Phase 4 Finance; no table created in MVP | — |
| journal_entries | Deferred — Phase 4; no table created in MVP | — |
| expenses | Deferred — Phase 4; no table created in MVP | — |
| ai_* (model providers, orchestration, suggestions) | Deferred — Phase 5 AI capabilities; no table, endpoint or job is wired in MVP | — |

## State Machines

Notation: `[state A] --[trigger / guard / actor]--> [state B]`. Every transition not listed is rejected with HTTP 409 (or HTTP 403 when the actor lacks permission) and is never silently ignored. Every transition writes an audit entry (FR-095).

### User account (FR-004, FR-007, FR-056)

```
PENDING_VERIFICATION --[verification code accepted / code unexpired, attempts <= 5 / user]--> ACTIVE
  side effect: email_verified_at or phone_verified_at set; verification token hard-deleted; UserVerified event; audit entry
ACTIVE --[sign-in with MFA challenge passed / role requires MFA / user]--> ACTIVE
  side effect: auth_session created with rotating refresh token; audit entry
ACTIVE --[deactivate / actor holds admin.* / Business Admin]--> SUSPENDED
  side effect: all auth_sessions revoked and refresh tokens invalidated in the same request; historical sales, receipts and stock movements keep their attribution (FR-057); audit entry
SUSPENDED --[reactivate / actor holds admin.* / Business Admin]--> ACTIVE
ACTIVE --[soft delete / actor holds admin.* / Business Admin]--> DELETED
  side effect: deleted_at set; sessions revoked; audit entry
```

Invalid: any transition out of `PENDING_VERIFICATION` other than to `ACTIVE`; any transition performed by a non-admin actor; disabling MFA for a role that requires it (FR-011).

### Business (FR-021, FR-024)

```
(registration) --[owner verified, tenant + Business Admin role created in one transaction / phone verified / owner]--> ACTIVE
ACTIVE --[suspend / compliance or abuse finding / platform operator via server-side tooling]--> SUSPENDED
  side effect: audit entry; no platform-operator UI exists, so the action is performed through server-side tooling and audited
SUSPENDED --[reinstate / finding resolved / platform operator]--> ACTIVE
ACTIVE --[soft delete / no open cash session, no open purchase order, no open transfer / Business Admin]--> DELETED
```

Assumption: registration completes directly into `ACTIVE` with no approval state, because FR-024 states there is no platform approval step.

### Branch (FR-035, FR-037)

```
ACTIVE --[deactivate / actor holds admin.* / Business Admin]--> DEACTIVATED
  side effect: new sales blocked at the branch; all history remains readable; audit entry
DEACTIVATED --[reactivate / actor holds admin.* / Business Admin]--> ACTIVE
ACTIVE or DEACTIVATED --[soft delete / no stock on hand and no open documents / Business Admin]--> DELETED
```

### User invitation (FR-045, FR-046, FR-047)

```
PENDING --[invitation accepted / token unexpired (7 days) and unused / invitee]--> ACCEPTED
  side effect: password set; user bound by the MFA rules of the assigned role; invitation token hard-deleted; audit entry
PENDING --[expire / now > expires_at / system]--> EXPIRED
PENDING --[revoke / actor holds admin.* / Business Admin]--> REVOKED
```

### Product and product variant (FR-067, FR-070)

```
ACTIVE --[deactivate / actor holds catalogue.write / Business Admin]--> INACTIVE
  side effect: hidden from POS search and new sales; existing sales, movements and receipts unchanged
INACTIVE --[reactivate / actor holds catalogue.write / Business Admin]--> ACTIVE
ACTIVE or INACTIVE --[soft delete / no stock on hand / Business Admin]--> DELETED
```

Assumption: `INACTIVE` is the smallest conventional option for the "update and soft-delete" behaviour required by FR-070. A selling price below cost price is allowed and flagged with a warning (FR-069); it is not a state.

### Purchase order (FR-140, FR-142, FR-151, FR-152, FR-153)

```
DRAFT --[submit / supplier set AND at least one line with quantity_ordered > 0 / user with po.create]--> SUBMITTED
  side effect: totals recomputed server-side; branch notified; audit entry
DRAFT --[cancel / actor holds admin.* / Business Admin]--> CANCELLED
SUBMITTED --[confirm / status = SUBMITTED / user with po.confirm]--> CONFIRMED
  side effect: confirmed_by and confirmed_at recorded; requesting branch notified; audit entry
SUBMITTED --[cancel / actor holds admin.* / Business Admin]--> CANCELLED
CONFIRMED --[goods receipt posted, some lines outstanding / system]--> PARTIALLY_RECEIVED
CONFIRMED --[goods receipt posted, all ordered quantities received / system]--> RECEIVED
PARTIALLY_RECEIVED --[further goods receipt posted, lines still outstanding / system]--> PARTIALLY_RECEIVED
PARTIALLY_RECEIVED --[all ordered quantities received / system]--> RECEIVED
RECEIVED --[close / actor holds po.close / Business Admin or Branch Manager]--> CLOSED
PARTIALLY_RECEIVED --[close / shortfall_reason non-empty / Business Admin or Branch Manager]--> CLOSED
CLOSED --[any]--> (final; immutable)
```

Invalid: editing any field after `SUBMITTED` (FR-141 — changes require cancellation and a new purchase order); receiving against a line that is not on the purchase order (FR-149); any transition out of `CLOSED`.

### Goods receipt (FR-145, FR-147, FR-148)

No state machine. A goods receipt is created and posted inside a single transaction; the only persisted state is `POSTED`, and it is immutable. The transaction writes positive stock movements, creates or matches batches, records `goods_receipts` and `goods_receipt_items`, and increments received quantities on the purchase order (FR-147). A receipt exceeding the ordered quantity requires explicit confirmation and is flagged `is_over_receipt` (FR-148).

### Stock transfer (FR-116, FR-118, FR-119, FR-120, FR-122, FR-123, FR-124, FR-125)

```
REQUESTED --[approve / actor holds transfer.approve and branch scope covers origin or destination / Branch Manager]--> APPROVED
  side effect: TransferApproved notification; audit entry
REQUESTED --[reject / rejection_reason non-empty / Branch Manager]--> REJECTED
  side effect: TransferRejected notification; audit entry
APPROVED --[dispatch / origin stock sufficient for every line, unless negative stock is enabled / Inventory Clerk at origin]--> DISPATCHED
  side effect: negative movements written at the origin branch inside one stock-checked transaction; TransferDispatched notification; audit entry
DISPATCHED --[receive / received quantities default to dispatched quantity, note required on any shortfall / Inventory Clerk at destination]--> RECEIVED
  side effect: positive movements written at the destination branch; shortfall stored as the transfer discrepancy; TransferReceived notification; audit entry
RECEIVED --[close / discrepancy note acknowledged / Branch Manager]--> CLOSED
  side effect: transfer becomes immutable; audit entry
```

Invalid: `REQUESTED → DISPATCHED`, `DISPATCHED → CLOSED`, and any other transition not listed (FR-119 accepts only `REQUESTED → APPROVED` and `REQUESTED → REJECTED`). No stock movement is written at request time (FR-117). Origin and destination branch can never change (FR-125). Insufficient origin stock rejects the whole dispatch with HTTP 409 (FR-121).

### Stock count (FR-129, FR-130)

```
DRAFT --[apply / every line has counted_quantity / Inventory Clerk]--> APPLIED
  side effect: one stock adjustment per line with reason_code STOCK_COUNT; one movement and one audit entry per line; applied_at set
DRAFT --[cancel / actor holds inventory.count / Inventory Clerk or Branch Manager]--> CANCELLED
```

Invalid: a stock count never sets a balance directly; it only produces adjustments (FR-130).

### Sale (FR-162, FR-171, FR-172)

```
(no persisted draft) --[commit / idempotency key unused, stock re-validated at the selling branch, no expired batch, payment recorded / Cashier]--> COMPLETED
  side effect: sales, sale_items, stock movements, payment link and receipt created in one transaction; SaleCompleted event; audit entry
COMPLETED --[refund, refunded quantity < sold quantity net of prior refunds / user with sales.refund]--> PARTIALLY_REFUNDED
  side effect: refunds and refund_items created; reversing movements written to the original batch; sale state recomputed; audit entry
COMPLETED --[refund, all sold quantities refunded / user with sales.refund]--> REFUNDED
COMPLETED --[full return recorded / user with sales.refund]--> RETURNED
PARTIALLY_REFUNDED --[further partial refund / refunded quantity < sold quantity net of prior refunds / user with sales.refund]--> PARTIALLY_REFUNDED
PARTIALLY_REFUNDED --[refund, all sold quantities refunded / user with sales.refund]--> REFUNDED
REFUNDED or RETURNED --[any]--> (final)
```

Assumption: a full return is recorded as a refund of all sold quantities with `reason_code = RETURN` and moves the sale to `RETURNED` instead of `REFUNDED`, matching the ledger lifecycle "completed → refunded / partially refunded / returned".

Invalid: a refund quantity exceeding the sold quantity net of prior refunds (FR-172); persisting client-supplied totals (FR-160); creating a second sale or movement for a repeated idempotency key (FR-164); committing a sale with insufficient stock (FR-163, HTTP 409).

### Payment (FR-180, FR-181, FR-184, FR-186, FR-187, FR-189)

```
PENDING --[provider callback / signature or reference verified AND provider_event_id unseen / system]--> SUCCEEDED
  side effect: sale marked paid; cash session updated for cash; PaymentSucceeded event; audit entry
PENDING --[provider callback / callback reports failure / system]--> FAILED
PENDING --[expire / now > created_at + 15 minutes and still PENDING / background job]--> EXPIRED
PENDING --[success callback after refund or sale cancellation / system]--> ORPHANED
  side effect: payment recorded as ORPHANED; the sale is not altered; audit entry
(cash) --[record cash payment / amount_tendered_minor >= total_minor / Cashier]--> SUCCEEDED
  side effect: change computed server-side; attributed to the cashier's open cash session
SUCCEEDED --[any]--> (final; corrections are recorded as payment_adjustments, never by editing the payment)
```

Invalid: marking a sale paid from a client signal alone (FR-182); processing a repeated `provider_event_id` (FR-185); editing a payment row (FR-192).

### Refund (FR-169, FR-188)

```
REQUESTED --[approve / quantity <= sold quantity net of prior refunds / user with sales.refund.approve]--> APPROVED
REQUESTED --[reject / reason non-empty / user with sales.refund.approve]--> REJECTED
APPROVED --[complete / reversing movements written / system]--> COMPLETED
  side effect: sale state recomputed; refund recorded against the original payment method; RefundCompleted notification; audit entry
APPROVED --[provider refund rejected / system]--> FAILED
```

Assumption: a refund is created in `REQUESTED` and is auto-approved when the acting user already holds `sales.refund.approve`; otherwise it waits for a Branch Manager.

### Cash session (FR-184, FR-193)

```
(implicit open) --[first cash payment of the business date / none / system]--> OPEN
OPEN --[close / day closure created for the same branch and business date / Cashier or Branch Manager]--> CLOSED
  side effect: expected_cash_minor, counted_cash_minor and discrepancy_minor recorded; audit entry
```

### Day closure (FR-204, FR-205, FR-206)

No state machine. A day closure is created once per `(branch_id, business_date)` and is immutable from creation. A second closure for the same branch and business date is rejected with HTTP 409 (FR-205). A non-zero discrepancy requires a reason (FR-205). Corrections after closure are recorded as new audited adjustment records (FR-206).

### Job (FR-214, FR-216)

```
QUEUED --[worker picks up / attempts < max_attempts / worker]--> RUNNING
RUNNING --[work completed / none / worker]--> SUCCEEDED
RUNNING --[error raised / none / worker]--> FAILED
  side effect: last_error stored
FAILED --[retry / attempts < max_attempts / worker]--> QUEUED
FAILED --[terminal / attempts = max_attempts / worker]--> FAILED
  side effect: failure surfaced in the UI
```

### Notification (FR-086, FR-090)

```
UNREAD --[mark as read / recipient owns the notification / recipient]--> READ
  side effect: read_at set; audit entry
```

Delivery status is tracked separately on the same row for the WhatsApp channel: `PENDING → SENT → FAILED`, driven by a background job (FR-090). The in-app channel is always enabled (FR-088).

### Subscription (FR-029)

No state machine in MVP. The subscription record is read-only with `status = ACTIVE`; subscription billing and collection are not implemented.

### Deferred state machines (not implemented in MVP)

Marketplace order — `submitted → accepted/rejected → terms confirmed → payment/credit → dispatched → received` — is deferred with Phase 3 and has no tables, endpoints or jobs in MVP.

### Domain events

Events are past-tense facts emitted by the transitions above; each event drives notifications, audit entries and background jobs.

| Group | Events |
|---|---|
| Auth | UserRegistered, UserVerified, UserInvited, InvitationAccepted, UserDeactivated, UserReactivated, MfaEnabled, MfaDisabled, RecoveryCodeUsed, SessionRevoked, PasswordReset, SignInLocked |
| Tenancy | BusinessRegistered, BusinessProfileUpdated, BranchCreated, BranchUpdated, BranchDeactivated, RoleAssigned, UserBranchAssigned, SettingsChanged |
| Catalogue | CategoryCreated, BrandCreated, ProductCreated, ProductUpdated, ProductPriceChanged, ProductArchived, CatalogueImported |
| Inventory | StockAdjusted, StockCountApplied, LowStockThresholdCrossed, BatchExpired, BatchWrittenOff |
| Transfers | TransferRequested, TransferApproved, TransferRejected, TransferDispatched, TransferReceived, TransferClosed |
| Purchasing | SupplierCreated, PurchaseOrderSubmitted, PurchaseOrderConfirmed, PurchaseOrderCancelled, GoodsReceived, OverReceiptConfirmed, PurchaseOrderClosed |
| Sales | SaleCompleted, SaleDiscounted, ReceiptIssued, ReceiptReprinted, RefundRequested, RefundCompleted, RefundRejected |
| Payments | PaymentInitiated, PaymentSucceeded, PaymentFailed, PaymentExpired, PaymentOrphaned, PaymentAdjusted, CashSessionOpened, CashSessionClosed, DayClosed |
| Platform | NotificationSent, AttachmentUploaded, AttachmentDownloaded, ExportReady, ImportCompleted, ImportFailed, JobFailed |

## Glossary

**Tenant**: a single business (`businesses` row) and the data boundary around it. Every business-owned record carries `business_id`, and every read and write is scoped to the requesting tenant server-side (FR-028). Not to be confused with a branch, which is a location inside one tenant.

**Tenant scope**: the rule that all queries for business records include a `business_id` filter, so a user of Business A can never read Business B's records. Enforced server-side, never in the client.

**Branch scope**: the rule that a branch-restricted user (Cashier, Inventory Clerk) sees only the branches assigned through `user_branches`; a branch-scoped operation without an assignment returns HTTP 403 (FR-041, FR-042).

**Business Admin**: the tenant role with full access, including business profile, branches, users, roles and settings. Requires MFA (FR-009). Cannot have `admin.*` permissions removed (FR-053).

**Branch Manager**: the tenant role for branch operations and approvals — transfer approval, purchase order confirmation and closure, day closure. Requires MFA (FR-009).

**Cashier**: the tenant role for POS and sales. Optional MFA.

**Inventory Clerk**: the tenant role for stock, adjustments, counts and transfers. Optional MFA.

**RBAC**: role-based access control built on `roles`, `permissions`, `role_permissions` and `user_roles`. Every endpoint checks permissions server-side and defaults to deny (FR-054).

**Permission code**: a dotted string such as `sales.discount`, `po.confirm`, `po.close`, `transfer.approve`, `inventory.count`, `sales.refund.approve`, `catalogue.write`, `admin.*`. Permissions are checked by code, never by role name.

**MFA**: multi-factor authentication using a TOTP factor plus one-time recovery codes. Required for Business Admin and Branch Manager, optional for other roles (FR-009, FR-059).

**Recovery code**: a single-use code issued at MFA enrolment, displayed exactly once, hashed at rest, and audited on use (FR-010, FR-017).

**Verification code**: a 6-digit code sent by phone (primary) and by email when the email channel is enabled; expires after 10 minutes with at most 5 attempts (FR-005, FR-006).

**Invitation token**: a single-use token that expires after 7 days and lets an invited user set a password and join a tenant with a role and branch scope (FR