# START HERE — # SOKOOS

This folder is a complete, build-ready pack for **# SOKOOS**: SokoOS is an interconnected business operating platform for B2B commerce, inventory management and business operations, starting in Uganda. Hand it to a coding agent (Claude Code or Codex) with the prompts below. The agent builds the whole product in this folder, which is the repository root.

## Before you start

| Need | Check |
|---|---|
| Stack | Next.js, React, TypeScript, Tailwind CSS, component-based UI, React Hook Form, Zod, TanStack Query.; Node.js with NestJS (or modular Next.js backend initially), REST API, OpenAPI documentation, background job processing.; PostgreSQL, Redis for caching and job queues, object storage for documents and product images. |
| A capable coding agent | Claude Code or Codex with a top model, in auto/approve-all mode for this folder |
| Environment | The tools and variables listed in `docs/17-devops-deployment-and-operations.md` |

Open a terminal **in this folder** and start your agent there.

## What the agent reads

`AGENTS.md` (rules) → `docs/00-index.md` (every decision) → the current task in `docs/build/tasks/`. Nothing outside this folder is needed.

## The prompts

Paste them one at a time. Wait for each to finish with all checks green before sending the next one.

### Prompt 1 — Monorepo, API conventions and CI foundation and PostgreSQL schema, tenant ownership and append-only tables
```text
Read START-HERE.md and AGENTS.md, then docs/00-index.md. Implement docs/build/tasks/task-001 and task-002 in order, reading the docs each task lists. After each task, run its verification commands and fix until they pass, set its Status to Done in docs/build/TASKS_INDEX.md, and give the task report described in AGENTS.md. Never start a task while the previous one has failing checks. Do not ask me questions unless a stop condition in AGENTS.md applies.
```

### Prompt 2 — Registration, verification, MFA, sessions and lockout and Enforcement chain, roles, permissions and branch scope
```text
Continue with task-003 and task-004, under the same rules.
```

### Prompt 3 — Business registration, branches, invitations and user lifecycle and Categories, brands, products, variants, search and product images
```text
Continue with task-005 and task-006, under the same rules.
```

### Prompt 4 — Stock ledger, balances, low stock, counts and adjustments and Multi-branch transfer lifecycle
```text
Continue with task-007 and task-008, under the same rules.
```

### Prompt 5 — Suppliers, purchase orders and goods receiving and POS sale commit, receipts, refunds and sales history
```text
Continue with task-009 and task-010, under the same rules.
```

### Prompt 6 — Mobile money, cash payments, callbacks and reconciliation and Notifications, audit log and Redis-backed jobs
```text
Continue with task-011 and task-012, under the same rules.
```

### Prompt 7 — Dashboard, reports, day closure, imports, exports and attachments and Next.js shell, design system and MVP screens
```text
Continue with task-013 and task-014, under the same rules.
```

### Prompt 8 — Security hardening, test coverage and release gates and README, OpenAPI docs, data inventory and operations runbook
```text
Continue with task-015 and task-016, under the same rules. Finish with the final report: the acceptance criteria table, all assumptions and known limitations.
```

### If the agent stops early or a session ends
```text
Continue from the first task in docs/build/TASKS_INDEX.md whose Status is not Done. Same rules as before: verify, fix until green, mark Done, report.
```

### Final audit (completed)
Full independent audit executed against docs/21-acceptance-criteria.md and the running system.
See `docs/audit/AUDIT.md` for the complete report, findings F-01–F-25, repair log and verification.
Current state: root `lint/typecheck/test/build` green; API 8 suites / 32 tests; Playwright E2E 2/2 against the live app.

## Folder map

| Path | What it is |
|---|---|
| `START-HERE.md` | This file |
| `AGENTS.md`, `CLAUDE.md` | Rules for the coding agent |
| `docs/` | The documentation pack, from `00-index.md` to `26-production-readiness-runbook.md` |
| `docs/build/` | Project context, implementation rules, the task index and one file per task |
