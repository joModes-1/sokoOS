# Progress — SokoOS Desktop Track

**Purpose:** Track the desktop project status against the approved phases.

**Last updated:** 2026-11-12

---

## Investigation

- Repository investigated for desktop-relevant reuse, integration, business model, and DB reality: **Completed**
- Existing system architecture documented: **Completed**
- Business types and modules documented: **Completed**
- Database analysis documented: **Completed**
- Frontend/backend integration documented: **Completed**
- Reusable components and business logic documented: **Completed**
- Backend dependency watchlist for sync added to existing-system-architecture.md: **Completed**

## Architecture

- Desktop application architecture doc: **Completed**
- Offline-first architecture doc: **Completed**
- Synchronization strategy doc: **Completed**
- Desktop security strategy doc: **Completed**
- Implementation roadmap doc: **Completed**
- Architecture review raised as a review checkpoint before Phase 1 implementation: **In progress** (documentation-only / scaffolding-only work is allowed without review; see the Phase 1 report)

## Phase 0 — Environment pre-flight

- Node.js and pnpm verified in this environment: **Completed**
- Existing backend reachable at `http://localhost:3001/v1/health`: **Verified** (`{"status":"ok","version":"1.0.0",...}`)
- Rust toolchain (`rustc` / `cargo` / `rustup`) present for Tauri build/run: **Blocked** (not installed — see the Phase 1 report)
- Desktop documentation package internally consistent: **Completed**

## Scaffolding (Phase 1)

- `apps/desktop` Tauri 2 + React + TypeScript scaffold: **In progress** — frontend verified (lint / typecheck / test / build all pass); the Tauri shell is authored but launch/build is blocked on the missing Rust toolchain
- Shared reuse integration (schemas, money, errors, permissions, design language, adapted API client): **Completed** for the Phase 1 scope
- One unauthenticated online API call proven (`GET /v1/health`): **Completed**
- SQLite local foundation: **Not started** (Phase 3, gated behind a review checkpoint)

## Offline operations

- Offline-capable operations implemented: **Not started**
- Offline status UI implemented: **Not started**
- Restart resilience verified: **Not started**

## Synchronization

- Sync engine implemented: **Not started**
- Sync backend dependencies verified/added: **Not started**
- Conflict handling implemented: **Not started**
- Sync tests executed: **Not started**

## Security

- Tauri capabilities constrained: **Not started**
- Secure local storage for tokens/session implemented: **Not started**
- IPC review completed: **Not started**
- Security review for release scope: **Not started**

## Testing

- Desktop unit tests: **Not started**
- Desktop integration/sync tests: **Not started**
- E2E offline scenarios: **Not started**

## Build and distribution

- Windows build configuration: **Not started**
- macOS build configuration: **Not started**
- Installer packaging: **Not started**
- WebView2/bootstrap documentation: **Not started**
- macOS signing/notarization documentation: **Not started**

## Documentation and delivery

- Installation docs: **Not started**
- Offline/sync docs: **Not started**
- Troubleshooting docs: **Not started**
- Final report: **Not started**

---

## Blockers

- **Rust toolchain missing.** `rustc`, `cargo` and `rustup` are not installed in this
  environment, so `tauri dev` / `tauri build` cannot run and the Phase 1 "prove launch"
  exit criterion cannot be verified here. The Windows MSVC build tools required by Tauri
  on Windows are also unconfirmed. This is an environment blocker, not a code blocker.
  See `phase-1-scaffolding-report.md`.
- **PowerShell script execution is disabled on this machine** (`pnpm.ps1` is blocked by
  the execution policy), so pnpm must be invoked through `cmd` in this environment. This
  only affects local command invocation; it does not affect the app or its scripts.

## Status legend

- **Not started**
- **In progress**
- **Completed**
- **Blocked**
- **Verified**

---

## Notes

- This track is additive to the existing SokoOS platform and does not replace the website, mobile app, backend, or PostgreSQL database.
- Financial integrity is treated as a hard constraint throughout; offline and sync work is designed before implementation and depends on backend support for safe idempotency, conflict visibility, incremental pull, and retry safety.
- Windows builds are in scope for this environment; macOS signing and notarization are documented as requiring separate infrastructure and credentials.
