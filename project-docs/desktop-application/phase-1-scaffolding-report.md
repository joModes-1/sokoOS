# Phase 1 Report — Desktop Scaffolding

**Phase:** 1 (Desktop scaffolding) — plus the Phase 0 pre-flight it depends on.
**Status:** Scaffolding delivered and verified for the parts that do not require the Rust
toolchain. The Tauri shell is authored but **unverified** because Rust is not installed in
this environment. **Review checkpoint below.**
**Date:** 2026-11-12

---

## 1. What changed

- Added a new, additive app `apps/desktop` — a Tauri 2 + React 19 + TypeScript + Tailwind
  client. No existing app, package, backend module, database object or schema was modified.
- The desktop frontend reuses platform contracts: `@sokoos/shared` schemas, money helpers,
  error codes and constants, the web design language (Sunset Savanna tokens/components),
  and an adaptation of `apps/web/src/lib/api-client.ts`.
- Proved **one unauthenticated online API call** to the existing backend: `GET /v1/health`.
- Authored the Tauri 2 native shell (Rust command surface, `tauri.conf.json`, least-privilege
  capabilities, icon generator), which will build once the Rust toolchain is installed.

Deliberately **not** done in this phase (gated behind the review checkpoint):
- No authentication wiring (no login flow, no token handling).
- No SQLite schema, no local storage of business/financial data.
- No sync engine, no outbox, no write path.
- No installer packaging.

## 2. Files added

All paths are under `apps/desktop/` unless stated otherwise.

| File | Purpose |
|---|---|
| `package.json` | Workspace package `@sokoos/desktop`; vite/vitest/tauri scripts |
| `tsconfig.json`, `tsconfig.node.json` | Strict TS config; `@/*` and `@sokoos/shared` paths |
| `vite.config.ts` | Vite + React; resolves `@sokoos/shared` to TS source (like apps/web) |
| `vitest.config.ts` | Vitest (node env) with the same shared-source resolver |
| `index.html` | CSP-restricted shell document |
| `postcss.config.mjs`, `tailwind.config.ts` | Tailwind wired to the web theme tokens |
| `src/index.css` | Sunset Savanna CSS tokens + component classes (mirrors web `globals.css`) |
| `src/main.tsx`, `src/App.tsx` | React entry + QueryClientProvider |
| `src/lib/config.ts` | API base URL (`VITE_API_URL`, default `http://localhost:3001`), `/v1` prefix |
| `src/lib/api-client.ts` | Adapted API client (injected session, no browser storage, 401 handler) |
| `src/lib/health.ts` | Typed `GET /v1/health` probe |
| `src/lib/runtime.ts` | Tauri `app_info` bridge with graceful browser fallback |
| `src/lib/format.ts` | Re-exports shared `formatMoney`; UI date/quantity helpers |
| `src/hooks/use-connectivity.ts` | TanStack Query hook for honest connectivity state |
| `src/components/*.tsx` | `AppShell`, `Sidebar`, `TopBar`, `StatusPill` |
| `src/pages/Home.tsx` | Connectivity + runtime panel |
| `src/lib/__tests__/*.spec.ts` | API-client and shared-money unit tests |
| `scripts/generate-icons.mjs` | Dependency-free PNG/ICO icon generator |
| `src-tauri/Cargo.toml`, `build.rs` | Tauri 2 crate |
| `src-tauri/src/lib.rs`, `main.rs` | Minimal read-only `app_info` native command |
| `src-tauri/tauri.conf.json` | Window, CSP, MSI + NSIS bundle targets |
| `src-tauri/capabilities/default.json` | Least-privilege capability set (`core:default` only) |
| `src-tauri/icons/*` | Generated placeholder brand icons |
| `README.md` | Desktop dev/run/reuse notes |
| `project-docs/desktop-application/phase-1-scaffolding-report.md` | This report |

Modified files (small, non-functional to existing apps):
- `project-docs/desktop-application/progress.md` — statuses + blockers updated.
- `pnpm-lock.yaml` — updated by adding the new workspace package's dependencies.

---

## 3. Phase 0 pre-flight results

| Check | Result |
|---|---|
| Node.js | ✅ `v24.16.0` |
| pnpm | ✅ `12.6.0` (must be invoked via `cmd`; PowerShell script execution is disabled here) |
| WebView2 runtime | ✅ present (`157.0.4341.46`) |
| Existing backend on `:3001` | ✅ live — `GET /v1/health` → `{"status":"ok","version":"1.0.0","timestamp":...}` |
| Desktop docs internally consistent | ✅ (consistency pass against the platform docs) |
| Rust toolchain (`rustc`/`cargo`/`rustup`) | ❌ **not installed** |
| Windows MSVC build tools (needed by Tauri) | ⚠️ unconfirmed |
| `packages/api-client` | ⚠️ exists as an empty `src/` dir with no `package.json` — confirmed it is **not** a usable shared client, matching the docs' warning |

## 4. Tests and checks run (results)

Run from the repo root; the desktop frontend does not require Rust.

| Command | Result |
|---|---|
| `pnpm --filter @sokoos/desktop lint` | ✅ pass (no output) |
| `pnpm --filter @sokoos/desktop typecheck` | ✅ pass (`tsc --noEmit`, no errors) |
| `pnpm --filter @sokoos/desktop test` | ✅ 2 files, 9 tests passed (Vitest 2.1.9) |
| `pnpm --filter @sokoos/desktop build` | ✅ `tsc --noEmit && vite build` — 113 modules, built in ~6.9s |
| `node apps/desktop/scripts/generate-icons.mjs` | ✅ wrote 5 icons |
| Live probe: `curl http://localhost:3001/v1/health` | ✅ returns the platform health JSON |
| `pnpm --filter @sokoos/desktop tauri:dev` / `tauri:build` | ⛔ **not runnable** — Rust toolchain missing |

What the tests actually prove:
- ⚠️ **Not proven here:** Tauri app launch, the native `app_info` command, MSI/NSIS packaging,
  and the in-window health call (all require `tauri dev` under the Rust toolchain).
- ✅ **Proven:** the frontend compiles, lints, bundles; the adapted client sends the right
  `/v1` request with the right headers; it maps the shared error vocabulary and reports an
  honest `NETWORK_ERROR`; and it reuses the platform's minor-unit money logic.

## 5. Assumptions

1. **Vite** is used as the desktop bundler, per the architecture docs ("a Vite-based desktop
   frontend is acceptable if it's cleaner"). This adds `vite`, `@vitejs/plugin-react` and
   `vitest` beyond the core stack; Vite is the standard Tauri 2 frontend tooling.
2. **Vitest** was chosen over Jest for the Vite/ESM frontend (the repo already uses Jest for
   `api`/`shared` and Playwright for E2E; Vitest is the natural fit for a Vite app).
3. The desktop `tsconfig` uses `moduleResolution: "Bundler"` with a `@sokoos/shared` path to
   the package **source**, mirroring how `apps/web` consumes it. This avoids the shared
   package's CommonJS `dist` output in an ESM bundle.
4. `GET /v1/health` is treated as the Phase 1 "one online API call" because it is public
   (`@Public()`), so it satisfies the exit criterion without touching auth.
5. Placeholder brand icons are generated programmatically; they are not the real brand asset.
6. The desktop app talks to the same backend URL contract as the web app (`VITE_API_URL`
   mirrors `NEXT_PUBLIC_API_URL`).

## 6. Blockers

1. **Rust toolchain missing (hard blocker).** `rustc`, `cargo` and `rustup` are absent, so
   the Tauri shell cannot be compiled, launched or packaged. Per the stop conditions, this is
   reported rather than guessed: the app's own Rust code, `tauri.conf.json` and capabilities
   are written to the standard Tauri 2 template but are **unverified**. Installing the Rust
   toolchain plus the Windows MSVC build tools unblocks `pnpm --filter @sokoos/desktop tauri:dev`.
2. **PowerShell execution policy** blocks `pnpm.ps1` on this machine; pnpm was invoked through
   `cmd`. Environment-only.

## 7. Review checkpoint (stop)

Per the gating rule, this is a **review checkpoint**. The scaffolding above is additive and
documentation/scaffolding-only, so it was within the allowed scope. The next phase would move
into review-gated territory, so I am stopping here for a decision.

Please confirm the following before Phase 2/3:

1. **Install the Rust toolchain + Windows MSVC build tools** so the Tauri shell can be launched
   and packaged (required to close Phase 1's exit criteria and to do Phase 8/9 honestly).
2. **Auth approach** — the desktop app must store tokens/sessions securely. This touches the
   `F-16` residual (token storage/refresh). Confirm the intended secure-store approach on
   Windows/macOS before any login flow is built.
3. **SQLite scope** — confirm that local SQLite stays strictly a workspace + sync staging store
   (no second financial ledger) before any local schema is written.
4. **Backend sync dependencies** — confirm idempotency-key stability, conflict/version metadata,
   and an incremental change feed before any sync write path is designed/built.

## 8. Next phase ready to start

Once items 1–4 above are confirmed, the ready steps are: **(Phase 2)** formalise shared reuse
(schemas/money/errors/permissions) and align UI further; then **(Phase 3)** the SQLite
foundation, which is a review-gated step.

