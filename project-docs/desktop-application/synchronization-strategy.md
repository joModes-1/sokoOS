# Synchronization Strategy — SokoOS Desktop Track

**Purpose:** Define how the desktop application synchronizes local SQLite data with the existing backend: what is synchronized, how it is synchronized, how conflicts and retries work, and what backend support is required.

**Status:** Design phase. Implementation should not begin until this strategy and the required backend support are agreed.

---

## 1. Sync model overview

The desktop sync engine is a structured client-side synchronizer, not a bulk database upload.

It has three concerns:
- **Outbox:** local operations staged while offline or while online-but-async.
- **Pull:** incremental download of server-side changes for mirrored data.
- **Reconciliation:** matching local pending work to server results, handling conflicts, failures, and retries.

The backend remains the system of record. Sync is the mechanism that moves local work into that system safely and brings server changes back to the device.

---

## 2. What is synchronized

Not everything is synchronized, and not everything is synchronized the same way.

### 2.1 Typically synchronized outward from the device
- Locally created sales and related payment/refund records, where supported.
- Locally created transfer/purchasing/expense records that the backend accepts.
- Locally created reference data entries where the backend allows them.
- Files captured locally and uploaded through the attachment flow.

### 2.2 Typically synchronized inward to the device
- Business and branch context for the active session.
- Catalogue and pricing context needed offline.
- Customer/supplier context needed offline.
- Recent transactions and balances needed for offline visibility and reconciliation.
- Server-side state changes relevant to pending local operations.

### 2.3 What is not blindly synchronized
- The entire PostgreSQL database is not mirrored to every device.
- Large historical datasets are fetched incrementally or on demand.
- Data the local app does not need for offline operation is not pulled just because it exists.

---

## 3. Outbox design

### 3.1 Purpose
The outbox holds operations the user performed locally that need to be sent to the server.

### 3.2 Outbox record contents
Each outbox entry should include:
- A unique local operation id.
- The operation type and payload.
- Created timestamp.
- Status: pending, processing, synced, failed.
- Retry metadata: attempt count, last attempt time, backoff state.
- Error context for failures.
- Any server-assigned id returned after sync, when applicable.
- Idempotency key where the backend operation requires one.

### 3.3 Ordering and grouping
- Related operations can be grouped so a sale and its payments are processed together where the backend requires it.
- Ordering matters for financial operations: the local engine should preserve the user’s intended sequence for disjoint operations and use safe retry behavior for dependent ones.

---

## 4. Outbox lifecycle

- **pending:** created locally, not yet sent.
- **processing:** being sent or prepared to send.
- **synced:** confirmed by the server where applicable.
- **failed:** could not be synchronized; may be retried or flagged for review.

Transitions must be durable. If the app crashes, the outbox should still reflect the actual state on restart.

---

## 5. Pull-based incremental synchronization

### 5.1 Approach
The device should not re-fetch everything on every sync. It should ask the server for changes since the last successful sync point for each mirrored dataset.

### 5.2 Sync metadata
The local side keeps:
- Per-dataset sync cursors or timestamps.
- Last successful sync time.
- Any conflict markers or notes.

### 5.3 Pull scope
Pull is selective:
- Only mirrored datasets are pulled.
- Only the data the local app needs for its offline scope is cached.
- Large reference data may be cached with eviction or paging rather than stored forever.

---

## 6. Push synchronization

### 6.1 How pushes work
The engine sends pending outbox operations to the backend in a safe order, using the existing REST API where possible.

### 6.2 Idempotency
Where the backend uses idempotency keys, the local operation must supply a stable key so retries do not create duplicates. The local id and the idempotency key should be related in a way the sync engine can reason about.

### 6.3 Safe retries
- Retries should be safe for idempotent operations.
- For non-idempotent or sensitive operations, the engine should not blindly blast retries; it should use backoff and, where needed, stop for manual review.

---

## 7. Backend support required

Before sync can be reliable, verify that the backend provides, or can provide, the following. This list is a dependency list, not a claim that everything already exists.

### 7.1 Idempotency
- Stable idempotency semantics for offline-created mutations.
- Clear behavior when the same logical operation is retried.

### 7.2 Conflict/version visibility
- A way for the client to tell whether a mirrored record changed since the last sync.
- Version or timestamp metadata sufficient to detect conflicts.

### 7.3 Incremental change visibility
- A reliable way to ask “what changed since X” for the datasets the desktop app mirrors.
- Or a backend-supported cursor/feed that supports incremental pull.

### 7.4 Offline-friendly create semantics
- Clean handling of locally staged records.
- Predictable mapping from local operation to server record.
- Clear error signaling when a local operation cannot be accepted.

### 7.5 Retry safety
- Payment initiation, sale commit, and other sensitive mutations must not become duplicated simply because the client retried.
- Error responses must be distinguishable: conflict, stale data, validation failure, transient network error, provider error, etc.

If the backend does not support one of these today, the sync strategy must list the exact change needed and pause that part of sync until the backend is ready.

---

## 8. Conflict detection

Conflict means the local operation or local state is no longer consistent with the server state in a way that matters.

Detection can come from:
- Server rejecting a local operation because the server state changed.
- Version/timestamp mismatch on a mirrored record.
- A local operation that is impossible given current server state.
- A server-side change that conflicts with a locally staged change.

The engine should detect these explicitly and surface them rather than silently picking an answer for sensitive records.

---

## 9. Conflict resolution by record type

### 9.1 Financial transactions
- Server-authoritative for history.
- No silent overwrite of completed sales, payments, refunds, or movement records.
- Corrections go through proper adjustment/reversal/return mechanisms, consistent with the existing platform.

### 9.2 Stock movements
- Movement history is authoritative in the sense that it should not be silently replaced.
- If a local stock operation conflicts with server state, the engine should not invent a different stock history to force a match.

### 9.3 Customer and supplier records
- Server-authoritative for master data where the server manages it.
- Local edits may be staged; if the server record changed, the conflict should be surfaced.

### 9.4 Product and supplier information
- Where admins manage master data centrally, server changes generally win over local offline edits.
- Local offline edits may still be queued, but the reconciliation rule should be explicit.

### 9.5 User permissions and business settings
- Server-authoritative.
- Local offline changes to these should not silently override server policy.

### 9.6 Local-only or request-style records
- Local drafts, requests, or staged operations that have not yet been accepted by the server can often be retried, refined, or confirmed later.
- Their resolution depends less on overwrite rules and more on whether the server accepts them when connectivity returns.

---

## 10. Conflict presentation

The app should tell the user, in plain operational terms:
- What conflicted.
- Why it conflicted.
- What the local version was.
- What the server version is, if relevant.
- What the proposed resolution is, if any.
- What the user needs to do, if anything.

For sensitive financial conflicts, never silently choose a resolution that changes history.

---

## 11. Retry and backoff

### 11.1 Retry policy
- Exponential backoff with a cap.
- Jitter or spacing to avoid hammering the server.
- Retry only for appropriate error classes.

### 11.2 When not to retry automatically
- Validation failures that are unlikely to change without user action.
- Conflicts that require user decision.
- Operations that the server has explicitly rejected in a non-transient way.
- Situations where retrying would create confusion or duplication risk.

### 11.3 Manual retry
- The app should allow manual retry and manual review of failed operations.
- Users should be able to see which operations are pending, failed, or need attention.

---

## 12. Sync logging and visibility

### 12.1 Logs
The sync engine should keep logs sufficient for diagnostics:
- Sync start/end.
- Operations pushed and pulled.
- Success/failure per operation.
- Conflict events.
- Retry events.
- Errors and error context.

### 12.2 User-visible sync state
- Last sync time.
- Pending count.
- Failed count.
- Current online/offline state.
- Any operations awaiting user action.

---

## 13. Recovery after crashes and restarts

### 13.1 Recovery guarantees
- Pending and failed operations survive restarts.
- Processing state is recoverable without losing the intent of the operation.
- The outbox can be inspected after a crash.
- The app should not lose local work simply because sync was interrupted.

### 13.2 Recovery behavior
- On restart, the engine should reconcile in-flight operations.
- If an operation was processing during a crash, the engine should determine whether it needs to be retried, abandoned, or reviewed.
- The app should not assume an operation succeeded just because it was sent once.

---

## 14. Manual and automatic sync triggers

### 14.1 Automatic sync
- When connectivity returns.
- On a reasonable periodic basis for pull updates.
- After local changes where immediate sync is safe and useful.

### 14.2 Manual sync
- The user can force a sync.
- Manual sync is useful for retries, review, and explicit reconciliation.

### 14.3 Sync constraints
- Sync does not override offline status indicators prematurely.
- Sync does not claim success before the backend confirms it.
- Sync respects rate limits and transient error handling.

---

## 15. Duplicate prevention

Duplicate prevention is a first-class requirement for financial data.

It depends on:
- Stable local operation ids.
- Backend idempotency where applicable.
- Careful ordering and retry behavior.
- Conflict detection so the engine does not re-push an already-synced operation as if it were new.
- Clear local state transitions so a synced operation is not treated as pending again.

The goal is not just “don’t send the same HTTP request twice.” The goal is “don’t create duplicate financial effects.”

---

## 16. Partial synchronization failures

Sync may succeed for some datasets or operations and fail for others. The engine must:
- Track success/failure per operation or per dataset, not just overall.
- Continue where safe.
- Leave failed items in a clearly reviewable state.
- Not leave the local DB in an inconsistent “half-synced” state for sensitive data.

---

## 17. Synchronization contract summary

For the desktop sync engine to be safe, the backend must support:

| Contract aspect | Why it matters |
|---|---|
| Idempotent offline mutations | Prevents duplicate financial effects |
| Conflict/version visibility | Enables safe pull and conflict detection |
| Incremental change retrieval | Avoids full data reloads and stale caches |
| Predictable offline-create handling | Makes staged records reconcile cleanly |
| Clear error classification | Allows correct retry vs. conflict vs. failure handling |
| Safe retry semantics | Prevents duplication from transient failures |

Until these are confirmed, sync implementation should be limited to the parts that do not depend on missing backend capabilities.

---

## 18. Decisions recorded here

1. Sync is structured outbox + incremental pull + reconciliation, not a bulk upload.
2. Financial operations use stable ids and idempotency to avoid duplication.
3. Conflicts are record-type-specific and often server-authoritative for financial history.
4. Corrections use proper adjustment/reversal/return semantics.
5. Sync logs and user-visible sync state are required, not optional.
6. Crash recovery must preserve pending work and outbox state.
7. Backend support for idempotency, conflict visibility, incremental pull, and safe retry is a prerequisite for full sync, and is flagged as a dependency.
