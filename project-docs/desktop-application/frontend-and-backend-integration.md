# Frontend and Backend Integration — SokoOS Desktop Track

**Purpose:** Describe how the existing frontend and backend integrate today, so the desktop app can reuse the same contracts and patterns without breaking them.

**Sources:** `apps/web/src/lib/api-client.ts`, `apps/web/src/hooks/use-queries.ts`, `apps/api/src`, `packages/shared`, Playwright E2E, and the existing audit.

---

## 1. Integration style

- The web frontend talks to the backend over REST with a `/v1` prefix.
- The API client physically calls `http://localhost:3001/v1/...` in local development unless `NEXT_PUBLIC_API_URL` is set.
- The API is a NestJS/Fastify backend with Swagger/OpenAPI at `/docs`.
- The frontend uses TanStack Query for server state and a typed fetch client for mutations and ad-hoc reads.

This is a standard request/response API, not a WebSocket-first real-time system, which is good news for a desktop sync design: the same REST contract can be used for online operation and for replaying staged offline operations.

---

## 2. Auth integration today

- Login sends credentials to `/auth/login`.
- If MFA is required, the client handles a challenge step through `/auth/login/mfa`.
- On success, the client stores `accessToken` and `refreshToken` and business/branch context in session storage, then routes to `/dashboard`.
- The API client attaches `Authorization: Bearer ...` and business/branch headers automatically.

For the desktop app:
- The same auth endpoints and token semantics apply.
- The desktop client must manage token storage securely in the native app context, not in browser storage.
- The desktop app must still choose an active business and branch for scoped operations.

---

## 3. Request/response shape today

- Successful responses are JSON.
- Errors use a machine-readable envelope with a code, message, optional details, and a request id.
- Shared error codes exist in `packages/shared/src/errors/index.ts`.
- The frontend throws `ApiError` and maps 401 to a login redirect.

Desktop implication:
- The desktop app should reuse the same error-code vocabulary.
- It should treat 401, 403, 404, 409, 422, and 429 as distinct UX cases, not as generic failures.
- Request ids are useful for desktop logging and support diagnostics.

---

## 4. List endpoint shape today

- Many API list endpoints return pagination shapes such as `{ data, total, page, limit }`.
- The web frontend originally had its own hook shape expectations that did not always match the API, and that mismatch was fixed for core flows in the audit.
- The desktop app should follow the real API response shapes, not a guessed one.

---

## 5. Mutation contracts relevant to the desktop app

The most important mutation contracts for an offline-capable desktop app are:

- Sale commit with idempotency key, items, discount, and payments.
- Payment initiation with idempotency key, method, amount, optional phone, and optional tendered amount.
- Refund creation against sale items with quantity and restock.
- Transfer creation, approval, dispatch, receive, close.
- Purchase order creation and goods receipt creation, including over-receipt confirmation.
- Stock adjustments with reason and batch/expiry context.
- Day closure with branch, business date, denominations, counted cash, and discrepancy reason.

All of these have real shared Zod schemas in `packages/shared/src/schemas`. That is the best reuse target for the desktop app’s form/validation layer.

---

## 6. Idempotency today

- Sale commit uses `idempotencyKey`.
- Payment initiation uses `idempotencyKey`.
- The audit fixed several idempotency/amount issues so that payments are not accepted for any amount and idempotency is properly tenant-scoped.

Desktop implication:
- Local offline operations should be prepared with stable local ids and idempotency keys before sync.
- The desktop app should never invent new non-idempotent financial mutations; every financial write should be designed to be replay-safe.

---

## 7. File and attachment integration

- There is an attachments API and object storage for documents and product images.
- Files are partitioned by tenant in the existing model.
- Product images, documents, and exports exist in the platform.

Desktop implication:
- Offline file capture (for example, photos or scans) should be stored locally and uploaded through the same attachment flow when online, respecting tenant partitioning.
- The desktop app should not assume it can write directly to the object store.

---

## 8. Background jobs and async reality

- The backend has BullMQ-based jobs for payment expiry, notifications, low stock, exports, imports, and so on.
- Some processors are placeholders today, and some behavior runs on request rather than as background jobs.

Desktop implication:
- The desktop app cannot assume every backend action is synchronous or instantly consistent.
- Sync success/failure and job outcomes should be reported to the user as distinct states, not assumed away.

---

## 9. Reuse strategy for integration

Reuse directly:
- Shared Zod schemas.
- Shared error codes.
- Shared money formatters.
- The API client pattern and auth flow concepts.
- Playwright journeys as cross-checks for real API behavior.

Reuse with adaptation:
- TanStack Query usage patterns can inform desktop state fetching, but Tauri may require its own data-fetching and caching approach.
- UI component patterns can be reused, but the desktop app is not a Next.js app.

Do not reuse as-is:
- Browser storage for tokens.
- Next.js routing/data fetching.
- Web-only devtools and SSR assumptions.

---

## 10. Backend changes the desktop app may need

Before building sync, the desktop track should confirm whether the backend needs any of the following:
- Idempotency key conventions that are stable across devices.
- Conflict/version metadata on mutable records.
- Incremental change feed or reliable last-sync cursor support for the records the desktop app will mirror.
- New endpoints or fields needed to support offline-created records cleanly.
- Safer retry semantics for payment initiation and other sensitive mutations.

These are not assumed to exist today. They are flagged here as dependencies to verify and, if needed, request before implementing sync.
