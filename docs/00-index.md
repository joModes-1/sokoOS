# Documentation Index — # SOKOOS

SokoOS is an interconnected business operating platform for B2B commerce, inventory management and business operations, starting in Uganda.

This folder is a build-ready documentation pack. Every row below is a final decision. An implementing agent must not re-decide any of them. If a row seems to conflict with another document, this table wins.

## Confirmed Decisions

| Area | Confirmed decision |
|---|---|
| Product | SokoOS is an interconnected business operating platform for B2B commerce, inventory management and business operations, starting in Uganda. |
| Problem | Fragmented business operations cause connected problems across inventory, sales, purchasing, finance and supplier coordination. |
| Success metrics | Active weekly users and completed core flows tracked from launch; targets set after first month *(assumed)* |
| MVP | MVP = Phase 1 Foundation (auth, business registration, multi-tenancy, branch management, user permissions, basic dashboard, product catalogue) plus Phase 2 Business operations (inventory, stock movements, purchasing, sales, POS, receipts, basic reporting). |
| Deferred | Deferred: Phase 3 Supplier ecosystem, Phase 4 Finance, Phase 5 AI capabilities, Phase 6 Expansion, dedicated React Native app, patient medical records. |
| Users | Primary users: retailers, pharmacies, wholesalers, distributors, business administrators; shop attendants must use basic operations without technical training. |
| Roles | Business Admin (full access), Branch Manager (branch operations, approvals), Cashier (POS, sales), Inventory Clerk (stock, transfers) |
| Tenancy | Yes, multi-tenant: every business-owned record has tenant ownership, isolation enforced server-side, branch-level restrictions, file storage partitioned by tenant. |
| Business rules | Never break: immutable stock movement ledger; no negative stock unless configured; stock adjustments require reason; batch identity preserved; expired batches excluded from sale; transfers keep source/destination; balances reconcile to ledger; no overselling; financial records deterministic from events; AI never alters financial records or executes writes without confirmation; tenant isolation and permissions enforced server-side; audit all critical actions. |
| Primary workflows | Primary workflows: POS sale (scan/search, payment, receipt), purchasing (PO creation, goods receiving), multi-branch transfer (request, approval, dispatch, receipt), marketplace order (search, compare, order, accept/reject, dispatch, receipt), stock replenishment (low stock detection, PO), end-of-day reconciliation (cash count, discrepancy, closure). |
| Core entities | Core entities include users, roles, permissions, businesses, branches, subscriptions, products, product_variants, categories, brands, inventory_balances, stock_movements, stock_batches, sales, sale_items, payments, refunds, receipts, suppliers, purchase_orders, goods_receipts, marketplace listings/offers/orders, finance accounts/journal entries/expenses, audit_logs, notifications, attachments, jobs. |
| Lifecycles | Lifecycles: Purchase orders: DRAFT→SUBMITTED→CONFIRMED→PARTIALLY_RECEIVED→RECEIVED→CLOSED. Marketplace orders: submitted→accepted/rejected→terms confirmed→payment/credit→dispatched→received. Stock transfers: requested→approved→dispatched→received→closed. Sales: completed→refunded/partially refunded/returned. |
| Sensitive data | Sensitive data: personal data (users, customers, suppliers), financial records (revenue, expenses, balances, payment transactions), business registration and tax information. Patient medical records are explicitly out of scope for initial release. |
| Deletes and backups | Soft-delete business records; hard-delete tokens; daily backups kept 14 days *(assumed)* |
| Frontend | Next.js, React, TypeScript, Tailwind CSS, component-based UI, React Hook Form, Zod, TanStack Query. |
| Backend | Node.js with NestJS (or modular Next.js backend initially), REST API, OpenAPI documentation, background job processing. |
| Database | PostgreSQL, Redis for caching and job queues, object storage for documents and product images. |
| Architecture | Modular monolith initially; avoid microservices until scaling requires. |
| API style | REST with URL versioning (/v1/) |
| Auth | Email + password with email/phone verification and MFA |
| MFA | Required for admin roles; optional for others *(assumed)* |
| Permissions | Role-based access control (RBAC) with roles, permissions, role_permissions, user_roles; branch-level restrictions enforced server-side. |
| Compliance | Comply with Ugandan Data Protection and Privacy Act 2019 and relevant regulations. |
| Payments | Mobile money via MTN MoMo and Airtel Money |
| File storage | Object storage for documents and product images, partitioned by tenant. |
| Other integrations | Other integrations: WhatsApp (subject to provider), CSV/XLSX import, multiple AI model providers via orchestration layer. |
| Notifications | Notification channels include WhatsApp (subject to provider); users can configure preferences. |
| UI platform | Responsive web application with PWA support; mobile and desktop usable; native React Native app deferred. |
| Design source | Tailwind CSS with a simple neutral design system; no Figma *(assumed)* |
| Accessibility | WCAG 2.1 AA *(assumed)* |
| Languages | English only; i18n-ready; USD *(assumed)* |
| Performance | p95 API < 500 ms for reads, < 1 s for writes at 50 concurrent users *(assumed)* |
| Availability | 99.5% monthly *(assumed)* |
| Hosting | Managed Node hosting (Render or Railway) with managed PostgreSQL; no Docker |
| CI/CD | CI/CD with Docker, automated database backups, centralized logging, error monitoring, production and staging environments. |
| Observability | Centralized application logging, error monitoring, audit logs with actor/action/target/timestamp/context. |
| Testing | Unit tests for stock/pricing/tax/refund/PO/payment/forecasting/permissions; integration tests for sale+inventory, PO+receiving, transfers, supplier lifecycle, payment reconciliation, import, AI auth; E2E scenarios A-G; release gates on financials, stock reconciliation, duplicate prevention, E2E, backups, import errors. |
| Timeline | MVP built by one developer with an AI coding agent *(assumed)* |
| Top risks | Top risk: pricing assumptions are proposed, not validated market prices. |

## Documentation Map

| File | Purpose |
|---|---|
| 23-open-questions-and-assumptions.md | Open Questions and Assumptions |
| 01-executive-summary.md | Executive Summary |
| 02-product-requirements-document.md | Product Requirements Document |
| 20-risk-register.md | Risk Register |
| 03-cleaned-srs.md | Cleaned Software Requirements Specification |
| 04-requirements-matrix.md | Requirements Matrix |
| 05-non-functional-requirements.md | Non-Functional Requirements |
| 21-acceptance-criteria.md | Acceptance Criteria |
| 07-system-architecture.md | System Architecture |
| 08-technology-stack-and-adrs.md | Technology Stack and ADRs |
| 12-authentication-authorization-and-permissions.md | Authentication, Authorization and Permissions |
| 13-security-requirements-and-threat-model.md | Security Requirements and Threat Model |
| 06-domain-model-and-glossary.md | Domain Model and Glossary |
| 09-database-design.md | Database Design |
| 10-api-specification.md | API Specification |
| 11-ui-ux-specification.md | UI/UX Specification |
| 14-implementation-plan.md | Implementation Plan |
| 16-test-plan-and-quality-strategy.md | Test Plan and Quality Strategy |
| 19-coding-standards.md | Coding Standards |
| 25-repository-structure.md | Repository Structure |
| 17-devops-deployment-and-operations.md | DevOps, Deployment and Operations |
| 18-observability-logging-and-monitoring.md | Observability, Logging and Monitoring |
| 22-readme-draft.md | README Draft |
| 26-production-readiness-runbook.md | Production Readiness Runbook |
| build/PROJECT_CONTEXT.md | Project Context |
| build/IMPLEMENTATION_RULES.md | Implementation Rules |
| 15-task-breakdown.md | Task Breakdown |
| 24-traceability-matrix.md | Traceability Matrix |
| build/TASKS_INDEX.md | Tasks Index |

## Reading Order for an Implementing Agent

`START-HERE.md` → `AGENTS.md` → this file → the current task file in `docs/build/tasks/`.
