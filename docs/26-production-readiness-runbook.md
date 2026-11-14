# Production Readiness Runbook

**Product:** SokoOS — interconnected business operating platform for B2B commerce, inventory management and business operations
**Release covered:** MVP = Phase 1 Foundation (FR-001–FR-060, FR-081–FR-100) + Phase 2 Business operations (FR-101–FR-216)
**Document status:** Build-ready. Requirement IDs (FR-001–FR-216, NFR-001–NFR-015) are reused from `docs/03-cleaned-srs.md` and `docs/08-technology-stack-and-adrs.md` and are not renumbered. Every value below is either confirmed by the decision ledger, carried from `docs/17-devops-deployment-and-operations.md` and `docs/18-observability-logging-and-monitoring.md`, or recorded as an explicit assumption in the row or note that introduces it.

Runtime shape: three processes from one pnpm-workspace monorepo — `apps/web` (Next.js), `apps/api` (NestJS), `apps/worker` (BullMQ) — against managed PostgreSQL, managed Redis and S3-compatible object storage, on managed Node hosting (Render or Railway) with no container orchestration in the runtime (ADR-008, ADR-010, ADR-012).

How to use this runbook: execute the Go-Live Checklist top to bottom, in order, on the release commit. Every step is either a command to paste or a click to make. Record the evidence named in step 12 before declaring the release live. If any "Do not proceed" condition in step 11 is true, stop and fix it — do not improvise.

## Go-Live Checklist

### 1. Scope and ownership

| Item | Value |
|---|---|
| Release unit | One commit tag deployed to `apps/api`, `apps/worker` and `apps/web` from the same commit |
| Environments | `staging` (auto-deploy on merge to `main`) and `production` (manual dispatch, GitHub Environment `production` with required reviewers) |
| Operator | The single developer building the MVP (`timeline.target`); acts as release operator and incident commander |
| Out of scope for this runbook | Phase 3 Supplier ecosystem, Phase 4 Finance, Phase 5 AI capabilities, Phase 6 Expansion, the native React Native app, patient medical records (`scope.deferred`) |
| Out of scope capability | Email: no email provider, no email environment variables, email verification channel disabled (FR-005, `integrations.email` deferred). No alert or report is delivered by email |
| No bootstrap step | Business registration is self-service after phone verification with no platform approval step (FR-024), so there is no platform-admin bootstrap credential to seed or remove |

### 2. Configuration and secrets

1. Run `pnpm ops:validate` from the release tag. It fails if any required variable is missing or still holds a placeholder value.
2. Confirm the production secret store (hosting provider secret management) holds non-placeholder values for every variable in the table below. `staging` and `production` never share a secret value (ADR-011).
3. Confirm no secret is exposed through a `NEXT_PUBLIC_*` variable.

| Group | Production variables that must be set | Notes |
|---|---|---|
| Core | `NODE_ENV=production`, `APP_BASE_URL`, `CORS_ORIGINS`, `LOG_LEVEL=info`, `TZ=UTC` | `CORS_ORIGINS` lists the production web origin only |
| Data stores and queues | `DATABASE_URL`, `REDIS_URL`, `JOB_MAX_ATTEMPTS=5` | Pooled PostgreSQL connection string |
| Auth, MFA, verification | `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, `ACCESS_TOKEN_TTL=15m`, `REFRESH_TOKEN_TTL=30d`, `MFA_ISSUER=SokoOS`, `LOGIN_MAX_ATTEMPTS=10`, `LOGIN_LOCKOUT_MINUTES=15`, `VERIFICATION_CODE_TTL_MINUTES=10`, `VERIFICATION_MAX_ATTEMPTS=5`, `PASSWORD_RESET_TTL_MINUTES=30`, `INVITATION_TTL_DAYS=7`, `SMS_PROVIDER_API_KEY` | `SMS_PROVIDER_API_KEY` is a hard go-live blocker: phone is the primary verification channel (FR-005) and without it no account can reach `ACTIVE` (FR-007) |
| Object storage | `STORAGE_ENDPOINT`, `STORAGE_BUCKET=sokoos-production`, `STORAGE_ACCESS_KEY_ID`, `STORAGE_SECRET_ACCESS_KEY`, `STORAGE_SIGNED_URL_TTL_SECONDS=300`, `MAX_IMAGE_BYTES=5242880` | Bucket is private; keys are tenant-prefixed (FR-075, FR-077) |
| Payments | `MTN_MOMO_SUBSCRIPTION_KEY`, `MTN_MOMO_API_USER`, `MTN_MOMO_API_KEY`, `MTN_MOMO_CALLBACK_SECRET`, `AIRTEL_MONEY_CLIENT_ID`, `AIRTEL_MONEY_CLIENT_SECRET`, `AIRTEL_MONEY_CALLBACK_SECRET`, `PAYMENT_PENDING_TTL_MINUTES=15` | Live credentials, not sandbox (FR-179, FR-185, FR-187) |
| Notifications | `WHATSAPP_ENABLED`, `WHATSAPP_PROVIDER_TOKEN` | Set `WHATSAPP_ENABLED=false` unless the chosen WhatsApp provider is live; in-app notifications are always on and need no configuration (FR-088, FR-089) |
| Observability | `ERROR_MONITORING_DSN`, `METRICS_TOKEN` | Both are go-live blockers; `METRICS_TOKEN` is required by `GET /v1/metrics` (NFR-007, NFR-013) |
| Business defaults | `NEGATIVE_STOCK_DEFAULT=false` | Negative stock is enabled per business or per branch only (FR-043, FR-113) |
| Operations only (never set on a runtime service) | `API_BASE_URL`, `WEB_BASE_URL`, `BACKUP_DIR`, `BACKUP_EXPECTED_MAX_AGE_HOURS=24`, `BACKUP_RETENTION_DAYS=14`, `CONFIRM_RESTORE` | Used by CI, smoke tests and restore scripts |

Provider callback registration (Assumption: callback routes are `POST /v1/payments/callbacks/mtn-momo` and `POST /v1/payments/callbacks/airtel-money`):

| Check | Expected |
|---|---|
| MTN MoMo callback URL registered with the provider | `https://api.<production-domain>/v1/payments/callbacks/mtn-momo` |
| Airtel Money callback URL registered with the provider | `https://api.<production-domain>/v1/payments/callbacks/airtel-money` |
| Callback secret matches the value the provider signs with | `MTN_MOMO_CALLBACK_SECRET`, `AIRTEL_MONEY_CALLBACK_SECRET` |
| Callback URLs point at production, not staging | Confirmed in both provider consoles |

### 3. Backup and restore readiness

| Step | Command or action | Pass condition |
|---|---|---|
| 1 | Confirm provider-managed daily snapshots and PITR are enabled on the production PostgreSQL tier | Snapshot schedule visible in the provider console |
| 2 | `BACKUP_DIR=backups BACKUP_EXPECTED_MAX_AGE_HOURS=24 pnpm backup:status` | Newest artifact younger than 24 hours |
| 3 | Create a manual snapshot in the provider console and record its identifier | Identifier recorded in the evidence table (step 12) |
| 4 | Confirm `.github/workflows/backup-verify.yml` is scheduled daily and alerts on a stale backup | Workflow enabled |
| 5 | Confirm the restore drill was executed on staging within the last 30 days: `CONFIRM_RESTORE=yes DATABASE_URL=<staging-url> BACKUP_DIR=backups scripts/deploy/restore-postgres.sh` | Drill completed, duration recorded, staging destroyed or reset afterwards |
| 6 | Confirm retention: `BACKUP_RETENTION_DAYS=14` for repository-managed artifacts, provider snapshot retention per tier | Matches `data.retention` (daily backups kept 14 days) |

Assumption: the repository-managed backup creation command is `DATABASE_URL=... BACKUP_DIR=backups pnpm backup:postgres`; `docs/17` names `BACKUP_DIR` and `pnpm backup:status` but not the creation command.

### 4. Quality and release gates

Run from the release tag, in this order. Every gate blocks the merge and the deploy.

| # | Command | Gate it satisfies |
|---|---|---|
| 1 | `pnpm install --frozen-lockfile` | Reproducible install |
| 2 | `pnpm prisma generate` | Prisma client matches the schema |
| 3 | `pnpm lint` | Static quality |
| 4 | `pnpm typecheck` | Type safety |
| 5 | `pnpm test:unit` | Financial correctness (pricing, tax, refund, payment), stock, PO, permissions |
| 6 | `pnpm test:integration` | Sale+inventory, PO+receiving, transfers, supplier lifecycle, payment reconciliation, import, permissions |
| 7 | `pnpm build` | All three apps build |
| 8 | `pnpm ops:validate` | Configuration completeness |
| 9 | `pnpm test:e2e` against staging | E2E scenarios A–G |
| 10 | `pnpm deploy:smoke` against staging | Staging smoke |

Release-gate assertions that must be green, not merely executed:

| Gate | Assertion | FR |
|---|---|---|
| Financial correctness | Pricing, tax, refund and payment unit tests pass; payment-reconciliation integration test passes | FR-178, FR-181, FR-191 |
| Stock reconciliation | Closing balance equals the sum of `stock_movements` for every product/variant/batch/branch combination | FR-102, FR-199 |
| Duplicate prevention | A repeated idempotency key returns the original sale and creates no second movement; a repeated provider event id is rejected | FR-164, FR-185 |
| E2E scenarios A–G | All seven scenarios pass on staging | `testing.strategy` |
| Backups | `pnpm backup:status` fresh and provider snapshot confirmed | NFR-004 |
| Import errors | Per-row validation and row-level error reporting tests pass | FR-207–FR-209 |

### 5. Database migration

1. List pending migrations and read the SQL for each one before approving the deploy.
2. Confirm every migration is forward-only and backward compatible with the previous release (expand → migrate → contract across at least two releases).
3. Confirm no migration drops or renames a column in the same release that stops writing to it.
4. Run `DATABASE_URL=... pnpm deploy:migrate` against production **before** the application rollout.
5. Confirm the migration run reports no failed migration.

Never: edit a migration after it has been applied; run migrations and the application rollout simultaneously; apply a production migration without a current backup; run a partial migration by hand.

### 6. Deploy

1. Confirm the staging deploy of the same commit passed E2E scenarios A–G and staging smoke.
2. Announce the deploy window.
3. Dispatch `.github/workflows/deploy-production.yml` and approve the `production` environment in GitHub.
4. Confirm `pnpm deploy:migrate` completed with no failed migration.
5. Confirm `apps/api`, `apps/worker` and `apps/web` all report the same commit tag.
6. Confirm no service was rolled back by the hosting provider's health check.
7. Confirm the worker process is consuming queues (no backlog growth) and that the seven MVP job types (FR-213) are registered.

### 7. Smoke and health verification

| # | Command | Expected |
|---|---|---|
| 1 | `API_BASE_URL=https://api.<production-domain>/v1 WEB_BASE_URL=https://app.<production-domain> pnpm deploy:smoke` | All smoke assertions pass |
| 2 | `curl -sS https://api.<production-domain>/v1/health` | `200` |
| 3 | `curl -sS https://api.<production-domain>/v1/health/live` | `200` |
| 4 | `curl -sS https://api.<production-domain>/v1/health/ready` | `{"status":"ok"}` with `db`, `redis` and storage checks `ok` |
| 5 | `curl -sS https://api.<production-domain>/v1/version` | New commit SHA and `"environment":"production"` |
| 6 | `curl -sS -H "Authorization: Bearer $METRICS_TOKEN" https://api.<production-domain>/v1/metrics` | Prometheus text output; `401` without the token |
| 7 | Load `https://app.<production-domain>` on a phone and a desktop browser | Responsive layout renders; PWA install prompt available over HTTPS (NFR-009) |
| 8 | Confirm the web app calls the API only through `CORS_ORIGINS`-allowed origins | No CORS error in the browser console |

Readiness must never report `ok` while PostgreSQL is unreachable; the load balancer routes traffic only to instances returning `200` (NFR-003).

### 8. Manual critical-flow verification

Execute one manual pass per row against production with a real tenant. Each row is a go/no-go check, not a formality.

| # | Flow | Steps | Expected result | FR |
|---|---|---|---|---|
| 1 | Sign-up and verification | Register a test account, receive the phone code, verify | Account moves `PENDING_VERIFICATION → ACTIVE`; no business data visible before verification | FR-004, FR-007 |
| 2 | Business registration | Register a business with type `retail` | Tenant, owner Business Admin role assignment and unique slug created in one transaction | FR-021, FR-022, FR-023 |
| 3 | MFA for admin | Sign in as Business Admin | MFA challenge required; recovery codes shown exactly once | FR-009, FR-010 |
| 4 | Branch and user | Create a branch, invite a Cashier scoped to it | Invitation token issued; Cashier sees only that branch | FR-035, FR-045, FR-042 |
| 5 | Catalogue | Create a product with a variant, SKU and barcode | SKU and barcode unique per tenant; prices stored as integer minor units | FR-067, FR-068, FR-072, FR-073 |
| 6 | POS sale | Scan the barcode, take payment, commit | Sale committed, receipt issued, one negative movement per line, no oversell | FR-074, FR-155, FR-162 |
| 7 | Idempotent replay | Re-submit the same sale with the same idempotency key | Original sale returned; no second movement | FR-164 |
| 8 | Negative-stock guard | Attempt a sale beyond available stock | HTTP 409 with a machine-readable reason; nothing written | FR-114 |
| 9 | Expired batch | Attempt to sell an expired batch | Excluded from sale and flagged for write-off | FR-132 |
| 10 | Stock adjustment | Apply an adjustment without a reason, then with one | Rejected without a reason; accepted with one, writing exactly one movement and one audit entry | FR-109, FR-111 |
| 11 | Purchase order | Create a PO, submit, confirm, receive goods with batch and expiry | `DRAFT → SUBMITTED → CONFIRMED → PARTIALLY_RECEIVED`/`RECEIVED`; positive movements written in one transaction | FR-140, FR-142, FR-147, FR-151 |
| 12 | Transfer | Request, approve, dispatch, receive with a shortfall note | Movements at origin on dispatch and at destination on receipt; discrepancy stored | FR-116, FR-120, FR-122, FR-123 |
| 13 | Payment | Initiate an MTN MoMo and an Airtel Money collection | Callback verified, payment reaches `SUCCEEDED`, sale linked | FR-179, FR-181, FR-185 |
| 14 | Callback rejection | Send a callback with a bad signature | Rejected, `webhook_signature_failure_total` increments, no state change | FR-185 |
| 15 | Refund | Refund a completed sale | Refund recorded, stock restored by movement, audit entry written | FR-178 |
| 16 | Day closure | Count cash, record a discrepancy, close the day | Closure recorded with expected, counted, discrepancy and reason | FR-204, FR-205 |
| 17 | Tenant isolation | As tenant A, request a tenant B resource by id | HTTP 403 or 404; no cross-tenant data returned | FR-028, FR-042 |
| 18 | Permission denial | Call a permission-gated endpoint without the permission | HTTP 403; denial audited | FR-054, FR-112 |
| 19 | Audit trail | Open the audit log for the actions above | Entries present with actor, action, target, timestamp and context; no edit or delete path exists | FR-091, FR-092, FR-093 |
| 20 | Import | Import a CSV with one bad row | Valid rows applied, bad row reported with its row number and reason | FR-207–FR-209 |

### 9. Observability and alerting readiness

| Check | Expected |
|---|---|
| Log drain attached to `apps/api`, `apps/worker` and `apps/web` | Structured JSON lines on stdout, retained 14 days |
| Log line shape | `timestamp`, `level`, `service`, `environment`, `release`, `event`, `message`, plus request fields when in a request (NFR-007) |
| Redaction | No password, token, verification code, MFA secret, full MSISDN, callback secret, signed URL, `METRICS_TOKEN` or `ERROR_MONITORING_DSN` appears in any log line |
| Error monitoring | `ERROR_MONITORING_DSN` set; a deliberate staging error produces an event tagged with `environment`, `release`, `service`, `route`, `errorCode`, `requestId` |
| Release tag | `release` equals the deployed commit SHA |
| Metrics scrape | `GET /v1/metrics` scraped every 30 seconds with `METRICS_TOKEN` |
| Critical alerts armed | PostgreSQL unreachable or readiness `503` > 2 min; 5xx > 5% over 5 min; backup job failed or stale; `webhook_signature_failure_total` > 5% over 15 min |
| Warning alerts armed | API p95 > 2 s for 10 min; `job_failed_total` > 10% for one job type |
| Monitor alerts armed | Login failure spike, MFA bypass attempts, unusual admin activity |
| Alert delivery channel | The chosen error-monitoring provider's alert rules and the hosting provider's alerting; email is out of scope |
| Dashboards available | API health, Auth and security, Sales and POS, plus the reconciliation gauges |
| Integrity gauges at zero | `stock_reconciliation_drift_total = 0`, `expired_batch_sellable_total = 0`, `payment_mismatch_open_total` reviewed and explained |

### 10. Compliance and data-protection readiness

| Check | Expected |
|---|---|
| Ugandan Data Protection and Privacy Act 2019 | Registration and processing documented; personal data minimised to what the flows require |
| Personal data | Users, customers and suppliers treated as sensitive; only internal ids appear in logs (NFR-014) |
| Financial and tax data | Revenue, expenses, balances, payment transactions, business registration and TIN restricted to the Business Admin role (FR-034) |
| Tenant isolation | Enforced server-side on every read and write; storage keys tenant-prefixed (FR-028, `users.multi_tenant`) |
| Audit retention | `audit_logs` retained for the life of the tenant record and included in every backup (FR-096) |
| Soft delete | Business records soft-deleted via `deleted_at`; tokens hard-deleted (FR-031, FR-008) |
| Production data outside production | No production dump is restored outside production except into an access-restricted staging database destroyed at the end of the drill |
| Patient medical records | Out of scope for this release (`scope.deferred`) |

### 11. Watch window and go/no-go

Watch for 15 minutes after the deploy, then re-check at 24 hours and 7 days.

| Window | Watch | Action if breached |
|---|---|---|
| 0–15 min | 5xx rate, p95 latency, `job_failed_total`, `webhook_signature_failure_total`, readiness status, error-monitoring feed | Roll back per the Rollback section |
| 15–60 min | `sales_committed_total`, `sale_commit_conflicts_total`, `payment_success_total`, `payment_expired_total`, queue depth | Investigate before closing the window |
| 24 h | `stock_reconciliation_drift_total`, `payment_mismatch_open_total`, `backup_age_hours`, login failure rate | Fix forward; record as a follow-up |
| 7 d | Availability against the 99.5% monthly target, p95 against NFR-001, audit log growth, storage usage | Record in the evidence table |

Do not proceed to production if any of the following is true:

1. Staging E2E scenarios A–G did not pass on the release commit.
2. `pnpm ops:validate` fails, or any production secret is still a placeholder.
3. `SMS_PROVIDER_API_KEY` is unset or invalid — no account can be verified.
4. `MTN_MOMO_CALLBACK_SECRET` or `AIRTEL_MONEY_CALLBACK_SECRET` is missing or does not match the provider console.
5. `METRICS_TOKEN` or `ERROR_MONITORING_DSN` is unset.
6. The newest backup is older than `BACKUP_EXPECTED_MAX_AGE_HOURS` (24) or the provider snapshot is missing.
7. A pending migration's SQL has not been read, or it is not backward compatible with the previous release.
8. No known-good previous image tag has been identified for rollback.
9. The restore drill has never been executed on staging.

Record any skipped gate with the command, the reason, and whether the issue is pre-existing.

### 12. Evidence record

Capture every row before declaring the release live.

| Evidence | Where captured | Value to record |
|---|---|---|
| Release commit tag | Git | SHA and tag |
| Deployed image tags | Hosting provider console | `apps/api`, `apps/worker`, `apps/web` tags |
| Migration names applied | `pnpm deploy:migrate` output | Ordered list |
| Quality gate results | CI run URL | Pass/fail per gate |
| E2E result | CI run URL | Scenarios A–G pass |
| Staging smoke result | CI run URL | Pass |
| Production smoke result | `pnpm deploy:smoke` output | Pass |
| Readiness payload | `GET /v1/health/ready` | JSON body |
| Version payload | `GET /v1/version` | JSON body |
| Backup confirmation | Provider console and `pnpm backup:status` | Snapshot id, artifact age |
| Restore drill date and duration | Drill notes | Date, minutes |
| Alert rules armed | Error-monitoring provider | List of rules |
| Manual verification results | Step 8 table | Pass/fail per row |
| Operator and window | Release notes | Name, start, end |
| Follow-ups | Issue tracker | Items found during validation |

## Rollback

### 1. Classify the failure first

| Class | Symptoms | Default action |
|---|---|---|
| Application-only regression | Wrong behaviour, 5xx, broken UI, schema unchanged | Redeploy the previous image tags |
| Schema or data incident | Bad data written, migration applied and code wrong | Prefer a forward fix; restore only with explicit approval |
| Migration failure | Migration did not apply cleanly or partially applied | Stop writes, preserve evidence, fix the migration on staging first |
| Configuration error | Service starts but misbehaves; missing or wrong variable | Fix the variable and restart `apps/api` and `apps/worker` |
| Provider or callback incident | Callbacks rejected, payments stuck `PENDING` | Verify secrets and provider configuration; never edit payment rows |
| Infrastructure | PostgreSQL or Redis unreachable, readiness `503` | Follow the hosting provider's incident path, then verify readiness |

### 2. Rollback decision table

| Failure | Action | Command or click | Target time | Data loss |
|---|---|---|---|---|
| Application regression, schema unchanged | Redeploy the previous successful deploy of all three services from the same release family | Render: Deploys → previous successful deploy → Rollback. Railway: Deployments → previous deployment → Redeploy | < 5 min | None |
| Application regression after a migration that is backward compatible | Redeploy the previous image tags; the previous code still runs against the new schema (expand → migrate → contract) | Same as above | < 5 min | None |
| Application regression where the previous code cannot run against the new schema | Forward fix in a new deployment | New commit, full checklist from step 4 | < 60 min | None |
| Configuration error | Correct the variable in the provider secret store, then restart `apps/api` and `apps/worker` | Provider console; verify `GET /v1/health/ready` | < 10 min | None |
| Migration failure | Abort the rollout, keep the previous app version running, fix the migration on staging, re-run | `pnpm deploy:migrate` on staging, then production | < 60 min | None if aborted before the app rollout |
| Bad data written by a release | Stop the affected write path, preserve audit and payment evidence, correct with a compensating action | See sections 4 and 7 | < 60 min | None if corrected by compensating records |
| Database corruption or unrecoverable data loss | Restore from backup after explicit approval | Section 8 | < 60 min (Assumption) | Everything written after the backup point |

### 3. Application-only regression

1. Identify the last known-good image tags for `apps/api`, `apps/worker` and `apps/web` from the same release family.
2. Redeploy all three from those tags — never mix tags across services.
3. Confirm the worker restarts and resumes consuming queues.
4. Run `API_BASE_URL=https://api.<production-domain>/v1 WEB_BASE_URL=https://app.<production-domain> pnpm deploy:smoke`.
5. Confirm `GET /v1/health/ready` returns `{"status":"ok"}` and `GET /v1/version` reports the rolled-back commit.
6. Watch the 5xx rate and the error-monitoring feed for 10 minutes before closing the incident.

### 4. Schema or data incident

1. Stop new writes to the affected path if the incident is still writing bad data.
2. Preserve evidence before mitigation: application logs for the affected `requestId`, `audit_logs` rows, payment references, provider callback payloads, and the current backup/PITR state.
3. Prefer a forward fix. Rolling back a schema migration with live data is dangerous.
4. Never edit or delete a `stock_movements` row through any endpoint, UI or manual SQL statement (FR-106). Correct stock with a compensating adjustment carrying a non-empty reason, which writes exactly one movement and one audit entry (FR-109, FR-111).
5. Never edit a payment row. Record a `PAYMENT_MANUAL_CORRECTION` audit entry instead (FR-192).
6. Never edit or delete an `audit_logs` row; the table is append-only and the application role holds `INSERT` and `SELECT` only (FR-093).
7. Re-run the reconciliation checks in section 9 before closing the incident.

### 5. Migration failure

1. If the migration failed before the application rollout, the previous app version is still serving; keep it running.
2. Do not run a partial migration by hand in production.
3. Reproduce the failure on staging against a restored copy of the production schema.
4. Fix the migration, re-run `pnpm deploy:migrate` on staging, then re-run the full checklist from step 4.
5. If a migration partially applied and left the schema inconsistent, stop writes, preserve evidence, and forward-fix with a new migration that completes the intended end state.
6. Never edit a migration file that has already been applied.

### 6. Configuration error

1. Identify the variable from the `ops.config.invalid` log event, which names the variable and never its value.
2. Correct the value in the hosting provider's secret store.
3. Restart `apps/api` and `apps/worker` so no process holds a retired value.
4. Verify `GET /v1/health/ready` and `GET /v1/version`.
5. If a secret is suspected of compromise, rotate the full rotation set — `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, `MTN_MOMO_CALLBACK_SECRET`, `AIRTEL_MONEY_CALLBACK_SECRET`, `STORAGE_ACCESS_KEY_ID`, `STORAGE_SECRET_ACCESS_KEY`, `SMS_PROVIDER_API_KEY`, `WHATSAPP_PROVIDER_TOKEN`, `ERROR_MONITORING_DSN`, `METRICS_TOKEN` — then restart both services. Rotating `JWT_ACCESS_SECRET` and `JWT_REFRESH_SECRET` invalidates all sessions; announce this before doing it.

### 7. Payment and provider callback incidents

| Symptom | Action |
|---|---|
| `webhook_signature_failure_total` spiking | Verify `MTN_MOMO_CALLBACK_SECRET` and `AIRTEL_MONEY_CALLBACK_SECRET` against the provider consoles; confirm the registered callback URLs point at production; restart `apps/api` after correcting |
| Payments stuck `PENDING` | Check that the `payment.expire` job is running and that `PAYMENT_PENDING_TTL_MINUTES=15` is set (FR-187); inspect the `jobs` row error detail for the job id |
| Duplicate callbacks | Expected and safe: a repeated provider event id is rejected and counted in `webhook_duplicate_total` (FR-185) |
| Payment succeeded after refund or cancellation | Recorded as orphaned and counted in `payment_orphaned_total`; resolve with a `PAYMENT_MANUAL_CORRECTION` audit entry, never by editing the payment (FR-186, FR-192) |
| Provider outage | Do not disable payment verification; keep callbacks verified and let payments expire, then reconcile |

### 8. Database restore procedure

Restore is the last resort. It requires explicit approval from the operator and a rehearsed path.

1. Confirm the incident cannot be resolved by a forward fix or a compensating record.
2. Announce the restore and the expected data-loss window (everything written after the backup point).
3. Stop `apps/api` and `apps/worker` so no writes occur during the restore.
4. Run `CONFIRM_RESTORE=yes DATABASE_URL=<production-url> BACKUP_DIR=backups scripts/deploy/restore-postgres.sh`.
5. Re-run `DATABASE_URL=... pnpm deploy:migrate` so the restored schema matches the deployed code.
6. Restart `apps/api` and `apps/worker`.
7. Run `API_BASE_URL=https://api.<production-domain>/v1 WEB_BASE_URL=https://app.<production-domain> pnpm deploy:smoke`.
8. Verify `GET /v1/health/ready` and `GET /v1/version`.
9. Confirm a `RESTORE_EXECUTED` audit entry exists.
10. Reconcile the data-loss window: identify sales, receipts, transfers and payments created after the backup point and re-enter them through the normal flows so the stock ledger and financial records stay deterministic from events.
11. Rotate the full secret rotation set if the restore was caused by a compromise.

### 9. Post-rollback verification

| Check | Command or surface | Pass condition |
|---|---|---|
| Readiness | `GET /v1/health/ready` | `{"status":"ok"}` with all dependency checks `ok` |
| Version | `GET /v1/version` | Reports the intended commit and `environment: "production"` |
| Smoke | `pnpm deploy:smoke` | Pass |
| Stock reconciliation | `stock_reconciliation_drift_total` and the stock report assertion | `0`; closing balance equals the sum of movements (FR-102, FR-199) |
| Expired batches | `expired_batch_sellable_total` | `0` (FR-132) |
| Payment reconciliation | `payment_mismatch_open_total` | Reviewed and explained (FR-191) |
| Jobs | `job_failed_total`, queue depth, `jobs` table error detail | No unexplained failures; backlog draining |
| Audit | `audit_logs` for the incident window | Entries present and append-only; no gaps |
| Error monitoring | Provider feed | No new error type after the rollback |
| Backups | `pnpm backup:status` | Fresh artifact younger than 24 hours |

### 10. Communication and freeze

1. Announce the rollback, the affected flows and the expected recovery time.
2. Freeze deploys until the post-rollback verification table is fully green.
3. Record the incident: class, trigger, detection source, action taken, data-loss window, verification result, follow-up items.
4. If the rollback was caused by a release, do not re-deploy that commit; fix forward on a new commit and re-run the Go-Live Checklist from step 4.