# AGENTS.md — # SOKOOS

## Project Overview

Build **# SOKOOS** exactly as specified in `docs/` and `docs/build/`: SokoOS is an interconnected business operating platform for B2B commerce, inventory management and business operations, starting in Uganda. **This folder is the repository root: build in place.** Work through `docs/build/tasks/` in order, task-001 to task-016. Make small, verified changes.

Authority order when two sources seem to disagree:
1. The decision table in `docs/00-index.md`
2. The architecture, database and API documents (`docs/07`–`docs/13`)
3. The task file
4. Everything else

If you find a real conflict, follow the higher source and mention the conflict in your task report.

## Run Commands

The exact install, lint, typecheck, test, build and start commands are listed in `docs/17-devops-deployment-and-operations.md`. The agreed stack: Next.js, React, TypeScript, Tailwind CSS, component-based UI, React Hook Form, Zod, TanStack Query.; Node.js with NestJS (or modular Next.js backend initially), REST API, OpenAPI documentation, background job processing.; PostgreSQL, Redis for caching and job queues, object storage for documents and product images.. Hosting: Managed Node hosting (Render or Railway) with managed PostgreSQL; no Docker.

## Coding and Architecture Rules

- Architecture: Modular monolith initially; avoid microservices until scaling requires..
- API style: REST with URL versioning (/v1/). Use the API document exactly: paths, bodies, error codes.
- Follow `docs/19-coding-standards.md` and the folder layout in `docs/25-repository-structure.md`.
- Use the database design in `docs/09-database-design.md` verbatim.
- Follow `docs/11-ui-ux-specification.md` for every screen and state.

## Security Rules

- Authentication: Email + password with email/phone verification and MFA.
- Permissions: Role-based access control (RBAC) with roles, permissions, role_permissions, user_roles; branch-level restrictions enforced server-side..
- Do not hardcode secrets. Never log passwords, tokens, cookies or personal data.
- Validate every input on the server. Follow `docs/13-security-requirements-and-threat-model.md`.
- Do not add dependencies beyond the stack document without stating why in the report.

## Testing Rules

- Unit tests for stock/pricing/tax/refund/PO/payment/forecasting/permissions; integration tests for sale+inventory, PO+receiving, transfers, supplier lifecycle, payment reconciliation, import, AI auth; E2E scenarios A-G; release gates on financials, stock reconciliation, duplicate prevention, E2E, backups, import errors.
- Write tests alongside the code, in the same task.
- A task is not done while any check fails, unless the failure is pre-existing and documented.

## Stop Conditions

Stop and report — do not guess — if:
- a required tool or service is missing
- a check fails for a reason outside the task
- following the documents would break security, data integrity or the API contract

For anything else that is unspecified, choose the smallest conventional option consistent with the documents, and list it under "Assumptions" in your report.

## Definition of Done (per task)

1. The task's acceptance criteria are met.
2. The lint, typecheck, test and build commands pass.
3. No unrelated rewrites.
4. The report contains: what changed, files, tests run with results, assumptions, and blockers.
5. The task's row in `docs/build/TASKS_INDEX.md` has its Status set to `Done`.
