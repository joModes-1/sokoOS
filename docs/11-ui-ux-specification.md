# UI/UX Specification

**Product:** SokoOS — interconnected business operating platform for B2B commerce, inventory management and business operations.
**Release covered:** MVP = Phase 1 Foundation (FR-001–FR-060, FR-081–FR-100) + Phase 2 Business operations (FR-101–FR-216).
**Explicitly not covered:** Phase 3 supplier ecosystem/marketplace, Phase 4 finance, Phase 5 AI capabilities, Phase 6 expansion, dedicated React Native app, patient medical records, subscription billing UI, platform-operator UI. No screen in this document reads or writes a deferred table.
Requirement IDs (FR-001–FR-216, NFR-001–NFR-015, BR-001–BR-022) are reused from `docs/03-cleaned-srs.md`, `docs/06-domain-model-and-glossary.md`, `docs/09-database-design.md`, `docs/10-api-specification.md` and `docs/12-authentication-authorization-and-permissions.md` and are not renumbered.

**Platform.** Responsive web application built with Next.js (App Router), React, TypeScript, Tailwind CSS, React Hook Form, Zod and TanStack Query, installable as a PWA (ui.platform, NFR-009). Mobile and desktop are both usable; the native React Native app is deferred. There is no Figma file: the design system in this document is the source of truth (ui.design_source).

**Authority.** The backend is authoritative for every value that touches stock, money, permissions or state. The UI never computes a persisted total, never marks a sale paid from a client signal, and never offers an affordance for an operation the API does not expose (FR-160, FR-182, FR-106).

## Screens

Every route below is a Next.js App Router route. Routes are grouped as `(auth)` for unauthenticated screens, `(app)` for the authenticated shell, and `(pos)` for the full-bleed point-of-sale layout. A screen whose route contains `[id]` is reachable only for a record inside the caller's tenant; a record outside the tenant returns the same `404` screen as a missing record (FR-028). "Key states" lists the distinct render states the screen must implement; the shared treatment of each state is defined in the States section.

| Screen | Route | Purpose | Key states |
|---|---|---|---|
| Sign in | `/login` | Email + password sign-in; returns an MFA challenge when the role requires it (FR-015, FR-009) | default; submitting; invalid-credentials; account-locked (FR-018); rate-limited 429; redirect-to-mfa; redirect-to-verify |
| MFA challenge | `/login/mfa` | Complete the challenge with a TOTP code or a single-use recovery code (FR-009, FR-017) | default; verifying; invalid-code; attempts-exhausted; recovery-code-accepted; challenge-expired |
| Register account | `/register` | Create an account with email, password and phone (FR-001–FR-004) | default; field-errors; password-policy-error (FR-002); email-exists 409 (FR-003); submitting; success → verify |
| Verify phone | `/verify` | Enter the 6-digit verification code; resend (FR-005–FR-008) | default; code-sent; verifying; invalid-code; code-expired (FR-006); attempts-exhausted; resend-cooldown; verified |
| Forgot password | `/forgot-password` | Request a password reset; the confirmation is identical whether or not the account exists (FR-013) | default; submitting; submitted-202; rate-limited |
| Reset password | `/reset-password` | Set a new password with a single-use token; all sessions are revoked (FR-014) | default; token-invalid; token-expired; password-policy-error; submitting; success → sign in |
| Accept invitation | `/invitations/accept` | Set a password and bind the assigned role and branches (FR-046, FR-047) | default; token-invalid; token-expired (7 days); password-policy-error; mfa-enrolment-required; success |
| Register business | `/onboarding/business` | Create the tenant, the owner's Business Admin role, the default branch and settings in one transaction (FR-021–FR-024) | default; field-errors; slug-taken (FR-023); submitting; success → dashboard |
| Business switcher | header control, no route | Set the active business and active branch context (FR-032, FR-033) | default; hidden when the user holds one business; switching; 403 TENANT_ACCESS_DENIED; 403 BRANCH_SCOPE_REQUIRED |
| Dashboard | `/dashboard` | Today's sales total, transaction count, top items, low-stock count, pending transfer approvals, pending PO items and open cash session (FR-081, FR-082) | loading-skeleton; empty (no sales today); populated; per-widget-error; branch-scoped; background-refresh (FR-083) |
| Business profile | `/settings/business` | Legal name, TIN, registration number, address, contact phone and currency (FR-025, FR-034) | loading; view; edit; validation-error; saving; saved; forbidden for non-admin |
| Business settings | `/settings/business/settings` | Currency, timezone, receipt footer, default tax rate and negative-stock policy (FR-030, FR-043) | loading; view; edit; saving; saved; negative-stock-enabled warning |
| Subscription | `/settings/subscription` | Read-only plan, status and period start/end (FR-029) | loading; populated; no-subscription; error |
| Branches | `/branches` | List branches scoped to the tenant and the caller's branch access (FR-038) | loading; empty; populated; filtered; deactivated rows marked |
| Branch detail | `/branches/[id]` | Edit name, code, address, phone and warehouse flag; activate or deactivate (FR-035, FR-037, FR-039) | loading; view; edit; code-conflict (FR-036); saving; deactivated banner; delete-confirm |
| Branch users | `/branches/[id]/users` | Assign and remove users for a branch (FR-040, FR-044) | loading; empty; populated; add-user dialog; remove-confirm; saved |
| Users | `/users` | List the tenant's users with roles and branch assignments (FR-048) | loading; empty; populated; filtered; deactivated rows marked |
| User detail | `/users/[id]` | Roles, branches and MFA state; deactivate or reactivate (FR-049, FR-056, FR-058) | loading; view; role-edit; branch-edit; deactivate-confirm; deactivated; reactivate-confirm; self-edit-blocked |
| Invitations | `/users/invitations` | Invite by email or phone with a role and branch scope; revoke a pending invitation (FR-045, FR-046) | loading; empty; populated; invite-dialog; validation-error; pending; expired; revoked |
| Roles and permissions | `/settings/roles` | List the four system roles and edit `role_permissions` (FR-051, FR-052) | loading; populated; editing; locked `admin.*` permissions (FR-053); saving; saved; forbidden |
| Categories | `/catalogue/categories` | List, create, update and soft-delete categories (FR-061) | loading; empty; populated; create/edit dialog; duplicate-name error; in-use delete blocked (FR-062); deleted |
| Brands | `/catalogue/brands` | List, create, update and soft-delete brands (FR-064, FR-065) | loading; empty; populated; create/edit dialog; duplicate-name error (case-insensitive); deleted |
| Products | `/catalogue/products` | Search by name, SKU or barcode; filter by category, brand and active state (FR-079) | loading; empty; no-results; populated; filtered; deleted hidden |
| Product detail | `/catalogue/products/[id]` | Product fields, variants, images and price history (FR-067, FR-070) | loading; view; edit; price-below-cost warning (FR-069); saving; saved; deleted |
| Variant editor | `/catalogue/products/[id]/variants/[variantId]` | SKU, barcode, attributes and price override (FR-071) | loading; create; edit; SKU-conflict (FR-072); barcode-conflict (FR-073); saving; saved |
| Product images | `/catalogue/products/[id]` (images tab) | Pre-signed upload, confirm and detach product images (FR-075–FR-077) | empty; uploading; upload-progress; type-rejected (FR-076); size-rejected; uploaded; signed-url-expired; deleted |
| Catalogue import | `/catalogue/imports/new` | Upload a CSV/XLSX file for `products`, `suppliers`, `categories` or `opening_stock` (FR-078, FR-207) | default; file-selected; type-rejected; size-rejected; uploading; queued |
| Import job | `/catalogue/imports/[jobId]` | Job status, valid/invalid/imported counts and per-row errors (FR-208, FR-214) | queued; running; succeeded; partially-succeeded; failed; retrying (FR-216); error-report-download |
| POS sale | `/pos` | Scan or search, build the cart, show server-computed totals and commit the sale (FR-155–FR-160) | loading; empty-cart; scanning; barcode-not-found (FR-074); out-of-stock (FR-157); expired-batch hidden (FR-158); discount-requires-permission (FR-161); committing; 409 stock conflict (FR-163); idempotent replay (FR-164); offline-blocked |
| POS payment | `/pos` (payment panel) | Cash, MTN MoMo or Airtel Money; poll provider state (FR-179–FR-184) | method-select; cash-tendered; change-computed; momo-pending; momo-polling; succeeded; failed; expired (FR-187); orphaned (FR-186); retry |
| Receipt view | `/pos/receipt/[saleId]` | Print view and PDF rendered from stored sale data only (FR-166–FR-168) | loading; ready; print-preview; pdf-generating; reprint (no new movement); error |
| Sales history | `/sales` | Search by date range, branch, cashier, payment method, state and receipt number (FR-173, FR-174) | loading; empty; populated; filtered; branch-scoped |
| Sale detail | `/sales/[id]` | Lines, payments, receipt, refund action and state timeline (FR-169–FR-172) | loading; view; refund-dialog; partial-refund; over-quantity rejected (FR-172); refunded; partially-refunded; returned |
| Inventory balances | `/inventory/balances` | Balances per product, variant, batch and branch with branch, category, brand, product and low-stock filters (FR-101, FR-104) | loading; empty; populated; low-stock filter; negative balance in red (FR-115); expired separated (FR-103) |
| Expired batches | `/inventory/expired` | Expired batches listed separately from sellable stock (FR-103, FR-132) | loading; empty; populated; write-off action; write-off-confirm; written-off |
| Low stock | `/inventory/low-stock` | Items at or below reorder level per product, variant and branch (FR-126, FR-202) | loading; empty (all above threshold); populated; export-queued (FR-203) |
| Stock movements | `/inventory/movements` | Immutable ledger with movement type, signed quantity, reference, batch, actor and timestamp (FR-105, FR-107) | loading; empty; populated; filtered; read-only (no edit or delete affordance) (FR-106) |
| Movement detail | `/inventory/movements/[id]` | Movement with its originating sale, goods receipt, transfer or adjustment (FR-108) | loading; populated; source-missing; error |
| Adjustments | `/inventory/adjustments` | List adjustments with reason code, actor and date filters (FR-109) | loading; empty; populated; filtered |
| New adjustment | `/inventory/adjustments/new` | Product/variant, branch, quantity delta, batch and a mandatory reason (FR-109, FR-110) | default; validation-error; reason-required; batch-required; negative-stock blocked 409 (FR-114); submitting; saved; forbidden 403 (FR-112) |
| Batches | `/inventory/batches` | Batch number, expiry date, status and quantity (FR-131) | loading; empty; populated; expiring-soon; expired; written-off |
| Stock counts | `/inventory/stock-counts` | List count sessions with status and date filters (FR-129) | loading; empty; populated; filtered |
| Stock count detail | `/inventory/stock-counts/[id]` | System, counted and delta quantities per line; apply or cancel (FR-129, FR-130) | loading; draft; counting; validation-error; applying; applied (adjustments raised); cancelled; applied-immutable |
| Stock transfers | `/inventory/transfers` | List transfers with status, origin, destination and date filters (FR-116) | loading; empty; populated; filtered; pending-approval badge |
| Transfer detail | `/inventory/transfers/[id]` | Lines, actors and timestamps; approve, reject, dispatch, receive and close (FR-118–FR-125) | loading; requested; approved; rejected (reason shown); dispatching; dispatched; insufficient-stock 409 (FR-121); receiving; shortfall-note-required (FR-123); received; closed-immutable |
| Suppliers | `/purchasing/suppliers` | List suppliers with search and pagination (FR-136) | loading; empty; populated; filtered; deleted hidden |
| Supplier detail | `/purchasing/suppliers/[id]` | Contact person, phone, email, address, TIN, payment terms and PO history (FR-133) | loading; view; edit; saving; saved; deleted |
| Purchase orders | `/purchasing/purchase-orders` | List purchase orders with status, supplier, branch and date filters (FR-150) | loading; empty; populated; filtered; status badges |
| Purchase order editor | `/purchasing/purchase-orders/new`, `/purchasing/purchase-orders/[id]/edit` | Lines of product/variant, quantity, unit cost and tax with server-computed totals (FR-137–FR-139) | loading; draft; editing; validation-error; totals-recomputing; saving; submitted-read-only (FR-141) |
| Purchase order detail | `/purchasing/purchase-orders/[id]` | Ordered, received and outstanding quantities per line, state timeline and actions (FR-150) | loading; draft; submitted; confirmed; partially-received; received; closed-immutable; cancelled; confirm-dialog; cancel-dialog |
| Goods receipt editor | `/purchasing/goods-receipts/new?purchaseOrderId=` | Received quantity, unit cost, batch number and expiry per line (FR-145, FR-146) | loading; default; line-not-on-po rejected (FR-149); over-receipt-confirmation (FR-148); batch-required; submitting; posted; idempotent replay |
| Goods receipts | `/purchasing/goods-receipts` | List receipts with purchase order, branch and date filters (FR-147) | loading; empty; populated; filtered |
| Goods receipt detail | `/purchasing/goods-receipts/[id]` | Receipt lines, batches created and linked stock movements (FR-147) | loading; populated; movements-linked; error |
| Sales report | `/reports/sales` | Sales grouped by day, week or month with branch, cashier, category and payment-method filters (FR-195–FR-197) | loading; empty; populated; filtered; refunds shown separately (FR-196); export-queued |
| Stock report | `/reports/stock` | Opening balance, movements by type, closing balance and valuation at cost per product/variant/branch (FR-198) | loading; empty; populated; filtered; reconciliation-ok; drift-detected (FR-199) |
| Purchasing report | `/reports/purchasing` | Ordered value, received value, outstanding quantities and open PO count by supplier and period (FR-200, FR-201) | loading; empty; populated; filtered; export-queued |
| Low-stock report | `/reports/low-stock` | Items at or below reorder level with quantity, reorder level and last movement date (FR-202) | loading; empty; populated; export-queued (FR-203) |
| Payments | `/finance/payments` | Payments by provider, state and date with sale references (FR-190) | loading; empty; populated; filtered; pending-polling; orphaned flagged |
| Payment detail | `/finance/payments/[id]` | Provider, state history, webhook events and the adjustment action (FR-192, FR-194) | loading; populated; state-timeline; adjustment-dialog; adjustment-saved; orphaned; expired |
| Payment mismatches | `/finance/payment-mismatches` | Payments without a completed sale and sales without a successful payment (FR-191) | loading; empty (reconciled); populated; filtered; adjustment action |
| Day closure | `/finance/day-closure` | Expected cash, counted cash, discrepancy and reason; close the business date (FR-204–FR-206) | loading; open; counting; discrepancy-non-zero (reason required); closing; closed-immutable; already-closed 409 (FR-205) |
| Notifications | `/notifications` | In-app notification list with an unread filter (FR-084) | loading; empty; populated; unread-filter; mark-read; mark-all-read; error |
| Notification preferences | `/settings/notifications` | Per-event, per-channel preferences; the IN_APP channel is always on (FR-087–FR-089) | loading; populated; editing; saving; saved; whatsapp-disabled (provider off) |
| Audit log | `/admin/audit-logs` | Search by actor, action, target type, target id, branch and date range (FR-091, FR-098, FR-099) | loading; empty; populated; filtered; branch-scoped for Branch Manager (FR-094); paginated |
| Audit entry detail | `/admin/audit-logs/[id]` | Full context: request id, IP address and user agent (FR-092, FR-097) | loading; populated; context-missing; error |
| Background job | `/jobs/[id]` | Job status `queued`, `running`, `succeeded` or `failed` with error detail (FR-214, FR-216) | queued; running; succeeded; failed; retrying; retry-exhausted; download-ready |
| Attachments | `/attachments` | Attach documents to a record by entity type and entity id; download (FR-210–FR-212) | loading; empty; populated; uploading; type-rejected (FR-211); size-rejected; signed-url-expired; download-audited |
| Profile | `/profile` | The caller's own name, phone and locale preferences (FR-032) | loading; view; edit; saving; saved |
| Sessions | `/profile/sessions` | Active sessions with device, IP address and last-used timestamp; revoke (FR-016) | loading; empty; populated; revoke-confirm; revoked |
| MFA settings | `/profile/mfa` | Enrol, confirm and disable MFA; recovery codes shown exactly once (FR-010–FR-012) | loading; not-enrolled; enrolling (secret + QR); confirming; enabled; recovery-codes-shown-once; disable-blocked-for-admin-role (FR-011); disabled |
| Permission denied | `/403` | Explain a missing permission, a missing branch assignment or a tenant the caller cannot enter | default; tenant-access-denied; branch-scope-required; permission-missing |
| Not found | `/404` | Record missing, soft-deleted or outside the caller's tenant scope (FR-028, FR-031) | default; deleted-record; cross-tenant |
| Server error | `/500` | Unexpected failure with the request id for support (NFR-011) | default; request-id-shown |
| Offline | `/offline` | PWA offline shell; all writes are blocked | offline; reconnecting; back-online |

## States

### Global state model

Every screen implements the same five render states. A screen that omits one of them is incomplete.

| State | Trigger | UI treatment | Requirement |
|---|---|---|---|
| Loading (first paint) | TanStack Query `isPending` with no cached data | Skeleton matching the final layout: 3–8 shimmer rows for tables, 4 skeleton cards for the dashboard, a 2-column skeleton for detail panes. No full-page spinner after the first load. | NFR-001 |
| Refreshing | Query `isFetching` with cached data | 2 px indeterminate bar under the header plus a dimmed `aria-busy="true"` region. Content stays interactive. | FR-083 |
| Empty | Request succeeded with `total = 0` and no active filter | `EmptyState` with a title, one sentence of explanation and the primary create action when the caller holds the permission. | — |
| No results | Request succeeded with `total = 0` and an active filter or search term | `EmptyState` variant that names the filter and offers "Clear filters". Never shows the create action. | — |
| Error | Non-2xx response or network failure | `ErrorAlert` inline in the region that failed, with the error `code`, the human message and the `requestId`. A retry button re-runs the query. A failed widget never blanks the whole dashboard. | NFR-011 |

### Error envelope to UI mapping

The API returns `{ error: { code, message, details, requestId } }` (NFR-011). The UI maps codes as follows and never renders a stack trace.

| HTTP | Code | UI treatment |
|---|---|---|
| 400 | `VALIDATION_ERROR` | Field-level inline errors from `details` plus an error summary at the top of the form, focus moved to the summary. |
| 401 | `UNAUTHENTICATED` | Redirect to `/login?returnTo=<path>`; the in-flight mutation is not retried. |
| 403 | `TENANT_ACCESS_DENIED` | Navigate to `/403` with the tenant-access-denied variant (FR-033). |
| 403 | `BRANCH_SCOPE_REQUIRED` | Navigate to `/403` with the branch-scope-required variant (FR-041). |
| 403 | `PERMISSION_DENIED` | Navigate to `/403` with the permission-missing variant; the triggering control is removed from the DOM on the next render. |
| 404 | `RESOURCE_NOT_FOUND` | Navigate to `/404`; used identically for a missing record and for another tenant's record (FR-028). |
| 405 | `METHOD_NOT_ALLOWED` | No affordance exists for this operation; if reached, show a read-only notice. Applies to `stock_movements`, `audit_logs`, `payment_webhook_events` and `import_rows` (FR-093, FR-106). |
| 409 | `INVALID_STATE_TRANSITION` | Banner above the record header: "This record is now `<currentState>`." Render the allowed transitions from `details` as the only enabled actions, then refetch (FR-119, FR-141, FR-153). |
| 409 | `STALE_RESOURCE` | `ConfirmDialog`: "This record changed since you opened it." Actions: Reload (discards the local edit) or Copy my changes. |
| 409 | `IDEMPOTENCY_KEY_REUSED` | Error toast: "This submission was already used with different data." No automatic retry. |
| 409 | `INSUFFICIENT_STOCK` | POS and transfer conflict panel listing the offending lines with available versus requested quantity; the commit button stays disabled until the cart is corrected (FR-121, FR-163). |
| 409 | `DUPLICATE_*` | Field-level error on the conflicting field (SKU, barcode, category name, brand name, branch code, supplier name, business slug) (FR-023, FR-036, FR-065, FR-072, FR-073, FR-134). |
| 409 | `DAY_ALREADY_CLOSED` | Banner on `/finance/day-closure`: "This business date is already closed." Corrections are offered as a new audited adjustment (FR-205, FR-206). |
| 429 | `RATE_LIMITED` | Inline countdown driven by `Retry-After`; the submit button is disabled until it reaches zero (FR-018, FR-020). |
| 500 | `INTERNAL_ERROR` | Navigate to `/500` for a page load; for a mutation, an error toast carrying the `requestId`. |

### Lifecycle state to UI affordance

The UI renders exactly the actions the lifecycle permits. A disabled action is never shown as enabled; an illegal action is not rendered at all.

| Entity | State | Visible actions | Badge tone |
|---|---|---|---|
| Purchase order | `DRAFT` | Edit, Submit, Cancel | neutral |
| Purchase order | `SUBMITTED` | Confirm, Cancel | info |
| Purchase order | `CONFIRMED` | Receive goods, Cancel | info |
| Purchase order | `PARTIALLY_RECEIVED` | Receive goods, Close (shortfall reason required) | warning |
| Purchase order | `RECEIVED` | Close | success |
| Purchase order | `CLOSED` | none (immutable) | neutral-strong |
| Purchase order | `CANCELLED` | none | danger-muted |
| Stock transfer | `REQUESTED` | Approve, Reject (reason required) | info |
| Stock transfer | `APPROVED` | Dispatch | info |
| Stock transfer | `REJECTED` | none | danger |
| Stock transfer | `DISPATCHED` | Receive | warning |
| Stock transfer | `RECEIVED` | Close (discrepancy note acknowledgement required) | success |
| Stock transfer | `CLOSED` | none (immutable) | neutral-strong |
| Sale | `COMPLETED` | Refund, Re-print receipt | success |
| Sale | `PARTIALLY_REFUNDED` | Refund (remaining quantity only), Re-print receipt | warning |
| Sale | `REFUNDED` | Re-print receipt | danger-muted |
| Sale | `RETURNED` | Re-print receipt | danger-muted |
| Payment | `PENDING` | Poll state, Cancel | warning |
| Payment | `SUCCEEDED` | Refund (against the original method) | success |
| Payment | `FAILED` | Retry with a new payment | danger |
| Payment | `EXPIRED` | Retry with a new payment | neutral |
| Payment | `ORPHANED` | Record adjustment | danger |
| Job | `QUEUED` | none | neutral |
| Job | `RUNNING` | none | info |
| Job | `SUCCEEDED` | Download result | success |
| Job | `FAILED` | Retry (bounded), Download error report | danger |
| Account | `PENDING_VERIFICATION` | Resend code | warning |
| Account | `ACTIVE` | — | success |
| Account | `LOCKED` | none (15-minute lockout) | danger |
| Account | `DEACTIVATED` | none | neutral |
| Batch | `ACTIVE` | Write off | success |
| Batch | `EXPIRING_SOON` | Write off | warning |
| Batch | `EXPIRED` | Write off (excluded from sale) | danger |
| Batch | `WRITTEN_OFF` | none | neutral |

### Form states

| State | Behaviour |
|---|---|
| Pristine | Submit enabled only when the form is valid; no errors rendered. |
| Invalid on blur | Field-level message appears on blur, not on keystroke. |
| Invalid on submit | Error summary at the top of the form, focus moved to it, each field linked by `aria-describedby`. |
| Submitting | Submit button shows a spinner and the label "Saving…"; the form is `aria-busy="true"`; double submission is prevented by disabling the control and by the `Idempotency-Key` header on the endpoints that require one. |
| Succeeded | Success toast plus an inline confirmation; the record header refetches. |
| Server field error | The server message replaces the client message on the named field; the client never rewrites a server message. |
| Dirty navigation | Leaving a dirty form prompts a `ConfirmDialog` with Discard and Stay. |
| Read-only | Fields render as text, not disabled inputs, when the record state forbids editing (FR-141, FR-153). |

### Server-authoritative and conflict states

| Concern | UI rule |
|---|---|
| Totals | Subtotal, tax, discount and total are rendered from the last server response. While a recompute is in flight the previous value is shown with a subtle pending indicator; a client-computed value is never persisted (FR-159, FR-160). |
| Stock at commit | A `409 INSUFFICIENT_STOCK` opens the conflict panel and keeps the cart intact so the cashier can adjust quantities (FR-163). |
| Idempotent replay | A response carrying `Idempotency-Replayed: true` renders the original receipt and an info toast: "This sale was already recorded." No second movement is created (FR-164). |
| Payment confirmation | The cashier screen polls payment state; a sale is shown as paid only after the API reports `SUCCEEDED`. A client-side success signal never marks a sale paid (FR-182). |
| Optimistic updates | Permitted only for notification mark-as-read and notification preferences. Every stock, money, permission and lifecycle mutation is pessimistic. |
| Concurrency | Mutable headers send `If-Match`; a `409 STALE_RESOURCE` opens the reload dialog. |
| Negative stock | When negative stock is enabled, a negative balance renders in `--color-danger` with a "Negative stock" badge; when disabled, the commit is blocked before submission and the API remains the final guard (FR-113–FR-115). |
| Expired batches | Never rendered as selectable in POS; shown only on `/inventory/expired` and `/inventory/batches` with a Write-off action (FR-132, FR-158). |
| Immutable records | `stock_movements`, `audit_logs`, `payment_webhook_events` and `import_rows` render with no edit or delete control anywhere in the UI (FR-093, FR-106). |

### Permission-aware states

| Situation | UI treatment |
|---|---|
| Permission absent | The navigation item and the action control are not rendered. The route still exists and returns `/403` if reached directly, because the server is authoritative (FR-054). |
| Branch not assigned | Branch-scoped screens show the branch-scope-required variant of `/403` (FR-041). |
| Branch deactivated | The branch is selectable for reading history but the POS and new-sale actions are disabled with the reason "This branch is deactivated" (FR-037). |
| Role changed mid-session | The next request returns the new effective permissions; the shell refetches `/me` and re-renders navigation without a full reload (FR-049). |
| MFA required for the role | The MFA settings screen shows the disable control as disabled with the reason "Required for your role" (FR-011). |
| Deactivated user | The session is revoked; the next request returns `401` and the user lands on `/login` (FR-056). |

### Background job states

| State | UI treatment |
|---|---|
| `QUEUED` | Neutral badge, "Waiting to start", no progress bar. |
| `RUNNING` | Info badge with an indeterminate progress bar; the screen polls `GET /v1/jobs/{id}` every 3 s with backoff to 15 s after 60 s. |
| `SUCCEEDED` | Success badge plus a Download button that requests a fresh signed URL (FR-215). |
| `FAILED` | Danger badge, the error detail, a Download error report button for imports, and a Retry button while attempts remain (FR-216). |
| Retry exhausted | Danger badge, "Automatic retries exhausted", and a support hint carrying the `requestId`. |

### Offline and PWA states

| State | UI treatment |
|---|---|
| Offline | A persistent banner: "You are offline. Changes cannot be saved." All mutating controls are disabled. The `/offline` shell is served for uncached routes. |
| Reconnecting | Banner changes to "Reconnecting…"; queries retry with exponential backoff. |
| Back online | Banner clears, the active query refetches, and a toast confirms "Back online." |
| Installable | The PWA install prompt is offered once, dismissible, and never blocks a task (NFR-009). |
| Offline writes | Out of scope. No mutation is queued offline; the server remains the only writer. |

### Copy rules for state messaging

| Rule | Example |
|---|---|
| State the fact, then the next action. | "This purchase order is already `RECEIVED`. Close it to finish." |
| Never disclose existence across tenants. | A cross-tenant record shows the same `/404` copy as a missing record (FR-028). |
| Never disclose whether an account exists. | "If the account exists, a reset code has been sent to the registered phone number." (FR-013, FR-019) |
| Name the field and the fix. | "SKU `RICE-5KG` already exists in this business." (FR-072) |
| Always carry the request id on an unexpected error. | "Something went wrong. Reference `3f9c…`." (NFR-011) |

Assumption: because the email integration is deferred, verification and password-reset delivery are phone-channel only in the MVP; no screen offers an email-delivery option and no copy promises an email (FR-005, integrations.email = deferred).

## Design System

### Foundation

Tailwind CSS with a single neutral design system, no Figma file (ui.design_source). Tokens are declared once as CSS custom properties on `:root` in `app/globals.css` and exposed to Tailwind through `theme.extend` in `tailwind.config.ts`, so a component never hard-codes a hex value. One accent colour carries brand identity; every other colour is neutral or semantic. Dark mode is out of scope for the MVP.

### Colour tokens

| Token | Value | Usage | Contrast on its background |
|---|---|---|---|
| `--color-bg` | `#F8FAFC` | Application background | — |
| `--color-surface` | `#FFFFFF` | Cards, tables, modals, POS panels | — |
| `--color-surface-sunken` | `#F1F5F9` | Table headers, inset panels, disabled fields | — |
| `--color-border` | `#E2E8F0` | Dividers, input borders, table rules | 1.2:1 (decorative) |
| `--color-border-strong` | `#CBD5E1` | Hovered and focused input borders | 1.6:1 (decorative) |
| `--color-text` | `#0F172A` | Primary text | 17.9:1 on `#FFFFFF` |
| `--color-text-muted` | `#475569` | Secondary text, table metadata | 7.5:1 on `#FFFFFF` |
| `--color-text-subtle` | `#64748B` | Timestamps, helper text | 4.8:1 on `#FFFFFF` |
| `--color-brand` | `#0F766E` | Primary buttons, active navigation, links | 4.9:1 on `#FFFFFF` |
| `--color-brand-hover` | `#115E59` | Hover and active states | 6.4:1 on `#FFFFFF` |
| `--color-brand-subtle` | `#CCFBF1` | Selected rows, brand-tinted badges | — |
| `--color-focus` | `#0EA5E9