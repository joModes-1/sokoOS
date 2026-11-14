# Security Requirements and Threat Model

**Product:** SokoOS — interconnected business operating platform for B2B commerce, inventory management and business operations
**Release covered:** MVP = Phase 1 Foundation (FR-001–FR-060, FR-081–FR-100) + Phase 2 Business operations (FR-101–FR-216)
**Explicitly not covered:** Phase 3 supplier ecosystem/marketplace, Phase 4 finance, Phase 5 AI capabilities, Phase 6 expansion, dedicated React Native app, patient medical records, subscription billing, platform-operator UI, card processing, email channel.

This document is the security specification for SokoOS. It lists the assets that must be protected, the threats against them with impact, likelihood, mitigation and verification, and the controls that implement those mitigations. Requirement IDs FR-001–FR-216 and NFR-001–NFR-015 are reused from `docs/01-executive-summary.md`, `docs/02-product-requirements-document.md` and `docs/03-cleaned-srs.md`; business rules BR-001–BR-022 are referenced, not restated. Role, permission and enforcement-chain definitions are reused from `docs/12-authentication-authorization-and-permissions.md`. No requirement is renumbered here.

**Security posture in one paragraph.** SokoOS is a multi-tenant, server-authoritative system. Every business-owned row carries `tenant_id`; every protected endpoint declares exactly one permission and defaults to deny; every stock, money and state transition happens inside one database transaction; the stock movement ledger and the audit log are append-only; payment state changes only from a signature-verified provider callback or a server-side cash record; and authentication is built in-house with email + password, phone verification and TOTP MFA. There is no third-party identity provider, no card processing, no AI write path and no platform-operator UI in the MVP.

## Threats

### Sensitive assets

| Asset | Where it lives | Classification | Why it matters | Requirement refs |
|---|---|---|---|---|
| Passwords | `users.password_hash` (Argon2id, per-user salt) | Confidential | Account takeover if cracked | FR-002, FR-015 |
| MFA secrets and recovery codes | `users.mfa_secret`, `mfa_recovery_codes.code_hash` | Confidential | MFA bypass | FR-010, FR-017 |
| Refresh, verification, reset and invitation tokens | `refresh_tokens`, `verification_tokens`, `password_reset_tokens`, `invitations` (SHA-256 hashes only) | Confidential | Session or account takeover | FR-008, FR-014, FR-015, FR-046 |
| Session records | `sessions` (device, IP address, last-used timestamp) | Confidential / personal | Device and location inference | FR-016 |
| Personal data of users, customers and suppliers | `users`, `suppliers`, `sales` customer fields | Personal data (Uganda DPPA 2019) | Regulatory exposure | FR-133, NFR-014 |
| Business registration and tax information | `businesses` (legal name, TIN, registration number, address) | Confidential / regulated | Fraud, impersonation | FR-025, FR-034 |
| Financial records | `sales`, `sale_items`, `payments`, `refunds`, `receipts`, `day_closures` | Confidential / financial | Revenue loss, false books | FR-162, FR-169, FR-204 |
| Stock ledger | `stock_movements`, `inventory_balances`, `stock_batches` | Confidential / operational | Reconciliation failure, overselling | FR-102, FR-106 |
| Attachments and product images | Object storage, keys prefixed `tenants/{tenant_id}/…` | Confidential | Document and image exposure | FR-075, FR-211, FR-212 |
| Provider secrets | Environment variables (MTN MoMo, Airtel Money, SMS provider, WhatsApp, object storage, error monitoring) | Secret | Payment forgery, message spoofing, storage access | FR-185, NFR-007 |
| Audit log | `audit_logs` (append-only) | Confidential / accountability | Loss of non-repudiation | FR-092, FR-093, FR-096 |
| Backups | Managed PostgreSQL automated backups, 14-day retention | Confidential | Mass data breach if exposed | NFR-004 |

### Threat actors and attack surfaces

| Actor | Motivation | Primary surfaces |
|---|---|---|
| Unauthenticated internet attacker | Credential theft, data theft, disruption | `/v1/auth/*`, payment callbacks, signed-URL endpoints, login and search rate limits |
| Authenticated user of another tenant | Cross-tenant data access | Any `/v1/*` resource id, attachment ids, job ids, export links |
| Authenticated user with a narrow role | Privilege escalation, cross-branch access | `role_permissions`, branch-scoped queries, POS and stock endpoints |
| Malicious or careless insider (Business Admin, Branch Manager) | Financial manipulation, concealment | Stock adjustments, refunds, discounts, day closure, payment adjustments, catalogue prices |
| Fraudulent payer | Free goods | Mobile money callback endpoints, POS payment polling |
| Compromised dependency or build pipeline | Code execution, secret exfiltration | npm registry, CI/CD pipeline, Docker build stage |
| Shared-device bystander (shop floor) | Unauthorised sales under another identity | POS screen, PWA cache, browser session |

### Threat table

| ID | Threat | Impact | Likelihood | Mitigation | Verification | Refs |
|---|---|---|---|---|---|---|
| T-01 | Credential stuffing / password spraying | Account takeover | Medium | Argon2id hashing, password policy ≥10 chars with 3 character classes, lockout after 10 failures in 15 minutes, MFA required for admin roles, non-disclosing errors | Auth tests | FR-002, FR-009, FR-018, FR-019 |
| T-02 | Brute force of the phone verification code | Pre-verification account takeover | Medium | 6-digit code, 10-minute TTL, max 5 attempts per code, resend invalidates the previous code, per-phone and per-IP rate limits | Auth tests | FR-005, FR-006, FR-008 |
| T-03 | Password-reset user enumeration | Information disclosure | Medium | `POST /v1/auth/password/forgot` always returns 202, uniform response timing, single-use 30-minute token, all sessions revoked on success | Auth tests | FR-013, FR-014 |
| T-04 | MFA disabled on an admin role | Privilege escalation | Medium | MFA requirement evaluated per role; disable rejected with `409 MFA_REQUIRED_FOR_ROLE`; enable/disable audited | RBAC tests | FR-009, FR-011, FR-012, FR-059 |
| T-05 | MFA recovery-code theft or reuse | Account takeover | Medium | Codes stored only as hashes, single-use, use audited, 10 codes issued once at enrolment | Auth tests | FR-010, FR-017 |
| T-06 | Refresh-token theft or replay | Session hijack | Medium | Rotating refresh tokens, reuse of a rotated token revokes the session family, hashed at rest, revoked on password reset and user deactivation | Auth tests | FR-014, FR-015, FR-016, FR-056 |
| T-07 | Shared POS device left signed in | Sales attributed to the wrong cashier | High | 15-minute access token, session list with one-request revoke, cash session attribution, actor recorded on every sale and audited | E2E scenario, session tests | FR-015, FR-016, FR-178, FR-184 |
| T-08 | Cross-tenant IDOR on any resource id | Data breach | High | `tenant_id` on every business-owned row, repository methods require `tenantId`, `TenantGuard` re-validates membership per request, cross-tenant reference returns `404 RESOURCE_NOT_FOUND` | RBAC/tenancy tests | FR-028, FR-033 |
| T-09 | Branch-scope bypass | Cross-branch data exposure | High | `BranchScopeGuard` injects the allowed branch set into every query; missing assignment returns `403 BRANCH_SCOPE_REQUIRED`; other-branch reads return 404 | RBAC tests | FR-041, FR-042, FR-082, FR-094, FR-174 |
| T-10 | Privilege escalation by editing `role_permissions` | Insider escalation | Medium | `admin.*` permissions immutable on the Business Admin role (`409 ADMIN_PERMISSION_IMMUTABLE`), permission changes audited, default deny | RBAC tests | FR-052, FR-053, FR-054 |
| T-11 | Invitation token interception or replay | Unauthorised tenant access | Medium | Single-use hashed token, 7-day expiry, hard-deleted on accept or expiry, role and branch scope bound at acceptance, audited | Auth tests | FR-045, FR-046, FR-047 |
| T-12 | Mass assignment / DTO over-posting (`tenant_id`, `state`, `total`) | Data integrity breach | Medium | Zod DTO allowlists per endpoint, server-derived fields, unknown keys rejected | Integration tests | FR-138, FR-159, FR-160 |
| T-13 | Client-supplied totals or prices trusted | Revenue loss | Medium | Subtotal, tax and total recomputed server-side; client totals are display-only and never persisted | Integration tests | FR-159, FR-160 |
| T-14 | Discount abuse | Margin loss | Medium | `sales.discount` permission required, configurable maximum percentage cap, discounts above threshold audited | Integration tests | FR-161, FR-178 |
| T-15 | Stock ledger tampering (update or delete of movements) | Reconciliation failure | High | Append-only `stock_movements`; no endpoint or UI updates or deletes a movement; application DB role has no UPDATE/DELETE grant on the table; report asserts closing balance equals the sum of movements | Stock tests, DB grant review | FR-102, FR-106, FR-199 |
| T-16 | Negative-stock bypass | Overselling | High | Stock-checked transaction at commit; `409 INSUFFICIENT_STOCK` with a machine-readable reason; negative stock only when explicitly enabled per business or branch | Stock tests | FR-113, FR-114, FR-163 |
| T-17 | Overselling race between concurrent sales | Overselling | High | Row-level locking on the balance rows inside the sale transaction, stock re-validated at commit time, one transaction per state transition | Concurrency tests | FR-163, NFR-006 |
| T-18 | Duplicate sale from a retried request | Double stock deduction | High | Idempotency key unique per tenant on the sale; a repeated key returns the original sale and creates no new movement | Idempotency tests | FR-162, FR-164 |
| T-19 | Expired batch sold | Patient safety, regulatory breach | High | Expiry filter applied at sale time, first-expiry-first-out batch resolution, expired batches listed separately and flagged for write-off | Stock/POS tests | FR-132, FR-158, FR-165 |
| T-20 | Refund exceeding the sold quantity | Financial loss | High | Refund quantity checked against sold quantity net of prior refunds; reversing movements written to the original batch | Refund tests | FR-169, FR-170, FR-172 |
| T-21 | Forged mobile money callback | False paid state | High | Provider signature/reference verified on every callback, provider allowlist, per-environment callback secrets, HTTPS only | Webhook tests | FR-181, FR-185 |
| T-22 | Replayed or duplicated callback | Double payment credit | High | Provider event id stored and unique; repeated events rejected; state transition idempotent | Idempotency tests | FR-185, NFR-006 |
| T-23 | Client-side "paid" signal | Goods released unpaid | High | Payment state changes only from a verified callback or a server-side cash record; the cashier screen polls and never marks a sale paid from a client signal | Payment tests | FR-182, FR-184 |
| T-24 | Payment success arriving after refund or cancellation | Inconsistent financials | Medium | Payment recorded as `ORPHANED` without altering the sale; mismatch list surfaces payments without a completed sale and sales without a successful payment | Payment tests | FR-186, FR-191 |
| T-25 | Manual edit of a payment record | Concealed financial manipulation | Medium | No payment edit endpoint; corrections are audited adjustment records | Payment tests | FR-192 |
| T-26 | Day-closure double submission or post-close edit | Cash discrepancy concealment | Medium | Unique (branch, business date) closure, second closure returns 409, closed day immutable, corrections recorded as new audited adjustments | E2E scenario F, tests | FR-204, FR-205, FR-206 |
| T-27 | Purchase-order over-receipt without approval | Unapproved spend | Medium | Explicit confirmation required for a receipt exceeding the ordered quantity, over-receipt flagged, receipt audited | PO tests | FR-148, FR-154 |
| T-28 | Receiving against a line not on the purchase order | Phantom stock | Medium | Receipt lines must belong to the purchase order; unknown lines rejected | PO tests | FR-149 |
| T-29 | Transfer dispatch without sufficient origin stock | Negative stock | High | Dispatch writes negative movements inside a stock-checked transaction; the whole dispatch is rejected with 409 when origin stock is insufficient | Transfer tests | FR-120, FR-121 |
| T-30 | Malicious or oversized file upload | Storage abuse, malware distribution | Medium | MIME allowlist, size caps, tenant-prefixed object keys, private bucket, no public ACL, scan-ready adapter boundary | Upload tests | FR-076, FR-211 |
| T-31 | Signed-URL leakage or object-key guessing | Document exposure | Medium | Short-lived signed URLs issued only after a permission check, tenant-prefixed keys, downloads audited, bucket never public | Document tests | FR-077, FR-212 |
| T-32 | Import file abuse (formula injection, oversized file, malformed rows) | Data corruption, client-side execution | Medium | File type and size validation, per-row validation with row/column/value errors, formula-prefix neutralisation on export, error report retained | Import tests | FR-078, FR-207, FR-208, FR-209 |
| T-33 | SQL injection | Data compromise | Low | ORM parameterisation for all domain operations, no string-concatenated SQL, raw SQL only for reports and reviewed | Code review, dependency scan | NFR-005 |
| T-34 | Stored XSS via product names, supplier notes or receipt footer | Session and data theft | Medium | React output escaping, no `dangerouslySetInnerHTML`, strict CSP, receipt rendered from stored data with encoding | Frontend tests, CSP review | FR-167, NFR-008 |
| T-35 | Secrets or stack traces in logs and error responses | Provider compromise | Medium | Redaction rules, no stack traces in production, fixed error shape `{ error: { code, message, details, requestId } }` | Log review, secret scan | NFR-007, NFR-011 |
| T-36 | Audit-log tampering | Loss of accountability | Medium | Append-only table, no update or delete API, restricted DB grants, retained for the life of the tenant record | Audit tests, DB grant review | FR-093, FR-096 |
| T-37 | Excessive admin powers / insider abuse | Data or financial manipulation | Medium | Least privilege across four roles, MFA for admin roles, audit of every critical action, no platform-operator UI | Permission review | FR-034, FR-095 |
| T-38 | Redis outage weakening lockout counters | Brute-force window | Medium | Counters fail closed for writes and open for reads, so a lockout is never silently lost and a sign-in is never blocked by a cache outage; lockout events audited | Resilience test | FR-018, FR-020 |
| T-39 | Backup exposure or unrestorable backup | Data loss, mass breach | Medium | Encrypted managed backups, 14-day retention, access restricted to the operator, restore tested in staging before launch | Backup restore test | NFR-004 |
| T-40 | Personal data leaked to the wrong phone number | Privacy breach | Medium | WhatsApp channel opt-in per event type, recipient bound to the user record, no financial detail in message bodies | Notification tests | FR-087, FR-089, NFR-014 |
| T-41 | Dependency or build-pipeline compromise | Code execution, secret exfiltration | Medium | Lockfiles committed, pinned versions, CI dependency audit and secret scanning, Docker used only in CI, no untrusted post-install scripts | CI gate | NFR-005 |
| T-42 | Denial of service on login or POS search | Unavailability | Medium | Rate limits on sensitive endpoints, pagination on all list endpoints, indexes on filter and sort fields, p95 targets monitored | Load test | NFR-001, NFR-003 |
| T-43 | Enumeration through differing 403/404 responses | Information disclosure | Low | Cross-tenant and other-branch references return 404; authentication errors are uniform and non-disclosing | RBAC tests | FR-019, FR-028 |
| T-44 | Job-queue poisoning or unauthorised job trigger | Resource abuse | Low | Jobs created only by server-side domain code, job status scoped to the tenant, bounded retries then surfaced failure | Job tests | FR-213, FR-214, FR-216 |
| T-45 | Unlawful processing or cross-border transfer of personal data | Regulatory penalty | Medium | Data minimisation, documented lawful basis, retention rules, soft delete of business records, hard delete of tokens, access restricted to the Business Admin role | Privacy review | FR-031, FR-034, NFR-014 |

### Threats explicitly out of scope for the MVP

| Threat | Why out of scope | Ledger basis |
|---|---|---|
| Card fraud, card-data theft, PCI scope | No card processing, no card storage, no third-party checkout | Payments are mobile money (MTN MoMo, Airtel Money) and recorded cash only |
| AI prompt injection, model-output manipulation, unauthorised AI writes | Phase 5 AI capabilities are deferred; no AI endpoints, jobs or model providers are wired | AI never alters financial records and never executes writes without confirmation |
| Marketplace supplier fraud, fake listings, offer manipulation | Phase 3 supplier ecosystem is deferred | Marketplace entities are not built in MVP |
| Patient medical record exposure | Patient medical records are explicitly out of scope for the initial release | Data sensitivity decision |
| Email-channel phishing and email spoofing | The email integration is deferred; `EMAIL_CHANNEL_ENABLED=false` | Email channel deferred |
| Native mobile app reverse engineering and insecure local storage | The dedicated React Native app is deferred; the MVP is a responsive PWA | UI platform decision |
| Subscription-billing fraud | Subscription billing and collection are not implemented in MVP | Scope decision |

## Controls

### Control catalogue

| ID | Control | Implementation | Requirement refs |
|---|---|---|---|
| SEC-001 | Server-authoritative enforcement chain | Every protected request passes `RequestIdMiddleware` → `RateLimitGuard` → `AuthGuard` → `TenantGuard` → `BranchScopeGuard` → `PermissionGuard` → Zod `ValidationPipe` → controller → domain service → repository | FR-054, NFR-005 |
| SEC-002 | Default deny | An endpoint with no declared permission is reachable only by an authenticated user with a valid tenant context; an unrecognised permission code denies | FR-054 |
| SEC-003 | Tenant isolation by construction | `tenant_id` on every business-owned row; repository methods require `tenantId`; cross-tenant reference returns 404 | FR-028, FR-033 |
| SEC-004 | Branch scope enforcement | `BranchScopeGuard` injects the allowed branch set; missing assignment returns `403 BRANCH_SCOPE_REQUIRED` | FR-041, FR-042 |
| SEC-005 | Password hashing and policy | Argon2id with per-user salt and environment-tuned parameters; ≥10 characters with at least three character classes | FR-002 |
| SEC-006 | Lockout and rate limiting | Redis counters with TTL; thresholds in the rate-limit table below; lockout and rate-limit events audited | FR-018, FR-019, FR-020 |
| SEC-007 | MFA for privileged roles | TOTP (RFC 6238) with hashed single-use recovery codes; required for Business Admin and Branch Manager; disable blocked for admin roles | FR-009, FR-010, FR-011, FR-017, FR-059 |
| SEC-008 | Token hygiene | Access token never persisted; refresh, verification, reset and invitation tokens stored as SHA-256 hashes; hard-deleted on use or expiry; refresh rotation with family revocation | FR-008, FR-014, FR-015, FR-046 |
| SEC-009 | Transactional state transitions | One database transaction per stock, money or state transition; row-level locking on balance rows; idempotency keys on sale submission; provider event ids on callbacks | FR-162, FR-164, FR-185, NFR-006 |
| SEC-010 | Immutable ledgers | `stock_movements` and `audit_logs` are append-only; no API operation updates or deletes them; the application DB role has no UPDATE/DELETE grant on either table | FR-093, FR-106 |
| SEC-011 | Server-computed money | Subtotal, tax, total, change and purchase-order totals computed server-side; client values are display-only | FR-138, FR-159, FR-160, FR-183 |
| SEC-012 | Payment integrity | Signature/reference verification on every callback, unique provider event id, no client-driven paid state, `ORPHANED` and `EXPIRED` handling, audited adjustment records instead of edits | FR-181, FR-182, FR-185, FR-186, FR-187, FR-192 |
| SEC-013 | Private object storage | Private bucket, tenant-prefixed keys, pre-signed uploads, short-lived signed reads after a permission check, downloads audited | FR-075, FR-077, FR-211, FR-212 |
| SEC-014 | Upload and import validation | MIME allowlist, size caps, per-row import validation with retained error report, formula-prefix neutralisation on export | FR-076, FR-078, FR-208, FR-209 |
| SEC-015 | Audit of critical actions | Append-only `audit_logs` with actor, action, target type, target id, timestamp and context (request id, IP address, user agent) | FR-092, FR-095, FR-097 |
| SEC-016 | Logging and redaction | Centralized structured logging with a redaction list; no passwords, tokens, MFA secrets, recovery codes, provider secrets or signed URLs in logs | NFR-007 |
| SEC-017 | Error hygiene | Fixed error shape `{ error: { code, message, details, requestId } }`; no stack traces or secrets in production responses | NFR-011 |
| SEC-018 | Secrets management | All secrets in environment variables per environment (production and staging separate); no secret in the repository, no secret in client bundles | NFR-007 |
| SEC-019 | Transport and browser hardening | HTTPS only, HSTS, strict CSP, `Cache-Control: no-store` on authenticated API responses, PWA caches static assets only | NFR-005, NFR-009 |
| SEC-020 | Backup and restore | Daily automated encrypted backups retained 14 days; restore tested in staging before launch | NFR-004 |
| SEC-021 | Dependency and pipeline controls | Committed lockfiles, pinned versions, CI dependency audit and secret scanning, Docker used only in the CI build stage | NFR-005 |
| SEC-022 | Privacy controls | Data minimisation, soft delete of business records, hard delete of tokens, access to registration and tax data restricted to the Business Admin role | FR-031, FR-034, NFR-014 |

### Authentication controls

| Control | Setting | Requirement refs |
|---|---|---|
| Password hashing | Argon2id, per-user salt, `ARGON2_MEMORY_KIB=19456`, `ARGON2_TIME_COST=2`, `ARGON2_PARALLELISM=1` | FR-002 |
| Password policy | Minimum 10 characters, at least three of lowercase, uppercase, digit, symbol; enforced on registration, invitation acceptance and reset | FR-002 |
| Verification code | 6 digits, `VERIFICATION_CODE_TTL_SECONDS=600`, `VERIFICATION_MAX_ATTEMPTS=5`, resend invalidates the previous code, hard-deleted on use or expiry | FR-005, FR-006, FR-008 |
| MFA | TOTP with `MFA_ISSUER=SokoOS`, `MFA_RECOVERY_CODE_COUNT=10`, recovery codes shown once and stored hashed | FR-010, FR-017 |
| Access token | JWT, `ACCESS_TOKEN_TTL=15m`, never persisted, rejected when its session is revoked or the user is deactivated | FR-015, FR-056 |
| Refresh token | `REFRESH_TOKEN_TTL=30d`, rotated on every use, reuse revokes the session family, revoked on logout, password reset and deactivation | FR-014, FR-015, FR-016 |
| Password reset | Always 202, single-use token `PASSWORD_RESET_TTL_SECONDS=1800`, all sessions invalidated on success | FR-013, FR-014 |
| Invitation | Single-use token `INVITATION_TTL_DAYS=7`, hard-deleted on accept or expiry | FR-045, FR-046 |
| Account states | `PENDING_VERIFICATION` exposes no business data; `DEACTIVATED` blocks sign-in and revokes sessions in the same request | FR-004, FR-056 |

### Rate limits

| Endpoint or action | Limit | Window | Key | On breach | Refs |
|---|---|---|---|---|---|
| `POST /v1/auth/login` | 10 failures | 15 minutes | Email | `423 AUTH_LOCKED`, audited | FR-018, FR-019 |
| `POST /v1/auth/verify` | 5 attempts | Per code lifetime | Email + code | Code invalidated, new code required | FR-006 |
| `POST /v1/auth/verify/resend` | 5 requests | 60 minutes | Phone | 429, audited | FR-005, FR-020 |
| `POST /v1/auth/password/forgot` | 5 requests | 60 minutes | Email | 202 without issuing a token | FR-013 |
| `POST /v1/auth/mfa/challenge` | 5 attempts | 15 minutes | Session | Challenge invalidated, re-sign-in required | FR-009 |
| `POST /v1/auth/register` | 10 requests | 60 minutes | IP address | 429, audited | FR-001, FR-020 |
| `POST /v1/payments/momo/callback` | 60 requests | 1 minute | Provider + IP allowlist | 429, event rejected | FR-185 |
| `POST /v1/sales` | 120 requests | 1 minute | User + branch | 429 | FR-162 |
| `GET /v1/products/search` | 300 requests | 1 minute | User | 429 | FR-079, FR-155 |
| `POST /v1/imports` | 10 requests | 60 minutes | Tenant | 429 | FR-207 |
| `POST /v1/attachments/upload-url` | 60 requests | 60 minutes | Tenant | 429 | FR-211 |

Assumption: counters live in Redis with a TTL equal to the window; a Redis outage fails counters closed for writes and open for reads, so a lockout is never silently lost and a sign-in is never blocked by a cache outage.

### Authorization and tenancy controls

| Control | Rule | Requirement refs |
|---|---|---|
| Permission declaration | Every protected endpoint declares exactly one permission code from the catalogue in `docs/12-authentication-authorization-and-permissions.md` | FR-054, FR-060 |
| Tenant resolution | `TenantGuard` reads the active business context, re-validates `user_roles` membership on every request, and sets `tenantId` on the request context | FR-032, FR-033 |
| Repository contract | Every repository method takes `tenantId` as a required argument; no query is issued without it | FR-028 |
| Branch filtering | `BranchScopeGuard` injects the allowed branch set into every list and detail query for branch-scoped roles | FR-041, FR-042, FR-174 |
| Cross-tenant response | A resource belonging to another tenant returns `404 RESOURCE_NOT_FOUND`, never 403 | FR-028 |
| Admin permission immutability | `admin.*` permissions cannot be removed from the Business Admin role; `409 ADMIN_PERMISSION_IMMUTABLE` | FR-053 |
| Role change propagation | Replacing role assignments invalidates the user's permission cache immediately and takes effect on the next request | FR-049 |
| Deactivation | Deactivating a user revokes sessions and refresh tokens in the same request while preserving historical attribution | FR-056, FR-057 |
| Denial auditing | Permission denials on critical actions (stock, money, permissions, branches, catalogue price, settings) are written to `audit_logs` | FR-095 |

### Data integrity controls (stock, money, state)

| Control | Rule | Requirement refs |
|---|---|---|
| Immutable ledger | `stock_movements` rows are never updated or deleted through any endpoint or UI; the application DB role has no UPDATE/DELETE grant on the table | FR-106 |
| Balance derivation | Every balance is the sum of `stock_movements` for the same product, variant, batch and branch; the stock report asserts this and reports drift | FR-102, FR-199 |
| Adjustment discipline | Every adjustment requires a non-empty reason, product/variant, branch, quantity delta and a batch for batch-tracked products; exactly one movement and one audit entry per adjustment | FR-109, FR-110, FR-111 |
| Negative stock | Permitted only when explicitly enabled for the business or branch; otherwise the commit is rejected atomically with `409 INSUFFICIENT_STOCK` | FR-113, FR-114 |
| Batch identity | Batch number and expiry captured on goods receipt; batch identity preserved through sale, refund and transfer; expired batches excluded from sale | FR-131, FR-132, FR-158, FR-165 |
| Transfer integrity | No movement at request time; negative movements at dispatch, positive at receipt; source and destination retained for the life of the transfer; closed transfers immutable | FR-117, FR-120, FR-122, FR-125 |
| Purchase-order lifecycle | Only `DRAFT → SUBMITTED → CONFIRMED → PARTIALLY_RECEIVED → RECEIVED → CLOSED` transitions accepted; submitted orders are not editable; closed orders immutable | FR-140, FR-141, FR-151, FR-153 |
| Sale idempotency | `sales` carries a tenant-unique idempotency key; a repeated key returns the original sale and creates no duplicate movement | FR-162, FR-164 |
| Refund bounds | Refund quantity cannot exceed sold quantity net of prior refunds; reversing movements go to the original batch; sale state becomes `REFUNDED` or `PARTIALLY_REFUNDED` | FR-170, FR-171, FR-172 |
| Day closure | One closure per branch and business date, reason required on non-zero discrepancy, closed day immutable, corrections as new audited adjustments | FR-204, FR-205, FR-206 |
| Determinism | All financial values are derived from stored sale, refund and payment records; reports never recompute from client input | FR-196, FR-197 |

### Payment controls

| Control | Rule | Requirement refs |
|---|---|---|
| Provider scope | Mobile money through MTN MoMo and Airtel Money only; cash recorded internally; no card processing and no third-party checkout | FR-179, FR-183 |
| Initiation | Payment created in `PENDING` with provider, amount, currency, payer phone and sale reference | FR-180 |
| Callback verification | Provider signature/reference verified on every callback; provider event id stored and unique; repeated events rejected | FR-185 |
| State authority | `SUCCEEDED` or `FAILED` set only from a verified callback; cash set to `SUCCEEDED` server-side; the cashier screen polls and never marks a sale paid | FR-181, FR-182, FR-184 |
| Expiry | A payment `PENDING` beyond 15 minutes is marked `EXPIRED` by a background job | FR-187 |
| Orphan handling | A success arriving after refund or cancellation is recorded `ORPHANED` without altering the sale | FR-186 |
| Reconciliation | Mismatch list of payments without a completed sale and sales without a successful payment; payments reported by provider, state and date | FR-190, FR-191 |
| Corrections | No payment edit endpoint; corrections are audited adjustment records | FR-192 |
| Refund routing | Refunds are recorded against the original payment method | FR-188 |
| Auditing | Every payment state change is audited | FR-194 |

### File, import and export controls

| Control | Rule | Requirement refs |
|---|---|---|
| Upload path | Pre-signed upload URL to a tenant-prefixed object key; the client never holds storage credentials | FR-075, FR-211 |
| MIME and size | Product images: image MIME types, maximum 5 MB. Attachments: PDF, JPEG, PNG, XLSX, CSV. Assumption: attachment maximum size 10 MB | FR-076, FR-211 |
| Read path | Short-lived signed URL issued only after a permission check; downloads audited. Assumption: signed-URL TTL 300 seconds | FR-077, FR-212 |
| Bucket posture | Private bucket, no public ACL, no directory listing, tenant prefix enforced server-side | FR-211 |
| Import validation | File type and size validated before parsing; each row validated independently; errors reported with row number, column, value and error; error report retained | FR-208, FR-209 |
| Import execution | Rows applied one at a time in a transaction; a failed row does not corrupt previously applied rows | FR-209 |
| Export | Export produced by a background job and downloadable only through an authenticated, tenant-scoped link; formula prefixes neutralised | FR-215 |
| Job safety | Jobs are created only by server-side domain code; job status is tenant-scoped; bounded retries then surfaced failure | FR-213, FR-214, FR-216 |

### Logging, audit and monitoring controls

| Control | Rule | Requirement refs |
|---|---|---|
| Audit content | Actor, action, target type, target id, timestamp, context (request id, IP address, user agent) | FR-092, FR-097 |
| Audit immutability | Append-only; no API operation edits or deletes entries; retained for the life of the tenant record | FR-093, FR-096 |
| Audit scope | Business Admin sees tenant-wide entries; Branch Manager sees branch-scoped entries only; filtering by actor, action, target type, target id, date range and branch; paginated | FR-091, FR-094, FR-098, FR-099 |
| Audited actions | Authentication events, MFA changes, role changes, branch changes, user deactivation, catalogue price changes, stock adjustments, transfers, purchase orders, goods receipts, sales, discounts above threshold, refunds, payment state changes, day closure, attachment downloads | FR-012, FR-044, FR-050, FR-058, FR-080, FR-095, FR-100, FR-111, FR-154, FR-178, FR-194, FR-206, FR-212 |
| Application logging | Centralized structured logs with request id correlation; log level from `LOG_LEVEL` | NFR-007 |
| Error monitoring | Unhandled exceptions and 5xx responses reported to the chosen error-monitoring provider with the request id; no request bodies containing personal or financial data | NFR-007 |
| Redaction list | `password`, `passwordHash`, `token`, `refreshToken`, `authorization`, `mfaSecret`, `recoveryCode`, `apiKey`, `callbackSecret`, `signedUrl`, full phone numbers, TIN | NFR-007 |
| Alerting | Alerts on repeated `auth.lockout`, `auth.login.failure` spikes, callback signature failures, `INSUFFICIENT_STOCK` spikes, job failure rate and 5xx rate | FR-020, FR-185, FR-216 |

### Secrets and configuration controls

| Variable | Purpose | Default |
|---|---|---|
| `DATABASE_URL` | Managed PostgreSQL connection (application role, no DDL, no UPDATE/DELETE on ledgers) | none — required |
| `MIGRATION_DATABASE_URL` | Separate migration role used only by CI/CD migrations | none — required |
| `REDIS_URL` | Cache, rate-limit counters and job queues | none — required |
| `JWT_ACCESS_SECRET` | Access-token signing key | none — required |
| `JWT_REFRESH_SECRET` | Refresh-token signing key | none — required |
| `ARGON2_MEMORY_KIB` / `ARGON2_TIME_COST` / `ARGON2_PARALLELISM` | Argon2id parameters | `19456` / `2` / `1` |
| `MFA_ISSUER` / `MFA_RECOVERY_CODE_COUNT` | TOTP issuer and recovery-code count | `SokoOS` / `10` |
| `LOGIN_MAX_ATTEMPTS` / `LOGIN_ATTEMPT_WINDOW_SECONDS` / `LOGIN_LOCKOUT_SECONDS` | Lockout thresholds | `10` / `900` / `900` |
| `VERIFICATION_CODE_TTL_SECONDS` / `VERIFICATION_MAX_ATTEMPTS` | Verification code controls | `600` / `5` |
| `PASSWORD_RESET_TTL_SECONDS` / `INVITATION_TTL_DAYS` | Reset and invitation lifetimes | `1800` / `7` |
| `SMS_PROVIDER_API_KEY` | Phone verification and SMS — the chosen provider | none — required |
| `WHATSAPP_ENABLED` | Enables the WhatsApp notification channel | `false` |
| `EMAIL_CHANNEL_ENABLED` | Email verification channel — out of scope in MVP | `false` |
| `MTN_MOMO_API_KEY` / `MTN_MOMO_CALLBACK_SECRET` | MTN MoMo credentials and callback verification | none — required |
| `AIRTEL_MONEY_API_KEY` / `AIRTEL_MONEY_CALLBACK_SECRET` | Airtel Money credentials and callback verification | none — required |
| `STORAGE_BUCKET` / `STORAGE_REGION` / `STORAGE_ACCESS_KEY_ID` / `STORAGE_SECRET_ACCESS_KEY` | Object storage, private bucket | none — required |
| `STORAGE_SIGNED_URL_TTL_SECONDS` | Signed-URL lifetime | `300` |
| `ERROR_MONITORING_DSN` | Error monitoring — the chosen provider | none — required |
| `CORS_ALLOWED_ORIGINS` | Allowed browser origins | production and staging app origins |
| `APP_BASE_URL` | Canonical origin used in links and callbacks | none — required |
| `LOG_LEVEL` | Log verbosity | `info` |

Rules: production and staging hold separate values for every secret; no secret is committed to the repository; no secret is exposed to the browser bundle; secrets are rotated on suspected exposure and on operator departure; callback secrets are per environment so a staging callback can never move a production payment.

### Transport, browser and client controls

| Control | Setting | Refs |
|---|---|---|
| Transport | HTTPS only; HTTP redirected; HSTS with a long max-age | NFR-005 |
| Content Security Policy | `default-src 'self'`; scripts and styles from the application origin; no inline script; `frame-ancestors 'none'` | NFR-008 |
| Other headers | `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy` disabling unused device APIs | NFR-005 |
| API caching | `Cache-Control: no-store` on all authenticated API responses | FR-028 |
| PWA cache | Service worker caches static assets only; no API response containing tenant data is cached | NFR-009 |
| Token storage in the browser | Access token held in memory; refresh token in an `HttpOnly`, `Secure`, `SameSite=Strict` cookie | FR-015 |
| Client guards | Frontend route and component guards are UX only and never the enforcement point | FR-054 |
| Accessibility | Authenticated screens meet WCAG 2.1 Level AA, including focus management on POS and error announcements | NFR-008 |

### Dependency and supply-chain controls

| Control | Rule | Refs |
|---|---|---|
| Lockfiles | `package-lock.json` committed and used with `npm ci` in CI | NFR-005 |
| Pinned versions | Direct dependencies pinned; upgrades reviewed before merge | NFR-005 |
| CI audit | Dependency audit and secret scanning run on every pipeline; a high-severity finding fails the build | NFR-005 |
| Build isolation | Docker is used only in the CI build and test stage; the runtime path is managed Node hosting with no Docker | Ops decision |
| Install scripts | Post-install scripts from untrusted packages are disabled in CI | NFR-005 |
| Migration safety | Migrations run with `MIGRATION_DATABASE_URL` in a separate step, never from the application runtime role | NFR-006 |

### Backup, retention and privacy controls

| Control | Rule | Refs |
|---|---|---|
| Backups | Daily automated encrypted PostgreSQL backups, 14-day retention, access restricted to the operator | NFR-004 |
| Restore test | A restore is performed in staging and verified before launch and after any schema change to ledger tables | NFR-004, NFR-015 |
| Soft delete | Business records are soft-deleted via `deleted_at`; deleted records are excluded from all reads | FR-031 |
| Hard delete | Verification, reset, invitation and refresh tokens are hard-deleted on use or expiry | FR-008, FR-014, FR-046 |
| Audit retention | Audit entries are retained for the life of the tenant record | FR-096 |
| Data minimisation | Only data required for the flow is collected; no patient medical records; no card data; no national ID images | NFR-014 |
| Access restriction | Business registration and tax information is readable only by the Business Admin role | FR-034 |
| Notification privacy | Notification bodies carry no financial detail; the WhatsApp channel is opt-in per event type and the recipient is bound to the user record | FR-087, FR-089 |
| Regulatory basis | Processing complies with the Ugandan Data Protection and Privacy Act 2019 and relevant regulations; personal data is not transferred outside the hosting region without a documented basis | NFR-014 |

### Incident response

| Step | Action | Owner | Refs |
|---|---|---|---|
| 1. Detect | Alert from error monitoring, audit-log anomaly query, or user report | Operator | NFR-007 |
| 2. Triage | Classify as authentication, tenancy, financial, stock or availability incident; capture request ids from logs | Operator | FR-097 |
| 3. Contain | Revoke affected sessions and refresh tokens; rotate the affected secret; disable the affected provider channel; block the offending IP range at the hosting edge | Operator | FR-016, FR-