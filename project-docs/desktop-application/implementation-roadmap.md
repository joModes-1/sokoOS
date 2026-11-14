# Implementation Roadmap — SokoOS Desktop Track

**Purpose:** Sequence the desktop work in controlled stages, with clear entry/exit criteria, so the existing platform stays intact and financial integrity is not regressed.

**Status:** Roadmap phase. The first implementation milestone is scaffolding; later stages depend on the architecture and sync strategy being agreed.

---

## 1. Guiding principles

- Reuse first: schemas, money, error codes, permissions, UI patterns, API client ideas.
- Preserve the existing web, mobile, backend, and DB.
- No new business rules that conflict with the existing platform.
- Offline and sync are designed before they are implemented.
- Backend dependencies are identified before sync implementation.
- Security-relevant decisions are reviewed before release.

---

## 2. Phase 0 — Investigation and architecture (this pass)

Deliverables:
- Existing system architecture doc
- Business types and modules doc
- Database analysis doc
- Frontend/backend integration doc
- Reusable components and business logic doc
- Desktop application architecture doc
- Offline-first architecture doc
- Synchronization strategy doc
- Desktop security strategy doc
- Implementation roadmap
- Progress tracking document

Exit criteria:
- The existing platform is understood well enough to reuse its contracts safely.
- The desktop architecture is written and reviewable.
- The sync and security designs exist and list their backend dependencies.
- The roadmap’s first implementation phase is clear.

Current status: this phase is in progress and largely complete for the documentation package.

---

## 3. Phase 1 — Desktop scaffolding

Goals:
- Create `apps/desktop` as a Tauri 2 project alongside the existing apps.
- Set up React + TypeScript UI foundation.
- Wire a small secure command surface in Rust for platform capabilities.
- Prove the app launches, shows a professional shell, and can talk to the existing backend online.

Exit criteria:
- The desktop app starts and renders a shell.
- Basic navigation and window behavior work.
- The app can authenticate and call the existing API online.
- No existing app is disrupted.

---

## 4. Phase 2 — Shared reuse integration

Goals:
- Reuse shared schemas, money helpers, error codes, and permission constants.
- Reuse or adapt the API client pattern.
- Reuse UI design language and component patterns.

Exit criteria:
- Forms and payloads use the same contracts as the existing platform.
- Money handling is consistent with the existing minor-unit model.
- Error mapping uses the existing error codes.
- UI looks and feels like SokoOS, not a separate product.

---

## 5. Phase 3 — Local SQLite foundation

Goals:
- Add local SQLite storage.
- Implement local schema and migrations for offline-relevant data.
- Implement secure local storage for session material.
- Implement basic local reads from cached data.

Exit criteria:
- The app can store and read local data.
- Migrations are upgrade-safe.
- Sensitive material is stored securely.
- The app can open and use cached data without the server for supported reads.

---

## 6. Phase 4 — Offline operations

Goals:
- Make supported operations work offline.
- Stage offline work as structured records in an outbox.
- Add offline status UI that is honest about local vs synced state.
- Ensure restart resilience for pending work.

Exit criteria:
- Supported offline operations can be performed and persisted locally.
- The app indicates offline/pending state clearly.
- Pending work survives restart.
- The app does not claim synced status prematurely.

---

## 7. Phase 5 — Synchronization engine

Goals:
- Implement the outbox, push, pull, retry, logging, and conflict handling described in the sync strategy.
- Implement recovery after restart/crash.
- Implement manual and automatic sync triggers.
- Implement duplicate prevention for financial operations.

Exit criteria:
- Pending operations sync when online.
- Server changes can be pulled for mirrored data.
- Conflicts are detected and presented appropriately.
- Failed operations can be retried or reviewed.
- Sync logs are available.
- The app does not create duplicate financial effects through naive retry.

Note: this phase depends on the backend support listed in the sync strategy doc. If any required backend capability is missing, implement or request that backend change first.

---

## 8. Phase 6 — Security hardening and review

Goals:
- Constrain Tauri capabilities.
- Harden IPC and local storage.
- Review business isolation locally.
- Review sync safety for financial operations.
- Confirm logs do not leak secrets.

Exit criteria:
- Security review of the desktop app is complete for the release scope.
- Capability surface is intentionally limited.
- Credential/session handling is secure.
- Sync cannot create duplicates through unsafe retry.

---

## 9. Phase 7 — Testing

Goals:
- Unit tests for sync, outbox, conflict handling, and local DB logic.
- Integration tests for sync scenarios where possible.
- End-to-end scenarios for:
  - launch
  - authenticate
  - select business/branch
  - record offline sale
  - verify local persistence
  - disconnect
  - record more offline work
  - restart
  - restore connectivity
  - sync
  - verify results
- Duplicate sync, crash recovery, conflict, permission, and migration tests.

Exit criteria:
- Tests exist and pass for the implemented scope.
- No test is weakened to hide a real failure.
- Offline and sync behavior is verified, not just coded.

---

## 10. Phase 8 — Windows build and packaging

Goals:
- Produce a Windows build.
- Configure MSI and NSIS EXE installer packaging.
- Verify the app launches and runs on a clean Windows environment conceptually, including WebView2 requirements.

Exit criteria:
- A Windows installer build exists.
- WebView2/bootstrap strategy is documented.
- Installation preserves local data and sync queue.

---

## 11. Phase 9 — macOS build and packaging

Goals:
- Produce a macOS build configuration for Apple Silicon and, where feasible, Intel.
- Configure DMG and .app bundle packaging.
- Document Apple code signing and notarization requirements.

Exit criteria:
- A macOS build configuration exists.
- Signing/notarization requirements are documented.
- The gap between “buildable here” and “signed/notarized for distribution” is explicit.

---

## 12. Phase 10 — Documentation and delivery

Goals:
- Installation documentation.
- Offline and sync documentation.
- Troubleshooting documentation.
- Development documentation.
- Final report covering what was discovered, reused, newly implemented, and left as limitations.

Exit criteria:
- The desktop app is documented for installation, operation, sync, and troubleshooting.
- The final report distinguishes implemented, tested, and verified functionality.

---

## 13. Decision checkpoints before risky work

Before any of the following, pause for review:
- Any change that affects existing production functionality.
- Any change that affects financial data integrity.
- Any change to authentication or token/session storage.
- Any backend migration or new backend endpoint for sync.
- Any change that could affect existing customers.
- Any expansion of Tauri capabilities or native access.
- Any change to how offline financial operations are staged or synced.

---

## 14. Current roadmap status

- Phase 0: in progress / substantially complete for documentation.
- Phase 1 through Phase 10: not started yet.
- The next implementation step after this documentation package is Phase 1 scaffolding, once the architecture and sync/security designs are reviewed.

---

## 15. What is intentionally deferred or conditional

- Full module-by-module offline coverage is incremental, not all at once.
- macOS signing/notarization depends on macOS infrastructure and credentials.
- Local network peer sync is a potential future extension, not a first-phase requirement.
- Backend sync contract changes are a dependency, not assumed to exist.
- Any feature that would require rewriting existing working modules is deferred unless there is a clear technical reason.
