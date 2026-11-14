# Database Design

**Product:** SokoOS — interconnected business operating platform for B2B commerce, inventory management and business operations.
**Scope:** MVP only — Phase 1 Foundation (FR-001–FR-060, FR-081–FR-100) and Phase 2 Business operations (FR-101–FR-216). Phase 3–6 tables are not created.
**Physical target:** managed PostgreSQL 15+ (single primary), accessed through Prisma. Requirement IDs (FR-001–FR-216, NFR-001–NFR-015, BR-001–BR-022) are reused from `docs/03-cleaned-srs.md` and `docs/06-domain-model-and-glossary.md` and are not renumbered.

## Schema Overview

49 tables are created in the MVP. Every business-owned table carries `business_id` (tenant key, FR-028); every branch-scoped table carries `branch_id` (FR-042). All monetary columns are `BIGINT` integers in minor units with an explicit `currency CHAR(3)` column (FR-068, FR-027). All business records carry `created_at`, `updated_at` and `deleted_at` (soft delete, FR-031); sessions and tokens are hard-deleted (FR-008). Append-only tables (`stock_movements`, `audit_logs`, `payment_webhook_events`, `import_rows`) carry `created_at` only and expose no update or delete path (FR-093, FR-106).

| Table | Purpose | Key notes |
|---|---|---|
| users | Human account, one per person | `email` citext unique; `status`; `password_hash`; `mfa_enabled`; no `business_id` — membership is via `user_roles` (FR-055); soft delete |
| auth_sessions | One signed-in device session with rotating refresh token | `refresh_token_hash` unique; `revoked_at`; hard-deleted on revoke/expiry (FR-015, FR-016) |
| auth_tokens | Single-use verification, password-reset and invitation tokens | `token_type`; `token_hash` unique; `attempt_count`; hard-deleted on use or expiry (FR-008, FR-014, FR-046) |
| mfa_factors | Enrolled TOTP factor per user | `secret_encrypted`; `confirmed_at`; `disabled_at`; one active factor per user (FR-010) |
| mfa_recovery_codes | Single-use MFA recovery codes | `code_hash`; `used_at`; shown exactly once at enrolment (FR-010, FR-017) |
| businesses | Tenant root | `slug` unique platform-wide (FR-023); `business_type`; `tin`; `registration_number`; `currency`; `status`; soft delete |
| business_settings | One settings row per business | PK is `business_id`; `allow_negative_stock`; `default_tax_rate_bp`; `receipt_footer_text`; `low_stock_suppression_hours` (FR-030, FR-128) |
| branches | Selling or storage location inside a tenant | `code` unique per tenant (FR-036); `is_warehouse`; `allow_negative_stock` nullable override (FR-043); `status`; soft delete |
| subscriptions | Read-only plan record in MVP | `plan_code`; `status`; `period_start`; `period_end`; no billing or collection (FR-029) |
| roles | The four system roles per tenant | `code` unique per tenant; `is_system`; seeded, not user-created (FR-051) |
| permissions | Platform-wide permission catalogue | `code` unique (e.g. `sales.discount`, `po.confirm`, `admin.*`); no `business_id`; no soft delete (FR-060) |
| role_permissions | Role-to-permission join | Composite PK `(role_id, permission_id)`; `admin.*` rows are protected from removal (FR-052, FR-053) |
| user_roles | Role assignment scoped to one business | Unique `(user_id, business_id, role_id)`; `granted_by`; `deleted_at` marks a revoked assignment (FR-049, FR-055) |
| user_branches | Branch assignment for a user inside a business | Unique `(user_id, branch_id)`; absence of a row denies branch-scoped operations (FR-040, FR-041) |
| user_invitations | Pending invitation with role and branch scope | `token_hash` unique; `expires_at` (7 days); `status`; `branch_ids uuid[]` (FR-045, FR-046, FR-047) |
| categories | Tenant-scoped product category | `name` unique per tenant, case-insensitive; soft delete; hard delete rejected while in use (FR-061, FR-062) |
| brands | Tenant-scoped brand | `name` unique per tenant, case-insensitive; soft delete (FR-064, FR-065) |
| products | Catalogue master | `category_id` nullable (at most one, FR-063); `cost_price_minor`; `selling_price_minor`; `tax_rate_bp`; `is_batch_tracked`; `reorder_level`; `is_active`; soft delete |
| product_variants | Sellable unit with SKU and optional barcode | `sku` unique per tenant (FR-072); `barcode` unique per tenant when present (FR-073); `attributes jsonb`; nullable price falls back to the product |
| stock_batches | Batch identity for batch-tracked products | Unique `(business_id, product_variant_id, batch_number)`; `expiry_date`; `status`; identity preserved for the life of the batch (FR-131) |
| stock_movements | The immutable stock ledger | Append-only; signed `quantity_delta`; `movement_type`; `reference_type`/`reference_id`; `reason`; never updated or deleted (FR-105, FR-106, BR-001) |
| inventory_balances | Derived read projection of the ledger | Keyed by branch + variant + batch; `quantity_on_hand`; recomputable from `stock_movements` (FR-102, FR-199) |
| stock_adjustments | One adjustment header per adjustment | `reason_code`; `reason_text` NOT NULL (FR-109); `stock_movement_id` unique — exactly one movement per adjustment (FR-111) |
| stock_counts | Physical count session for a branch | `status` DRAFT/APPLIED/CANCELLED; `counted_by`; `applied_at` (FR-129) |
| stock_count_items | Counted quantity per variant and batch | `system_quantity`; `counted_quantity`; `delta_quantity`; `stock_adjustment_id` set on apply (FR-130) |
| stock_transfers | Inter-branch transfer | `origin_branch_id` and `destination_branch_id` immutable for life (FR-125); `status`; approval, dispatch, receipt and closure actors and timestamps |
| stock_transfer_items | Transfer lines | `requested_quantity`; `dispatched_quantity`; `received_quantity`; `shortfall_quantity`; `note` required on shortfall (FR-123) |
| suppliers | Non-user supplier record | `name` unique per tenant; `tin`; `payment_terms`; no login in MVP (FR-133, FR-134, FR-135) |
| purchase_orders | Purchase order header | `po_number` unique per tenant; `status`; server-computed `subtotal_minor`/`tax_minor`/`total_minor` (FR-138); immutable once CLOSED (FR-153) |
| purchase_order_items | Purchase order lines | `quantity_ordered`; `quantity_received`; `unit_cost_minor`; `tax_rate_bp`; `line_total_minor` (FR-150) |
| goods_receipts | Receipt of goods against a confirmed purchase order | Only against CONFIRMED or PARTIALLY_RECEIVED (FR-145); `status` POSTED; `over_receipt_confirmed`; immutable |
| goods_receipt_items | Receipt lines carrying batch number and expiry | `batch_id`; `batch_number`; `expiry_date`; `is_over_receipt` (FR-146, FR-148) |
| sales | Completed sale header | `sale_number` unique per tenant; `idempotency_key` unique per tenant; server-computed totals (FR-160); `refunded_total_minor`; `cash_session_id` |
| sale_items | Sale lines resolved to a batch by FEFO | `batch_id`; `quantity`; `unit_price_minor`; `discount_minor`; `tax_minor`; `line_total_minor`; `unit_cost_minor` (FR-165) |
| receipts | Tenant-unique receipt for a sale | `receipt_number` unique per tenant; `print_count`; re-print has no side effects (FR-166, FR-168) |
| refunds | Full or partial refund against an original sale | `status`; `reason_code`; `refund_total_minor`; `approved_by`; `completed_at` (FR-169, FR-188) |
| refund_items | Refund lines against original sale items | `sale_item_id`; `quantity`; `amount_minor`; `restock` (FR-172) |
| customers | Optional tenant-scoped customer attached to a sale | Walk-in sales have none; `phone`; soft delete |
| cash_sessions | Cash drawer session per branch, business date and cashier | `expected_cash_minor`; `counted_cash_minor`; `discrepancy_minor`; opened implicitly on the first cash payment (FR-184, FR-193) |
| day_closures | Immutable end-of-day snapshot | Unique `(branch_id, business_date)`; `discrepancy_reason`; `closed_by`; `closed_at` (FR-204, FR-205, FR-206) |
| payments | Payment attempt against a sale | `method` MTN_MOMO/AIRTEL_MONEY/CASH; `provider_reference`; `idempotency_key`; `amount_tendered_minor`/`change_minor` for cash; `expires_at` (FR-179, FR-183, FR-189) |
| payment_webhook_events | Stored provider callbacks | Unique `(provider, provider_event_id)` for de-duplication; `signature_verified`; `payload jsonb`; append-only (FR-185) |
| payment_adjustments | Audited correction record | Payments are never edited; `adjustment_type`; `amount_minor`; `reason`; `actor_user_id` (FR-192) |
| audit_logs | Append-only audit trail | `actor_user_id`; `actor_role_code`; `action`; `target_type`/`target_id`; `before`/`after`; `request_id`; `ip_address`; `user_agent` (FR-092, FR-093, FR-097) |
| notifications | In-app and WhatsApp notification records | `event_type`; `channel`; `status` UNREAD/READ; `delivery_status`; `read_at` (FR-084, FR-088, FR-089) |
| notification_preferences | Per-user, per-event, per-channel preference | Unique `(user_id, business_id, event_type, channel)`; the IN_APP row is always enabled (FR-087, FR-088) |
| attachments | File metadata for documents and product images | `object_key` unique and tenant-prefixed; `mime_type`; `size_bytes`; `checksum`; `visibility`; soft delete (FR-075, FR-211) |
| jobs | Redis-backed background job record | `job_type`; `status`; `payload jsonb`; `attempts`/`max_attempts`; `last_error`; `result_object_key` (FR-213, FR-214, FR-216) |
| import_rows | Per-row import validation result | `job_id`; `row_number`; `raw_row jsonb`; `status`; `error_column`; `error_value`; `error_message` (FR-208, FR-209) |

**Not created in the MVP.** `marketplace_listings`, `marketplace_offers`, `marketplace_orders` (Phase 3 Supplier ecosystem), `finance_accounts`, `journal_entries`, `expenses` (Phase 4 Finance) and all `ai_*` tables (Phase 5 AI capabilities) are deferred. No table, endpoint or job references them, and no foreign key points at them.

**Migrations and seeds.** Prisma migrations live in `apps/api/prisma/migrations`; applied migrations are never edited, only superseded by forward migrations. Seeds create the four system roles per tenant, the platform-wide `permissions` catalogue, the `role_permissions` matrix, and a development tenant with branches and users. Production migrations run after a verified backup (NFR-004). Assumption: the `citext` extension is enabled by the first migration.

## Important Columns

**Column conventions applied to every table.**

| Convention | Rule | Requirement |
|---|---|---|
| Primary key | `id UUID PRIMARY KEY DEFAULT gen_random_uuid()` on every table except pure join tables (`role_permissions`, `business_settings`), which use a composite or single-column natural PK | — |
| Timestamps | `created_at TIMESTAMPTZ NOT NULL DEFAULT now()` and `updated_at TIMESTAMPTZ NOT NULL DEFAULT now()` on every mutable table; append-only tables carry `created_at` only | — |
| Soft delete | `deleted_at TIMESTAMPTZ NULL` on business records; `NULL` means live. Sessions, tokens, MFA recovery codes and webhook events are hard-deleted or never deleted | FR-031, FR-008 |
| Tenant key | `business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE RESTRICT` on every business-owned table; the data-access layer requires an explicit `tenantId` argument on every query | FR-028 |
| Branch key | `branch_id UUID NOT NULL REFERENCES branches(id) ON DELETE RESTRICT` on every branch-scoped table | FR-042 |
| Money | `BIGINT` minor units plus a `currency CHAR(3) NOT NULL DEFAULT 'USD'` column on the owning header row; never `FLOAT` or `NUMERIC` for money | FR-068, FR-027 |
| Quantity | `NUMERIC(14,3)` signed where a delta is stored, unsigned where a counted quantity is stored. Assumption: three decimal places so fractional units of measure (kg, litre) are supported | FR-110 |
| Tax rate | `tax_rate_bp INTEGER NOT NULL DEFAULT 0` — basis points, so 18% is `1800` | FR-067 |
| State | PostgreSQL enum types, never unconstrained text; every enum value matches a state named in `docs/06-domain-model-and-glossary.md` | FR-054 |
| Flexible data | `JSONB` only for `attributes`, `address`, `payload`, `raw_row`, `before`, `after` and `result`-style metadata; never for money, quantity or state | — |
| Actor attribution | `*_by UUID REFERENCES users(id) ON DELETE RESTRICT` columns are never nulled, so a deactivated user keeps attribution of historical sales, receipts and movements | FR-057 |
| Foreign keys | `ON DELETE RESTRICT` by default; `ON DELETE CASCADE` only for rows wholly owned by a parent line (sale items, PO items, receipt items, transfer items, count items, refund items, import rows, recovery codes, role permissions, notification preferences) | — |
| Secrets | `password_hash`, `refresh_token_hash`, `token_hash`, `code_hash` store Argon2id or SHA-256 digests; `mfa_factors.secret_encrypted` is encrypted at rest. No plaintext secret is ever stored | FR-010, FR-015 |

**Enum types.**

| Enum | Values |
|---|---|
| `user_status` | PENDING_VERIFICATION, ACTIVE, SUSPENDED, DELETED |
| `business_type` | RETAIL, PHARMACY, WHOLESALE, DISTRIBUTION |
| `business_status` | ACTIVE, SUSPENDED, DELETED |
| `branch_status` | ACTIVE, DEACTIVATED, DELETED |
| `role_code` | BUSINESS_ADMIN, BRANCH_MANAGER, CASHIER, INVENTORY_CLERK |
| `token_type` | PHONE_VERIFICATION, EMAIL_VERIFICATION, PASSWORD_RESET |
| `invitation_status` | PENDING, ACCEPTED, EXPIRED, REVOKED |
| `batch_status` | ACTIVE, EXPIRED, WRITTEN_OFF |
| `movement_type` | SALE, SALE_REVERSAL, GOODS_RECEIPT, TRANSFER_OUT, TRANSFER_IN, ADJUSTMENT, STOCK_COUNT, OPENING_STOCK, WRITE_OFF |
| `adjustment_reason_code` | MANUAL, STOCK_COUNT, WRITE_OFF, DAMAGE, EXPIRY |
| `stock_count_status` | DRAFT, APPLIED, CANCELLED |
| `transfer_status` | REQUESTED, APPROVED, REJECTED, DISPATCHED, RECEIVED, CLOSED |
| `po_status` | DRAFT, SUBMITTED, CONFIRMED, PARTIALLY_RECEIVED, RECEIVED, CLOSED, CANCELLED |
| `goods_receipt_status` | POSTED |
| `sale_status` | COMPLETED, PARTIALLY_REFUNDED, REFUNDED, RETURNED |
| `refund_status` | REQUESTED, APPROVED, COMPLETED, REJECTED, FAILED |
| `payment_method` | MTN_MOMO, AIRTEL_MONEY, CASH |
| `payment_status` | PENDING, SUCCEEDED, FAILED, EXPIRED |
| `payment_adjustment_type` | CORRECTION, REVERSAL |
| `cash_session_status` | OPEN, CLOSED |
| `notification_channel` | IN_APP, WHATSAPP |
| `notification_status` | UNREAD, READ |
| `delivery_status` | PENDING, SENT, FAILED, SKIPPED |
| `job_type` | EXPORT, NOTIFICATION, PAYMENT_EXPIRY, PAYMENT_RECONCILIATION, IMPORT |
| `job_status` | QUEUED, RUNNING, SUCCEEDED, FAILED, CANCELLED |
| `import_row_status` | VALID, INVALID, IMPORTED, SKIPPED |
| `attachment_visibility` | PRIVATE, PUBLIC |
| `reference_type` | SALE, GOODS_RECEIPT, STOCK_TRANSFER, STOCK_ADJUSTMENT, STOCK_COUNT, REFUND, OPENING_STOCK |

**Important columns per table.**

| Table | Important columns | Constraints and notes |
|---|---|---|
| users | `id`, `email citext`, `phone text`, `password_hash text`, `full_name text`, `status user_status`, `email_verified_at`, `phone_verified_at`, `mfa_enabled boolean`, `failed_login_count int`, `locked_until timestamptz`, `last_login_at`, `created_at`, `updated_at`, `deleted_at` | `email` unique case-insensitive; `phone` unique when present; lockout after 10 failures in 15 minutes (FR-018); no `business_id` (FR-055) |
| auth_sessions | `id`, `user_id`, `refresh_token_hash text`, `device_label text`, `ip_address inet`, `user_agent text`, `last_used_at`, `expires_at`, `revoked_at`, `created_at`, `updated_at` | `refresh_token_hash` unique; hard-deleted on revoke or expiry; all rows for a user are revoked in one request on deactivation (FR-056) |
| auth_tokens | `id`, `user_id`, `token_type`, `token_hash text`, `attempt_count int`, `expires_at`, `consumed_at`, `created_at`, `updated_at` | `token_hash` unique; `attempt_count` capped at 5 (FR-006); hard-deleted on use or expiry (FR-008) |
| mfa_factors | `id`, `user_id`, `secret_encrypted bytea`, `confirmed_at`, `disabled_at`, `created_at`, `updated_at` | One active factor per user; disabling is blocked for roles that require MFA (FR-011) |
| mfa_recovery_codes | `id`, `mfa_factor_id`, `code_hash text`, `used_at`, `created_at` | Single-use; use is audited (FR-017) |
| businesses | `id`, `legal_name text`, `slug citext`, `business_type`, `tin text`, `registration_number text`, `address jsonb`, `contact_phone text`, `currency char(3)`, `timezone text`, `status`, `owner_user_id`, `created_at`, `updated_at`, `deleted_at` | `slug` unique platform-wide (FR-023); `currency` defaults to `USD` (FR-027); `tin` and `registration_number` are sensitive and readable only by Business Admin (FR-034) |
| business_settings | `business_id` (PK), `currency char(3)`, `timezone text`, `receipt_footer_text text`, `default_tax_rate_bp int`, `allow_negative_stock boolean`, `max_discount_percent numeric(5,2)`, `low_stock_suppression_hours int`, `created_at`, `updated_at` | One row per business, created in the registration transaction (FR-021, FR-030); `low_stock_suppression_hours` defaults to 24 (FR-128) |
| branches | `id`, `business_id`, `name text`, `code text`, `address jsonb`, `phone text`, `is_warehouse boolean`, `allow_negative_stock boolean`, `status`, `created_at`, `updated_at`, `deleted_at` | `code` unique per tenant (FR-036); `allow_negative_stock` NULL means inherit the business setting (FR-043); DEACTIVATED blocks new sales but keeps history readable (FR-037) |
| subscriptions | `id`, `business_id`, `plan_code text`, `status text`, `period_start date`, `period_end date`, `created_at`, `updated_at` | Read-only in MVP; no billing, invoice or collection columns exist (FR-029) |
| roles | `id`, `business_id`, `code role_code`, `name text`, `is_system boolean`, `created_at`, `updated_at`, `deleted_at` | `(business_id, code)` unique; exactly four seeded rows per tenant (FR-051) |
| permissions | `id`, `code text`, `category text`, `description text`, `created_at`, `updated_at` | `code` unique platform-wide; no `business_id`, no `deleted_at`; catalogue is versioned with the code (FR-060) |
| role_permissions | `role_id`, `permission_id`, `created_at` | Composite PK; rows with `permission_id` in the `admin.*` category cannot be deleted from the Business Admin role (FR-053) |
| user_roles | `id`, `user_id`, `business_id`, `role_id`, `granted_by`, `granted_at`, `created_at`, `updated_at`, `deleted_at` | `(user_id, business_id, role_id)` unique among live rows; replacement sets `deleted_at` and takes effect on the next request (FR-049) |
| user_branches | `id`, `user_id`, `business_id`, `branch_id`, `assigned_by`, `created_at`, `updated_at`, `deleted_at` | `(user_id, branch_id)` unique among live rows; a Cashier or Inventory Clerk with no live row receives HTTP 403 (FR-041) |
| user_invitations | `id`, `business_id`, `email citext`, `phone text`, `role_id`, `branch_ids uuid[]`, `token_hash text`, `status`, `invited_by`, `expires_at`, `accepted_at`, `revoked_at`, `created_at`, `updated_at` | `token_hash` unique; `CHECK (email IS NOT NULL OR phone IS NOT NULL)`; `expires_at` = created + 7 days (FR-046) |
| categories | `id`, `business_id`, `name text`, `description text`, `created_at`, `updated_at`, `deleted_at` | `lower(name)` unique per tenant among live rows; hard delete rejected while a product references it (FR-062) |
| brands | `id`, `business_id`, `name text`, `created_at`, `updated_at`, `deleted_at` | `lower(name)` unique per tenant among live rows (FR-065) |
| products | `id`, `business_id`, `name text`, `category_id`, `brand_id`, `unit_of_measure text`, `cost_price_minor bigint`, `selling_price_minor bigint`, `currency char(3)`, `tax_rate_bp int`, `tax_class text`, `is_batch_tracked boolean`, `reorder_level numeric(14,3)`, `is_active boolean`, `created_at`, `updated_at`, `deleted_at` | `category_id` nullable and single-valued (FR-063); `selling_price_minor < cost_price_minor` is allowed and flagged, not blocked (FR-069); `is_active = false` is the INACTIVE state |
| product_variants | `id`, `business_id`, `product_id`, `sku text`, `barcode text`, `variant_name text`, `attributes jsonb`, `cost_price_minor bigint`, `selling_price_minor bigint`, `is_active boolean`, `created_at`, `updated_at`, `deleted_at` | `sku` unique per tenant (FR-072); `barcode` unique per tenant when not null (FR-073); NULL price inherits the product price |
| stock_batches | `id`, `business_id`, `product_variant_id`, `batch_number text`, `expiry_date date`, `supplier_id`, `received_at`, `status batch_status`, `created_at`, `updated_at` | `(business_id, product_variant_id, batch_number)` unique; `expiry_date` NULL means non-expiring; `status = EXPIRED` excludes the batch from sale (FR-132) |
| stock_movements | `id`, `business_id`, `branch_id`, `product_variant_id`, `batch_id`, `movement_type`, `quantity_delta numeric(14,3)`, `unit_cost_minor bigint`, `reference_type`, `reference_id uuid`, `reason text`, `actor_user_id`, `occurred_at timestamptz`, `created_at` | Append-only, no `updated_at`/`deleted_at`; `CHECK (quantity_delta <> 0)`; `CHECK (movement_type NOT IN ('ADJUSTMENT','STOCK_COUNT','WRITE_OFF') OR reason IS NOT NULL)` (FR-109); `batch_id` is required when the variant is batch-tracked (FR-110) |
| inventory_balances | `business_id`, `branch_id`, `product_variant_id`, `batch_id`, `quantity_on_hand numeric(14,3)`, `last_movement_at`, `created_at`, `updated_at` | Unique `(business_id, branch_id, product_variant_id, batch_id) NULLS NOT DISTINCT`; derived projection, recomputable from `stock_movements` (FR-102, FR-199); never the source of truth |
| stock_adjustments | `id`, `business_id`, `branch_id`, `product_variant_id`, `batch_id`, `quantity_delta numeric(14,3)`, `reason_code`, `reason_text text`, `actor_user_id`, `stock_movement_id`, `created_at`, `updated_at` | `reason_text` NOT NULL and non-empty (FR-109); `stock_movement_id` unique — exactly one movement per adjustment (FR-111) |
| stock_counts | `id`, `business_id`, `branch_id`, `status`, `counted_by