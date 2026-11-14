# @sokoos/desktop

A **Tauri 2** desktop client for the existing SokoOS platform. This app is additive:
it does not replace `apps/web`, `apps/mobile`, `apps/api`, `apps/worker` or PostgreSQL.

## Status

Scaffolding (Phase 1). The app launches a SokoOS-branded shell and proves it can reach
the existing API online via an unauthenticated `GET /v1/health` probe. Authentication,
local SQLite storage and sync are **not** implemented yet — they are gated behind review
checkpoints in `project-docs/desktop-application/implementation-roadmap.md`.

## Prerequisites

- Node.js ≥ 20 and pnpm (repo workspace)
- The existing backend running on `http://localhost:3001` (optional — the app reports
  "Offline" honestly when it is not reachable)
- **Rust toolchain (`rustc`/`cargo`) + platform build tools** — required to build or run
  the Tauri shell. Not yet installed in the current environment; see the Phase 1 report.

## Commands

```bash
# Frontend only (runs in a normal browser, no Rust required)
pnpm --filter @sokoos/desktop dev        # Vite dev server on http://localhost:1420
pnpm --filter @sokoos/desktop build      # typecheck + production bundle to dist/
pnpm --filter @sokoos/desktop lint
pnpm --filter @sokoos/desktop typecheck
pnpm --filter @sokoos/desktop test       # Vitest
pnpm --filter @sokoos/desktop icons      # regenerate src-tauri/icons (placeholder art)

# Desktop shell (requires the Rust toolchain)
pnpm --filter @sokoos/desktop tauri:dev
pnpm --filter @sokoos/desktop tauri:build
```

## Configuration

Copy `.env.example` to `.env.local` and set `VITE_API_URL` if the backend is not on
`http://localhost:3001`. This mirrors the web app's `NEXT_PUBLIC_API_URL`.

## Reuse

- `@sokoos/shared` schemas, money, error codes and constants (resolved to source, like `apps/web`).
- The API client is adapted from `apps/web/src/lib/api-client.ts`: same `/v1` contract,
  same error envelope and error-code vocabulary — but session material is injected via a
  `SessionProvider` (no browser storage; `window.location` redirect is replaced with a handler).
- The Tailwind theme and CSS tokens mirror `apps/web` (Sunset Savanna design language).
