# Traceability Matrix

Every functional and non-functional requirement is listed with its wording, the document it comes from and the tasks that implement it. A requirement with no task is a gap in the plan, unless it is deferred.

## Matrix

| ID | Requirement | Source document | Tasks |
|---|---|---|---|
| FR-001 | The system shall allow a user to register an account with email and password. — P0 | docs/03-cleaned-srs.md | task-003 |
| FR-002 | The system shall enforce a password policy of at least 10 characters with mixed character classes on registration and password reset. — P0 | docs/03-cleaned-srs.md | task-003 |
| FR-003 | The system shall reject registration with an email that already exists, returning HTTP 409. — P0 | docs/03-cleaned-srs.md | task-003 |
| FR-004 | The system shall create a new account in state `PENDING_VERIFICATION` and shall expose no business data before verification completes. — P0 | docs/03-cleaned-srs.md | task-003 |
| FR-005 | The system shall send an account verification code by phone as the primary channel and by email when the email channel is enabled. — P0 | docs/03-cleaned-srs.md | task-003 |
| FR-006 | The system shall expire a verification code after 10 minutes and shall allow at most 5 verification attempts per code. — P0 | docs/03-cleaned-srs.md | task-003 |
| FR-007 | The system shall move an account from `PENDING_VERIFICATION` to `ACTIVE` on successful verification. — P0 | docs/03-cleaned-srs.md | task-003 |
| FR-008 | The system shall hard-delete verification tokens on use or expiry. — P0 | docs/03-cleaned-srs.md | task-003 |
| FR-009 | The system shall require MFA on sign-in for the Business Admin and Branch Manager roles. — P0 | docs/03-cleaned-srs.md | task-003 |
| FR-010 | The system shall return an MFA secret and one-time recovery codes on MFA enrolment, displaying the recovery codes exactly once. — P0 | docs/03-cleaned-srs.md | task-003 |
| FR-011 | The system shall prevent a user holding an admin role from disabling MFA for that role. — P0 | docs/03-cleaned-srs.md | task-003 |
| FR-012 | The system shall write an audit entry when MFA is enabled or disabled. — P0 | docs/03-cleaned-srs.md | task-003 |
| FR-013 | The system shall return HTTP 202 to a password reset request whether or not the email exists. — P0 | docs/03-cleaned-srs.md | task-003 |
| FR-014 | The system shall issue a single-use password reset token that expires in 30 minutes and shall invalidate all existing sessions on successful reset. — P0 | docs/03-cleaned-srs.md | task-003 |
| FR-015 | The system shall authenticate a user by email and password and issue a session with a rotating refresh token. — P0 | docs/03-cleaned-srs.md | task-003 |
| FR-016 | The system shall list a user's active sessions with device, IP address and last-used timestamp, and shall allow the user to revoke a session in one request. — P1 | docs/03-cleaned-srs.md | task-003 |
| FR-017 | The system shall treat an MFA recovery code as single-use and shall audit its use. — P0 | docs/03-cleaned-srs.md | task-003 |
| FR-018 | The system shall lock an email for 15 minutes after 10 failed sign-in attempts within 15 minutes. — P0 | docs/03-cleaned-srs.md | task-003 |
| FR-019 | The system shall return a lockout message that does not disclose whether the email exists. — P0 | docs/03-cleaned-srs.md | task-003 |
| FR-020 | The system shall log and audit lockout and rate-limit events. — P0 | docs/03-cleaned-srs.md | task-003 |
| FR-021 | The system shall create a business tenant and the registering owner's Business Admin role assignment in one transaction. — P0 | docs/03-cleaned-srs.md | task-005 |
| FR-022 | The system shall capture a business type of retail, pharmacy, wholesale or distribution at business registration. — P0 | docs/03-cleaned-srs.md | task-005 |
| FR-023 | The system shall enforce a unique business slug/identifier across the platform. — P0 | docs/03-cleaned-srs.md | task-005 |
| FR-024 | The system shall complete business registration self-service after phone verification, with no platform approval step. — P0 | docs/03-cleaned-srs.md | task-005 |
| FR-025 | The system shall allow a Business Admin to update the business legal name, TIN, registration number, address, contact phone and currency. — P0 | docs/03-cleaned-srs.md | task-005 |
| FR-026 | The system shall write an audit entry containing before and after values for every business profile change. — P0 | docs/03-cleaned-srs.md | task-005 |
| FR-027 | The system shall store one currency per tenant and shall default the display currency to USD. — P0 | docs/03-cleaned-srs.md | task-002, task-005 |
| FR-028 | The system shall scope every read and write of a business-owned record to the requesting tenant server-side. — P0 | docs/03-cleaned-srs.md | task-002, task-004 |
| FR-029 | The system shall return the business subscription record with plan, status and period start/end. — P1 | docs/03-cleaned-srs.md | task-005 |
| FR-030 | The system shall store business-level settings including currency, timezone, receipt footer text and default tax rate. — P1 | docs/03-cleaned-srs.md | task-005 |
| FR-031 | The system shall soft-delete business records by setting `deleted_at` rather than removing rows. — P0 | docs/03-cleaned-srs.md | task-002, task-005 |
| FR-032 | The system shall allow a user to set an active business and active branch context and shall re-validate membership on every subsequent request. — P1 | docs/03-cleaned-srs.md | task-004 |
| FR-033 | The system shall reject an active-context switch to a tenant in which the user holds no role, returning HTTP 403. — P0 | docs/03-cleaned-srs.md | task-004 |
| FR-034 | The system shall treat business registration and tax information as sensitive data with access restricted to the Business Admin role. — P0 | docs/03-cleaned-srs.md | task-005 |
| FR-035 | The system shall allow a Business Admin to create and edit branches with name, code, address, phone and `is_warehouse` flag. — P0 | docs/03-cleaned-srs.md | task-005 |
| FR-036 | The system shall enforce branch code uniqueness within a tenant. — P0 | docs/03-cleaned-srs.md | task-005 |
| FR-037 | The system shall block new sales at a deactivated branch while keeping that branch's history readable. — P0 | docs/03-cleaned-srs.md | task-005 |
| FR-038 | The system shall list branches scoped to the requester's tenant and branch access. — P0 | docs/03-cleaned-srs.md | task-005 |
| FR-039 | The system shall allow a branch to be flagged as a warehouse. — P0 | docs/03-cleaned-srs.md | task-005 |
| FR-040 | The system shall allow a Business Admin to assign users to branches. — P0 | docs/03-cleaned-srs.md | task-005 |
| FR-041 | The system shall return HTTP 403 on a branch-scoped operation when a Cashier or Inventory Clerk has no branch assignment. — P0 | docs/03-cleaned-srs.md | task-004 |
| FR-042 | The system shall prevent a branch-scoped user from reading another branch's balances, sales or transfers. — P0 | docs/03-cleaned-srs.md | task-004 |
| FR-043 | The system shall allow the negative-stock setting to be overridden per branch. — P2 | docs/03-cleaned-srs.md | task-005 |
| FR-044 | The system shall audit branch creation, update, deactivation and user assignment. — P0 | docs/03-cleaned-srs.md | task-005 |
| FR-045 | The system shall allow a Business Admin to invite a user with email or phone, a role and a branch scope. — P0 | docs/03-cleaned-srs.md | task-005 |
| FR-046 | The system shall issue a single-use invitation token that expires after 7 days. — P0 | docs/03-cleaned-srs.md | task-005 |
| FR-047 | The system shall allow an invited user to accept the invitation, set a password and become bound by the MFA rules of the assigned role. — P0 | docs/03-cleaned-srs.md | task-005 |
| FR-048 | The system shall list the tenant's users with their roles and branch assignments. — P0 | docs/03-cleaned-srs.md | task-005 |
| FR-049 | The system shall allow a Business Admin to replace a user's role assignments, effective on the user's next request. — P0 | docs/03-cleaned-srs.md | task-005 |
| FR-050 | The system shall audit every role change with actor and target. — P0 | docs/03-cleaned-srs.md | task-005 |
| FR-051 | The system shall provide four system roles per tenant: Business Admin, Branch Manager, Cashier and Inventory Clerk. — P0 | docs/03-cleaned-srs.md | task-004 |
| FR-052 | The system shall allow a Business Admin to manage role permissions through `role_permissions`. — P1 | docs/03-cleaned-srs.md | task-004 |
| FR-053 | The system shall prevent removal of `admin.*` permissions from the Business Admin role. — P0 | docs/03-cleaned-srs.md | task-004 |
| FR-054 | The system shall enforce role and permission checks server-side on every endpoint, defaulting to deny. — P0 | docs/03-cleaned-srs.md | task-004 |
| FR-055 | The system shall support one user account holding roles in more than one business through `user_roles`. — P1 | docs/03-cleaned-srs.md | task-004 |
| FR-056 | The system shall allow a Business Admin to deactivate a user and shall revoke that user's sessions and refresh tokens within one request. — P0 | docs/03-cleaned-srs.md | task-005 |
| FR-057 | The system shall preserve attribution of a deactivated user's historical sales, receipts and stock movements. — P0 | docs/03-cleaned-srs.md | task-005 |
| FR-058 | The system shall audit user deactivation and reactivation. — P0 | docs/03-cleaned-srs.md | task-005 |
| FR-059 | The system shall enforce the MFA requirement defined per role. — P0 | docs/03-cleaned-srs.md | task-003 |
| FR-060 | The system shall expose the permission catalogue for role configuration. — P1 | docs/03-cleaned-srs.md | task-004 |
| FR-061 | The system shall allow a Business Admin to list, create and update categories scoped to the tenant, with unique names per tenant and soft delete. — P0 | docs/03-cleaned-srs.md | task-006 |
| FR-062 | The system shall reject hard deletion of a category that is in use by a product. — P0 | docs/03-cleaned-srs.md | task-006 |
| FR-063 | The system shall allow a product to be assigned to at most one category. — P0 | docs/03-cleaned-srs.md | task-006 |
| FR-064 | The system shall allow a Business Admin to list, create and update brands scoped to the tenant. — P0 | docs/03-cleaned-srs.md | task-006 |
| FR-065 | The system shall enforce brand name uniqueness per tenant, case-insensitively. — P0 | docs/03-cleaned-srs.md | task-006 |
| FR-066 | The system shall soft-delete brands and categories. — P0 | docs/03-cleaned-srs.md | task-006 |
| FR-067 | The system shall allow a Business Admin to create a product with name, category, brand, unit of measure, cost price, selling price, tax rate/class, `is_batch_tracked` and `reorder_level`. — P0 | docs/03-cleaned-srs.md | task-006 |
| FR-068 | The system shall store every monetary amount as an integer in minor units with an explicit currency. — P0 | docs/03-cleaned-srs.md | task-002, task-006 |
| FR-069 | The system shall allow a selling price below cost price and shall flag it with a warning. — P1 | docs/03-cleaned-srs.md | task-006 |
| FR-070 | The system shall allow a Business Admin to update and soft-delete products. — P0 | docs/03-cleaned-srs.md | task-006 |
| FR-071 | The system shall allow a Business Admin to create product variants with SKU and optional barcode. — P0 | docs/03-cleaned-srs.md | task-006 |
| FR-072 | The system shall enforce SKU uniqueness per tenant. — P0 | docs/03-cleaned-srs.md | task-006 |
| FR-073 | The system shall enforce barcode uniqueness per tenant when a barcode is present. — P0 | docs/03-cleaned-srs.md | task-006 |
| FR-074 | The system shall resolve a barcode scan to exactly one variant or return a clear not-found result without blocking the POS. — P0 | docs/03-cleaned-srs.md | task-006 |
| FR-075 | The system shall accept product image uploads through a pre-signed URL to a tenant-prefixed object key. — P1 | docs/03-cleaned-srs.md | task-006 |
| FR-076 | The system shall restrict product image uploads to image MIME types and a maximum size of 5 MB. — P1 | docs/03-cleaned-srs.md | task-006 |
| FR-077 | The system shall serve product image reads through short-lived signed URLs. — P1 | docs/03-cleaned-srs.md | task-006 |
| FR-078 | The system shall import catalogue data from CSV/XLSX with per-row validation of required columns, duplicate SKU/barcode, numeric prices and unknown categories. — P1 | docs/03-cleaned-srs.md | task-013 |
| FR-079 | The system shall search products by name, SKU or barcode within the tenant. — P0 | docs/03-cleaned-srs.md | task-006 |
| FR-080 | The system shall audit catalogue price changes. — P0 | docs/03-cleaned-srs.md | task-006 |
| FR-081 | The system shall return a dashboard summary containing today's sales total, transaction count, top items, low-stock count, pending transfer approvals, pending purchase-order items and open cash session. — P0 | docs/03-cleaned-srs.md | task-013 |
| FR-082 | The system shall scope dashboard results to the requester's branch for a Branch Manager. — P0 | docs/03-cleaned-srs.md | task-013 |
| FR-083 | The system shall refresh dashboard data without a full page reload. — P1 | docs/03-cleaned-srs.md | task-014 |
| FR-084 | The system shall create in-app notifications for transfer requested, approved, dispatched and received; purchase order submitted, confirmed and received; low-stock threshold crossed; refund issued; and day closed. — P0 | docs/03-cleaned-srs.md | task-012 |
| FR-085 | The system shall display an unread notification count in the application header. — P0 | docs/03-cleaned-srs.md | task-012, task-014 |
| FR-086 | The system shall allow a user to mark notifications as read and shall audit the mark-as-read action. — P1 | docs/03-cleaned-srs.md | task-012, task-014 |
| FR-087 | The system shall allow a user to configure notification preferences per event type and per channel. — P1 | docs/03-cleaned-srs.md | task-012 |
| FR-088 | The system shall always enable the in-app notification channel. — P0 | docs/03-cleaned-srs.md | task-012 |
| FR-089 | The system shall offer the WhatsApp notification channel as selectable when the provider is enabled. — P1 | docs/03-cleaned-srs.md | task-012 |
| FR-090 | The system shall deliver notifications through a background job. — P0 | docs/03-cleaned-srs.md | task-012 |
| FR-091 | The system shall allow a Business Admin to search the audit log by actor, action, target type, target id and date range. — P0 | docs/03-cleaned-srs.md | task-012 |
| FR-092 | The system shall store each audit entry with actor, action, target, timestamp and context. — P0 | docs/03-cleaned-srs.md | task-012 |
| FR-093 | The system shall store audit entries append-only and shall expose no API operation that edits or deletes them. — P0 | docs/03-cleaned-srs.md | task-012 |
| FR-094 | The system shall show a Branch Manager only branch-scoped audit entries. — P0 | docs/03-cleaned-srs.md | task-004, task-012 |
| FR-095 | The system shall write an audit entry for every critical action covering stock, money, permissions, branches, catalogue price and settings. — P0 | docs/03-cleaned-srs.md | task-012 |
| FR-096 | The system shall retain audit entries for the life of the tenant record. — P0 | docs/03-cleaned-srs.md | task-012 |
| FR-097 | The system shall record request id, IP address and user agent as context on audit entries. — P1 | docs/03-cleaned-srs.md | task-012 |
| FR-098 | The system shall allow audit log filtering by branch. — P1 | docs/03-cleaned-srs.md | task-012 |
| FR-099 | The system shall paginate audit log results. — P1 | docs/03-cleaned-srs.md | task-012 |
| FR-100 | The system shall audit authentication events including sign-in, MFA challenge, lockout and password reset. — P0 | docs/03-cleaned-srs.md | task-003, task-012 |
| FR-101 | The system shall list stock balances per product, variant, batch and branch with filters for branch, category, brand, product and low-stock. — P0 | docs/03-cleaned-srs.md | task-007 |
| FR-102 | The system shall compute each balance as the sum of `stock_movements` for the same product, variant, batch and branch. — P0 | docs/03-cleaned-srs.md | task-007 |
| FR-103 | The system shall list expired batches separately from sellable stock. — P0 | docs/03-cleaned-srs.md | task-007 |
| FR-104 | The system shall filter balances to items at or below their reorder level. — P0 | docs/03-cleaned-srs.md | task-007 |
| FR-105 | The system shall list stock movements with movement type, signed quantity, reference, batch, actor and timestamp. — P0 | docs/03-cleaned-srs.md | task-007 |
| FR-106 | The system shall never update or delete a `stock_movements` row through any endpoint or UI. — P0 | docs/03-cleaned-srs.md | task-007 |
| FR-107 | The system shall filter stock movements by branch, product, movement type and date range. — P0 | docs/03-cleaned-srs.md | task-007 |
| FR-108 | The system shall link each movement to its originating sale, goods receipt, transfer or adjustment. — P1 | docs/03-cleaned-srs.md | task-007 |
| FR-109 | The system shall require a non-empty reason on every stock adjustment. — P0 | docs/03-cleaned-srs.md | task-007 |
| FR-110 | The system shall require product/variant, branch, quantity delta and, for batch-tracked products, a batch on every stock adjustment. — P0 | docs/03-cleaned-srs.md | task-007 |
| FR-111 | The system shall write exactly one stock movement and one audit entry per stock adjustment. — P0 | docs/03-cleaned-srs.md | task-007 |
| FR-112 | The system shall return HTTP 403 for a stock adjustment attempted without permission. — P0 | docs/03-cleaned-srs.md | task-007 |
| FR-113 | The system shall permit negative stock only when the business or branch has explicitly enabled it. — P2 | docs/03-cleaned-srs.md | task-007 |
| FR-114 | The system shall reject atomically, with HTTP 409 and a machine-readable reason, any commit that would take a balance negative while negative stock is disabled. — P0 | docs/03-cleaned-srs.md | task-007 |
| FR-115 | The system shall display a negative balance in red when negative stock is enabled. — P2 | docs/03-cleaned-srs.md | task-007 |
| FR-116 | The system shall create a stock transfer in state `REQUESTED` with origin branch, destination branch and lines of product/variant/batch and quantity. — P0 | docs/03-cleaned-srs.md | task-008 |
| FR-117 | The system shall write no stock movement at stock transfer request time. — P0 | docs/03-cleaned-srs.md | task-008 |
| FR-118 | The system shall allow a Branch Manager to approve or reject a transfer, requiring a reason on rejection. — P0 | docs/03-cleaned-srs.md | task-008 |
| FR-119 | The system shall accept only the transitions `REQUESTED → APPROVED` and `REQUESTED → REJECTED`. — P0 | docs/03-cleaned-srs.md | task-008 |
| FR-120 | The system shall dispatch an approved transfer by writing negative movements at the origin branch inside a stock-checked transaction. — P0 | docs/03-cleaned-srs.md | task-008 |
| FR-121 | The system shall reject the entire dispatch with HTTP 409 when origin stock is insufficient. — P0 | docs/03-cleaned-srs.md | task-008 |
| FR-122 | The system shall receive a dispatched transfer by writing positive movements at the destination branch. — P0 | docs/03-cleaned-srs.md | task-008 |
| FR-123 | The system shall accept received quantities per line defaulting to the dispatched quantity, shall require a note on a shortfall and shall store the shortfall as the transfer discrepancy. — P0 | docs/03-cleaned-srs.md | task-008 |
| FR-124 | The system shall allow a Branch Manager to close a received transfer only after any discrepancy note is acknowledged. — P1 | docs/03-cleaned-srs.md | task-008 |
| FR-125 | The system shall retain the source and destination branch for the whole life of a transfer and shall make a closed transfer immutable. — P0 | docs/03-cleaned-srs.md | task-008 |
| FR-126 | The system shall list low-stock items by comparing balances to `reorder_level` per product/variant per branch. — P0 | docs/03-cleaned-srs.md | task-007 |
| FR-127 | The system shall create a notification when a balance crosses to at or below `reorder_level`. — P0 | docs/03-cleaned-srs.md | task-007 |
| FR-128 | The system shall suppress repeat low-stock notifications for 24 hours until the balance rises above the threshold. — P1 | docs/03-cleaned-srs.md | task-007 |
| FR-129 | The system shall record a stock count capturing counted quantities per product/variant/batch for a branch. — P1 | docs/03-cleaned-srs.md | task-007 |
| FR-130 | The system shall compute the stock count delta and raise one adjustment per line with reason `STOCK_COUNT`, and shall not allow a count to set a balance directly. — P1 | docs/03-cleaned-srs.md | task-007 |
| FR-131 | The system shall capture batch number and expiry date on goods receipt for batch-tracked products. — P0 | docs/03-cleaned-srs.md | task-009 |
| FR-132 | The system shall exclude expired batches from sale at the moment of sale and shall flag them for write-off. — P0 | docs/03-cleaned-srs.md | task-010 |
| FR-133 | The system shall allow a Business Admin to manage suppliers with name, contact person, phone, email, address, TIN and payment terms. — P0 | docs/03-cleaned-srs.md | task-009 |
| FR-134 | The system shall enforce supplier name uniqueness per tenant and shall soft-delete suppliers. — P0 | docs/03-cleaned-srs.md | task-009 |
| FR-135 | The system shall treat suppliers as non-user records with no login in MVP. — P0 | docs/03-cleaned-srs.md | task-009 |
| FR-136 | The system shall list suppliers with search and pagination. — P1 | docs/03-cleaned-srs.md | task-009 |
| FR-137 | The system shall create a purchase order in state `DRAFT` with supplier, branch, expected date and lines of product/variant, quantity, unit cost and tax. — P0 | docs/03-cleaned-srs.md | task-009 |
| FR-138 | The system shall compute draft purchase order totals server-side. — P0 | docs/03-cleaned-srs.md | task-009 |
| FR-139 | The system shall allow a draft purchase order to be edited. — P0 | docs/03-cleaned-srs.md | task-009 |
| FR-140 | The system shall submit a purchase order only when it has a supplier and at least one line with quantity greater than zero, moving `DRAFT → SUBMITTED`. — P0 | docs/03-cleaned-srs.md | task-009 |
| FR-141 | The system shall prevent editing a submitted purchase order and shall require cancellation plus a new purchase order for changes. — P0 | docs/03-cleaned-srs.md | task-009 |
| FR-142 | The system shall allow a user with permission `po.confirm` to confirm a purchase order, moving `SUBMITTED → CONFIRMED`. — P0 | docs/03-cleaned-srs.md | task-009 |
| FR-143 | The system shall record actor and timestamp on purchase order confirmation and shall notify the requesting branch. — P0 | docs/03-cleaned-srs.md | task-009 |
| FR-144 | The system shall allow a Business Admin to cancel a purchase order and shall audit the cancellation. — P1 | docs/03-cleaned-srs.md | task-009 |
| FR-145 | The system shall create a goods receipt only against a purchase order in state `CONFIRMED` or `PARTIALLY_RECEIVED`. — P0 | docs/03-cleaned-srs.md | task-009 |
| FR-146 | The system shall capture received quantity, unit cost, batch number and expiry per goods receipt line. — P0 | docs/03-cleaned-srs.md | task-009 |
| FR-147 | The system shall write positive stock movements, create or match batches, record `goods_receipts` and `goods_receipt_items`, and increment received quantities on the purchase order in one transaction. — P0 | docs/03-cleaned-srs.md | task-009 |
| FR-148 | The system shall require explicit confirmation for a receipt exceeding the ordered quantity and shall flag the over-receipt. — P0 | docs/03-cleaned-srs.md | task-009 |
| FR-149 | The system shall reject receiving against a line that is not on the purchase order. — P0 | docs/03-cleaned-srs.md | task-009 |
| FR-150 | The system shall show ordered, received and outstanding quantities per purchase order line together with the current state. — P0 | docs/03-cleaned-srs.md | task-009 |
| FR-151 | The system shall set `PARTIALLY_RECEIVED` when some but not all lines are fully received and `RECEIVED` when all ordered quantities are received. — P0 | docs/03-cleaned-srs.md | task-009 |
| FR-152 | The system shall close a purchase order from `RECEIVED`, or from `PARTIALLY_RECEIVED` with a stated shortfall reason. — P1 | docs/03-cleaned-srs.md | task-009 |
| FR-153 | The system shall make a closed purchase order immutable. — P0 | docs/03-cleaned-srs.md | task-009 |
| FR-154 | The system shall audit purchase order submission, confirmation, each goods receipt, cancellation and closure. — P0 | docs/03-cleaned-srs.md | task-009 |
| FR-155 | The system shall search products in POS by name, SKU or barcode scoped to the selling branch. — P0 | docs/03-cleaned-srs.md | task-010 |
| FR-156 | The system shall add the exact variant to the cart when a barcode is scanned. — P0 | docs/03-cleaned-srs.md | task-010 |
| FR-157 | The system shall display out-of-stock items in POS as visible but not committable. — P0 | docs/03-cleaned-srs.md | task-010 |
| FR-158 | The system shall never present an expired batch as sellable in POS. — P0 | docs/03-cleaned-srs.md | task-010 |
| FR-159 | The system shall provide a cart with editable line quantity and shall recompute subtotal, tax and total server-side. — P0 | docs/03-cleaned-srs.md | task-010 |
| FR-160 | The system shall treat client-supplied totals as display-only and shall never persist them. — P0 | docs/03-cleaned-srs.md | task-010 |
| FR-161 | The system shall require permission `sales.discount` for a line discount and shall cap the discount at a configurable maximum percentage. — P1 | docs/03-cleaned-srs.md | task-010 |
| FR-162 | The system shall commit a sale with an idempotency key, creating `sales`, `sale_items`, stock movements and the payment link in one transaction. — P0 | docs/03-cleaned-srs.md | task-010 |
| FR-163 | The system shall re-validate stock at the selling branch at commit time and shall reject with HTTP 409 when stock is unavailable. — P0 | docs/03-cleaned-srs.md | task-010 |
| FR-164 | The system shall return the original sale for a repeated idempotency key and shall never create a duplicate sale or movement. — P0 | docs/03-cleaned-srs.md | task-010 |
| FR-165 | The system shall resolve sale lines to batches using first-expiry-first-out within non-expired batches. — P0 | docs/03-cleaned-srs.md | task-010 |
| FR-166 | The system shall create a `receipts` record with a tenant-unique number on sale completion. — P0 | docs/03-cleaned-srs.md | task-010 |
| FR-167 | The system shall render the receipt print view and PDF from stored sale data only. — P0 | docs/03-cleaned-srs.md | task-010 |
| FR-168 | The system shall allow a receipt to be re-printed without creating a new sale or stock movement. — P0 | docs/03-cleaned-srs.md | task-010 |
| FR-169 | The system shall record a full or partial refund as `refunds` plus refund lines against the original sale. — P0 | docs/03-cleaned-srs.md | task-010 |
| FR-170 | The system shall write reversing stock movements to the original batch for batch-tracked products on refund. — P0 | docs/03-cleaned-srs.md | task-010 |
| FR-171 | The system shall set the sale state to `REFUNDED` or `PARTIALLY_REFUNDED` after a refund. — P0 | docs/03-cleaned-srs.md | task-010 |
| FR-172 | The system shall reject a refund quantity exceeding the sold quantity net of prior refunds. — P0 | docs/03-cleaned-srs.md | task-010 |
| FR-173 | The system shall search sale history by date range, branch, cashier, payment method, state and receipt number. — P1 | docs/03-cleaned-srs.md | task-010 |
| FR-174 | The system shall show a branch-scoped user only their own branch's sales. — P0 | docs/03-cleaned-srs.md | task-010 |
| FR-175 | The system shall support a sale split across at most two payment methods. — P1 | docs/03-cleaned-srs.md | task-010 |
| FR-176 | The system shall hold a parked sale in the POS client session only, with no server-side parked-sale entity. — P2 | docs/03-cleaned-srs.md | task-010, task-014 |
| FR-177 | The system shall discard an unpaid cart when the POS page is reloaded. — P2 | docs/03-cleaned-srs.md | task-010, task-014 |
| FR-178 | The system shall audit sale completion, discounts above the configured threshold and refunds. — P0 | docs/03-cleaned-srs.md | task-010 |
| FR-179 | The system shall initiate a mobile money payment with provider `mtn_momo` or `airtel_money`, amount, currency, payer phone and sale reference. — P0 | docs/03-cleaned-srs.md | task-011 |
| FR-180 | The system shall create a mobile money payment in state `PENDING`. — P0 | docs/03-cleaned-srs.md | task-011 |
| FR-181 | The system shall move a mobile money payment to `SUCCEEDED` or `FAILED` on receipt of the provider callback. — P0 | docs/03-cleaned-srs.md | task-011 |
| FR-182 | The system shall poll payment state on the cashier screen and shall never mark a sale paid from a client signal alone. — P0 | docs/03-cleaned-srs.md | task-011 |
| FR-183 | The system shall record a cash payment with the amount tendered and shall compute change server-side. — P0 | docs/03-cleaned-srs.md | task-011 |
| FR-184 | The system shall move a cash payment directly to `SUCCEEDED` and attribute it to the cashier's open cash session. — P0 | docs/03-cleaned-srs.md | task-011 |
| FR-185 | The system shall verify the provider signature/reference on every callback, store the provider event id and reject repeated events. — P0 | docs/03-cleaned-srs.md | task-011 |
| FR-186 | The system shall record a payment success arriving after refund or sale cancellation as `ORPHANED` without altering the sale. — P0 | docs/03-cleaned-srs.md | task-011 |
| FR-187 | The system shall mark a payment `EXPIRED` through a background job when it remains `PENDING` beyond 15 minutes. — P0 | docs/03-cleaned-srs.md | task-011 |
| FR-188 | The system shall record a refund against the original payment method. — P1 | docs/03-cleaned-srs.md | task-010 |
| FR-189 | The system shall support the payment states `PENDING`, `SUCCEEDED`, `FAILED`, `EXPIRED` and `ORPHANED`. — P0 | docs/03-cleaned-srs.md | task-011 |
| FR-190 | The system shall report payments by provider, state and date with sale references. — P0 | docs/03-cleaned-srs.md | task-011 |
| FR-191 | The system shall list payments without a completed sale and sales without a successful payment as a mismatch list. — P0 | docs/03-cleaned-srs.md | task-011 |
| FR-192 | The system shall create an audited adjustment record for a manual payment correction instead of editing the payment. — P0 | docs/03-cleaned-srs.md | task-011 |
| FR-193 | The system shall open a cash session implicitly on the first cash payment of the day. — P1 | docs/03-cleaned-srs.md | task-011 |
| FR-194 | The system shall audit every payment state change. — P0 | docs/03-cleaned-srs.md | task-011 |
| FR-195 | The system shall report sales grouped by day, week or month with filters for branch, cashier, category and payment method. — P0 | docs/03-cleaned-srs.md | task-013 |
| FR-196 | The system shall exclude refunds from sales totals and shall show refunds separately. — P0 | docs/03-cleaned-srs.md | task-013 |
| FR-197 | The system shall derive all report values from stored sale and refund records. — P0 | docs/03-cleaned-srs.md | task-013 |
| FR-198 | The system shall report stock with opening balance, movements by type, closing balance and valuation at cost per product/variant/branch. — P0 | docs/03-cleaned-srs.md | task-013 |
| FR-199 | The system shall assert in the stock report that the closing balance equals the sum of movements and shall report any drift. — P0 | docs/03-cleaned-srs.md | task-013 |
| FR-200 | The system shall report purchasing grouped by supplier and period. — P1 | docs/03-cleaned-srs.md | task-013 |
| FR-201 | The system shall show ordered value, received value, outstanding quantities and open purchase order count in the purchasing report. — P1 | docs/03-cleaned-srs.md | task-013 |
| FR-202 | The system shall report low-stock items at or below reorder level by branch with quantity, reorder level and last movement date. — P0 | docs/03-cleaned-srs.md | task-013 |
| FR-203 | The system shall allow the low-stock report to be exported through the export job. — P1 | docs/03-cleaned-srs.md | task-013 |
| FR-204 | The system shall create a day closure snapshotting expected cash, counted cash, discrepancy and reason for a branch and business date. — P0 | docs/03-cleaned-srs.md | task-013 |
| FR-205 | The system shall require a reason when the day closure discrepancy is non-zero and shall reject a second closure for the same branch and business date with HTTP 409. — P0 | docs/03-cleaned-srs.md | task-013 |
| FR-206 | The system shall make a closed day immutable and audited, with corrections recorded as new audited adjustment records. — P0 | docs/03-cleaned-srs.md | task-013 |
| FR-207 | The system shall import CSV/XLSX files for job types `products`, `suppliers`, `categories` and `opening_stock`. — P0 | docs/03-cleaned-srs.md | task-013 |
| FR-208 | The system shall validate import file type and size, validate each row independently and report row number, column, value and error. — P0 | docs/03-cleaned-srs.md | task-013 |
| FR-209 | The system shall apply an import row-by-row in a transaction and shall retain the error report. — P0 | docs/03-cleaned-srs.md | task-013 |
| FR-210 | The system shall attach documents to a record by entity type and entity id. — P1 | docs/03-cleaned-srs.md | task-013 |
| FR-211 | The system shall enforce a MIME allowlist of PDF, JPEG, PNG, XLSX and CSV, enforce a maximum file size and prefix object keys with the tenant id. — P1 | docs/03-cleaned-srs.md | task-013 |
| FR-212 | The system shall require an authenticated short-lived signed URL for attachment access and shall audit downloads. — P1 | docs/03-cleaned-srs.md | task-013 |
| FR-213 | The system shall process exports, notifications, payment expiry and payment reconciliation as Redis-backed background jobs. — P0 | docs/03-cleaned-srs.md | task-012 |
| FR-214 | The system shall return job status `queued`, `running`, `succeeded` or `failed` with error detail. — P0 | docs/03-cleaned-srs.md | task-012 |
| FR-215 | The system shall enqueue an export job, return a job id and make the resulting file downloadable through an authenticated link. — P1 | docs/03-cleaned-srs.md | task-013 |
| FR-216 | The system shall retry a failed job a bounded number of times and then surface the failure in the UI. — P0 | docs/03-cleaned-srs.md | task-012 |
| NFR-001 | Performance — The API shall respond within p95 500 ms for reads and p95 1 s for writes at 50 concurrent users. — POS, stock and dashboard screens are used on shop-floor devices during live trading; slow responses block t | docs/05-non-functional-requirements.md | task-015 |
| NFR-002 | Scalability — The architecture shall be a modular monolith with a stateless API, database connection pooling, pagination and indexed queries, retaining a path to horizontal scaling. — MVP is built by one developer with a | docs/05-non-functional-requirements.md | task-001 |
| NFR-003 | Reliability — The production system shall target 99.5% monthly availability, subject to the hosting provider tier. — Sales, stock and payment flows are business-critical during trading hours; downtime stops tills. — 99.5 | docs/05-non-functional-requirements.md | task-001 |
| NFR-004 | Backup/Recovery — The system shall take daily automated database backups retained for 14 days, and backup restoration shall be tested in staging before launch. — The stock ledger, sales and payment records are the tenant | docs/05-non-functional-requirements.md | task-015 |
| NFR-005 | Security — The system shall have no unresolved P0 or P1 findings from security review at launch, with server-side authorization on all protected endpoints. — Tenant isolation, financial records and personal data are the | docs/05-non-functional-requirements.md | task-004, task-015 |
| NFR-006 | Data integrity — The system shall enforce data integrity through database transactions for every stock, money and state transition, idempotency keys on sale submission and provider event ids on callbacks. — The stock mov | docs/05-non-functional-requirements.md | task-002 |
| NFR-007 | Observability — The system shall provide centralized application logging, error monitoring and audit logs containing actor, action, target, timestamp and context, and shall never log passwords, tokens or full payment cre | docs/05-non-functional-requirements.md | task-012 |
| NFR-008 | Accessibility — All authenticated screens shall meet WCAG 2.1 Level AA. — Shop attendants and administrators use the product for full shifts; accessibility also improves usability on small screens and with barcode scanne | docs/05-non-functional-requirements.md | task-014 |
| NFR-009 | Compatibility — The web application shall support the last two versions of Chrome, Firefox and Edge, Safari 14 or later, and current Android Chrome, and shall be installable as a PWA. — Users work on mixed desktop and An | docs/05-non-functional-requirements.md | task-014 |
| NFR-010 | Maintainability — The codebase shall carry unit tests for stock, pricing, tax, refund, purchase order, payment, forecasting and permission logic, integration tests for sale+inventory, PO+receiving, transfers, supplier li | docs/05-non-functional-requirements.md | task-015 |
| NFR-011 | Error handling — All API errors shall return the shape `{ error: { code, message, details, requestId } }` with no stack traces or secrets in production responses. — Cashiers and clerks need actionable messages, and leake | docs/05-non-functional-requirements.md | task-001 |
| NFR-012 | Localization readiness — The MVP shall be English-only and i18n-ready, with all user-facing strings externalized, UTC timestamps in API responses and USD as the display currency. — Expansion beyond Uganda is deferred but | docs/05-non-functional-requirements.md | task-002 |
| NFR-013 | API versioning — All endpoints shall be versioned by URL prefix `/v1/` and documented with OpenAPI; breaking changes require a new version prefix. — A future React Native app and tenant integrations must not break on int | docs/05-non-functional-requirements.md | task-001, task-016 |
| NFR-014 | Compliance — The system shall comply with the Ugandan Data Protection and Privacy Act 2019 and relevant regulations for personal, financial and business registration data. — The platform stores personal data (users, cust | docs/05-non-functional-requirements.md | task-002, task-016 |
| NFR-015 | Release gates — Release shall be gated on financial correctness, stock reconciliation, duplicate prevention, E2E scenarios, verified backups and import error handling. — These six areas are the failure modes that destroy | docs/05-non-functional-requirements.md | task-015 |
