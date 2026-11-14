# SokoOS Publish-Readiness Review — 2026-11-15

Purpose: gap analysis before publishing. Sources: full quality-gate runs, `docs/audit/AUDIT.md`
(findings F-01…F-25 and repair log), a codebase production-readiness sweep, and live end-to-end
verification of auth flows. This is the working checklist for the DevOps run that follows.

## 1. What is solid (verified this session)

- **Quality gates**: API 9 suites / 37 tests pass; web + API + shared typecheck and lint clean;
  worker now compiles (was broken — fixed 2026-11-15); web production build passes.
- **Core product is real**: auth (register → verify → login → MFA → lockout → password reset),
  RBAC with per-business role scoping and branch enforcement, catalogue, stock ledger with atomic
  decrement, sales with financial invariants (line totals = sale total, payments must cover),
  refunds with cumulative caps, transfers lifecycle, purchasing with over-receipt protection,
  day closure on `Africa/Kampala` boundaries, reports, audit log, in-app notifications.
- **Security posture (post-audit)**: tenant guard fails closed (F-01), per-business permissions
  (F-02), branch assignment checked (F-03), suspended/deleted users rejected (F-13), MFA attempt
  caps (F-14 partial), helmet + CORS + global rate limit (100 req/min), argon2 password hashing,
  Zod-validated endpoints.
- **Password reset works end-to-end** (verified live 2026-11-15: wrong code rejected, code
  single-use, old password rejected, sessions revoked).
- **Mobile app** (`apps/mobile`) is a real functional Expo app (~30 screens, typed API client).
- **Audit repair status**: F-01…F-13, F-15, F-18, F-24 fixed with regression tests.

## 2. Blockers for a public launch (money/users touch the real world)

| # | Blocker | Evidence | Notes |
|---|---|---|---|
| B-1 | **No git repository** — nothing is version-controlled; deploys need a repo | `Test-Path .git` → false | Fixed in DevOps run |
| B-2 | **Signup un-verifyable in production**: `SMS_PROVIDER=mock`, no SMS sending code exists, and `devCode` is suppressed when `NODE_ENV=production` | `auth.service.ts:72,91`; sweep Q7 | New businesses can never verify a phone or reset a password in prod. Pilot-mode flag added in DevOps run; real SMS (Africa's Talking) is the real fix |
| B-3 | **Mobile money never completes**: no provider HTTP call, no webhook endpoint; payments stay PENDING forever; expiry processor is a stub | sweep Q3, Q4; F-10 history | App fails honestly (`PAYMENT_PROVIDER_NOT_CONFIGURED`), cash payments fully work → pilot can run cash-only |
| B-4 | **Uploads don't exist**: no upload endpoint, `Attachment` rows never written, product images unsupported; storage env vars unused | sweep Q5 | Spec requires image/document storage; acceptable for a cash-only pilot if users are told |
| B-5 | **Web deploy env**: `NEXT_PUBLIC_API_URL` is inlined at build time; committed `apps/web/.env` pins localhost. CORS allows exactly one origin (`FRONTEND_URL`) | sweep Q1, Q9 | Set at build time in CI; `FRONTEND_URL` must equal the deployed web origin |
| B-6 | **Invitations cannot be accepted** (F-21 open): raw invitation token never delivered | AUDIT.md repair log | Blocks the "add a staff member" journey for a new business |

## 3. High-priority defects to fix before/soon after launch

- **F-16** — JWT in `sessionStorage`, no refresh-token flow in the web client (API supports refresh).
- **F-17** — sequential document numbers use `count + 1` → race/collision under concurrency.
- **F-19** — audit entries hardcode `actorRoleCode`, omit IP/user-agent; auth events unaudited.
- **F-14 remainder** — recovery-code login and admin-MFA enforcement incomplete.
- **F-20** — all 4 BullMQ processors are TODO stubs (payments never expire, exports/low-stock simulated).
- **Swagger `/docs` is public in every environment** — gated in DevOps run.
- **Env schema accepts example secrets in production** (`JWT_SECRET="change-me…"`, localhost
  `FRONTEND_URL`) — production refinements added in DevOps run.
- **Test gaps**: no unit tests for `debts` and `worker` modules; auth suite is flaky under parallel
  turbo load (passes standalone — 1 flaky failure observed, rerun green).
- **Desktop app is scaffolding only** (Tauri shell, no auth/sync per its own README).

## 4. Known gaps / later (documented, not launch-blocking for a pilot)

- No Prisma migration history (baseline created in DevOps run); no integration test suite; E2E covers 2 journeys only.
- Worker requires Redis (not installed locally); nothing in the API enqueues today, so it can deploy later without loss.
- F-22 (adjustment stock race, partial), F-23 (re-print increments printCount), F-25 (unused `api-client` package reference).
- BigInt money serialized via `Number()` — lossy above 2^53 (fine for UGX magnitudes).
- No external monitoring/APM; logging is requestId + console. Backups rely on the managed Postgres provider.
- No README.md at repo root (created in DevOps run).

## 5. DevOps run (2026-11-15) — what was done

1. Git initialized with `.gitignore` and an initial commit (B-1).
2. `README.md` at root; `apps/web/.env.example` added; real `.env` files git-ignored.
3. Production env hardening: `FRONTEND_URL` must be a real origin and example secrets rejected
   when `NODE_ENV=production`; `PILOT_MODE` flag added (B-2 interim: returns verification/reset
   codes in the response when no SMS provider exists — explicitly opt-in, for pilot deploys only).
4. Swagger `/docs` disabled in production.
5. Prisma baseline migration `0_init` generated from the schema so `prisma migrate deploy` works
   on a fresh managed database (existing DBs: `prisma migrate resolve --applied 0_init`).
6. `render.yaml` blueprint for Render (api + web + postgres) — the documented hosting target.

## 6. The real fixes that remain (next work, in order)

1. Real SMS provider integration (Africa's Talking) → retire `PILOT_MODE`.
2. Invitation accept journey (F-21) with token delivery.
3. Web refresh-token flow + secure token storage (F-16).
4. MTN/Airtel MoMo integration: provider call + signed webhook + reconciliation (replaces stubs).
5. Uploads to S3-compatible storage + product images (B-4).
6. Race-free document numbering (F-17) and audit metadata (F-19).
7. Worker processors made real once Redis is provisioned (F-20).
8. Debts/worker unit tests; more E2E journeys; integration suite with a test database.
