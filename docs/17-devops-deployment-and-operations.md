# DevOps, Deployment and Operations

**Product:** SokoOS — interconnected business operating platform for B2B commerce, inventory management and business operations
**Release covered:** MVP = Phase 1 Foundation (FR-001–FR-060, FR-081–FR-100) + Phase 2 Business operations (FR-101–FR-216)
**Document status:** Build-ready. Requirement IDs (FR-001–FR-216, NFR-001–NFR-015) are reused from `docs/03-cleaned-srs.md` and `docs/08-technology-stack-and-adrs.md` and are not renumbered. Every value below is either confirmed by the decision ledger or recorded as an explicit assumption in the row or note that introduces it.

Runtime shape: three processes from one pnpm-workspace monorepo — `apps/web` (Next.js), `apps/api` (NestJS), `apps/worker` (BullMQ) — against managed PostgreSQL, managed Redis and S3-compatible object storage (ADR-008, ADR-010, ADR-012).

## Environments

| Environment | Purpose | Database | Redis | Object storage | Payment providers | Notes |
|---|---|---|---|---|---|---|
| `local` | Development on a developer machine | Local PostgreSQL 15+ (`sokoos_dev`) | Local Redis 7 | S3-compatible endpoint with a per-developer bucket, or the provider's development bucket | MTN MoMo and Airtel Money sandbox credentials | `.env.local`, `NODE_ENV=development`, `APP_BASE_URL=http://localhost:3000`, `LOG_LEVEL=debug` |
| `staging` | Integration testing, migration rehearsal, E2E scenarios A–G, backup-restore drill, stakeholder review | Dedicated managed PostgreSQL instance (`sokoos_staging`) | Dedicated managed Redis instance | Dedicated bucket `sokoos-staging` | MTN MoMo and Airtel Money sandbox credentials | Auto-deploys on merge to `main`; `WHATSAPP_ENABLED=false` unless the WhatsApp provider's sandbox is available; synthetic or anonymised tenant data only |
| `production` | Live tenants | Managed PostgreSQL with provider daily snapshots and PITR where the tier supports it | Managed Redis | Bucket `sokoos-production` | MTN MoMo and Airtel Money live credentials | Manual approval required (GitHub Environment `production`); deploy from a tagged commit only |

### Environment parity rules

1. Staging mirrors production configuration: same variable names, same TTLs, same job types, same migration path, same worker topology. Only credential values and `APP_BASE_URL` differ.
2. Each environment has its own `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, `MTN_MOMO_CALLBACK_SECRET`, `AIRTEL_MONEY_CALLBACK_SECRET` and `STORAGE_SIGNED_URL_TTL_SECONDS` value. Secrets are never shared or copied between environments (ADR-011).
3. Production credentials are never used in staging. Production databases are never pointed at by staging tests.
4. Personal data is not copied out of production. Any production dump restored outside production is restored into an access-restricted staging database that is destroyed at the end of the drill (Ugandan Data Protection and Privacy Act 2019; `data.sensitivity`).
5. `NEGATIVE_STOCK_DEFAULT=false` in all three environments; negative stock is enabled per business or per branch by configuration only (FR-113, FR-043).
6. AI capabilities, marketplace, finance, subscription billing and the native React Native app are out of scope for MVP and have no environment configuration (FR: deferred phases; `scope.deferred`).
7. Email integration is out of scope: no email provider, no email environment variables, and the email verification channel is disabled (FR-005, `integrations.email` deferred). Verification codes are sent by phone through the chosen SMS provider.

## Environment Variables

Every key below appears in the committed `.env.example` with a placeholder value; real values live only in `.env.local` (gitignored) or the hosting provider's secret store.

### Core

| Variable | Environments | Purpose | Default |
|---|---|---|---|
| `NODE_ENV` | all | Runtime mode | `development` |
| `APP_BASE_URL` | all | Absolute base URL used in links and signed-URL redirects | — |
| `CORS_ORIGINS` | all | Comma-separated allowed browser origins for the web app | — (Assumption: required because web and API are separate services) |
| `LOG_LEVEL` | all | Structured log level: `debug`, `info`, `warn`, `error` | `info` |
| `TZ` | all | Process timezone; business dates derive from the tenant timezone, not this value | `UTC` |

### Data stores and queues

| Variable | Environments | Purpose | Default |
|---|---|---|---|
| `DATABASE_URL` | all | Pooled PostgreSQL connection string | — |
| `REDIS_URL` | all | Redis connection string for BullMQ, rate limits and cache | — |
| `JOB_MAX_ATTEMPTS` | all | Bounded retries before a job is marked `failed` (FR-216) | `5` |

### Authentication, MFA and verification

| Variable | Environments | Purpose | Default |
|---|---|---|---|
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

### Object storage

| Variable | Environments | Purpose | Default |
|---|---|---|---|
| `STORAGE_ENDPOINT` | all | S3-compatible endpoint | — |
| `STORAGE_BUCKET` | all | Bucket holding product images and attachments | — |
| `STORAGE_ACCESS_KEY_ID` | all | Server-side storage credential | — |
| `STORAGE_SECRET_ACCESS_KEY` | all | Server-side storage credential | — |
| `STORAGE_SIGNED_URL_TTL_SECONDS` | all | Signed PUT/GET lifetime (FR-077, FR-212) | `300` |
| `MAX_IMAGE_BYTES` | all | Product image size cap (FR-076) | `5242880` |

### Payments

| Variable | Environments | Purpose | Default |
|---|---|---|---|
| `MTN_MOMO_SUBSCRIPTION_KEY` | staging, production | MTN MoMo collection API credential | — |
| `MTN_MOMO_API_USER` | staging, production | MTN MoMo collection API credential | — |
| `MTN_MOMO_API_KEY` | staging, production | MTN MoMo collection API credential | — |
| `MTN_MOMO_CALLBACK_SECRET` | staging, production | Verifies the MTN MoMo callback (FR-185) | — |
| `AIRTEL_MONEY_CLIENT_ID` | staging, production | Airtel Money collection API credential | — |
| `AIRTEL_MONEY_CLIENT_SECRET` | staging, production | Airtel Money collection API credential | — |
| `AIRTEL_MONEY_CALLBACK_SECRET` | staging, production | Verifies the Airtel Money callback (FR-185) | — |
| `PAYMENT_PENDING_TTL_MINUTES` | all | Age at which `payment.expire` marks a payment `EXPIRED` (FR-187) | `15` |

### Notifications

| Variable | Environments | Purpose | Default |
|---|---|---|---|
| `WHATSAPP_ENABLED` | all | Enables the WhatsApp channel as selectable (FR-089) | `false` |
| `WHATSAPP_PROVIDER_TOKEN` | staging, production | WhatsApp provider credential, required only when `WHATSAPP_ENABLED=true` | — |

In-app notifications are always on and need no configuration (FR-088). Email variables do not exist; email is out of scope.

### Observability

| Variable | Environments | Purpose | Default |
|---|---|---|---|
| `ERROR_MONITORING_DSN` | staging, production | DSN for the chosen error-monitoring provider's SDK (NFR-007) | — |
| `METRICS_TOKEN` | staging, production | Bearer token required by `GET /v1/metrics` | — (Assumption) |

### Business defaults

| Variable | Environments | Purpose | Default |
|---|---|---|---|
| `NEGATIVE_STOCK_DEFAULT` | all | Tenant default for allowing negative stock (FR-113) | `false` |

### CI/CD and operations only (never set on a runtime service)

| Variable | Purpose | Default |
|---|---|---|
| `CI_DATABASE_URL` | Ephemeral PostgreSQL for integration tests | — (Assumption) |
| `CI_REDIS_URL` | Ephemeral Redis for integration and worker tests | — (Assumption) |
| `API_BASE_URL` | Target of `pnpm deploy:smoke` for the API | — |
| `WEB_BASE_URL` | Target of `pnpm deploy:smoke` for the web app | — |
| `BACKUP_DIR` | Directory or mounted volume holding `pg_dump` artifacts | `./backups` |
| `BACKUP_EXPECTED_MAX_AGE_HOURS` | Staleness threshold for `pnpm backup:status` | `24` |
| `BACKUP_RETENTION_DAYS` | Local backup artifact retention | `14` |
| `CONFIRM_RESTORE` | Must equal `yes` for `scripts/deploy/restore-postgres.sh` to run | — |

### Secret management and rotation

| Rule | Detail |
|---|---|
| Storage | `.env.example` committed with placeholders; `.env.local` gitignored; staging and production values injected from the hosting provider's secret store |
| Scope | One secret set per environment; no reuse across environments or between web, api and worker services |
| Rotation trigger | Suspected compromise, operator offboarding, restore from backup into a non-production environment, or provider credential reset |
| Rotation set | `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, `MTN_MOMO_CALLBACK_SECRET`, `AIRTEL_MONEY_CALLBACK_SECRET`, `STORAGE_ACCESS_KEY_ID`, `STORAGE_SECRET_ACCESS_KEY`, `SMS_PROVIDER_API_KEY`, `WHATSAPP_PROVIDER_TOKEN`, `ERROR_MONITORING_DSN`, `METRICS_TOKEN` |
| Post-rotation step | Restart `apps/api` and `apps/worker` so no process holds a retired secret; verify `GET /v1/health/ready` |
| Never | Commit a real secret, print a secret in a log line, or place a secret in an `NEXT_PUBLIC_*` variable |

## Deployment

### Repository and build artifacts

| Path | Role |
|---|---|
| `apps/web` | Next.js web app and installable PWA (NFR-009) |
| `apps/api` | NestJS REST API under `/v1/` (NFR-013) |
| `apps/worker` | BullMQ worker process for the seven MVP job types (ADR-012) |
| `packages/shared` | Zod schemas shared by web, api and worker (ADR-014) |
| `apps/api/Dockerfile` | CI build artifact; health-checks `GET /v1/health` |
| `apps/web/Dockerfile` | CI build artifact; health-checks `/` |
| `.github/workflows/ci.yml` | Quality gates on every pull request and on push to `main` |
| `.github/workflows/deploy-staging.yml` | Staging migration + deploy + E2E on merge to `main` |
| `.github/workflows/deploy-production.yml` | Manually dispatched, bound to GitHub Environment `production` with required reviewers |
| `.github/workflows/backup-verify.yml` | Scheduled daily; runs `pnpm backup:status` and alerts on a stale backup |

Docker is used for CI test services and reproducible build artifacts only. The production runtime is managed Node hosting with no container orchestration (ADR-010).

### Pipeline stages

| Stage | Command or action | Environment | Blocks on failure |
|---|---|---|---|
| Install | `pnpm install --frozen-lockfile` | CI | merge |
| Prisma generate | `pnpm prisma generate` | CI | merge |
| Lint | `pnpm lint` | CI | merge |
| Typecheck | `pnpm typecheck` | CI | merge |
| Unit tests | `pnpm test:unit` (stock, pricing, tax, refund, PO, payment, permissions) | CI | merge |
| Integration tests | `pnpm test:integration` against ephemeral PostgreSQL and Redis (sale+inventory, PO+receiving, transfers, supplier lifecycle, payment reconciliation, import, permissions) | CI | merge |
| Build | `pnpm build` | CI | merge |
| Deploy config validation | `pnpm ops:validate` | CI | merge |
| Staging migrate | `pnpm deploy:migrate` against staging | staging | staging deploy |
| Staging deploy | Deploy `apps/api`, `apps/worker`, `apps/web` from the merge commit | staging | production promotion |
| E2E | `pnpm test:e2e` (scenarios A–G) against staging | staging | production promotion |
| Smoke | `pnpm deploy:smoke` against staging | staging | production promotion |
| Production migrate | `pnpm deploy:migrate` against production | production | production deploy |
| Production deploy | Deploy `apps/api`, `apps/worker`, `apps/web` from the same commit tag | production | — |
| Production smoke | `pnpm deploy:smoke` against `API_BASE_URL` and `WEB_BASE_URL` | production | release accepted |

### Release gates

| Gate | Enforced by | Blocks |
|---|---|---|
| Financial correctness | `pnpm test:unit` (pricing, tax, refund, payment) and integration payment-reconciliation tests | merge and deploy |
| Stock reconciliation | `pnpm test:unit` (stock) and integration tests for sale+inventory, PO+receiving and transfers; the stock report assertion that closing balance equals the sum of movements (FR-199) | merge and deploy |
| Duplicate prevention | Integration test asserting a repeated idempotency key returns the original sale and creates no second movement (FR-164), and a repeated provider event id is rejected (FR-185) | merge and deploy |
| E2E scenarios A–G | `pnpm test:e2e` on staging | production deploy |
| Backups | `pnpm backup:status` and a confirmed provider snapshot | production deploy |
| Import errors | Integration tests for per-row validation and row-level error reporting (FR-207–FR-209) | merge and deploy |

### Migration process

Migrations are Prisma migrations, forward-only, and backward compatible with the previous release (expand → migrate → contract across at least two releases).

| Stage | Steps |
|---|---|
| Development | 1. `pnpm prisma migrate dev --name <description>` in `apps/api`. 2. Read the generated SQL before committing. 3. Run `pnpm test:unit` and `pnpm test:integration`. 4. Commit the migration with the code that uses it. |
| Staging | 1. `deploy-staging.yml` runs `pnpm deploy:migrate` before the staging app rollout. 2. On failure the staging deploy aborts and CI reports the failure; no staging app version is promoted. 3. E2E scenarios A–G run against the migrated staging database. |
| Production | 1. Confirm a fresh provider snapshot (`pnpm backup:status`). 2. `pnpm ops:validate`. 3. `pnpm deploy:migrate` — runs **before** the new application code. 4. Deploy `apps/api`, `apps/worker`, `apps/web` from the same commit tag. 5. `pnpm deploy:smoke`; verify `GET /v1/version` reports the new commit. |

Never: edit a migration after it has been applied; run migrations and the application rollout simultaneously; apply a production migration without a current backup; run a partial migration by hand; drop or rename a column in the same release that stops writing to it.

### Production deploy checklist

Pre-deploy

1. Confirm the staging deploy of the same commit passed E2E scenarios A–G.
2. Run `pnpm backup:status` and confirm the newest backup artifact is younger than `BACKUP_EXPECTED_MAX_AGE_HOURS` (24).
3. Create a manual snapshot in the provider console and record its identifier.
4. Run `pnpm ops:validate`.
5. Run `pnpm lint && pnpm typecheck && pnpm test:unit && pnpm test:integration && pnpm build` from the release tag.
6. List pending migrations and read the SQL for each one.
7. Announce the deploy window to the team.

Deploy

8. Dispatch `deploy-production.yml` and approve the `production` environment.
9. Confirm `pnpm deploy:migrate` completed with no failed migration.
10. Confirm `apps/api`, `apps/worker` and `apps/web` report the same commit tag.
11. Confirm no service was rolled back by the provider's health check.

Post-deploy

12. Run `pnpm deploy:smoke` against `API_BASE_URL` and `WEB_BASE_URL`.
13. Confirm `GET /v1/health/ready` returns `{"status":"ok"}` with all dependency checks `ok`.
14. Confirm `GET /v1/version` reports the new commit and `environment: "production"`.
15. Watch the 5xx rate, p95 latency, job failure counters and the error-monitoring provider for 15 minutes.
16. Execute one manual verification per critical flow: a POS sale commit, a goods receipt against a `CONFIRMED` purchase order, and a transfer approval.
17. Record the release: commit tag, migration names, operator, start and end time, verification result.

### Health and version endpoints

| Endpoint | Purpose | Checks | Failure response |
|---|---|---|---|
| `GET /v1/health` | Liveness | Process is up | `503` |
| `GET /v1/health/live` | Liveness probe | Same as `/v1/health` | `503` |
| `GET /v1/health/ready` | Readiness | `SELECT 1` on PostgreSQL, `PING` on Redis, `HEAD` on `STORAGE_BUCKET` | `503` with `{"status":"degraded","checks":{...}}` |
| `GET /v1/version` | Release metadata | None | `{"version":"1.0.0","commit":"<sha>","environment":"production","builtAt":"<ISO-8601>"}` |
| `GET /v1/metrics` | Prometheus text metrics | Requires `Authorization: Bearer $METRICS_TOKEN` | `401` without the token |

The load balancer routes traffic only to instances whose readiness check returns `200` (NFR-003). Readiness never reports `ok` while PostgreSQL is unreachable.

### Observability

Structured JSON logs, one line per request, with: `timestamp` (ISO-8601 UTC), `level`, `requestId`, `route`, `method`, `statusCode`, `latencyMs`, `tenantId`, `userId`, `branchId`, `resourceType`, `resourceId`. `requestId` correlates logs, error-monitoring events and `audit_logs` entries (NFR-007, FR-097).

Never logged: passwords and `password_hash`; access tokens, refresh tokens, session ids and invitation tokens; verification codes and password reset tokens; MFA secrets and recovery codes; full mobile money MSISDN (mask to last three digits); provider callback secrets; storage signed URLs and private object keys; `METRICS_TOKEN`; `ERROR_MONITORING_DSN`.

Application metrics: `http_requests_total{method,route,status_code}`, `http_request_duration_ms{method,route}` (histogram).

Business counters: `auth_login_attempts_total`, `auth_login_failures_total`, `auth_lockouts_total`, `sales_committed_total`, `sale_commit_conflicts_total`, `sale_idempotent_replays_total`, `payment_initiation_total{provider}`, `payment_success_total`, `payment_failure_total`, `payment_expired_total`, `payment_orphaned_total`, `webhook_received_total{provider}`, `webhook_duplicate_total`, `webhook_signature_failure_total`, `stock_movement_total{type}`, `stock_adjustment_total`, `stock_negative_rejection_total`, `goods_receipt_total`, `transfer_dispatch_total`, `transfer_receive_total`, `lowstock_notification_total`, `import_job_total{status}`, `export_job_total{status}`, `job_failed_total{type}`, `notification_dispatch_total{channel}`.

Audit events written for every critical action (FR-092, FR-095, FR-100): authentication sign-in, sign-in failure, lockout, MFA challenge, MFA enabled or disabled, recovery code use, password reset; business profile changes with before and after values; branch create, update, deactivate and user assignment; invitation, role change, user deactivation; catalogue price change; stock adjustment; sale completion, discount above the configured threshold, refund; payment state change and manual payment correction; purchase order submit, confirm, receive, cancel, close; transfer request, approve, reject, dispatch, receive, close; day closure; attachment download. Each entry stores `actor_id`, `actor_type`, `tenant_id`, `action`, `resource_type`, `resource_id`, `ip_address`, `user_agent`, `metadata` and `created_at`, and is append-only (FR-093).

Alerts

| Severity | Condition | Action |
|---|---|---|
| Critical | PostgreSQL unreachable or readiness `503` for more than 2 minutes | Page the operator; follow the rollback table |
| Critical | 5xx rate above 5% over 5 minutes | Page; check the error-monitoring provider and the newest release |
| Critical | Backup job failed or `pnpm backup:status` stale | Page; take a manual snapshot immediately |
| Critical | `webhook_signature_failure_total` above 5% over 15 minutes | Page; verify callback secrets and provider configuration |
| Warning | API p95 above 2 s for 10 minutes | Investigate slow queries and job backlog within 1 hour |
| Warning | `job_failed_total` above 10% for one job type | Inspect the `jobs` table error detail (FR-214) |
| Warning | New error type first seen in production | Triage within 1 hour |
| Warning | Object storage errors on upload or signed URL creation | Triage within 1 hour |
| Monitor | `auth_login_failures_total` spike, `stock_negative_rejection_total` spike, `import_job_total{status="failed"}` spike, orphaned payments above zero | Daily review |

### Rollback

| Failure | Action | Target time |
|---|---|---|
| Application regression, no schema change | Redeploy the previous release tag on the provider for the affected service only | < 5 minutes |
| Application regression after a migration was applied | Forward-fix in a new release; migrations are backward compatible, so the previous code version keeps running during the fix window | < 60 minutes |
| Migration failed mid-deploy | Abort the deploy, fix the migration, rehearse on staging, re-run; never repair a partially applied migration by hand in production | — |
| Configuration error | Correct the environment variable and restart the affected service; no code change | < 10 minutes |
| Worker failure only | Redeploy `apps/worker`; inspect the `jobs` table and re-enqueue with the original idempotency key | < 15 minutes |
| Payment callback failures | Keep the webhook route serving; the provider retries; run `payment.reconcile` to close gaps; never mark a sale paid from a client signal (FR-182) | < 30 minutes |
| Data corruption or a destructive migration | Restore from a provider snapshot or PITR to a chosen timestamp; accept data loss back to the restore point; rotate `JWT_ACCESS_SECRET` and `JWT_REFRESH_SECRET` | — |

Schema rollback is never automatic. A destructive change requires a backup and a rehearsed restore before it ships.

## Backups

| Asset | Method | Frequency | Retention | Location | Restore target |
|---|---|---|---|---|---|
| PostgreSQL | Provider automated snapshot, plus PITR where the tier supports it (NFR-004) | Daily snapshot; continuous WAL with PITR | 14 days (`data.retention`) | Provider-managed | Staging first, then production |
| PostgreSQL (fallback and drill) | `pnpm backup:postgres` writes a compressed `pg_dump` using `DATABASE_URL` into `BACKUP_DIR` | Daily scheduled job, plus before every production migration | `BACKUP_RETENTION_DAYS` = 14 days | Provider persistent disk or object storage | `scripts/deploy/restore-postgres.sh` |
| Object storage (product images, attachments) | Bucket versioning with a lifecycle rule on non-current versions | Continuous | 30 days for non-current versions (Assumption) | Provider bucket | Restore individual object versions; keys remain `tenant/{tenantId}/{entityType}/{entityId}/{uuid}.{ext}` |
| Redis | None — cache and queues only; no money or stock value is cached (ADR-012) | — | — | — | Re-enqueue from the `jobs` table, which mirrors job state for status queries (FR-214) |
| Audit log | Part of the PostgreSQL backup; append-only in the live database | Daily | Life of the tenant record (FR-096) | Provider-managed | Included in the database restore |
| Secrets | Provider secret store; keys documented in `.env.example` | On change | — | Provider | Re-entered from the documented key list |
| Soft-deleted business records | Remain in the live database with `deleted_at` set (FR-031) and are present in every backup for the retention window | Daily | 14 days in backups | Provider-managed | Included in the database restore |
| Hard-deleted tokens | Verification, password-reset, invitation and refresh tokens are hard-deleted on use or expiry (FR-008, FR-014) | Continuous | Not retained | — | Not restored; see the post-restore steps below |

### Backup verification

| Command | Behaviour |
|---|---|
| `pnpm backup:postgres` | Writes a compressed `pg_dump` from `DATABASE_URL` into `BACKUP_DIR` and exits non-zero on failure |
| `pnpm backup:status` | Reports whether the newest `.sql` or `.sql.gz` artifact in `BACKUP_DIR` is younger than `BACKUP_EXPECTED_MAX_AGE_HOURS`; exits non-zero when stale |
| `scripts/deploy/restore-postgres.sh <file>` | Restores a `.sql` or `.sql.gz` file and runs only when `CONFIRM_RESTORE=yes` |
| `.github/workflows/backup-verify.yml` | Runs `pnpm backup:status` daily and raises the backup alert on failure or staleness |

Provider-native daily snapshots and PITR are the primary production backup. The repository scripts are a deterministic fallback, a staleness check and the restore-drill mechanism; they do not replace provider PITR, which must be confirmed in the provider console.

### Restore procedure

1. Declare the incident and stop writes: put the affected service into maintenance mode at the load balancer.
2. Identify the restore point: the newest provider snapshot, or a PITR timestamp before the first corrupting write.
3. Restore into staging first and run the verification below. Restore into production only when staging verification passes or when the incident demands it.
4. Restore production: use provider PITR for a point-in-time target, or `CONFIRM_RESTORE=yes DATABASE_URL=<target> scripts/deploy/restore-postgres.sh <file>` for an artifact restore.
5. If the dump predates the current schema, run `pnpm deploy:migrate` against the restored database.
6. Rotate `JWT_ACCESS_SECRET` and `JWT_REFRESH_SECRET` so every access and refresh token issued before the restore point is invalid, and restart `apps/api` and `apps/worker`.
7. Invalidate MFA recovery codes: set `consumed_at` for all `mfa_recovery_codes` rows issued before the restore point so a previously used code cannot be replayed (FR-017).
8. Rotate `MTN_MOMO_CALLBACK_SECRET` and `AIRTEL_MONEY_CALLBACK_SECRET` if the restore target is a non-production environment, so production callbacks cannot be replayed against it.
9. Run `payment.reconcile` and confirm the payment mismatch list is empty (FR-191), then run the stock reconciliation job and confirm the closing balance equals the sum of movements with no drift (FR-199).
10. Re-enqueue jobs lost with Redis from the `jobs` table using the original idempotency keys; a repeated key must not create a duplicate sale or movement (FR-164).
11. Lift maintenance mode, run `pnpm deploy:smoke`, and confirm `GET /v1/health/ready` is `ok`.
12. Write an audit entry for the restore action and record the incident: cause, restore point, data lost, duration, follow-up action.

### Restore drill

| Item | Requirement |
|---|---|
| When | Once in staging before production launch (NFR-004), then quarterly |
| Input | The newest provider snapshot or `pg_dump` artifact |
| Environment | An access-restricted staging database, destroyed at the end of the drill; production data never lands in a shared environment |
| Steps | Restore, run `pnpm deploy:migrate` if needed, run the payment reconciliation and stock reconciliation checks, run `pnpm test:integration` against the restored database, then destroy it |
| Output | A recorded result: date, operator, backup identifier, restore duration, verification outcome |
| Blocks | Production launch fails its gate until a drill has passed |

### Backup retention and deletion

1. Daily backups are kept 14 days (`data.retention`). Older artifacts are deleted by the lifecycle rule on `BACKUP_DIR` and by the provider's snapshot policy.
2. A deletion request for personal data is honoured in the live system by soft-deleting the business record (FR-031) and hard-deleting tokens (FR-008, FR-014); the record ages out of backups within the 14-day window and no separate backup surgery is performed.
3. Audit entries are retained for the life of the tenant record and are never deleted by an API operation (FR-093, FR-096).
4. Financial records are deterministic from stored events and are never edited; corrections are new audited adjustment records (FR-192, FR-206). A restore therefore never requires back-filling financial values.
5. Backups are stored only in the hosting provider's region and are never copied to a developer machine.