# Observability, Logging and Monitoring

**Product:** SokoOS — interconnected business operating platform for B2B commerce, inventory management and business operations
**Release covered:** MVP = Phase 1 Foundation (FR-001–FR-060, FR-081–FR-100) + Phase 2 Business operations (FR-101–FR-216)
**Document status:** Build-ready. Requirement IDs (FR-001–FR-216, NFR-001–NFR-015) are reused from `docs/03-cleaned-srs.md` and are not renumbered. Every value below is either confirmed by the decision ledger, carried from `docs/17-devops-deployment-and-operations.md`, or recorded as an explicit assumption in the row or note that introduces it.

Runtime shape: three processes from one pnpm-workspace monorepo — `apps/web` (Next.js), `apps/api` (NestJS), `apps/worker` (BullMQ) — against managed PostgreSQL, managed Redis and S3-compatible object storage. Observability has four surfaces: structured JSON logs on stdout (NFR-007), the append-only `audit_logs` table in PostgreSQL (FR-092, FR-093), Prometheus metrics at `GET /v1/metrics` (NFR-013), and error monitoring through the chosen provider's SDK configured by `ERROR_MONITORING_DSN` (NFR-007). Email is out of scope (`integrations.email` deferred), so no alert or report is delivered by email.

## Logging

### Log format

Every log line is one JSON object on stdout — never plain text, never multi-line. `apps/api`, `apps/worker` and `apps/web` server-side code all emit the same shape.

| Field | Type | Required | Source | Notes |
|---|---|---|---|---|
| `timestamp` | string | yes | logger | ISO-8601 UTC, millisecond precision |
| `level` | string | yes | logger | `debug` \| `info` \| `warn` \| `error` |
| `service` | string | yes | process | `api` \| `worker` \| `web` |
| `environment` | string | yes | `NODE_ENV` | `development` \| `staging` \| `production` |
| `release` | string | yes | build | Commit SHA of the running artifact |
| `event` | string | yes | call site | Stable machine name, e.g. `sale.committed`, `payment.callback.rejected` |
| `message` | string | yes | call site | Human-readable, no interpolated secrets |
| `requestId` | string | when in a request | API edge | UUID v4; also returned as the `X-Request-Id` response header and inside error bodies (NFR-011) |
| `route` | string | when in a request | router | Templated route, e.g. `POST /v1/sales` — never the raw path with ids |
| `method` | string | when in a request | router | HTTP method |
| `statusCode` | number | when in a request | interceptor | HTTP response status |
| `latencyMs` | number | when in a request | interceptor | Server-side handling time |
| `tenantId` | string | when known | auth context | Internal id only |
| `userId` | string | when authenticated | auth context | Internal id only, never email or phone |
| `branchId` | string | when branch-scoped | auth context | Internal id only |
| `resourceType` | string | when applicable | call site | e.g. `sale`, `purchase_order`, `transfer` |
| `resourceId` | string | when applicable | call site | Internal id only |
| `jobId` | string | worker only | BullMQ | Matches the `jobs` row (FR-214) |
| `jobType` | string | worker only | BullMQ | One of the seven MVP job types (FR-213) |
| `attempt` | number | worker only | BullMQ | 1-based; bounded by `JOB_MAX_ATTEMPTS` (FR-216) |
| `errorCode` | string | on failure | error mapper | Machine-readable code from the `{ error: { code, message, details, requestId } }` shape (NFR-011) |
| `durationMs` | number | on completion | call site | Job or operation duration |

Example request line:

```json
{"timestamp":"2026-03-04T09:14:22.481Z","level":"info","service":"api","environment":"production","release":"a1b2c3d","event":"http.request.completed","message":"sale committed","requestId":"6f1c0b7e-2f4a-4a1e-9d3c-0f9b2c7a5e11","route":"POST /v1/sales","method":"POST","statusCode":201,"latencyMs":184,"tenantId":"t_8f21","userId":"u_4471","branchId":"b_02","resourceType":"sale","resourceId":"s_99120"}
```

### Levels

| Level | Use | Examples | Enabled when |
|---|---|---|---|
| `debug` | Development diagnosis only | Query timings, cache hits, feature-flag evaluation | `LOG_LEVEL=debug` (local) |
| `info` | Normal lifecycle of a request, job or state transition | `http.request.completed`, `sale.committed`, `payment.state.changed`, `job.succeeded` | `LOG_LEVEL=info` and above |
| `warn` | Recoverable or expected-rejection conditions | `sale.commit.conflict`, `stock.negative.rejected`, `payment.callback.duplicate`, `job.retry.scheduled` | `LOG_LEVEL=warn` and above |
| `error` | Unhandled failure, 5xx, or a job that exhausted `JOB_MAX_ATTEMPTS` | `http.request.failed`, `job.failed`, `storage.signed_url.failed` | always |

`LOG_LEVEL=info` in staging and production. A `warn` or `error` line is never used for a condition the caller is expected to handle by design (for example a rejected oversell returns HTTP 409 and logs `warn`, not `error`).

### Correlation

| Hop | Mechanism |
|---|---|
| Browser → API | The API edge generates `requestId` (UUID v4) when the `X-Request-Id` header is absent and echoes it on the response (Assumption: header name `X-Request-Id`) |
| API → worker | The enqueued job payload carries `requestId`; the worker logs it on every line for that job (FR-213) |
| API → audit log | `audit_logs.request_id` stores the same value (FR-097) |
| API → error monitoring | `requestId`, `tenantId`, `userId`, `route`, `environment` and `release` are attached as tags/context (NFR-007) |
| Support → evidence | A user-reported error body contains `requestId`; that single value retrieves the request log line, the error-monitoring event and the audit entries (NFR-011) |

### Redaction list — never logged, never sent to error monitoring

| Category | Never log | Log instead |
|---|---|---|
| Credentials | Passwords, `password_hash`, password reset tokens | `userId`, `event` |
| Sessions | Access tokens, refresh tokens, session ids, invitation tokens | `userId`, `sessionId` prefix of 8 characters (Assumption) |
| Verification | Phone verification codes, verification attempt counters per code | `userId`, `attempt` count |
| MFA | TOTP secrets, MFA recovery codes, TOTP codes | `userId`, `event: auth.mfa.challenge` |
| Payments | Full mobile money MSISDN, provider callback secrets, provider API keys | MSISDN masked to the last three digits, `provider`, `paymentId` |
| Card data | Not applicable — no card processing and no card storage exist in scope (`integrations.payments`) | — |
| Storage | Signed URLs, private object keys, `STORAGE_SECRET_ACCESS_KEY` | `resourceType`, `resourceId`, `tenantId` |
| Business identity | Full TIN, business registration number, tax identifiers (`data.sensitivity`) | `tenantId` |
| Personal data | Customer, supplier and user names, emails, addresses, national ids | Internal ids only (NFR-014) |
| Operations | `METRICS_TOKEN`, `ERROR_MONITORING_DSN`, `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET` | `event: ops.config.invalid` with the variable name only |
| Medical | Not applicable — patient medical records are explicitly out of scope (`scope.deferred`) | — |

Rule: log identifiers and event names, never the sensitive value. If a field is not on the allowlist above, it does not go into a log line. Stack traces are written to error monitoring only and never into an API response body (NFR-011).

### Destinations and retention

| Sink | Content | Destination | Retention |
|---|---|---|---|
| Application logs | All JSON lines from `api`, `worker`, `web` | stdout, captured by the hosting provider's log drain | 14 days (Assumption: aligned with `BACKUP_RETENTION_DAYS`) |
| Error monitoring | 5xx, uncaught exceptions, unhandled rejections, failed jobs | The chosen error-monitoring provider via `ERROR_MONITORING_DSN` | Provider default, minimum 30 days (Assumption) |
| `audit_logs` | Immutable critical-action records (FR-092) | PostgreSQL, included in every backup | Life of the tenant record (FR-096) |
| `jobs` | Job status, attempt count and error detail (FR-214) | PostgreSQL | Life of the tenant record (Assumption: same rule as audit) |
| CI logs | Pipeline output for every PR and deploy | CI provider | 90 days (Assumption) |

### Audit logging

Every critical action writes exactly one append-only `audit_logs` row (FR-095). The table has no update or delete path in the API (FR-093); the application database role is granted `INSERT` and `SELECT` only on `audit_logs` (Assumption).

| Column | Type | Notes |
|---|---|---|
| `id` | uuid | Primary key |
| `tenant_id` | uuid | Tenant scope; null only for pre-tenant auth events |
| `branch_id` | uuid | Null when the action is not branch-scoped |
| `actor_id` | uuid | Null for `actor_type = system` |
| `actor_type` | enum | `user` \| `system` \| `webhook` |
| `action` | string | Uppercase code from the table below |
| `resource_type` | string | e.g. `sale`, `stock_movement`, `purchase_order` |
| `resource_id` | uuid | Target record |
| `ip_address` | inet | From the request context (FR-097) |
| `user_agent` | string | From the request context (FR-097) |
| `request_id` | uuid | Correlates with logs and error monitoring (FR-097) |
| `metadata` | jsonb | Safe JSON only: before/after values, reason text, quantities, state transitions |
| `created_at` | timestamptz | UTC |

Audited actions:

| Action code | Trigger | FR |
|---|---|---|
| `AUTH_SIGN_IN` | Successful sign-in | FR-100 |
| `AUTH_SIGN_IN_FAILED` | Failed sign-in attempt | FR-100 |
| `AUTH_LOCKOUT` | Email locked after `LOGIN_MAX_ATTEMPTS` | FR-018, FR-020 |
| `AUTH_RATE_LIMITED` | Rate limit hit on an auth endpoint | FR-020 |
| `AUTH_MFA_CHALLENGE` | MFA challenge presented and its outcome | FR-100 |
| `AUTH_MFA_ENABLED` / `AUTH_MFA_DISABLED` | MFA enrolment change | FR-012 |
| `AUTH_RECOVERY_CODE_USED` | Single-use recovery code consumed | FR-017 |
| `AUTH_PASSWORD_RESET` | Password reset completed; all sessions invalidated | FR-014, FR-100 |
| `BUSINESS_PROFILE_UPDATED` | Legal name, TIN, registration number, address, phone or currency changed; `metadata` holds before and after | FR-026 |
| `BRANCH_CREATED` / `BRANCH_UPDATED` / `BRANCH_DEACTIVATED` | Branch lifecycle | FR-044 |
| `BRANCH_USER_ASSIGNED` | User assigned to or removed from a branch | FR-044 |
| `USER_INVITED` | Invitation issued | FR-045 |
| `USER_ROLE_CHANGED` | Role assignment replaced; actor and target recorded | FR-050 |
| `USER_DEACTIVATED` / `USER_REACTIVATED` | User status change with session revocation | FR-058 |
| `CATALOGUE_PRICE_CHANGED` | Cost or selling price changed; before and after in `metadata` | FR-080 |
| `STOCK_ADJUSTMENT_CREATED` | Adjustment applied; reason required and stored | FR-109, FR-111 |
| `SALE_COMPLETED` | Sale committed | FR-178 |
| `SALE_DISCOUNT_ABOVE_THRESHOLD` | Line discount above the configured threshold | FR-161, FR-178 |
| `REFUND_CREATED` | Full or partial refund recorded | FR-178 |
| `PAYMENT_STATE_CHANGED` | Every payment state transition | FR-194 |
| `PAYMENT_MANUAL_CORRECTION` | Audited adjustment record instead of editing a payment | FR-192 |
| `PURCHASE_ORDER_SUBMITTED` | `DRAFT → SUBMITTED` | FR-154 |
| `PURCHASE_ORDER_CONFIRMED` | `SUBMITTED → CONFIRMED` with actor and timestamp | FR-143, FR-154 |
| `GOODS_RECEIPT_CREATED` | Receipt applied, including over-receipt confirmation | FR-148, FR-154 |
| `PURCHASE_ORDER_CANCELLED` | Cancellation | FR-144, FR-154 |
| `PURCHASE_ORDER_CLOSED` | Closure, including shortfall reason | FR-152, FR-154 |
| `TRANSFER_REQUESTED` / `TRANSFER_APPROVED` / `TRANSFER_REJECTED` | Transfer request and approval decisions | FR-116, FR-118 |
| `TRANSFER_DISPATCHED` / `TRANSFER_RECEIVED` / `TRANSFER_CLOSED` | Dispatch, receipt with discrepancy, closure | FR-120, FR-123, FR-124 |
| `DAY_CLOSED` | Day closure with expected cash, counted cash, discrepancy and reason | FR-204, FR-205 |
| `ATTACHMENT_DOWNLOADED` | Signed URL issued for an attachment | FR-212 |
| `NOTIFICATION_READ` | Notification marked read | FR-086 |
| `IMPORT_APPLIED` | Import job applied rows; error report retained | FR-209 |
| `RESTORE_EXECUTED` | Database restore performed | `docs/17` restore procedure |

Audit query surface: search by actor, action, target type, target id and date range (FR-091); filter by branch (FR-098); paginated (FR-099); a Branch Manager sees only branch-scoped entries (FR-094).

### Error monitoring

| Aspect | Rule |
|---|---|
| SDK | The chosen error-monitoring provider, initialised only when `ERROR_MONITORING_DSN` is set; absent DSN disables reporting without breaking the process |
| Captured | All 5xx responses, uncaught exceptions, unhandled promise rejections, failed BullMQ jobs after `JOB_MAX_ATTEMPTS`, storage signed-URL failures, provider callback verification failures |
| Not captured | 4xx responses that are expected outcomes (409 oversell, 409 duplicate day closure, 403 permission denial, 401 unauthenticated) — these are logged at `warn` |
| Tags | `environment`, `release`, `service`, `route`, `errorCode`, `requestId`, `tenantId`, `userId` |
| Scrubbing | The redaction list above is applied before send; request bodies, headers and cookies are not attached |
| Sampling | 100% of errors; 10% of performance traces (Assumption) |
| Release tracking | `release` is the commit SHA so a new error type can be attributed to a release |

### Log-based triage

| Symptom | First query |
|---|---|
| A user reports a failed action | Search `requestId` from the error body across logs, error monitoring and `audit_logs` |
| Sale rejected as oversold | `event = "sale.commit.conflict"` filtered by `branchId` and `resourceId` |
| Payment stuck pending | `event = "payment.state.changed"` filtered by `resourceId`, then check `payment.expired` job runs (FR-187) |
| Duplicate callback suspected | `event = "payment.callback.duplicate"` filtered by provider event id (FR-185) |
| Job not completing | `jobId` across worker logs and the `jobs` row error detail (FR-214) |
| Stock figure disputed | `stock_movement_total` by type for the branch, then the movement list filtered by product and date range (FR-105, FR-107) |

## Metrics

### Exposure

| Property | Value |
|---|---|
| Endpoint | `GET /v1/metrics` (NFR-013) |
| Format | Prometheus text exposition format |
| Auth | `Authorization: Bearer $METRICS_TOKEN`; `401` without it |
| Public access | None — the route is not exposed through the web app and is not CORS-enabled |
| Scrape interval | 30 seconds (Assumption) |
| Cardinality rule | Labels never include `tenantId`, `userId`, `branchId`, `resourceId` or any free-text value; `route` is the templated route, not the raw path |

### HTTP metrics

| Metric | Type | Labels | Source |
|---|---|---|---|
| `http_requests_total` | counter | `method`, `route`, `status_code` | API interceptor |
| `http_request_duration_ms` | histogram | `method`, `route` | API interceptor; buckets 25, 50, 100, 250, 500, 1000, 2000, 5000 (Assumption) |
| `http_requests_in_flight` | gauge | `service` | API interceptor (Assumption) |

`http_request_duration_ms` is the source for the p95 read and write targets in NFR-001 (p95 < 500 ms reads, p95 < 1 s writes at 50 concurrent users).

### Business counters

| Metric | Type | Labels | Meaning | FR |
|---|---|---|---|---|
| `auth_login_attempts_total` | counter | — | Sign-in attempts | FR-015 |
| `auth_login_failures_total` | counter | — | Failed sign-ins | FR-018 |
| `auth_lockouts_total` | counter | — | Lockouts applied | FR-018 |
| `sales_committed_total` | counter | — | Sales committed | FR-162 |
| `sale_commit_conflicts_total` | counter | — | Commits rejected for unavailable stock | FR-163 |
| `sale_idempotent_replays_total` | counter | — | Repeated idempotency keys returning the original sale | FR-164 |
| `payment_initiation_total` | counter | `provider` | Mobile money initiations (`mtn_momo`, `airtel_money`) | FR-179 |
| `payment_success_total` | counter | — | Payments reaching `SUCCEEDED` | FR-181 |
| `payment_failure_total` | counter | — | Payments reaching `FAILED` | FR-181 |
| `payment_expired_total` | counter | — | Payments expired by the background job | FR-187 |
| `payment_orphaned_total` | counter | — | Successes recorded after refund or cancellation | FR-186 |
| `webhook_received_total` | counter | `provider` | Callbacks received | FR-185 |
| `webhook_duplicate_total` | counter | — | Repeated provider event ids rejected | FR-185 |
| `webhook_signature_failure_total` | counter | — | Callbacks failing signature or reference verification | FR-185 |
| `stock_movement_total` | counter | `type` | Movements written, by movement type | FR-105 |
| `stock_adjustment_total` | counter | — | Adjustments applied | FR-111 |
| `stock_negative_rejection_total` | counter | — | Commits rejected because negative stock is disabled | FR-114 |
| `goods_receipt_total` | counter | — | Goods receipts applied | FR-147 |
| `transfer_dispatch_total` | counter | — | Transfers dispatched | FR-120 |
| `transfer_receive_total` | counter | — | Transfers received | FR-122 |
| `lowstock_notification_total` | counter | — | Low-stock notifications created | FR-127, FR-128 |
| `import_job_total` | counter | `status` | Import jobs by terminal status | FR-207, FR-214 |
| `export_job_total` | counter | `status` | Export jobs by terminal status | FR-215 |
| `job_failed_total` | counter | `type` | Jobs that exhausted `JOB_MAX_ATTEMPTS` | FR-216 |
| `notification_dispatch_total` | counter | `channel` | Notifications dispatched by channel (`in_app`, `whatsapp`) | FR-088, FR-089 |

### Job and queue metrics

| Metric | Type | Labels | Meaning | FR |
|---|---|---|---|---|
| `job_queue_depth` | gauge | `queue` | Waiting jobs per queue (Assumption) | FR-213 |
| `job_oldest_waiting_seconds` | gauge | `queue` | Age of the oldest waiting job (Assumption) | FR-213 |
| `job_duration_ms` | histogram | `type` | Job execution time (Assumption) | FR-213 |
| `job_attempts_total` | counter | `type`, `outcome` | Attempts by outcome `succeeded` \| `retried` \| `failed` (Assumption) | FR-216 |

### Reconciliation and integrity gauges

| Metric | Type | Meaning | FR |
|---|---|---|---|
| `stock_reconciliation_drift_total` | gauge | Product/variant/branch combinations where the closing balance differs from the sum of movements; must be `0` | FR-102, FR-199 |
| `payment_mismatch_open_total` | gauge | Payments without a completed sale plus sales without a successful payment | FR-191 |
| `backup_age_hours` | gauge | Age of the newest backup artifact reported by `pnpm backup:status` | NFR-004 |
| `expired_batch_sellable_total` | gauge | Expired batches still counted as sellable; must be `0` | FR-132 |

### Health and version endpoints

| Endpoint | Purpose | Checks | Failure response |
|---|---|---|---|
| `GET /v1/health` | Liveness | Process is up | `503` |
| `GET /v1/health/live` | Liveness probe | Same as `/v1/health` | `503` |
| `GET /v1/health/ready` | Readiness | `SELECT 1` on PostgreSQL, `PING` on Redis, `HEAD` on `STORAGE_BUCKET` | `503` with `{"status":"degraded","checks":{...}}` |
| `GET /v1/version` | Release metadata | None | `{"version":"1.0.0","commit":"<sha>","environment":"production","builtAt":"<ISO-8601>"}` |
| `GET /v1/metrics` | Prometheus text metrics | `Authorization: Bearer $METRICS_TOKEN` | `401` without the token |

Readiness never reports `ok` while PostgreSQL is unreachable, and the load balancer routes traffic only to instances returning `200` (NFR-003).

### Dashboards

| Dashboard | Panels | Audience | Refresh |
|---|---|---|---|
| API health | Request rate by route, 4xx/5xx ratio, p50/p95/p99 latency, readiness status, running commit | Operator | 1 min |
| Auth and security | Login attempts, login failures, lockouts, MFA challenge outcomes, recovery code use, rate-limit events | Operator | 5 min |
| Sales and POS | `sales_committed_total`, `sale_commit_conflicts_total`, `sale_idempotent_replays_total`, refunds, discounts above threshold | Operator, Business Admin (tenant-scoped view) | 5 min |
| Payments | Initiation, success, failure, expired and orphaned counts by provider; webhook received, duplicate and signature-failure counts; `payment_mismatch_open_total` | Operator | 1 min |
| Inventory | `stock_movement_total` by type, adjustments, negative-stock rejections, goods receipts, transfer dispatch and receipt, `stock_reconciliation_drift_total` | Operator, Inventory Clerk (tenant-scoped view) | 5 min |
| Jobs and queues | Queue depth, oldest waiting job age, job duration p95, `job_failed_total` by type, retry attempts | Operator | 1 min |
| Notifications | `notification_dispatch_total` by channel, `lowstock_notification_total`, WhatsApp failure ratio when `WHATSAPP_ENABLED=true` | Operator | 15 min |
| Data and backups | `backup_age_hours`, last restore-drill date, storage upload and signed-URL error counts | Operator | 1 hour |
| Errors | Issue count by release, new issues, top `errorCode` values, error rate by route | Operator | 1 min |

Tenant-scoped dashboards read from the reporting endpoints (FR-195–FR-203) and are subject to the same server-side tenant and branch scoping as every other read (FR-028, FR-042).

## Alerts

### Routing

| Aspect | Rule |
|---|---|
| Recipients | The operator (single developer per `timeline.target`); no on-call rotation exists in MVP |
| Delivery channels | The chosen error-monitoring provider's alert rules, the hosting provider's notification settings, and CI workflow failure notifications |
| Email | Out of scope — `integrations.email` is deferred, so no alert depends on email delivery |
| WhatsApp | Not an alerting channel; WhatsApp is a user notification channel only (FR-089) |
| Alert payload | `environment`, `release` commit, condition, threshold, current value, first-seen timestamp, and the dashboard name from the Dashboards table |
| Deduplication | One open alert per condition fingerprint; repeats suppressed for 30 minutes (Assumption) |
| Staging | Staging alerts route to the same recipient but are capped at Warning severity and tagged `environment=staging` (Assumption) |
| Deploy window | 5xx and latency alerts are suppressed for 15 minutes after a production deploy completes, while the post-deploy watch in `docs/17` runs (Assumption) |

### Severity

| Severity | Meaning | Response time |
|---|---|---|
| Critical | Live tenants cannot complete core flows, money or stock integrity is at risk, or recovery capability is lost | Page immediately; acknowledge within 15 minutes |
| Warning | Degradation that will become Critical if ignored | Triage within 1 hour |
| Monitor | Pattern to review for abuse, drift or capacity | Daily review |

### Critical alerts

| Condition | Threshold | First diagnostic step | Reference |
|---|---|---|---|
| PostgreSQL unreachable or `/v1/health/ready` returns `503` | More than 2 minutes | Check the provider's database status, then the readiness `checks` object | `docs/17` rollback table |
| 5xx rate | Above 5% over 5 minutes | Check the newest release in error monitoring; if the release is the cause, redeploy the previous tag | `docs/17` rollback table |
| Backup job failed or backup stale | `pnpm backup:status` exits non-zero, or `backup_age_hours` > `BACKUP_EXPECTED_MAX_AGE_HOURS` (24) | Take a manual provider snapshot immediately | `docs/17` Backups |
| Webhook signature failures | `webhook_signature_failure_total` above 5% over 15 minutes | Verify `MTN_MOMO_CALLBACK_SECRET` and `AIRTEL_MONEY_CALLBACK_SECRET` against the provider configuration | FR-185 |
| Worker process down or stalled | `job_queue_depth` rising with zero `job_attempts_total{outcome="succeeded"}` for 10 minutes | Redeploy `apps/worker`; inspect the `jobs` table | FR-213, FR-214 |
| Stock reconciliation drift | `stock_reconciliation_drift_total` > 0 | Run the stock report assertion and identify the product/variant/branch | FR-199 |
| Expired batch sellable | `expired_batch_sellable_total` > 0 | Identify the batch and write it off through an audited adjustment | FR-132 |

### Warning alerts

| Condition | Threshold | First diagnostic step | Reference |
|---|---|---|---|
| API latency | p95 above 2 s for 10 minutes | Inspect slow routes and the job backlog | NFR-001 |
| Job failures | `job_failed_total` above 10% for one job type | Read the error detail on the `jobs` row | FR-214, FR-216 |
| New error type | First seen in production | Triage the stack trace and the release tag | NFR-007 |
| Object storage errors | Any sustained upload or signed-URL failure | Verify `STORAGE_*` credentials and bucket reachability | FR-075, FR-212 |
| Readiness degraded | `degraded` for more than one scrape window without a `503` | Check which dependency is slow | NFR-003 |
| Payment mismatch list growing | `payment_mismatch_open_total` above zero for more than 24 hours | Run `payment.reconcile` and review the mismatch list | FR-191 |
| Sale commit conflicts | `sale_commit_conflicts_total` spike against the trailing 7-day baseline | Check branch stock levels and reorder levels | FR-163 |
| Import failures | `import_job_total{status="failed"}` above 10% of imports in a day | Read the retained row-level error report | FR-208, FR-209 |
| WhatsApp dispatch failures | `notification_dispatch_total{channel="whatsapp"}` failure ratio above 10% while `WHATSAPP_ENABLED=true` | Check the provider token and provider status | FR-089 |

### Monitor alerts (daily review)

| Condition | Why it matters | Reference |
|---|---|---|
| `auth_login_failures_total` or `auth_lockouts_total` spike | Possible credential stuffing | FR-018, FR-020 |
| MFA recovery code use | Each use is single-use and audited; repeated use indicates lost devices or abuse | FR-017 |
| `stock_negative_rejection_total` spike | Indicates stock records drifting from physical stock | FR-114 |
| Orphaned payments above zero | Money received without a matching sale | FR-186 |
| Role, permission or business profile changes outside business hours | Unusual admin activity | FR-050, FR-026 |
| `sale_idempotent_replays_total` spike | Client retry storms or a POS connectivity problem | FR-164 |
| Restore drill overdue | Quarterly drill required before launch and thereafter | NFR-004 |
| Audit log growth and query latency | Audit entries are retained for the life of the tenant | FR-096 |

### Alert-to-action mapping

| Alert | Immediate action | If unresolved |
|---|---|---|
| Readiness `503` | Confirm the failing dependency in the `checks` object | Follow the rollback table; restore from snapshot only if data is affected |
| 5xx spike after a deploy | Redeploy the previous release tag for the affected service | Forward-fix in a new release; migrations are backward compatible |
| Backup failure | Take a manual provider snapshot and record its identifier | Fix the backup job before the next production deploy; the release gate blocks without a fresh backup |
| Webhook signature failures | Verify callback secrets and provider configuration | Keep the webhook route serving so the provider retries; run `payment.reconcile` |
| Worker stalled | Redeploy `apps/worker` | Re-enqueue from the `jobs` table using the original idempotency keys |
| Stock drift | Identify the affected product/variant/branch | Correct with an audited adjustment carrying a reason; never edit a movement (FR-106, FR-109) |
| Payment mismatch | Run `payment.reconcile` and review the mismatch list | Record an audited manual correction; never edit a payment row (FR-192) |

### Alert configuration ownership

| Rule location | Rules it owns |
|---|---|
| Error-monitoring provider alert rules | New error type, error-rate spike, release regression, job failure exceptions |
| Hosting provider notification settings | Service crash, restart loop, database unreachable, disk or memory pressure |
| Metrics-based alert rules | 5xx rate, p95 latency, webhook signature failures, queue depth, reconciliation gauges |
| `.github/workflows/backup-verify.yml` | Daily backup staleness check and the backup alert |
| CI workflow failure notifications | Failed quality gates, failed staging deploy, failed production deploy |

Every alert in this document maps to a condition that is measurable from the metrics, health endpoints, logs or audit entries defined above; no alert depends on a signal that the system does not emit.