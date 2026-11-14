# Offline-First Architecture — SokoOS Desktop Track

**Purpose:** Define how the desktop application behaves when the server is unreachable, which data is available locally, which operations can be performed, and how the app keeps users informed without overpromising.

**Status:** Design phase. Sync-specific mechanics are covered in `synchronization-strategy.md`.

---

## 1. Offline-first definition for this product

Offline-first here means:
- The app launches and is useful without an immediate network connection.
- The app keeps a local SQLite store that supports reads and writes for supported operations.
- Offline actions are recorded locally with enough structure to sync later.
- The app clearly indicates offline status and sync state.
- The app never claims an operation has reached the server when it has only been saved locally.

It does not mean:
- Every backend feature is available offline.
- The local SQLite database is a second source of truth for financial history.
- Offline edits can violate the server’s financial/stock rules.

---

## 2. Local data model principles

### 2.1 What lives locally
- Enough reference data to be productive offline: for example, business context, current user, relevant products/variants, customers/suppliers context, branches, and recent transactions the user may need to see or act on.
- Local work: sales, payments, inventory entries, transfers, purchasing actions, expenses, and similar operations that the app supports offline.
- Sync metadata: outbox entries, sync cursors, retry state, error context, timestamps, conflict markers.

### 2.2 What does not live locally by default
- The entire central database does not get blindly downloaded to every device.
- Large historical datasets are fetched incrementally or on demand, not duplicated wholesale.
- Server-only administrative data that the local app does not need for offline operation is not mirrored unnecessarily.

### 2.3 Identity and isolation locally
- Every mirrored or locally created record keeps business and branch identity where the server does.
- Local data is scoped to the current local session/profile and the business the user is working with.
- Local storage does not become a loophole that exposes another business’s data.

---

## 3. Local reads

Offline reads should feel dependable for the data the app has cached:
- Catalogue lookup
- Recent sales and receipts
- Inventory balances and recent movements, where cached
- Customer/supplier context where cached
- Local pending operations
- Local reports computed from synchronized data where feasible

If data is not cached, the app should say so rather than fabricate it.

---

## 4. Local writes

### 4.1 General rule
Offline writes are staged locally as structured records with unique local identifiers and clear semantics. They are not “saved and forgotten”; they are prepared for later synchronization.

### 4.2 Supported offline operations
Likely supported with care:
- Recording a cash sale or other supported sale with payment details.
- Staging inventory-related entries where the app can express them without violating server rules.
- Recording customer/supplier data entry where appropriate.
- Recording expenses where supported.
- Creating draft or request-style transfer/purchasing records where the app can stage them for sync.
- Local searches over cached and pending data.

### 4.3 Operations that require caution
Some operations are not safe to treat as fully offline without server validation:
- Stock changes that could violate negative-stock policy or batch/expiry rules.
- Payment initiation that must be idempotent and cannot be duplicated by retries.
- Approvals or state transitions that depend on live server state.
- Day closure and other branch/time-sensitive operations.
- Goods receiving that affects balances and PO status.

For these, the offline UX should make the limitation explicit. The app may allow the user to prepare a request locally but should not pretend the server has accepted it.

---

## 5. Local session and authentication

### 5.1 Local session model
- After authentication, the app holds a session in secure local storage, not browser storage.
- The app should support a local session that lets the user continue working offline within the bounds of the permissions granted to that session.
- The app should still know the active business and branch for scoped operations.

### 5.2 Credential and token handling
- Tokens/session material must be stored securely using the desktop platform’s protected storage, not plain files or unencrypted local DB columns.
- Sensitive material should be accessed only by the parts of the app that need it.
- Offline login should not require inventing a separate insecure credential store.

### 5.3 Offline login UX
Two practical models:
- Keep a previously authenticated session locally so the user can reopen the app offline and continue working within that session’s permissions.
- If the app requires fresh server authentication before any local use, then offline use is limited to already-cached data or explicitly queued work from a prior online session.

The first model is better for a real offline-first POS-style tool. The app should support that where security allows.

---

## 6. Offline status communication

### 6.1 UI indicators
- Clear online/offline/synching state in the UI.
- Visible pending-sync count where relevant.
- Non-intrusive but obvious when the user is working offline.

### 6.2 Honest messaging
- “Saved locally” and “Pending sync” are different from “Saved” or “Synced.”
- If an operation cannot be completed offline, say what is missing and what will happen when connectivity returns.
- Do not imply server confirmation if there is none yet.

---

## 7. Data integrity while offline

### 7.1 Local rules mirror server intent
- Money remains integer minor units.
- Stock movements remain discrete where the server models them as discrete.
- State transitions remain constrained by the same kinds of lifecycle rules the server uses.
- Corrections still go through proper adjustment/reversal/return-style semantics, not silent overwrites.

### 7.2 Avoid local inconsistencies
- The app should validate locally what it can, but it should not treat local validation as equivalent to server enforcement.
- If a user could do something locally that the server would later reject, the app should either prevent it locally or queue it in a way that makes the eventual conflict resolvable and visible.

### 7.3 Restart resilience
- Unsynchronized data must survive app restarts.
- Pending operations and their state must be recoverable.
- Local DB and outbox must be updated atomically where it matters.

---

## 8. Local search

Local search should work over:
- Cached reference data
- Locally created records
- Pending operations
- Recently synchronized data within the offline cache window

It does not need to search the entire central database offline. It needs to search what the app has reasonably stored locally.

---

## 9. Offline reporting

Local reporting is supported where it can be computed from synchronized data and local pending work:
- Simple local summaries over cached data
- Local views of pending operations
- Reports that do not depend on live server state that is not cached

Reports that depend on server-computed aggregates or full history should either use cached data with a clear scope or wait until online.

---

## 10. What offline does not enable

Offline capability does not mean:
- Offline admin overrides.
- Offline permission expansion.
- Offline creation of financial records that bypass server rules.
- Offline creation of duplicate-unsafe mutations without idempotency keys.
- Offline confirmation of operations that require server validation.

---

## 11. Offline-first acceptance criteria

Before treating offline operation as done, verify:
- The app opens and is usable without network.
- Offline-capable operations can be performed and are stored locally.
- The app clearly shows offline/pending states.
- Restarting the app preserves pending work.
- Online action resumes and syncs pending work.
- Financial and stock data remains internally consistent locally.
- The app does not claim synced status prematurely.

---

## 12. Decisions recorded here

1. Offline support is scoped to supported operations, not the full platform.
2. Local SQLite is the offline workspace, not a second ledger.
3. Offline writes are staged as structured records with unique ids and sync metadata.
4. The app keeps an honest offline/synced/pending distinction in the UI.
5. Secure local session storage enables offline continuity without inventing insecure credential handling.
6. Local validation is helpful but never a substitute for server enforcement on sensitive operations.
