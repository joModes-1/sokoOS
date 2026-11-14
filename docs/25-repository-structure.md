# Repository Structure

## Tree

**Recommendation: one pnpm-workspace monorepo.** The web app, API, worker and shared validation schemas are all TypeScript; a single repository gives one CI pipeline, one Prisma schema, one permission catalogue and one set of Zod schemas reused by client and server (ADR-014), and it keeps the whole system inside one AI-agent context window. Splitting the worker or the shared package into separate repositories would duplicate domain code and break the "modules never duplicate business rules" rule in ADR-008.

**Top-level layout**

| Path | Purpose | Owner/Concern | Notes |
|---|---|---|---|
| `apps/web/` | Next.js App Router PWA (role-aware shell, POS, print views) | Frontend | Route groups by user area; client components only for POS/cart/print |
| `apps/api/` | NestJS REST API served under `/v1/` | Backend | 16 domain modules, guard chain, OpenAPI 3.1 |
| `apps/worker/` | BullMQ worker process (7 MVP job types) | Backend/DevOps | Separate deployable so job load cannot starve HTTP traffic (ADR-010) |
| `packages/shared/` | Zod schemas, permission catalogue, money/time utilities, error codes | Full stack | No app dependencies; imported by web, api and worker |
| `packages/api-client/` | Types and typed fetch wrapper generated from the OpenAPI document | Frontend | Generated — never hand-edited |
| `packages/config/` | Shared `tsconfig`, ESLint, Prettier and Tailwind preset | Tooling | Keeps lint/format identical across apps |
| `tests/e2e/` | Playwright end-to-end scenarios A–G | QA | Runs against staging in CI (ADR-011) |
| `scripts/` | Seed, smoke, OpenAPI export, backup-restore drill helpers | DevOps | Run locally and from CI |
| `docker/` | CI-only Dockerfiles and CI compose file | DevOps | Docker is a CI build artifact only; no Docker in the runtime path |
| `.github/workflows/` | CI/CD pipelines | DevOps | Assumption: CI provider is GitHub Actions (A5) |
| `project-docs/` | This documentation pack (`01`–`25`) | Product/Architecture | Read-only reference for implementers |
| `codex-handoff/` | Task-by-task agent instruction files | Codex | One file per implementation task |
| `.env.example` | Every environment variable with a safe placeholder | DevOps | Mirrors the stack document's variable table |
| `package.json` | Workspace root scripts and devDependencies | Tooling | `pnpm` + `turbo` task orchestration |
| `pnpm-workspace.yaml` | Workspace package globs | Tooling | `apps/*`, `packages/*` |
| `turbo.json` | Task graph (`lint`, `typecheck`, `test`, `build`) | Tooling | Cache keys include `packages/shared` |
| `README.md` | Local setup, run and test instructions | Full stack | Must be runnable by a new developer in under 30 minutes |
| `AGENTS.md` | Standing rules for the AI coding agent | Codex | Points at `project-docs/` and `codex-handoff/` |

**Full tree**

```text
sokoos/
├── apps/
│   ├── web/                      # Next.js App Router PWA
│   ├── api/                      # NestJS REST API (/v1)
│   └── worker/                   # BullMQ worker process
├── packages/
│   ├── shared/                   # Zod schemas, permissions, money, time, errors
│   ├── api-client/               # generated OpenAPI types + typed fetch client
│   └── config/                   # shared tsconfig / eslint / prettier / tailwind preset
├── tests/
│   └── e2e/                      # Playwright scenarios A–G
├── scripts/
│   ├── seed.ts                   # demo tenant, branches, users, catalogue
│   ├── export-openapi.ts         # writes packages/api-client/openapi.json
│   ├── smoke.sh                  # post-deploy health + login + one sale
│   └── backup-restore-drill.sh   # staging restore rehearsal (NFR-004)
├── docker/
│   ├── api.Dockerfile
│   ├── web.Dockerfile
│   ├── worker.Dockerfile
│   └── docker-compose.ci.yml     # ephemeral PostgreSQL + Redis for integration tests
├── .github/workflows/
│   ├── ci.yml
│   ├── deploy-staging.yml
│   ├── deploy-production.yml
│   └── backup-restore-drill.yml
├── project-docs/                 # 01-… through 25-repository-structure.md
├── codex-handoff/                # task-01-… through task-NN-….md
├── .env.example
├── .gitignore
├── .nvmrc
├── package.json
├── pnpm-workspace.yaml
├── turbo.json
├── README.md
└── AGENTS.md
```

**`apps/web/` — Next.js App Router**

```text
apps/web/
├── src/
│   ├── app/
│   │   ├── (public)/                     # unauthenticated
│   │   │   ├── login/page.tsx
│   │   │   ├── register/page.tsx
│   │   │   ├── verify/page.tsx           # phone/email verification code
│   │   │   ├── forgot-password/page.tsx
│   │   │   ├── reset-password/page.tsx
│   │   │   └── accept-invitation/page.tsx
│   │   ├── (app)/                        # authenticated shell (sidebar + header)
│   │   │   ├── layout.tsx                # session, tenant/branch context, unread badge
│   │   │   ├── dashboard/page.tsx
│   │   │   ├── pos/page.tsx              # client component, keyboard-first
│   │   │   ├── sales/page.tsx
│   │   │   ├── sales/[id]/page.tsx
│   │   │   ├── catalogue/{products,categories,brands}/page.tsx
│   │   │   ├── inventory/{balances,movements,batches,counts}/page.tsx
│   │   │   ├── transfers/{page.tsx,[id]/page.tsx}
│   │   │   ├── purchasing/{suppliers,purchase-orders,goods-receipts}/…
│   │   │   ├── reports/{sales,stock,purchasing,low-stock,payments}/page.tsx
│   │   │   ├── day-closure/page.tsx
│   │   │   ├── imports/page.tsx
│   │   │   ├── audit-logs/page.tsx
│   │   │   ├── notifications/page.tsx
│   │   │   └── settings/{business,branches,users,roles,notifications}/page.tsx
│   │   ├── print/receipts/[id]/page.tsx  # print-only layout, stored sale data only
│   │   ├── layout.tsx
│   │   ├── manifest.ts                   # PWA manifest
│   │   └── globals.css
│   ├── components/                       # design-system primitives (Button, Table, Money, EmptyState…)
│   ├── features/                         # one folder per API module: hooks + components + forms
│   ├── lib/
│   │   ├── api-client.ts                 # re-export from packages/api-client
│   │   ├── query-keys.ts                 # every key includes tenantId + branchId
│   │   ├── session.ts                    # token storage, refresh, MFA challenge
│   │   └── format.ts                     # minor-unit money, UTC → tenant timezone
│   ├── hooks/
│   └── styles/
├── public/{icons,sw.js,offline.html}
├── next.config.mjs
├── tailwind.config.ts
├── tsconfig.json
└── package.json
```

**`apps/api/` — NestJS**

```text
apps/api/
├── prisma/
│   ├── schema.prisma
│   ├── migrations/                       # forward-only, never edited after apply
│   └── seed.ts
├── src/
│   ├── main.ts                           # /v1 prefix, global filter, request-id, OpenAPI
│   ├── app.module.ts
│   ├── common/
│   │   ├── guards/{auth,tenant,branch-scope,permission}.guard.ts
│   │   ├── pipes/zod-validation.pipe.ts
│   │   ├── filters/http-exception.filter.ts   # { error: { code, message, details, requestId } }
│   │   ├── interceptors/{request-id,logging,audit}.interceptor.ts
│   │   ├── decorators/{permissions,current-user,tenant,branch,public}.decorator.ts
│   │   └── pagination/{page-query.dto.ts,paginated.ts}
│   ├── config/{env.schema.ts,configuration.ts}
│   ├── prisma/{prisma.module.ts,prisma.service.ts}
│   ├── providers/                        # external adapters behind interfaces
│   │   ├── payment/{payment-provider.interface.ts,mtn-momo.provider.ts,airtel-money.provider.ts}
│   │   ├── sms/sms.adapter.ts
│   │   ├── whatsapp/whatsapp.adapter.ts
│   │   └── storage/s3-storage.adapter.ts
│   ├── modules/                          # 16 domain modules (see ownership table)
│   │   ├── auth/
│   │   ├── businesses/
│   │   ├── branches/
│   │   ├── rbac/
│   │   ├── catalogue/
│   │   ├── inventory/
│   │   ├── transfers/
│   │   ├── purchasing/
│   │   ├── sales/
│   │   ├── payments/
│   │   ├── notifications/
│   │   ├── audit/
│   │   ├── reports/
│   │   ├── jobs/
│   │   ├── imports/
│   │   └── attachments/
│   ├── webhooks/                         # /v1/webhooks/mtn-momo, /v1/webhooks/airtel-money
│   └── health/{health.controller.ts,version.controller.ts}
└── test/                                 # integration + RBAC matrix tests
```

Every module folder follows the same shape:

```text
modules/<module>/
├── <module>.module.ts
├── <module>.controller.ts        # REST routes, permission decorators
├── <module>.service.ts           # domain rules, transactions
├── <module>.repository.ts        # Prisma access; every method takes tenantId
├── dto/                          # Zod schemas re-exported from packages/shared
├── <module>.service.spec.ts      # unit tests
└── <module>.controller.spec.ts   # integration tests
```

**`apps/worker/` — BullMQ**

```text
apps/worker/
├── src/
│   ├── main.ts
│   ├── worker.module.ts
│   ├── processors/
│   │   ├── notification.dispatch.processor.ts
│   │   ├── export.generate.processor.ts
│   │   ├── payment.expire.processor.ts
│   │   ├── payment.reconcile.processor.ts
│   │   ├── import.process.processor.ts
│   │   ├── lowstock.evaluate.processor.ts
│   │   └── stock.reconcile.processor.ts
│   ├── schedulers/               # repeatable jobs: payment.expire, lowstock.evaluate, stock.reconcile
│   └── config/
├── tsconfig.json
└── package.json
```

**`packages/shared/`**

```text
packages/shared/src/
├── schemas/                      # Zod: auth, business, branch, rbac, catalogue, inventory,
│                                 #       transfers, purchasing, sales, payments, imports, attachments
├── permissions/
│   ├── catalogue.ts              # every permission string, e.g. sales.discount, po.confirm
│   └── role-defaults.ts          # Business Admin / Branch Manager / Cashier / Inventory Clerk
├── money/                        # minor-unit arithmetic, currency guard, no floats
├── time/                         # UTC helpers, business-date derivation from tenant timezone
├── errors/                       # machine-readable error codes used by the API filter
├── constants/                    # enums: PO states, transfer states, payment states, job types
└── index.ts
```

**`tests/e2e/`**

```text
tests/e2e/
├── fixtures/                     # tenant, branch, user and catalogue factories
├── helpers/                      # login, MFA, POS driver, API seeding
├── scenario-a.spec.ts            # Assumption: A = register → verify → create business → branch → invite user
├── scenario-b.spec.ts            # Assumption: B = POS sale with cash → receipt → reprint
├── scenario-c.spec.ts            # Assumption: C = purchase order → confirm → goods receipt → close
├── scenario-d.spec.ts            # Assumption: D = transfer request → approve → dispatch → receive → close
├── scenario-e.spec.ts            # Assumption: E = low-stock detection → replenishment purchase order
├── scenario-f.spec.ts            # Assumption: F = end-of-day cash count → discrepancy → closure
├── scenario-g.spec.ts            # Assumption: G = CSV/XLSX import with row-level errors
└── playwright.config.ts
```

**Module ownership (ADR-008: a module owns its tables and never reads another module's tables directly)**

| Module | Owned tables | Exposes |
|---|---|---|
| `auth` | `users`, `sessions`, `refresh_tokens`, `verification_tokens`, `password_reset_tokens`, `mfa_secrets`, `mfa_recovery_codes`, `login_attempts` | sign-in, MFA, session revocation, lockout |
| `businesses` | `businesses`, `business_settings`, `subscriptions` | tenant profile, settings, active-context validation |
| `branches` | `branches`, `user_branches` | branch CRUD, branch scope resolution |
| `rbac` | `roles`, `permissions`, `role_permissions`, `user_roles`, `invitations` | permission catalogue, role assignment |
| `catalogue` | `categories`, `brands`, `products`, `product_variants`, `product_images` | product search, barcode resolution, pricing |
| `inventory` | `inventory_balances`, `stock_movements`, `stock_batches`, `stock_counts`, `stock_count_items` | balance reads, adjustments, batch/expiry rules |
| `transfers` | `stock_transfers`, `stock_transfer_items` | request → approve → dispatch → receive → close |
| `purchasing` | `suppliers`, `purchase_orders`, `purchase_order_items`, `goods_receipts`, `goods_receipt_items` | supplier CRUD, PO lifecycle, receiving |
| `sales` | `sales`, `sale_items`, `receipts`, `refunds`, `refund_items` | sale commit, receipts, refunds |
| `payments` | `payments`, `payment_events`, `cash_sessions`, `day_closures` | mobile money, cash, reconciliation, day closure |
| `notifications` | `notifications`, `notification_preferences` | in-app + WhatsApp dispatch, unread count |
| `audit` | `audit_logs` | append-only audit writes and search |
| `reports` | none (read-only raw SQL over other modules' tables) | dashboard summary, sales/stock/purchasing/low-stock/payment reports |
| `jobs` | `jobs` | enqueue, status, bounded retries |
| `imports` | `import_jobs`, `import_rows` | CSV/XLSX validation and row-by-row apply |
| `attachments` | `attachments` | signed upload/download, MIME and size enforcement |

**Conventions**

| Concern | Rule |
|---|---|
| Package manager | `pnpm` workspaces; no npm/yarn lockfiles committed |
| Task runner | `turbo run lint typecheck test build` from the root |
| File naming | `kebab-case.ts` for files, `PascalCase` for React components and NestJS classes |
| Module imports | A module may import another module's **service**, never its repository or Prisma models |
| Tenant scoping | Every repository method takes an explicit `tenantId`; a missing scope is a P0 defect |
| Money | Integer minor units + `currency` column; no floating point anywhere (ADR-015) |
| Timestamps | `timestamptz` in UTC; business dates derived from the tenant timezone |
| Validation | Zod schemas live only in `packages/shared`; the API validates with `ZodValidationPipe` |
| Query keys | Every TanStack Query key includes `tenantId` and `branchId` |
| Generated files | `packages/api-client/**` and `apps/api/prisma/migrations/**` are generated |
| Tests | Unit tests beside the service; integration tests in `apps/api/test/`; E2E in `tests/e2e/` |

**Never modify without an explicit reason**

| Path | Why |
|---|---|
| `.env`, `.env.*` (except `.env.example`) | Real secrets; never committed |
| `apps/api/prisma/migrations/**` already applied | Forward-only migrations (ADR-011) |
| `packages/api-client/**` | Regenerate with `pnpm export:openapi` instead |
| `apps/*/.next/`, `apps/*/dist/`, `node_modules/` | Build output |
| `project-docs/**` | Reference material; changes go through the documentation pack |

**Root scripts (`package.json`)**

| Script | Command | Purpose |
|---|---|---|
| `dev` | `turbo run dev` | Runs web, api and worker together |
| `lint` | `turbo run lint` | ESLint across all packages |
| `typecheck` | `turbo run typecheck` | `tsc --noEmit` across all packages |
| `test` | `turbo run test` | Unit tests |
| `test:integration` | `pnpm --filter api test:integration` | Requires `docker/docker-compose.ci.yml` services |
| `test:e2e` | `pnpm --filter e2e test` | Playwright scenarios A–G against staging |
| `db:migrate` | `pnpm --filter api prisma migrate deploy` | Applies migrations |
| `db:seed` | `pnpm --filter api tsx prisma/seed.ts` | Demo tenant and catalogue |
| `export:openapi` | `pnpm --filter api tsx ../../scripts/export-openapi.ts` | Regenerates `packages/api-client/openapi.json` |
| `smoke` | `bash scripts/smoke.sh` | Post-deploy health, login and one sale |

**Build order for the first commit.** Create `pnpm-workspace.yaml`, `turbo.json`, `packages/config`, `.env.example`, `docker/` and `.github/workflows/ci.yml` before any application code, so lint, typecheck and CI exist from the first task. Then scaffold `apps/api` with `prisma/schema.prisma` and the `common/` guard chain, then `packages/shared`, then `apps/web`, then `apps/worker`.