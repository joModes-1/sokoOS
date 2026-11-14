# Authentication, Authorization and Permissions

**Product:** SokoOS — interconnected business operating platform for B2B commerce, inventory management and business operations
**Release covered:** MVP = Phase 1 Foundation (FR-001–FR-060, FR-081–FR-100) + Phase 2 Business operations (FR-101–FR-216)
**Explicitly not covered:** Phase 3 supplier ecosystem/marketplace, Phase 4 finance, Phase 5 AI capabilities, Phase 6 expansion, dedicated React Native app, patient medical records, subscription billing, platform-operator UI.

This document is the single specification of who may do what in SokoOS. It defines the authentication mechanism, the role catalogue, the permission catalogue, the permission matrix, the branch-scope model and the server-side enforcement chain. Every protected endpoint in the API specification must declare exactly one permission from the catalogue in this document, and every permission check must be resolvable to a row in the matrix below. Requirement IDs FR-001–FR-216, NFR-001–NFR-015 and business rules BR-001–BR-022 are reused from `docs/01-executive-summary.md`, `docs/02-product-requirements-document.md` and `docs/03-cleaned-srs.md` and are not renumbered.

**Non-negotiable authorization principles (from the decision ledger and `docs/07-system-architecture.md`):**

1. **Backend is authoritative** — every permission check, tenant scope and branch scope is evaluated server-side on every request; frontend guards are UX only (FR-054, NFR-005).
2. **Default deny** — an endpoint with no declared permission is reachable only by an authenticated user with a valid tenant context, and any unrecognised permission code denies (FR-054).
3. **Tenant isolation by construction** — every business-owned row carries `tenant_id`; every repository method requires a `tenantId`; cross-tenant reads are impossible (FR-028).
4. **Branch restrictions enforced server-side** — a branch-scoped role can never read or write another branch's balances, sales or transfers (FR-041, FR-042).
5. **No third-party identity provider** — authentication is built in-house: email + password, phone/email verification, TOTP MFA, RBAC (FR-001–FR-020).
6. **Audit everything critical** — authentication events, role changes, branch assignment, user deactivation and permission denials on critical actions are written to append-only `audit_logs` (FR-050, FR-058, FR-092, FR-095, FR-100).

---

## Authentication

### Method and boundaries

| Aspect | Decision | Requirement refs |
|---|---|---|
| Identity provider | None. Authentication is built in-house inside `AuthModule`. No external identity provider, no SSO, no social login, no magic link, no passwordless login. | FR-001–FR-020 |
| Primary credential | Email address + password | FR-001, FR-015 |
| Password hashing | Argon2id, per-user salt, parameters in environment variables | FR-002 |
| Password policy | Minimum 10 characters with at least three of: lowercase, uppercase, digit, symbol. Enforced on registration, invitation acceptance and password reset. | FR-002 |
| Account verification | One-time code sent by phone as the primary channel; the email channel is used only when it is enabled | FR-005 |
| Email channel | Out of scope in MVP — the email integration is deferred, so `EMAIL_CHANNEL_ENABLED=false` and verification is phone-only. No email provider is integrated. | FR-005 |
| MFA | TOTP (RFC 6238) with one-time recovery codes | FR-009–FR-012, FR-017 |
| Session mechanism | Short-lived JWT access token + rotating refresh token | FR-015 |
| Transport | HTTPS only; access token sent as `Authorization: Bearer <token>` | NFR-005 |
| Token storage | Access token is never persisted server-side; refresh, verification, reset and invitation tokens are stored as SHA-256 hashes | FR-008, FR-014, FR-046 |
| Card data | Out of scope — no card processing, no card storage, no third-party checkout | — |
| Patient medical records | Out of scope for the initial release | — |

### Account states

| State | Meaning | Permitted operations | Transitions |
|---|---|---|---|
| `PENDING_VERIFICATION` | Account row exists; no business data is exposed | Resend verification code; complete verification; abandon | → `ACTIVE` on successful verification (FR-007) |
| `ACTIVE` | Verified; may sign in and hold roles | All operations permitted by roles and permissions | → `DEACTIVATED` by a Business Admin (FR-056) |
| `DEACTIVATED` | Sign-in blocked; sessions and refresh tokens revoked within the same request | None | → `ACTIVE` on reactivation by a Business Admin (FR-058) |

Lockout is **not** a persisted account state. It is a transient gate held in Redis against the email address and is released automatically when the window expires (FR-018).

### Registration and verification flow

1. Browser → `POST /v1/auth/register` with `{ email, password, phone, fullName }`.
2. `AuthModule` validates the payload against the shared Zod schema, applies the password policy (FR-002) and rejects an existing email with `409 EMAIL_ALREADY_REGISTERED` (FR-003).
3. The account is created in `PENDING_VERIFICATION`; no business data is readable before verification completes (FR-004).
4. A 6-digit verification code is generated, hashed and written to `verification_tokens` with a 10-minute expiry; the code is sent by phone through the SMS adapter (FR-005).
5. Browser → `POST /v1/auth/verify` with `{ email, code }`. At most 5 attempts are allowed per code; the code expires after 10 minutes (FR-006).
6. On success the account moves to `ACTIVE` (FR-007) and the verification token row is hard-deleted (FR-008).
7. `POST /v1/auth/verify/resend` issues a new code and invalidates the previous one.
8. Business registration (`POST /v1/businesses`) is self-service after phone verification, with no platform approval step; it creates the tenant, the owner's Business Admin role assignment, a default branch and `business_settings` in one transaction (FR-021, FR-024).

### Sign-in flow

1. Browser → `POST /v1/auth/login` with `{ email, password }`.
2. `AuthModule` checks the Redis lockout counter for the email; a locked email returns `423 AUTH_LOCKED` with a message that does not disclose whether the email exists (FR-018, FR-019).
3. The Argon2id hash is verified. On failure the lockout counter increments and the response is `401 AUTH_INVALID_CREDENTIALS` (non-disclosing).
4. If the user holds a role that requires MFA, the response is `202 { mfaRequired: true, challengeId }` and **no access token is issued** (FR-009).
5. Browser → `POST /v1/auth/mfa/challenge` with `{ challengeId, code }`. A TOTP code or a single-use recovery code is accepted; a recovery code is consumed and audited (FR-017).
6. On success the API issues a 15-minute access token and a 30-day rotating refresh token, writes a `sessions` row (device, IP address, last-used timestamp) and writes an audit entry (FR-015, FR-016, FR-100).
7. Every subsequent request passes through the enforcement chain: `AuthGuard` → `TenantGuard` → `BranchScopeGuard` → `PermissionGuard`.

### MFA policy

| Role | MFA requirement | Enforcement point | Requirement refs |
|---|---|---|---|
| Business Admin | Required | Sign-in challenge; enrolment forced before first protected request | FR-009, FR-011, FR-059 |
| Branch Manager | Required | Sign-in challenge; enrolment forced before first protected request | FR-009, FR-059 |
| Cashier | Optional | User may enrol; challenge issued only when enrolled | FR-059 |
| Inventory Clerk | Optional | User may enrol; challenge issued only when enrolled | FR-059 |

- Enrolment returns the TOTP secret and 10 one-time recovery codes; the recovery codes are displayed exactly once and stored only as hashes (FR-010).
- A user holding an admin role cannot disable MFA for that role; the request is rejected with `409 MFA_REQUIRED_FOR_ROLE` (FR-011).
- Enabling or disabling MFA writes an audit entry (FR-012).
- Recovery codes are single-use; use is audited (FR-017).
- MFA requirement is evaluated per role, so a user who holds Business Admin in one tenant and Cashier in another is challenged when acting in the Business Admin tenant (FR-059).

### Password reset

1. `POST /v1/auth/password/forgot` with `{ email }` always returns `202` whether or not the email exists (FR-013).
2. A single-use reset token is issued with a 30-minute expiry and stored as a hash in `password_reset_tokens` (FR-014).
3. `POST /v1/auth/password/reset` with `{ token, newPassword }` validates the password policy, updates the hash, hard-deletes the token and **invalidates all existing sessions and refresh tokens** for that user (FR-014).
4. The reset is audited (FR-100).

### Invitations

1. A Business Admin → `POST /v1/invitations` with `{ email, phone, roleId, branchIds }` (FR-045).
2. A single-use invitation token is issued with a 7-day expiry and stored as a hash in `invitations` (FR-046).
3. `POST /v1/invitations/accept` with `{ token, password }` creates or links the user, sets the password, writes `user_roles` and `user_branch_assignments`, and binds the user to the MFA rules of the assigned role (FR-047).
4. The invitation token is hard-deleted on acceptance or expiry (FR-046).

### Sessions and tokens

| Token | Storage | TTL | Rotation | Revocation |
|---|---|---|---|---|
| Access token (JWT) | Not stored | 15 minutes | Not rotated | Expires; rejected immediately when its `sessionId` is revoked or the user is deactivated |
| Refresh token | `refresh_tokens` (SHA-256 hash) | 30 days | Rotated on every use; reuse of an already-rotated token revokes the whole session family | Logout, password reset, user deactivation, explicit session revoke (FR-014, FR-016, FR-056) |
| Verification code | `verification_tokens` (hash) | 10 minutes, max 5 attempts | Replaced on resend | Hard-deleted on use or expiry (FR-008) |
| Password reset token | `password_reset_tokens` (hash) | 30 minutes, single use | Not rotated | Hard-deleted on use; all sessions revoked on success (FR-014) |
| Invitation token | `invitations` (hash) | 7 days, single use | Not rotated | Hard-deleted on accept or expiry (FR-046) |
| MFA recovery code | `mfa_recovery_codes` (hash) | No expiry | Not rotated | Marked used on first use; audited (FR-017) |

- `GET /v1/auth/sessions` lists the user's active sessions with device, IP address and last-used timestamp; `DELETE /v1/auth/sessions/{id}` revokes one session in a single request (FR-016).
- Deactivating a user revokes that user's sessions and refresh tokens within the same request (FR-056).
- Historical attribution of a deactivated user's sales, receipts and stock movements is preserved (FR-057).

### Lockout and rate limiting

| Control | Threshold | Window | Effect | Requirement refs |
|---|---|---|---|---|
| Sign-in failures per email | 10 | 15 minutes | Email locked for 15 minutes; `423 AUTH_LOCKED` | FR-018, FR-019 |
| Verification attempts per code | 5 | Code lifetime | Code invalidated; a new code must be requested | FR-006 |
| Password reset requests per email | 5 | 60 minutes | Further requests return `202` without issuing a token | FR-013 |
| MFA challenges per session | 5 | 15 minutes | Challenge invalidated; user must sign in again | FR-009 |
| Lockout and rate-limit events | — | — | Written to `audit_logs` and to centralized logs | FR-020 |

Counters live in Redis with a TTL equal to the window; a Redis outage fails the counter open for reads and closed for writes, so a sign-in is never blocked by a cache outage but a lockout is never silently lost.

### Authentication endpoints

| Method | Path | Auth required | Purpose | Requirement refs |
|---|---|---|---|---|
| POST | `/v1/auth/register` | None | Create account in `PENDING_VERIFICATION` | FR-001–FR-004 |
| POST | `/v1/auth/verify` | None (code) | Complete phone/email verification | FR-005–FR-008 |
| POST | `/v1/auth/verify/resend` | None | Issue a new verification code | FR-005, FR-006 |
| POST | `/v1/auth/login` | None | Password check; returns MFA challenge or tokens | FR-015, FR-018 |
| POST | `/v1/auth/mfa/challenge` | `challengeId` | Complete the MFA challenge | FR-009, FR-017 |
| POST | `/v1/auth/mfa/enrol` | Access token | Return TOTP secret and one-time recovery codes | FR-010 |
| POST | `/v1/auth/mfa/enrol/confirm` | Access token | Activate MFA after the first valid code | FR-010, FR-012 |
| POST | `/v1/auth/mfa/disable` | Access token | Disable MFA; rejected for admin roles | FR-011, FR-012 |
| POST | `/v1/auth/password/forgot` | None | Always `202` | FR-013 |
| POST | `/v1/auth/password/reset` | None (token) | Reset password and revoke all sessions | FR-014 |
| POST | `/v1/auth/refresh` | Refresh token | Rotate the refresh token and issue a new access token | FR-015 |
| POST | `/v1/auth/logout` | Access token | Revoke the current session | FR-016 |
| GET | `/v1/auth/sessions` | Access token | List own active sessions | FR-016 |
| DELETE | `/v1/auth/sessions/{id}` | Access token (own) | Revoke one own session | FR-016 |
| POST | `/v1/invitations/accept` | None (token) | Accept an invitation and set a password | FR-046, FR-047 |

### Authentication audit events

| Action code | Trigger | Requirement refs |
|---|---|---|
| `auth.register` | Account created | FR-100 |
| `auth.verify.success` / `auth.verify.failure` | Verification attempt | FR-100 |
| `auth.login.success` / `auth.login.failure` | Sign-in attempt | FR-100 |
| `auth.lockout` | Lockout threshold reached | FR-020, FR-100 |
| `auth.rate_limit` | Rate limit triggered | FR-020 |
| `auth.mfa.challenge.success` / `auth.mfa.challenge.failure` | MFA challenge | FR-100 |
| `auth.mfa.enabled` / `auth.mfa.disabled` | MFA state change | FR-012 |
| `auth.mfa.recovery_code.used` | Recovery code consumed | FR-017 |
| `auth.password.reset.requested` / `auth.password.reset.completed` | Password reset | FR-100 |
| `auth.session.revoked` | Session revoked by the user or by deactivation | FR-016, FR-056 |
| `auth.invitation.created` / `auth.invitation.accepted` | Invitation lifecycle | FR-045–FR-047 |
| `auth.user.deactivated` / `auth.user.reactivated` | User state change | FR-058 |
| `auth.role.changed` | Role assignment replaced | FR-050 |

Every entry stores actor, action, target type, target id, timestamp and context (request id, IP address, user agent) (FR-092, FR-097).

### Authentication environment variables

| Variable | Purpose | Default |
|---|---|---|
| `JWT_ACCESS_SECRET` | Access-token signing key | none — required |
| `JWT_REFRESH_SECRET` | Refresh-token signing key | none — required |
| `ACCESS_TOKEN_TTL` | Access-token lifetime | `15m` |
| `REFRESH_TOKEN_TTL` | Refresh-token lifetime | `30d` |
| `ARGON2_MEMORY_KIB` | Argon2id memory cost | `19456` |
| `ARGON2_TIME_COST` | Argon2id iterations | `2` |
| `ARGON2_PARALLELISM` | Argon2id parallelism | `1` |
| `MFA_ISSUER` | TOTP issuer label | `SokoOS` |
| `MFA_RECOVERY_CODE_COUNT` | Recovery codes issued at enrolment | `10` |
| `LOGIN_MAX_ATTEMPTS` | Failures before lockout | `10` |
| `LOGIN_ATTEMPT_WINDOW_SECONDS` | Failure window | `900` |
| `LOGIN_LOCKOUT_SECONDS` | Lockout duration | `900` |
| `VERIFICATION_CODE_TTL_SECONDS` | Verification code lifetime | `600` |
| `VERIFICATION_MAX_ATTEMPTS` | Attempts per code | `5` |
| `PASSWORD_RESET_TTL_SECONDS` | Reset token lifetime | `1800` |
| `INVITATION_TTL_DAYS` | Invitation lifetime | `7` |
| `SMS_PROVIDER_API_KEY` | Phone verification / SMS — the chosen provider | none — required |
| `EMAIL_CHANNEL_ENABLED` | Enables the email verification channel | `false` |
| `WHATSAPP_ENABLED` | Enables the WhatsApp notification channel | `false` |

### Authentication failure modes

| Condition | HTTP status | Error code | Requirement refs |
|---|---|---|---|
| Wrong password | 401 | `AUTH_INVALID_CREDENTIALS` | FR-015 |
| Email locked | 423 | `AUTH_LOCKED` | FR-018, FR-019 |
| Account not verified | 403 | `AUTH_ACCOUNT_PENDING_VERIFICATION` | FR-004 |
| MFA required, not completed | 202 | `AUTH_MFA_REQUIRED` (with `challengeId`) | FR-009 |
| Invalid or expired MFA code | 401 | `AUTH_MFA_INVALID` | FR-009 |
| MFA disable attempted for an admin role | 409 | `MFA_REQUIRED_FOR_ROLE` | FR-011 |
| Expired, rotated or revoked refresh token | 401 | `AUTH_REFRESH_INVALID` | FR-015 |
| Deactivated user | 403 | `AUTH_USER_DEACTIVATED` | FR-056 |
| No role in the active tenant | 403 | `TENANT_ACCESS_DENIED` | FR-033 |
| Branch-scoped role with no branch assignment | 403 | `BRANCH_SCOPE_REQUIRED` | FR-041 |
| Missing permission | 403 | `PERMISSION_DENIED` | FR-054, FR-112 |
| Resource belongs to another tenant | 404 | `RESOURCE_NOT_FOUND` | FR-028 |

Assumption: a cross-tenant resource reference returns `404 RESOURCE_NOT_FOUND` rather than `403`, so that the existence of another tenant's records is never disclosed.

---

## Roles

### Role catalogue

SokoOS ships four system roles per tenant (FR-051) plus the unauthenticated Guest. There is no platform-level role in the MVP: the platform-operator UI is out of scope, so platform operations are performed by the operator through hosting and database tooling, not through an application role.

| Role code | Display name | Description | Tenant scope | Branch scope | MFA | Requirement refs |
|---|---|---|---|---|---|---|
| `business_admin` | Business Admin | Full access within the tenant: business profile, branches, users, roles, catalogue, inventory, purchasing, sales, payments, reports, day closure, audit, settings | Tenant-wide | All branches | Required | FR-009, FR-051 |
| `branch_manager` | Branch Manager | Runs branch operations and approvals: transfers, purchase orders, goods receipts, refunds, day closure, branch reports, branch-scoped audit | Tenant-wide read of own branch | Assigned branches | Required | FR-009, FR-051 |
| `cashier` | Cashier | Operates the POS, takes cash and mobile money payments, prints receipts, submits day-closure counts | Own branch | Assigned branch | Optional | FR-051, FR-059 |
| `inventory_clerk` | Inventory Clerk | Maintains stock: adjustments, stock counts, transfers, goods receipts, batch and expiry handling | Own branch | Assigned branches | Optional | FR-051, FR-059 |
| `guest` | Guest | Not a stored role. Unauthenticated caller; may reach public endpoints only | None | None | n/a | — |

### Role assignment model

| Table | Key columns | Purpose | Requirement refs |
|---|---|---|---|
| `roles` | `id`, `tenant_id`, `code`, `name`, `is_system`, `created_at`, `updated_at`, `deleted_at` | The four system roles are seeded per tenant at business registration; `is_system = true` rows cannot be deleted | FR-051 |
| `permissions` | `id`, `code`, `description`, `module`, `is_admin_permission` | Platform-wide permission catalogue; `is_admin_permission = true` marks the `admin.*` codes | FR-053, FR-060 |
| `role_permissions` | `role_id`, `permission_id`, `granted_at`, `granted_by` | Which permissions a role holds; editable by a Business Admin | FR-052 |
| `user_roles` | `id`, `tenant_id`, `user_id`, `role_id`, `assigned_by`, `assigned_at`, `revoked_at` | Binds a user to a role inside one tenant; a user may hold roles in several tenants | FR-049, FR-055 |
| `user_branch_assignments` | `id`, `tenant_id`, `user_id`, `branch_id`, `assigned_by`, `assigned_at` | Binds a user to the branches they may operate in | FR-040 |
| `invitations` | `id`, `tenant_id`, `email`, `phone`, `role_id`, `branch_ids`, `token_hash`, `expires_at`, `accepted_at`, `invited_by` | Pending invitation carrying role and branch scope | FR-045, FR-046 |

### Role rules

1. Exactly four system roles exist per tenant; they are seeded in the same transaction as the business (FR-021, FR-051).
2. A Business Admin may edit the permission set of any role through `role_permissions` (FR-052).
3. `admin.*` permissions can never be removed from the Business Admin role; the request is rejected with `409 ADMIN_PERMISSION_IMMUTABLE` (FR-053).
4. Role and permission checks are enforced server-side on every endpoint and default to deny (FR-054).
5. One user account may hold roles in more than one business through `user_roles`; the active business is selected per request and membership is re-validated on every request (FR-032, FR-055).
6. Replacing a user's role assignments takes effect on that user's next request; the permission cache for that user is invalidated immediately (FR-049).
7. Deactivating a user revokes their sessions and refresh tokens within the same request (FR-056).
8. Historical attribution of a deactivated user's sales, receipts and stock movements is preserved (FR-057).
9. MFA requirements are evaluated per role, not per user (FR-059).
10. The permission catalogue is exposed to the client for role configuration screens (FR-060).
11. A user with no role in the active tenant receives `403 TENANT_ACCESS_DENIED` (FR-033).
12. A Cashier or Inventory Clerk with no branch assignment receives `403 BRANCH_SCOPE_REQUIRED` on any branch-scoped operation (FR-041).

### Branch scope model

| Role | Branch scope | Enforcement behaviour | Requirement refs |
|---|---|---|---|
| Business Admin | All branches in the tenant; may switch the active branch freely | `BranchScopeGuard` applies no branch filter | FR-035, FR-038 |
| Branch Manager | Assigned branches only; dashboard and reports scoped to the active branch | `BranchScopeGuard` injects the allowed branch set into every query; dashboard returns branch-scoped figures | FR-082, FR-094 |
| Cashier | Exactly one assigned branch; POS, sales and receipts scoped to it | `BranchScopeGuard` rejects with `403 BRANCH_SCOPE_REQUIRED` when no assignment exists; sales queries are filtered to the assigned branch | FR-041, FR-042, FR-174 |
| Inventory Clerk | Assigned branches; balances, movements, transfers and counts scoped to them | `BranchScopeGuard` injects the allowed branch set; cross-branch reads return `404` | FR-041, FR-042 |

A deactivated branch blocks new sales while keeping its history readable (FR-037). Negative-stock configuration may be overridden per branch (FR-043).

### Role lifecycle audit

| Event | Action code | Requirement refs |
|---|---|---|
| Role assignment created or replaced | `rbac.user_roles.replaced` | FR-049, FR-050 |
| Role permission set changed | `rbac.role_permissions.changed` | FR-052 |
| Invitation created | `rbac.invitation.created` | FR-045 |
| Invitation accepted | `rbac.invitation.accepted` | FR-047 |
| User deactivated / reactivated | `rbac.user.deactivated` / `rbac.user.reactivated` | FR-058 |
| Branch created / updated / deactivated | `tenancy.branch.created` / `.updated` / `.deactivated` | FR-044 |
| User assigned to a branch | `tenancy.branch.user_assigned` | FR-040, FR-044 |

Every entry records actor, action, target type, target id, timestamp and context (FR-092, FR-097).

---

## Permission Matrix

### Permission catalogue

| Permission code | Module | Description | Requirement refs |
|---|---|---|---|
| `dashboard.view` | Dashboard | View the dashboard summary | FR-081, FR-082 |
| `admin.business.view` | Tenancy | View business profile, registration and tax information | FR-025, FR-034 |
| `admin.business.manage` | Tenancy | Update business profile, TIN, registration number, address, currency and