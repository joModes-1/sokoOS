# README Draft

SokoOS is an interconnected business operating platform for B2B commerce, inventory management and business operations, starting in Uganda. One tenant (a business) runs its branches, product catalogue, stock, purchasing, sales and POS on a single system of record, backed by an immutable stock movement ledger and server-enforced tenant isolation.

This README covers the MVP release: **Phase 1 Foundation** (FR-001–FR-060, FR-081–FR-100) and **Phase 2 Business operations** (FR-101–FR-216). Deferred and not present in this repository: Phase 3 Supplier ecosystem, Phase 4 Finance, Phase 5 AI capabilities, Phase 6 Expansion, the dedicated React Native app, and patient medical records.

Runtime shape: three processes from one pnpm-workspace monorepo — `apps/web` (Next.js PWA), `apps/api` (NestJS REST API under `/v1/`), `apps/worker` (BullMQ) — against managed PostgreSQL, managed Redis and S3-compatible object storage.

## Setup

### Prerequisites

| Requirement | Version / value | Notes |
|---|---|---|
| Node.js | 20 LTS | Pinned in `.nvmrc`; run `nvm use` |
| pnpm | 9.x | Workspaces only; no npm or yarn lockfiles are committed |
| PostgreSQL | 15+ | Local database `sokoos_dev` |
| Redis | 7 | BullMQ queues, rate limits and cache |
| S3-compatible object storage | Any S3-compatible endpoint | Per-developer bucket, or the provider's development bucket |
| Docker | Optional | Used only for `docker/docker-compose.ci.yml` (ephemeral PostgreSQL + Redis for integration tests) and CI build artifacts. The production runtime is managed Node hosting with no container orchestration |
| Git | Any recent version | — |

Assumption: local ports are `3000` for `apps/web` and `4000` for `apps/api`; `apps/worker` exposes no port.

### Repository layout

| Path | Role |
|---|---|
| `apps/web/` | Next.js App Router PWA: role-aware shell, POS, print views |
| `apps/api/` | NestJS REST API served under `/v1/`, OpenAPI 3.1 document |
| `apps/worker/` | BullMQ worker for the seven MVP job types |
| `packages/shared/` | Zod schemas, permission catalogue, money and time utilities, error codes |
| `packages/api-client/` | Generated OpenAPI types and typed fetch client — never hand-edited |
| `packages/config/` | Shared `tsconfig`, ESLint, Prettier and Tailwind preset |
| `tests/e2e/` | Playwright scenarios A–G |
| `scripts/` | Seed, smoke, OpenAPI export, backup-restore drill helpers |
| `docker/` | CI-only Dockerfiles and CI compose file |
| `.github/workflows/` | CI/CD pipelines |
| `project-docs/` | Documentation pack `01`–`25` (read-only reference) |
| `codex-handoff/` | Task-by-task agent instruction files |

Full tree and module ownership: `project-docs/25-repository-structure.md`.

### 1. Install dependencies

```bash
git clone <repository>
cd sokoos
pnpm install --frozen-lockfile
```

### 2. Configure the environment

```bash
cp .env.example .env.local
```

`.env.example` is committed with placeholder values for every key. `.env.local` is gitignored and holds real values. Staging and production values are injected from the hosting provider's secret store.

| Variable | Environments | Purpose | Default |
|---|---|---|---|
| `NODE_ENV` | all | Runtime mode | `development` |
| `APP_BASE_URL` | all | Absolute base URL used in links and signed-URL redirects | — |
| `CORS_ORIGINS` | all | Comma-separated allowed browser origins for the web app | — |
| `LOG_LEVEL` | all | `debug`, `info`, `warn`, `error` | `info` |
| `TZ` | all | Process timezone; business dates derive from the tenant timezone | `UTC` |
| `DATABASE_URL` | all | Pooled PostgreSQL connection string | — |
| `REDIS_URL` | all | Redis connection string for BullMQ, rate limits and cache | — |
| `JOB_MAX_ATTEMPTS` | all | Bounded retries before a job is marked `failed` | `5` |
| `JWT_ACCESS_SECRET` | all | Signs access tokens | — |
| `JWT_REFRESH_SECRET` | all | Signs rotating refresh tokens | — |
| `ACCESS_TOKEN_TTL` | all | Access token lifetime | `15m` |
| `REFRESH_TOKEN_TTL` | all | Refresh token lifetime | `30d` |
| `MFA_ISSUER` | all | TOTP issuer label in authenticator apps | `SokoOS` |
| `LOGIN_MAX_ATTEMPTS` | all | Failed sign-ins before lockout (FR-018) | `10` |
| `LOGIN_LOCKOUT_MINUTES` | all | Lockout duration (FR-018) | `15` |
| `VERIFICATION_CODE_TTL_MINUTES` | all | Verification code lifetime (FR-006) | `10` |
| `VERIFICATION_MAX_ATTEMPTS` | all | Attempts per verification code (FR-006) | `5` |
| `PASSWORD_RESET_TTL_MINUTES` | all | Password reset token lifetime (FR-014) | `30` |
| `INVITATION_TTL_DAYS` | all | Invitation token lifetime (FR-046) | `7` |
| `SMS_PROVIDER_API_KEY` | staging, production | Phone verification code delivery via the chosen SMS provider | — |
| `STORAGE_ENDPOINT` | all | S3-compatible endpoint | — |
| `STORAGE_BUCKET` | all | Bucket holding product images and attachments | — |
| `STORAGE_ACCESS_KEY_ID` | all | Server-side storage credential | — |
| `STORAGE_SECRET_ACCESS_KEY` | all | Server-side storage credential | — |
| `STORAGE_SIGNED_URL_TTL_SECONDS` | all | Signed PUT/GET lifetime (FR-077, FR-212) | `300` |
| `MAX_IMAGE_BYTES` | all | Product image size cap (FR-076) | `5242880` |
| `MTN_MOMO_SUBSCRIPTION_KEY` | staging, production | MTN MoMo collection API credential | — |
| `MTN_MOMO_API_USER` | staging, production | MTN MoMo collection API credential | — |
| `MTN_MOMO_API_KEY` | staging, production | MTN MoMo collection API credential | — |
| `MTN_MOMO_CALLBACK_SECRET` | staging, production | Verifies the MTN MoMo callback (FR-185) | — |
| `AIRTEL_MONEY_CLIENT_ID` | staging, production | Airtel Money collection API credential | — |
| `AIRTEL_MONEY_CLIENT_SECRET` | staging, production | Airtel Money collection API credential | — |
| `AIRTEL_MONEY_CALLBACK_SECRET` | staging, production | Verifies the Airtel Money callback (FR-185) | — |
| `PAYMENT_PENDING_TTL_MINUTES` | all | Age at which `payment.expire` marks a payment `EXPIRED` (FR-187) | `15` |
| `WHATSAPP_ENABLED` | all | Enables the WhatsApp channel as selectable (FR-089) | `false` |
| `WHATSAPP_PROVIDER_TOKEN` | staging, production | WhatsApp provider credential, required only when `WHATSAPP_ENABLED=true` | — |
| `ERROR_MONITORING_DSN` | staging, production | DSN for the chosen error-monitoring provider's SDK | — |
| `METRICS_TOKEN` | staging, production | Bearer token required by `GET /v1/metrics` | — |
| `NEGATIVE_STOCK_DEFAULT` | all | Tenant default for allowing negative stock (FR-113) | `false` |

Rules that must never be broken:

1. One secret set per environment. `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, `MTN_MOMO_CALLBACK_SECRET`, `AIRTEL_MONEY_CALLBACK_SECRET` and `STORAGE_SIGNED_URL_TTL_SECONDS` are never shared or copied between `local`, `staging` and `production`.
2. Production credentials are never used in staging, and staging tests never point at a production database.
3. No secret is ever placed in a `NEXT_PUBLIC_*` variable, printed in a log line, or committed.
4. Email is out of scope for MVP: there is no email provider and no email environment variable. Account verification codes are delivered by phone through the chosen SMS provider; the email verification channel is disabled (FR-005).
5. In-app notifications are always on and need no configuration (FR-088).

### 3. Start local data stores

```bash
createdb sokoos_dev
redis-cli ping          # expect PONG
```

For integration tests only, the CI compose file provides ephemeral PostgreSQL and Redis:

```bash
docker compose -f docker/docker-compose.ci.yml up -d
```

### 4. Generate the client, migrate and seed

```bash
pnpm prisma generate
pnpm db:migrate
pnpm db:seed
```

`pnpm db:seed` creates a demo tenant with two branches, one user per system role, a small catalogue with categories, brands, products and variants, and a supplier. Seed data is for local development only and is never applied to staging or production.

### 5. Run the stack

```bash
pnpm dev
```

`turbo run dev` starts `apps/web`, `apps/api` and `apps/worker` together. The worker must be running for notifications, exports, payment expiry, payment reconciliation, imports, low-stock evaluation and stock reconciliation to execute.

### Runtime URLs

| Service | URL |
|---|---|
| Web app | `http://localhost:3000` |
| API liveness | `http://localhost:4000/v1/health` |
| API readiness | `http://localhost:4000/v1/health/ready` |
| API version | `http://localhost:4000/v1/version` |
| API metrics (Bearer `METRICS_TOKEN`) | `http://localhost:4000/v1/metrics` |
| OpenAPI documentation | `http://localhost:4000/v1/docs` |

Assumption: the OpenAPI document is served at `/v1/docs`; the readiness endpoint checks `SELECT 1` on PostgreSQL, `PING` on Redis and `HEAD` on `STORAGE_BUCKET`, and returns `503` with `{"status":"degraded","checks":{...}}` when any check fails.

### First-run walkthrough

| Step | Screen | Result |
|---|---|---|
| 1 | `/register` | Account created in state `PENDING_VERIFICATION`; no business data is exposed (FR-004) |
| 2 | `/verify` | Phone verification code accepted; account moves to `ACTIVE` (FR-007) |
| 3 | `/register` (business step) | Business tenant created with the owner's Business Admin role in one transaction (FR-021); business type is retail, pharmacy, wholesale or distribution (FR-022) |
| 4 | `/settings/branches` | First branch created with name, code, address, phone and `is_warehouse` (FR-035) |
| 5 | `/settings/users` | A Cashier and an Inventory Clerk invited with a branch scope (FR-045) |
| 6 | `/settings/roles` | Role permissions reviewed through `role_permissions` (FR-052) |
| 7 | `/catalogue/products` | Products and variants created with SKU, barcode, prices, tax rate and `reorder_level` (FR-067, FR-071) |
| 8 | `/pos` | Sale committed with an idempotency key; receipt created and printable (FR-162, FR-166) |
| 9 | `/inventory/movements` | The sale's stock movements appear; no movement row can be edited or deleted (FR-106) |
| 10 | `/dashboard` | Today's sales total, transaction count, top items, low-stock count and pending approvals (FR-081) |

### Roles and access

| Role | Scope | Notes |
|---|---|---|
| Business Admin | Full tenant access | MFA required on sign-in (FR-009); `admin.*` permissions cannot be removed (FR-053) |
| Branch Manager | Branch operations and approvals | MFA required on sign-in (FR-009); dashboard and audit log are branch-scoped (FR-082, FR-094) |
| Cashier | POS and sales | Requires a branch assignment; otherwise branch-scoped operations return HTTP 403 (FR-041) |
| Inventory Clerk | Stock and transfers | Requires a branch assignment; otherwise branch-scoped operations return HTTP 403 (FR-041) |

MFA is required for admin roles and optional for others. Every permission check is enforced server-side and defaults to deny (FR-054).

### Out of scope in MVP

- Phase 3 Supplier ecosystem, Phase 4 Finance, Phase 5 AI capabilities, Phase 6 Expansion.
- Dedicated React Native app; the web app is a responsive PWA (NFR-009).
- Patient medical records.
- Email delivery: no email provider, no email environment variables, email verification channel disabled.
- Suppliers are non-user records with no login (FR-135).

### Troubleshooting

| Symptom | Cause | Action |
|---|---|---|
| Sign-in blocked with a lockout message | 10 failed attempts within 15 minutes (FR-018) | Wait `LOGIN_LOCKOUT_MINUTES`, or clear the lockout for the account in the database; the message never discloses whether the email exists (FR-019) |
| Sign-in succeeds but no data is visible | Account still `PENDING_VERIFICATION` (FR-004) | Complete phone verification at `/verify` |
| MFA challenge cannot be completed | Admin role requires MFA (FR-009) | Enrol an authenticator app; use a single-use recovery code if the device is lost (FR-017) |
| HTTP 403 on a branch screen | No branch assignment for the user (FR-041) | Assign the user to a branch in `/settings/users` |
| Barcode scan returns not found | Barcode is not unique to one variant in the tenant (FR-073, FR-074) | Correct the variant barcode; the POS is not blocked |
| Sale commit returns HTTP 409 | Stock re-validation failed at commit time (FR-163) or the balance would go negative while negative stock is disabled (FR-114) | Receive stock or enable negative stock per business or branch (FR-113) |
| Repeated sale commit returns the same sale | Idempotency key replay (FR-164) | Expected behaviour; no duplicate sale or movement is created |
| Expired batch not sellable | Expired batches are excluded from sale (FR-132, FR-158) | Write off the batch through a stock adjustment with a reason |
| Payment stays `PENDING` | Provider callback not received | Check `payment_events` and the provider reference; `payment.expire` marks it `EXPIRED` after `PAYMENT_PENDING_TTL_MINUTES`; run `payment.reconcile` to close gaps |
| Notifications never arrive | Worker not running or Redis unreachable | Start `apps/worker`; check `REDIS_URL` and the `jobs` table error detail (FR-214) |
| Signed image or attachment URL returns 403 | Signed URL expired or the object key is outside the tenant prefix | Re-request the signed URL; `STORAGE_SIGNED_URL_TTL_SECONDS` defaults to 300 |
| `pnpm ops:validate` fails | A required environment variable is missing | Compare `.env.local` against `.env.example` |
| Migration drift on a fresh clone | Local database is ahead of or behind the committed migrations | Recreate `sokoos_dev` and run `pnpm db:migrate`; never edit an applied migration |

## Commands

### Root scripts

| Script | Command | Purpose |
|---|---|---|
| `pnpm dev` | `turbo run dev` | Runs web, api and worker together |
| `pnpm lint` | `turbo run lint` | ESLint across all packages |
| `pnpm typecheck` | `turbo run typecheck` | `tsc --noEmit` across all packages |
| `pnpm test` | `turbo run test` | Unit tests across all packages |
| `pnpm test:unit` | `turbo run test` | CI-facing alias of `pnpm test` |
| `pnpm test:integration` | `pnpm --filter api test:integration` | Integration tests; requires `docker/docker-compose.ci.yml` services |
| `pnpm test:e2e` | `pnpm --filter e2e test` | Playwright scenarios A–G against staging |
| `pnpm build` | `turbo run build` | Builds web, api and worker |
| `pnpm prisma generate` | `pnpm --filter api prisma generate` | Regenerates the Prisma client |
| `pnpm db:migrate` | `pnpm --filter api prisma migrate deploy` | Applies committed migrations |
| `pnpm db:seed` | `pnpm --filter api tsx prisma/seed.ts` | Demo tenant, branches, users and catalogue |
| `pnpm export:openapi` | `pnpm --filter api tsx ../../scripts/export-openapi.ts` | Regenerates `packages/api-client/openapi.json` |
| `pnpm smoke` | `bash scripts/smoke.sh` | Post-deploy health, login and one sale |

### Per-app and per-package commands

| Command | Purpose |
|---|---|
| `pnpm --filter web dev` | Run only the Next.js web app |
| `pnpm --filter api dev` | Run only the NestJS API |
| `pnpm --filter worker dev` | Run only the BullMQ worker |
| `pnpm --filter api prisma migrate dev --name <description>` | Create a new migration in development |
| `pnpm --filter api prisma migrate status` | List applied and pending migrations |
| `pnpm --filter api test` | API unit tests |
| `pnpm --filter api test:integration` | API integration tests against ephemeral PostgreSQL and Redis |
| `pnpm --filter e2e test` | Playwright scenarios A–G |
| `pnpm --filter shared test` | Shared schema, money and permission tests |

### Quality gates

Run before every pull request and before every release tag:

```bash
pnpm install --frozen-lockfile
pnpm prisma generate
pnpm lint
pnpm typecheck
pnpm test:unit
pnpm test:integration
pnpm build
pnpm ops:validate
```

Unit tests cover stock, pricing, tax, refund, purchase order, payment, forecasting and permissions. Integration tests cover sale + inventory, purchase order + receiving, transfers, supplier lifecycle, payment reconciliation, import and AI authorization.

### End-to-end scenarios

`pnpm test:e2e` runs seven Playwright scenarios against staging:

| Scenario | Flow |
|---|---|
| A | Register → verify → create business → create branch → invite user |
| B | POS sale with cash → receipt → reprint |
| C | Purchase order → confirm → goods receipt → close |
| D | Transfer request → approve → dispatch → receive → close |
| E | Low-stock detection → replenishment purchase order |
| F | End-of-day cash count → discrepancy → closure |
| G | CSV/XLSX import with row-level errors |

### Deployment and operations

| Command | Environment | Purpose |
|---|---|---|
| `pnpm ops:validate` | all | Validates that every required environment variable is present |
| `pnpm deploy:migrate` | staging, production | Applies migrations **before** the new application code is rolled out |
| `pnpm deploy:smoke` | staging, production | Smoke tests against `API_BASE_URL` and `WEB_BASE_URL` |
| `pnpm backup:status` | operations | Reports backup freshness against `BACKUP_EXPECTED_MAX_AGE_HOURS` (24) |
| `bash scripts/backup-restore-drill.sh` | staging | Rehearses a restore into staging (NFR-004) |
| `bash scripts/smoke.sh` | any | Health, login and one sale against a running environment |

Deployment pipelines: `.github/workflows/ci.yml` (quality gates on every pull request and on push to `main`), `.github/workflows/deploy-staging.yml` (migration, deploy and E2E on merge to `main`), `.github/workflows/deploy-production.yml` (manually dispatched, bound to the GitHub Environment `production` with required reviewers), `.github/workflows/backup-verify.yml` (scheduled daily backup freshness check).

Assumption: the CI provider is GitHub Actions.

### Release gates

| Gate | Enforced by |
|---|---|
| Financial correctness | `pnpm test:unit` (pricing, tax, refund, payment) and integration payment-reconciliation tests |
| Stock reconciliation | `pnpm test:unit` (stock), integration tests for sale + inventory, purchase order + receiving and transfers, and the assertion that closing balance equals the sum of movements (FR-199) |
| Duplicate prevention | Integration test asserting a repeated idempotency key returns the original sale and creates no second movement (FR-164), and that a repeated provider event id is rejected (FR-185) |
| E2E scenarios A–G | `pnpm test:e2e` on staging |
| Backups | `pnpm backup:status` and a confirmed provider snapshot |
| Import errors | Integration tests for per-row validation and row-level error reporting (FR-207–FR-209) |

### Production deploy sequence

```bash
pnpm backup:status                 # confirm the newest backup is younger than 24 hours
pnpm ops:validate                  # confirm every required variable is set
pnpm deploy:migrate                # migrations run before the new code
# deploy apps/api, apps/worker and apps/web from the same commit tag
pnpm deploy:smoke                  # against API_BASE_URL and WEB_BASE_URL
```

Then confirm `GET /v1/health/ready` returns `{"status":"ok"}` with all dependency checks `ok`, confirm `GET /v1/version` reports the new commit and `environment: "production"`, and watch the 5xx rate, p95 latency, job failure counters and the error-monitoring provider for 15 minutes. Full runbook: `project-docs/17-devops-deployment-and-operations.md`.