# Desktop Application Architecture — SokoOS Desktop Track

**Purpose:** Propose the desktop application architecture as a Tauri 2 application layered on top of the existing SokoOS platform. This document is a design, not yet the implementation.

**Status:** Design phase. Implementation begins after this document and the offline/sync/security docs are reviewed against the existing system.

---

## 1. Architectural goal

Build a professional, installable Windows and macOS desktop application that:

- Reuses the existing SokoOS backend, schemas, permissions, and business logic wherever possible.
- Preserves the existing multi-business, role-based, branch-scoped model.
- Works offline from a local SQLite store.
- Synchronizes reliably with the existing NestJS/PostgreSQL backend.
- Keeps financial and stock integrity intact during offline use and sync.

It does **not** replace the existing website, mobile app, NestJS backend, PostgreSQL database, or infrastructure.

---

## 2. High-level architecture

```
+---------------------------------------------------------------+
|  Tauri 2 desktop app                                          |
|  - React + TypeScript UI                                      |
|  - Tauri commands (Rust) for platform capabilities only        |
|  - Local SQLite database for offline work and sync staging     |
|  - Secure local storage for tokens/session                    |
|  - Sync engine + outbox + queue                               |
|  - App shell, menus, tray, logging, updates, hardware hooks   |
+---------------------------------------------------------------+
          |  secure IPC (Tauri commands)   |
          v
+---------------------------------------------------------------+
|  Existing Node.js backend (NestJS / Fastify / Prisma)         |
|  - System of record for financial and stock data              |
|  - Auth, tenancy, RBAC, branch scoping                        |
|  - REST /v1 API + OpenAPI docs                               |
|  - Existing BullMQ jobs, imports, exports, attachments        |
+---------------------------------------------------------------+
          |  REST over HTTPS               |
          v
+---------------------------------------------------------------+
|  PostgreSQL + Redis (existing infrastructure, unchanged)      |
+---------------------------------------------------------------+
```

Key design decisions:

- The desktop app is a **client** of the existing backend, not a second backend.
- Rust is used for native desktop capabilities, not as a second business-logic layer.
- SQLite is the offline/local store, not a replacement for PostgreSQL.
- React + TypeScript is the UI layer, reusing existing component patterns and shared logic where appropriate.

---

## 3. Application shell and windowing

### 3.1 Window model
- Main application window with a professional layout: sidebar/nav, main content area, status/synch indicator.
- Support window resize and reasonable keyboard navigation.
- Safe startup and shutdown: the app should be able to close even with pending offline work, preserving unsynchronized records in SQLite and the sync outbox.

### 3.2 Desktop shell features
- Application menu where appropriate.
- System tray support where useful, especially for retailers who want quick access and status visibility.
- Local logging for diagnostics.
- Update capability architecture planned early, even if final update delivery is implemented later.
- File import/export support for practical business workflows.

### 3.3 UI reuse
- Reuse the existing design language and component patterns from the web app.
- Reuse shared Zod schemas, money helpers, error codes, and permission constants.
- Reuse API client ideas, but adapt token storage and offline behavior for the desktop context.

---

## 4. Frontend architecture

### 4.1 Framework
- React + TypeScript inside Tauri.
- Vite-based desktop frontend if that is cleaner than forcing Next.js server-side patterns into a desktop app.
- The existing Next.js app is not forced into Tauri; if the web app is heavily SSR-dependent, the desktop app uses its own client-side React frontend that shares contracts and UI patterns.

### 4.2 State architecture
- Separate concerns:
  - UI state
  - Local SQLite-backed state
  - Synced server state
  - Pending offline operations
- The local SQLite store is the source of truth for what the user sees offline; the API is the source of truth for the enterprise record.

### 4.3 Navigation and module visibility
- The desktop app presents the modules the current business/user can actually use.
- Module visibility is driven by the existing permission model and any business configuration, not by hardcoding one layout for all industries.

---

## 5. Local SQLite architecture

### 5.1 Role of SQLite
SQLite stores:
- Cached business context and necessary reference data for offline use.
- Local work the user performed while offline.
- A sync outbox of pending operations.
- Sync metadata: cursors, timestamps, operation status, retry state, conflict indicators.
- Securely stored session material where the desktop app chooses to keep a session locally.

SQLite does **not** become a second financial ledger. It is an offline workspace and sync staging area.

### 5.2 Local schema approach
- Mirror only the entities needed for offline work, with the right business/branch identity and sync metadata.
- Keep money as integer minor units, consistent with the existing platform.
- Keep movement-like records as discrete events where the platform already does, rather than inventing local-only mutable state for financial history.
- Maintain a local “pending operations” table with unique ids, status, retry counts, error context, and ordering.

### 5.3 Migrations
- Use a migration system for the local DB.
- Migrations must be upgrade-safe so app updates preserve local data and pending sync queues.

### 5.4 Multi-user on one device
- Support multiple local profiles where appropriate, each tied to an authenticated user and business context.
- Respect business isolation locally: a local profile should not expose another business’s data.

---

## 6. Offline capabilities

### 6.1 What “offline” means here
Offline means the desktop app can continue productive work without contacting the server immediately, then synchronize later. It does not mean the desktop app becomes an independent accounting system with different rules.

### 6.2 Offline-capable operations
Likely offline-friendly:
- Viewing cached catalogues, customers/suppliers context, balances, and recent records.
- Recording sales with payments where the local app can stage the operation and sync later.
- Inventory lookups and some stock entry operations that can be queued.
- Customer/supplier data entry that can sync later.
- Expense recording where supported, staged for sync.
- Local search over cached and pending data.
- Local reporting from synchronized data where feasible.

### 6.3 Operations that need care
- Anything that changes stock in a way the server would reject.
- Anything that changes financial totals without clear reconciliation.
- Approvals or state transitions that depend on current server state.
- Day closure, which is branch-scoped and time-boundary-sensitive.
- Goods receiving against a PO, which affects balances and PO status.

For these, the desktop app should either:
- allow local creation of a request/record that still requires server validation on sync, or
- clearly tell the user the operation is queued and not yet confirmed.

---

## 7. Sync engine architecture

### 7.1 Design principles
- Not a dumb database upload.
- Structured, incremental, and replay-safe.
- Financial operations must not be duplicated or silently overwritten.
- Every locally created operation has a unique local id and stable idempotency keys where the backend uses them.
- The engine must recover cleanly after crashes and app restarts.

### 7.2 Core components
- **Local outbox:** pending operations with unique ids, status, payload, retry state, error context, timestamps.
- **Sync coordinator:** decides when to push, what to push, and how to reconcile results.
- **Pull side:** incremental download of server changes for mirrored entities.
- **Retry policy:** exponential backoff with caps, plus manual retry.
- **Logger:** sync log for diagnostics and support.
- **Conflict handler:** record-type-specific resolution rules.
- **Recovery path:** after crash/restart, the outbox and pending state must be inspectable and replayable.

### 7.3 Outbox operation lifecycle
- `pending` → `processing` → `synced` or `failed`
- Failed operations can be retried with backoff or marked for manual review.
- Idempotent backend operations mean retrying a successful logical operation should not duplicate it.

### 7.4 Sync directionality
- Pushes: locally created/updated operations staged while offline.
- Pulls: server-side changes for cached reference and transaction data the desktop app has chosen to mirror.
- Both directions need ordering/versioning/timestamps.

---

## 8. Synchronization contract (what the desktop app expects from the backend)

The sync engine is only as good as the contract it relies on. Before implementing sync, verify and, if needed, extend the backend to support:

- Stable idempotency keys for offline-created mutations.
- Conflict/version metadata for mirrored records.
- Incremental change visibility or a reliable cursor for what changed since last sync.
- Clear error semantics for conflict, stale data, and duplicate attempts.
- Safe retry semantics for sensitive operations.

If the backend cannot support these today, the sync design must list the exact backend changes required and pause sync implementation until they exist.

---

## 9. Conflict resolution policy

Conflict resolution is record-type-specific.

### 9.1 Server-authoritative patterns
For these, the server should win, with the desktop app surfacing the conflict rather than silently overwriting:
- Financial transaction history
- Payment records
- Stock movement history
- Customer/supplier records where the server is authoritative
- Product/supplier data where admins manage master data
- User permissions and business settings

### 9.2 Correction patterns
For accounting and financial records, corrections should use proper adjustment/reversal/return mechanisms rather than overwriting history. This is consistent with the existing platform’s financial integrity model.

### 9.3 Local-vs-server merge patterns
For some records, the right answer may be:
- Local wins if the server has not changed the record.
- Server wins if the server record is newer or authoritative.
- Merge with user review if both changed and the semantics allow it.
- Reject and ask the user if the change is unsafe to apply automatically.

The concrete rules should be documented per record type before sync implementation.

---

## 10. Multi-device and multi-user considerations

The desktop app must support:
- Multiple employees using the same business.
- Multiple devices for the same or different employees.
- User attribution for operations.
- Business isolation.
- Duplicate transaction prevention through backend idempotency and sync discipline.

Local network-only sync between devices is a potential future extension, not a first-phase requirement. It should be documented as such rather than built prematurely.

---

## 11. Hardware integration

Module/hardware integrations should be pluggable:
- Barcode scanners as input devices.
- Receipt printers where relevant.
- Other peripherals as needed.

Do not assume every device has the same hardware. Keep integrations modular so a business can use them only if they exist.

---

## 12. Security architecture summary

See `desktop-security-strategy.md` for the full strategy. In brief:
- Least-privilege Tauri capabilities.
- Secure IPC via Tauri commands, not unrestricted shell/filesystem access.
- Secure local token/session storage.
- Input validation on both the UI and sync layers.
- Business-level data isolation in the local DB.
- Protection against unauthorized local operations.
- No hardcoded secrets or signing credentials.

---

## 13. Build and distribution architecture

### 12.1 Targets
- Windows: MSI and NSIS EXE installer.
- macOS: DMG and .app bundle, with Apple Silicon support and Intel support where feasible.

### 12.2 Packaging assumptions
- End users do not install Node.js, Rust, or PostgreSQL.
- SQLite is initialized and managed by the application.
- Updates must preserve local databases and sync queues.

### 12.3 Build environment reality
- This environment is Windows.
- Windows builds can be produced or validated here.
- macOS signing/notarization and Apple-specific distribution require macOS infrastructure and credentials. Those should be documented as a separate track, with the desktop app prepared for them architecturally even if the actual signing happens elsewhere.

---

## 14. Non-functional requirements the desktop app must meet

Derived from the existing platform and the desktop requirements:
- Works offline for supported operations.
- Syncs when connectivity returns.
- Preserves data across restarts and updates.
- Keeps financial/stock integrity during sync.
- Surfaces offline status clearly.
- Does not claim an operation synced when it has only been saved locally.
- Is installable by ordinary business users.
- Is testable with Playwright-compatible flows where applicable and with unit/integration tests for sync and local DB logic.

---

## 15. What this architecture does not include yet

- Full UI screen-by-screen design (that follows in implementation and UI docs).
- Complete backend sync endpoint design (flagged as a dependency).
- Final packaging pipeline and signing workflow (flagged as environment-dependent).
- Local network peer sync (documented as a possible extension).
- Every module’s full offline behavior (to be implemented incrementally and verified).

---

## 16. Decisions recorded here

1. Tauri 2 + React + TypeScript + Rust-for-platform-only + SQLite local store + existing backend.
2. Desktop app is a client extension, not a replacement.
3. Local SQLite is for offline work and sync staging, not a second financial ledger.
4. Sync is structured and incremental, with an outbox, retry, logging, and conflict handling.
5. Financial conflicts use server-authoritative and correction-based patterns, not silent overwrites.
6. Windows builds are in scope here; macOS signing/notarization is documented as requiring separate infrastructure.
