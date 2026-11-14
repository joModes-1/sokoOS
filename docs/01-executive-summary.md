# Executive Summary

## Summary

SokoOS is an interconnected business operating platform for B2B commerce, inventory management and business operations, starting in Uganda. It replaces fragmented paper, spreadsheet and messaging workflows with one multi-tenant system in which catalogue, inventory, purchasing, sales/POS, receipts and reporting share a single record of truth. Retailers, pharmacies, wholesalers, distributors and their branch staff run daily operations in it, while business administrators govern users, branches, permissions and audit.

| Item | Decision |
|---|---|
| Product | SokoOS — interconnected business operating platform |
| Primary market | Uganda (B2B commerce, inventory, business operations) |
| Problem | Fragmented business operations cause connected problems across inventory, sales, purchasing, finance and supplier coordination |
| MVP | Phase 1 Foundation + Phase 2 Business operations |
| Deferred | Phase 3 Supplier ecosystem, Phase 4 Finance, Phase 5 AI capabilities, Phase 6 Expansion, native React Native app, patient medical records |
| Tenancy | Multi-tenant; every business-owned record carries tenant ownership; isolation enforced server-side; branch-level restrictions; file storage partitioned by tenant |
| Frontend | Next.js, React, TypeScript, Tailwind CSS, component-based UI, React Hook Form, Zod, TanStack Query |
| Backend | Node.js with NestJS (or a modular Next.js backend initially), REST API, OpenAPI documentation, background job processing |
| Data | PostgreSQL, Redis for caching and job queues, object storage for documents and product images |
| Architecture | Modular monolith initially; no microservices until scaling requires |
| Payments | Mobile money via MTN MoMo and Airtel Money |
| Hosting | Managed Node hosting (Render or Railway) with managed PostgreSQL; no Docker in the production runtime |
| Delivery model | MVP built by one developer working with an AI coding agent |
| Success metric | Active weekly users and completed core flows tracked from launch; targets set after the first month |
| Top risk | Pricing assumptions are proposed, not validated market prices |

## Problem

Businesses in Uganda run commerce on disconnected tools. Each fragmented process creates a problem that spreads into the next one, so fixing any single process in isolation produces new inconsistencies.

| Current practice | Who feels it | Consequence |
|---|---|---|
| Stock held in paper books or spreadsheets | Retailer, pharmacy, wholesaler and distributor owners | Balances drift from reality; batch identity and expiry dates are lost; nothing reconciles to a movement record |
| Sales written in a book or rung on a standalone till | Shop attendants and cashiers | Sales, receipts and stock movements are recorded twice or not at all; no receipt trail for the customer |
| Purchasing agreed by phone or WhatsApp | Owners and branch managers | No purchase order or goods-receipt record; supplier prices, outstanding orders and received quantities are untracked |
| Stock moved between branches informally | Multi-branch owners and branch managers | Branch balances disagree; transfers and shrinkage are invisible |
| Cash counted and reconciled manually at close | Cashiers and branch managers | Discrepancies are found late or never; there is no deterministic end-of-day record |
| Prices and availability quoted per customer from memory | Wholesalers and distributors | Inconsistent pricing; orders promised against stock that does not exist |
| Business data spread across books, spreadsheets, chat and memory | Business administrators | No auditable answer to who did what, when, and against which stock |

The root cause is one shared record missing across inventory, sales, purchasing, finance and supplier coordination. Because these areas move the same physical stock and the same money, an error in any one of them corrupts the others. SokoOS connects them so a sale, a goods receipt and a branch transfer all move the same inventory ledger, the same balances and the same audit trail.

## Solution

SokoOS gives each business one tenant-scoped operating system for commerce, stock and daily operations.

- **One record of truth per tenant.** Products, variants, batches, balances, purchases, sales and receipts live in one PostgreSQL schema with tenant ownership on every business-owned row.
- **Inventory derived from an immutable ledger.** `inventory_balances` are computed from `stock_movements`; movements are never edited or deleted; `stock_batches` preserve batch identity and expiry so expired batches are excluded from sale.
- **Deterministic outcomes.** Sales, receipts, refunds, goods receipts and transfers produce records that can be replayed from events; money and stock never depend on a client-side calculation alone.
- **No overselling, no negative stock.** Stock is verified server-side before a sale or dispatch is committed; negative stock is only possible where a business explicitly configures it.
- **Operations simple enough for attendants.** POS is scan-or-search, take payment, print or send a receipt; shop attendants need no technical training.
- **Governed access.** Role-based access control with roles, permissions, role_permissions and user_roles; branch-level restrictions enforced server-side; MFA for administrative roles.
- **Everything critical is audited.** Audit logs capture actor, action, target, timestamp and context.
- **Payments fit the market.** Mobile money via MTN MoMo and Airtel Money, alongside cash and other recorded methods.
- **Platform shape.** Modular monolith, REST API versioned under `/v1/` with OpenAPI documentation, Redis-backed background jobs, tenant-partitioned object storage, responsive web application with PWA support.

**Invariants the product must never break**

| Rule | Meaning in the product |
|---|---|
| Immutable stock movement ledger | A `stock_movements` row is never updated or deleted; corrections are new movements |
| No negative stock unless configured | Server-side check on every commit; a business may opt in explicitly |
| Stock adjustments require a reason | Adjustment movements carry a mandatory reason and an actor |
| Batch identity preserved | `stock_batches` flow through receiving, transfers, sales and refunds without merging |
| Expired batches excluded from sale | Expiry is checked at sale time, not only at receiving |
| Transfers keep source and destination | A transfer records origin branch, destination branch and both dispatch and receipt |
| Balances reconcile to ledger | `inventory_balances` must equal the sum of movements per product, variant, batch and branch |
| No overselling | Confirmation requires available stock at the selling branch |
| Financial records deterministic from events | Sales, receipts and refunds are derivable from stored events, not from recomputation drift |
| AI never alters financial records | AI capabilities are deferred (Phase 5); when introduced, they never execute writes without confirmation |
| Tenant isolation and permissions enforced server-side | Client checks are display-only; every endpoint re-checks tenant, role, permission and branch |
| Audit all critical actions | Writes to stock, money, permissions and settings produce audit entries |

## Users

| Persona | SokoOS role | Main problems today | Key needs |
|---|---|---|---|
| Retail shop owner | Business Admin | Cannot see true stock or daily takings across shops; loses money to untracked sales and shrinkage | One dashboard for sales, stock and low-stock items; control over staff, branches and permissions |
| Pharmacy operator | Business Admin | Batch and expiry control on paper; risk of selling expired medicine; no batch traceability | Batch-tracked stock, expiry exclusion from sale, adjustment with reason, auditable movements |
| Wholesaler / distributor manager | Business Admin | Bulk orders promised against unverified stock; inconsistent pricing across customers | Accurate branch and warehouse balances, no overselling, purchase orders and goods receiving |
| Branch manager | Branch Manager | Cannot approve transfers, purchases or corrections without a paper trail | Branch-scoped operations, approvals with recorded decisions, end-of-day reconciliation |
| Cashier / shop attendant | Cashier | Slow tills, handwritten receipts, stock counts that never match sales | Fast scan-or-search POS, mobile money and cash payments, printed or sent receipts, no training required |
| Inventory clerk / store keeper | Inventory Clerk | Manual stock cards, no transfer record, no reason trail for adjustments | Stock movements, batch receiving, transfer request and receipt, mandatory adjustment reasons |

| Role | Access scope | Typical persona | MFA |
|---|---|---|---|
| Business Admin | Full access to the business, all branches | Owner, pharmacy operator, wholesaler manager | Required |
| Branch Manager | Branch operations and approvals | Branch manager | Required (assumption: admin-level approvals) |
| Cashier | POS and sales | Shop attendant, cashier | Optional |
| Inventory Clerk | Stock and transfers | Store keeper, inventory clerk | Optional |

Every business-owned record is tenant-owned; a user only ever sees the businesses and branches their `user_roles` and permissions allow. Assumption: one user account may hold roles in more than one business, resolved through `user_roles`, and the interface shows one active business at a time.

## MVP Scope

MVP = Phase 1 Foundation plus Phase 2 Business operations. Functional requirement ranges below are reserved here and enumerated in the PRD and SRS.

| Module | Phase | FR IDs | Capability in scope |
|---|---|---|---|
| Identity and access | 1 | FR-001–FR-020 | Email + password sign-up and sign-in, email and phone verification, MFA (required for admin roles, optional for others), session management, password reset |
| Business registration and tenancy | 1 | FR-021–FR-034 | Business registration, tenant creation, business profile and registration/tax details, subscription record, tenant-scoped file storage |
| Branch management | 1 | FR-035–FR-044 | Create and edit branches, assign users to branches, branch-scoped visibility across all operations |
| Users, roles and permissions | 1 | FR-045–FR-060 | Invite users, assign the four roles, manage permissions, role_permissions and user_roles, enforce branch restrictions server-side |
| Product catalogue | 1 | FR-061–FR-080 | Categories, brands, products, product_variants, SKU/barcode, cost and selling price, tax field, product images in object storage |
| Dashboard and notifications | 1 | FR-081–FR-090 | Basic dashboard (today's sales, low stock, pending approvals), in-app notifications, WhatsApp channel subject to provider, user notification preferences |
| Audit log | 1 | FR-091–FR-100 | Audit entries with actor, action, target, timestamp and context for all critical actions |
| Inventory and stock | 2 | FR-101–FR-132 | `inventory_balances`, immutable `stock_movements`, `stock_batches` with expiry, adjustments with reason, multi-branch transfers (requested→approved→dispatched→received→closed), low-stock detection |
| Purchasing | 2 | FR-133–FR-154 | Suppliers, `purchase_orders` (DRAFT→SUBMITTED→CONFIRMED→PARTIALLY_RECEIVED→RECEIVED→CLOSED), `goods_receipts`, receiving into batches |
| Sales and POS | 2 | FR-155–FR-178 | POS scan/search, cart, sale completion, `sales` and `sale_items`, refunds and returns, overselling prevention |
| Payments, receipts and refunds | 2 | FR-179–FR-194 | Mobile money via MTN MoMo and Airtel Money, cash and other recorded methods, `payments`, `receipts`, `refunds` |
| Reporting and end-of-day reconciliation | 2 | FR-195–FR-206 | Sales, stock and purchasing reports, low-stock report, cash count with discrepancy handling, day closure record |
| Data import and background jobs | 2 | FR-207–FR-216 | CSV/XLSX import with validation and error reporting, attachments, Redis-backed jobs (exports, notifications, reconciliation) |

**Explicitly not in this release:** Phase 3 supplier ecosystem and marketplace listings, offers and orders; Phase 4 finance accounts, journal entries and expenses; Phase 5 AI capabilities; Phase 6 expansion; the dedicated React Native app; patient medical records; email as a notification channel; microservices.

| ID | Area | Requirement |
|---|---|---|
| NFR-001 | Read performance | p95 API response under 500 ms for reads at 50 concurrent users |
| NFR-002 | Write performance | p95 under 1 s for writes at 50 concurrent users |
| NFR-003 | Availability | 99.5% monthly |
| NFR-004 | API contract | REST with URL versioning (`/v1/`) and OpenAPI documentation for every endpoint |
| NFR-005 | Platform | Responsive web application with PWA support; usable on mobile and desktop |
| NFR-006 | Accessibility | WCAG 2.1 AA |
| NFR-007 | Language and currency | English only, i18n-ready; monetary values displayed in USD per the ledger |
| NFR-008 | Compliance | Ugandan Data Protection and Privacy Act 2019 and relevant regulations |
| NFR-009 | Auditability | Audit logs capture actor, action, target, timestamp and context for critical actions |
| NFR-010 | Data protection | Soft-delete business records, hard-delete tokens, daily backups retained 14 days with a tested restore |
| NFR-011 | Observability | Centralized application logging, error monitoring and background job visibility |
| NFR-012 | Environments and delivery | Production and staging environments with CI/CD; Docker is used for CI builds only, the production runtime is managed Node hosting with managed PostgreSQL |
| NFR-013 | Testing | Unit tests for stock, pricing, tax, refund, PO, payment, forecasting and permissions; integration tests for sale + inventory, PO + receiving, transfers, supplier lifecycle, payment reconciliation, import and AI authorisation (AI tests apply when Phase 5 lands) |
| NFR-014 | Release gates | Gates on financials, stock reconciliation, duplicate prevention, E2E scenarios, backups and import errors |
| NFR-015 | Security baseline | Server-side authorization on every endpoint, tenant isolation, tenant-partitioned storage, secure password handling, rate limiting |

## Key Risks

| Risk | Probability | Impact | Mitigation | Owner |
|---|---|---|---|---|
| Pricing assumptions are proposed, not validated market prices | High | High | Treat all price points as provisional and keep them in configuration, not code; validate with target retailers, pharmacies and wholesalers before public pricing | Founder (Product) |
| Cross-tenant data leakage | Medium | High | Tenant ownership on every business-owned table, tenant scoping enforced in every server-side query, automated isolation tests per endpoint, tenant-partitioned object storage | Developer |
| Stock ledger drift or negative stock | Medium | High | Immutable `stock_movements`, balances derived and reconciled to the ledger, adjustment reasons mandatory, negative stock blocked unless configured, integration tests on sale, receiving and transfer flows | Developer |
| Mobile money reconciliation failures (MTN MoMo, Airtel Money) | Medium | High | Idempotent payment records, verified provider callbacks, retry handling, daily reconciliation report, audited manual correction | Developer |
| WhatsApp provider availability or approval delay | Medium | Medium | Provider-agnostic notification abstraction, in-app notifications as the guaranteed channel, WhatsApp enabled once provider access is confirmed | Founder |
| Uganda Data Protection and Privacy Act 2019 non-compliance | Medium | High | Data minimisation, consent and retention handling, access controls, audit logs, documented processing, soft delete with 14-day backup retention | Founder |
| Scope creep from deferred phases (marketplace, finance, AI, expansion) | High | Medium | Phases frozen by the decision ledger; deferred entities are not built; any scope change requires an explicit ledger update | Founder |
| Single developer plus AI agent delivery risk against an assumed timeline | High | Medium | Build Phase 1 fully before Phase 2, rely on automated tests and release gates, use managed hosting to avoid operational load, keep the architecture a modular monolith | Founder |
| Connectivity and device constraints in Uganda | Medium | Medium | PWA with responsive layout, small payloads, TanStack Query caching, retry-safe and idempotent POS submission | Developer |
| Email integration deferred while auth requires email verification | Medium | Medium | Phone verification through the chosen messaging provider is the primary path; if email verification is required at launch, the email provider decision must be made before build | Founder |
| Currency mismatch between USD display and mobile money settlement | Medium | High | Confirm the settlement currency of the MTN MoMo and Airtel Money accounts before the payments build; store amounts with explicit currency; single currency per tenant in MVP | Founder |
| Catalogue and import data quality | Medium | Medium | CSV/XLSX import with validation and per-row error reporting, duplicate detection, import-error release gate | Developer |
| Backup or restore not proven before launch | Low | High | Daily backups retained 14 days, restore drill executed as a release gate | Developer |

**Assumptions that must hold**

- Assumption: the marketplace order workflow (search, compare, order, accept/reject, dispatch, receipt) belongs to Phase 3 Supplier ecosystem and is therefore outside the MVP; the MVP delivers the catalogue, stock, sales and receipt primitives it depends on.
- Assumption: finance accounts, journal entries and expenses belong to Phase 4, so Phase 2 basic reporting covers sales, stock, purchasing and end-of-day reconciliation only.
- Assumption: no platform-operator interface is built in MVP; internal SokoOS support is performed by the founding team through server-side tooling and managed database access.
- Assumption: business registration is self-service after email and phone verification, with no platform approval step in MVP.
- Assumption: subscriptions are recorded (plan, status, period) but subscription billing and collection are not implemented in MVP; mobile money is used for sale payments.
- Assumption: login rate limiting and lockout after repeated failed attempts are included in FR-001–FR-020.
- Assumption: suppliers are not SokoOS users in MVP; purchase orders are recorded internally and delivered through the business's existing channels.
- Assumption: the ledger's USD display setting is correct for a Uganda-first launch and a single currency per tenant is used in MVP.
- Assumption: success-metric targets are set after the first month of live usage.