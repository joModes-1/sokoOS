# Existing Database Analysis — SokoOS Desktop Track

**Purpose:** Describe the real database design the desktop application must coexist with, including the core entities, money model, stock integrity model, and the important limitation that the repository currently has no migrations.

**Sources:** `docs/09-database-design.md`, `apps/api/prisma/schema.prisma`, and the existing audit `docs/audit/AUDIT.md`.

---

## 1. Database platform

- PostgreSQL via Prisma 6.
- Redis used for caching and job queues in the existing architecture.
- Money stored as integer minor units (BIGINT in DB).
- Timestamps are UTC in the existing design.
- Soft deletes for business records; hard deletes for tokens in the existing assumptions.

---

## 2. Multi-tenancy and ownership in the database

The database model is multi-tenant:
- Businesses own records.
- Branches further scope stock, sales, POs, and transfers.
- User membership is modeled through user_roles and user_branches, so access is business- and branch-scoped.
- The backend enforces isolation server-side; the database schema supports tenant ownership, but the enforcement matters as much as the schema.

For the desktop app, this means the local SQLite store must also keep business and branch identity on synchronized records, not just dump rows into one flat local space.

---

## 3. Core entities relevant to a desktop offline app

These are the entities most relevant to offline operation and sync:

- `users`, `roles`, `permissions`, `role_permissions`, `user_roles`, `user_branches`
- `businesses`, `branches`
- `subscriptions` (where present)
- `products`, `product_variants`, `categories`, `brands`
- `inventory_balances`, `stock_movements`, `stock_batches`
- `sales`, `sale_items`, `payments`, `refunds`, `refund_items`, `receipts`
- `suppliers`, `purchase_orders`, `purchase_order_items`, `goods_receipts`, `goods_receipt_items`
- `stock_transfers`, `stock_transfer_items`
- `audit_logs`, `notifications`, `attachments`, `jobs`

Not everything needs to be stored locally. The desktop app should store locally what supports offline POS, inventory work, transfers, purchasing, and payments, plus enough metadata to sync and display context.

---

## 4. Inventory and stock integrity model

This is the most sensitive part of the schema for offline sync.

The existing rules:
- Stock movements are an immutable ledger.
- Balances are derived.
- No negative stock unless configured.
- Adjustments require a reason.
- Batch identity is preserved.
- Expired batches are excluded from sale.
- Transfers preserve source/destination identity.
- Balances must reconcile to the ledger.
- No overselling.

These rules are project decisions from `docs/00-index.md` and are reinforced by the audit’s fixes.

Desktop implication:
- A local SQLite store may cache balances for fast offline display, but it should not allow offline edits that violate the server-side rules without a sync contract that preserves them.
- Offline stock movements should look like the same kind of movement the server expects, with enough metadata to reconcile later.
- Offline sale creation should not commit a sale against stock the server would reject.

---

## 5. Money model

- All amounts are integer minor units.
- Shared money helpers reject floats for money fields.
- Currency handling is present with supported currencies including UGX, KES, TZS, USD.

Desktop implication:
- The desktop app should reuse the same money model. Local SQLite money columns should also be integer minor units, not decimals.
- Reusing `packages/shared/src/money` logic, or an equivalent typed local version, reduces the chance of introducing float-incompatible desktop math.

---

## 6. Financial records are deterministic from events

A key existing design principle is that financial records are deterministic from events. This is excellent news for sync design, because it means the system is built around events/records rather than arbitrary mutable state.

Desktop implication:
- Offline operations should be stored as staged events/records with clear semantics, not as random partial edits.
- Where the server already models sales, payments, refunds, adjustments, transfers, and receiving as discrete records, the desktop local store can mirror that structure.
- Corrections should follow the existing pattern (adjustments, reversals, returns/refunds) rather than silently rewriting history.

---

## 7. Lifecycle state is meaningful

The existing model includes lifecycle states for transfers, purchase orders, and sales/refunds. Those states are not cosmetic; they affect what operations are allowed.

Desktop implication:
- The local store must preserve state accurately and never invent transitions.
- Some operations may be unsafe to perform offline if they depend on current server state, for example approving a transfer that the server would reject because of stock. Offline UX should distinguish “create a request locally” from “commit an operation that must be validated by the server.”

---

## 8. Known schema/code drift

From the audit:
- The checked-in `schema.prisma` and the already-generated Prisma client differed for `goods_receipt_items.purchase_order_item_id`.
- The desktop track should not depend on the exact generated client shape until that is reconciled, but the desktop app talks to the HTTP API, not directly to Prisma client, so the deeper concern is API contract stability, not Prisma client shape.

---

## 9. Migration limitation

Important limitation:
- The repository currently has no Prisma migrations.
- The database schema cannot be fully recreated from source by running migrations in this environment.
- This does not stop the desktop track from designing against the documented schema and API, but it does mean some runtime database-level verification is not available until migrations exist.

Desktop implication:
- Do not assume the desktop app can rely on raw PostgreSQL access or a shared local PostgreSQL instance for offline use. The desktop app’s offline store is SQLite; the server stays PostgreSQL.
- Do not assume every table is syncable or that the full schema should be mirrored locally.

---

## 10. What the desktop app should copy from the DB design

1. Tenant + branch identity on synchronized records.
2. Integer minor-unit money.
3. Clear record types for sales, payments, refunds, adjustments, transfers, POs, goods receipts.
4. The idea that movements are the source of truth for stock, not just a current balance column.
5. Lifecycle state semantics for stateful records.
6. The principle that corrections go through proper adjustment/reversal mechanisms.

---

## 11. What the desktop app should not copy

1. Direct Prisma access patterns; the desktop app talks to the API.
2. The full PostgreSQL schema locally; only the offline-relevant subset.
3. Server-only enforcement rules as if they were optional; the desktop app should preserve their intent and push operations through the API where server validation is required.
4. Any assumption that the current lack of migrations means the database is unimportant; it is central, just not yet migration-managed in the repo.
