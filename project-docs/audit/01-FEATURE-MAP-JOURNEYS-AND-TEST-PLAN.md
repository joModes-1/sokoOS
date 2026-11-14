# SokoOS — Feature Map, User Journeys & Test Plan (Phases 2 & 3)

Companion to `00-SYSTEM-AUDIT.md`. Roles: **BA** Business Admin, **BM** Branch Manager,
**CA** Cashier, **IC** Inventory Clerk (from `docs/00-index.md`).

---

## 1. Feature inventory

| # | Feature | Purpose | Roles | UI routes (web) | API | Tables | Depends on |
|---|---|---|---|---|---|---|---|
| M1 | Authentication | register, verify, login, MFA, reset, refresh | all/public | `/login`, `/register`, `/verify`, `/forgot-password`, `/reset-password`, `/accept-invitation` | `/auth/*` (13 ops) | User, AuthSession, AuthToken, MfaFactor, MfaRecoveryCode | — |
| M2 | Business & branches | tenant + branch setup | BA | `/settings/business`, `/settings/branches` | `/businesses/*`, `/branches/*` | Business, BusinessSettings, Branch, Subscription | M1 |
| M3 | RBAC & team | roles, permissions, invite users | BA | `/settings/roles`, `/settings/users`, `/users` | `/rbac/*` | Role, Permission, RolePermission, UserRole, UserBranch, UserInvitation | M1,M2 |
| M4 | Catalogue | products, variants, categories, brands, barcode | BA,BM,IC | `/catalogue/products`, `/catalogue/categories`, `/catalogue/brands` | `/catalogue/*` (7) | Category, Brand, Product, ProductVariant | M2 |
| M5 | Inventory | balances, ledger, batches, low stock, adjustments, counts, write-off | BA,BM,IC | `/inventory/balances`, `/inventory/movements`, `/inventory/batches`, `/inventory/adjustments`, `/inventory/counts` | `/inventory/*` (6) | StockBatch, StockMovement, InventoryBalance, StockAdjustment, StockCount(+Item) | M4 |
| M6 | Transfers | multi-branch request→approve→dispatch→receive→close | BA,BM,IC | `/transfers`, `/transfers/[id]` | `/transfers/*` (7) | StockTransfer(+Item) | M5 |
| M7 | Purchasing | suppliers, POs, lifecycle, goods receipt | BA,BM,IC | `/purchasing/suppliers`, `/purchasing/purchase-orders`, `/purchasing/purchase-orders/[id]`, `/purchasing/goods-receipts` | `/purchasing/*` (8) | Supplier, PurchaseOrder(+Item), GoodsReceipt(+Item) | M4,M5 |
| M8 | Sales & POS | scan/search, cart, payment, receipt, refunds | BA,BM,CA | `/pos`, `/sales`, `/sales/[id]`, `/print/receipts/[id]` | `/sales/*` (4) | Customer, Sale, SaleItem, Receipt, Refund(+Item) | M4,M5,M9 |
| M9 | Payments & finance | payments, cash sessions, day closure | BA,BM,CA | `/finance/payments`, `/finance/day-closure` | `/payments/*` (4) | Payment, PaymentWebhookEvent, PaymentAdjustment, CashSession, DayClosure | M8 |
| M10 | Reports | dashboard, sales, stock, low stock, purchasing | BA,BM | `/dashboard`, `/reports/*` (4) | `/reports/*` (5) | (reads across) | M5,M7,M8,M9 |
| M11 | Notifications | in-app inbox, read state | all | `/notifications`, `/settings/notifications` | `/notifications/*` (4) | Notification, NotificationPreference | — |
| M12 | Audit log | actor/action/target record | BA | `/audit-logs` | `/audit-logs` | AuditLog | all |
| M13 | Imports & jobs | CSV/XLSX import, background jobs | BA | none | `/imports/*`, `/jobs/*` | ImportJob, ImportRow, Job | M4 |
| M14 | Attachments | file upload for records | BA,BM | none | `/attachments` | Attachment | — |

**Not built (deferred in spec, but still advertised in the sidebar — see F-02):** restaurant
floor/kitchen/recipes, patients/prescriptions, students, vehicles/workshop, pumps/tanks,
farmers/harvest, properties/tenants, projects, classes, housekeeping, commissions, deliveries.

---

## 2. User journeys to test end-to-end

| ID | Journey | Steps | Status |
|---|---|---|---|
| J1 | Sign in → dashboard | `/login` → enter creds → `/dashboard` → KPIs + charts render from real data | ✅ existing E2E |
| J2 | Catalogue CRUD | `/catalogue` → products → create product (variant + prices) → appears in list → edit → persists | ⬜ to write |
| J3 | Inventory adjust | `/inventory` → adjustments → post a reason-coded delta → balance changes → movement appears in ledger | ⬜ to write |
| J4 | POS sale → receipt | `/pos` → search → add → charge cash → receipt printed → stock decremented | ✅ existing E2E |
| J5 | Purchasing | `/purchasing` → suppliers → create PO → submit → confirm → goods receipt → stock increases → PO status | ⬜ to write |
| J6 | Transfer | `/transfers` → request → approve → dispatch → receive → balances move both branches | ⬜ to write |
| J7 | Navigation integrity | every sidebar link resolves (no 404) for the signed-in industry | ⬜ to write (proves F-01/F-02 fixed) |
| J8 | Reports | `/reports` → sales/stock/low-stock/purchasing → numbers reconcile with sales + ledger | ⬜ to write |
| J9 | Auth failure paths | wrong password, unverified email, expired session, unauthorized role | ⬜ partial |

---

## 3. Testing matrix (feature × scenario)

Scenarios: success · missing field · invalid input · duplicate submit · empty state · large
input · boundary · unauthorized · session expiry · network failure · server error · refresh.

| Feature | success | validation | duplicate | empty | boundary | unauthorized | refresh/state |
|---|---|---|---|---|---|---|---|
| M1 Auth | ⬜ J1/J9 | ⬜ J9 | — | — | ⬜ lockout | n/a | ⬜ F-08 |
| M2 Business | ⬜ | ⬜ | ⬜ slug | ⬜ | ⬜ | ⬜ | ⬜ |
| M3 RBAC | ⬜ | ⬜ | ⬜ email | ⬜ | ⬜ | ⬜ role scope | ⬜ |
| M4 Catalogue | ⬜ J2 | ⬜ | ⬜ SKU/barcode | ⬜ | ⬜ price 0 | ⬜ | ⬜ |
| M5 Inventory | ⬜ J3 | ⬜ reason | — | ⬜ | ⬜ negative stock | ⬜ | ⬜ |
| M6 Transfers | ⬜ J6 | ⬜ | — | ⬜ | ⬜ over-receive | ⬜ | ⬜ |
| M7 Purchasing | ⬜ J5 | ⬜ | — | ⬜ | ⬜ over-receipt | ⬜ | ⬜ |
| M8 Sales/POS | ⬜ J4 | ⬜ | ⬜ idempotency | ⬜ | ⬜ oversell | ⬜ | ⬜ |
| M9 Payments | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ overpay | ⬜ | ⬜ |
| M10 Reports | ⬜ J8 | — | — | ⬜ | ⬜ | ⬜ | ⬜ |
| M11 Notifications | ⬜ | — | — | ⬜ | ⬜ | ⬜ | ⬜ |
| M12 Audit | ⬜ | — | — | ⬜ | — | ⬜ | — |
| M13 Imports/Jobs | ⬜ | ⬜ row errors | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ |
| M14 Attachments | ⬜ | ⬜ size/type | — | ⬜ | ⬜ quota | ⬜ | ⬜ |

The matrix is deliberately honest: most cells are ⬜. Coverage will be raised by the
regression tests added with each fix and by the new E2E specs, and the matrix updated.
