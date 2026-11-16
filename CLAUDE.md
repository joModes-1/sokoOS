Read and follow `AGENTS.md`. Start with `START-HERE.md`.

# SokoOS — quick context for Claude Code

Business operating platform (POS, inventory, purchasing, debts, finance) for shops in Uganda.
`AGENTS.md` and `docs/00-index.md` are the authority; this file is a map so you don't have to read everything.

## Architecture
- pnpm + Turborepo monorepo, modular monolith.
- `apps/api` — NestJS REST API, prefix `/v1`, Prisma ORM on PostgreSQL (Supabase in production). One folder per domain in `apps/api/src/modules/` (auth, rbac, businesses, branches, catalogue, inventory, sales, payments, purchasing, debts, supplier-debts, transfers, reports, notifications, audit, imports, attachments, jobs).
- `apps/web` — Next.js 15 (App Router) + React + Tailwind + TanStack Query + React Hook Form. Screens in `apps/web/src/app/(app)/`, API client in `src/lib/api-client.ts`, data hooks in `src/hooks/use-queries.ts`, UI kit in `src/components/ui`.
- `packages/shared` — Zod schemas and types shared by api and web. `apps/mobile`, `apps/desktop`, `apps/worker` are secondary.
- Database schema: `apps/api/prisma/schema.prisma`. Money is stored as whole UGX in `*Minor` BigInt columns (no ÷100). SKU/barcode live on `ProductVariant`, not `Product`.

## Commands (run from repo root unless noted)
| Task | Command |
|---|---|
| Install | `pnpm install` (always from root — `--filter` installs break `packages/shared`) |
| Dev | `pnpm dev` (api :3001, web :3000) |
| Typecheck | `pnpm typecheck` · one app: `cd apps/api && npx tsc --noEmit -p tsconfig.json` |
| Lint | `pnpm lint` |
| Unit tests | `pnpm test` |
| Integration / E2E | `pnpm test:integration` · `pnpm test:e2e` |
| Build | `pnpm build` · api only: `cd apps/api && pnpm run build` |
| DB | `pnpm db:migrate` · `pnpm db:seed` · Prisma client: `pnpm --filter api exec prisma generate` |

Scripts that touch the DB need the env loaded: `set -a; . apps/api/.env; set +a`.

## Conventions
- Follow `docs/19-coding-standards.md` and the layout in `docs/25-repository-structure.md`.
- Never spread a request body into a Prisma call — map fields explicitly (unknown keys crash Prisma).
- Remote DB round trips are expensive (~80 ms): batch queries (`findMany` + `createMany`), avoid per-row loops inside `$transaction`.
- Mobile-first UI: no fixed `100vh` layouts on phones (use `dvh` / `inset-y-0`); tables scroll with `overflow-x-auto`.
- Small, direct changes. Typecheck the touched app before committing.

## Security
- Never print, log or commit secrets (`.env` files, DB URL, API keys, JWT secrets, tokens).
- Validate all input server-side; enforce RBAC and branch scope in the API, not only the UI.
- Auth errors must not reveal whether an account exists (see `auth.service.ts`).

## Production (VPS)
- Code at `/var/www/soko`. pm2: `soko-api` (port 3001), `soko-web` (port 3005). nginx: `sokoapi.villacode.site`, `soko.villacode.site`.
- The VPS has ~1.6 GB RAM: build on a dev machine and upload `dist/` / `.next/` rather than building on the server.
- After `.env` changes: `pm2 restart <app> --update-env` (pm2 caches env otherwise).

## Reading discipline (save tokens)
- Read only the files the task needs. Start from the module folder or screen named in the task.
- Do not read `node_modules/`, `dist/`, `.next/`, `logs/`, `pnpm-lock.yaml`, `.tmp_*`, `.diag_*` or `*.log` files.
- Do not read all of `docs/`; open the specific document `AGENTS.md` or the task points to.
- Search (`grep`/`rg`) before opening large files; read line ranges instead of whole files.
