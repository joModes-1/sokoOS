# SokoOS

Business operating platform for B2B commerce, inventory and business operations, starting in
Uganda: multi-branch stock, POS with receipts, supplier purchasing, customer credit (debts),
payments and day closure, reports — one system for shops and small distributors.

## Structure

| Path | What it is |
|---|---|
| `apps/web` | Next.js 15 App Router, React 19, Tailwind, TanStack Query, RHF + Zod (dev :3000) |
| `apps/api` | NestJS 10 on Fastify, Prisma 6, PostgreSQL (dev :3001, routes prefixed `/v1`, Swagger `/docs`) |
| `apps/worker` | BullMQ background jobs (notifications, exports, payment expiry) — needs Redis |
| `apps/mobile` | Expo / React Native app |
| `apps/desktop` | Tauri shell (scaffolding) |
| `packages/shared` | Zod schemas, money helpers, constants shared by API and clients |
| `e2e` | Playwright end-to-end journeys |

## Quick start (development)

```powershell
pnpm install
copy .env.example .env          # then set DATABASE_URL + JWT secrets (min 32 chars)
pnpm --filter @sokoos/shared build
pnpm --filter @sokoos/api prisma:generate
pnpm --filter @sokoos/api prisma:seed   # demo business: grace@nakatotraders.ug / Password123!
pnpm dev                        # turbo: API :3001 + web :3000
```

## Quality gates

```powershell
pnpm turbo run lint typecheck build test   # full gate
pnpm --filter @sokoos/api test             # unit tests (runInBand)
pnpm --filter e2e test                     # Playwright (needs running stack)
```

## Production deploy

See `render.yaml` (Render blueprint: api + web + Postgres) and
`docs/26-production-readiness-runbook.md`. Requirements: `DATABASE_URL`, `JWT_SECRET` /
`REFRESH_TOKEN_SECRET` (32+ chars, real values), `FRONTEND_URL` set to the deployed web origin,
and `NEXT_PUBLIC_API_URL` set at **build time** for the web app. Schema is applied with
`prisma migrate deploy` (baseline: `prisma/migrations/0_init`; for a database created earlier via
`db push`, run `prisma migrate resolve --applied 0_init` once).

`PILOT_MODE=true` returns verification/reset codes in API responses for pilot deploys with no SMS
provider — opt-in and temporary. See `docs/PUBLISH-READINESS.md` for the full readiness state.

## Docs

`START-HERE.md` → build tasks; `docs/00-index.md` → decisions; `docs/audit/AUDIT.md` →
independent audit, findings and repair log; `docs/PUBLISH-READINESS.md` → launch gaps.
