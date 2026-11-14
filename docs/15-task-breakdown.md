# Task Breakdown

The build is split into 16 tasks that must be implemented in order. Each task ends with its checks green before the next one starts. The task files in `docs/build/tasks/` are the work orders; the other documents are the reference they point to.

## Tasks

| # | Task | Depends on | Requirement IDs |
|---|---|---|---|
| 1 | [Monorepo, API conventions and CI foundation](build/tasks/task-001-project-setup.md) | — | NFR-002, NFR-003, NFR-011, NFR-013 |
| 2 | [PostgreSQL schema, tenant ownership and append-only tables](build/tasks/task-002-database-schema-and-tenancy.md) | 1 | FR-027, FR-028, FR-031, FR-068, NFR-006, NFR-012, NFR-014 |
| 3 | [Registration, verification, MFA, sessions and lockout](build/tasks/task-003-authentication-and-account-lifecycle.md) | 2 | FR-001, FR-002, FR-003, FR-004, FR-005, FR-006, FR-007, FR-008, FR-009, FR-010, FR-011, FR-012, FR-013, FR-014, FR-015, FR-016, FR-017, FR-018, FR-019, FR-020, FR-059, FR-100 |
| 4 | [Enforcement chain, roles, permissions and branch scope](build/tasks/task-004-rbac-tenancy-and-branch-scope.md) | 3 | FR-028, FR-032, FR-033, FR-041, FR-042, FR-051, FR-052, FR-053, FR-054, FR-055, FR-060, FR-094, NFR-005 |
| 5 | [Business registration, branches, invitations and user lifecycle](build/tasks/task-005-business-branch-and-user-management.md) | 4 | FR-021, FR-022, FR-023, FR-024, FR-025, FR-026, FR-027, FR-029, FR-030, FR-031, FR-034, FR-035, FR-036, FR-037, FR-038, FR-039, FR-040, FR-043, FR-044, FR-045, FR-046, FR-047, FR-048, FR-049, FR-050, FR-056, FR-057, FR-058 |
| 6 | [Categories, brands, products, variants, search and product images](build/tasks/task-006-catalogue-products-variants-and-media.md) | 4 | FR-061, FR-062, FR-063, FR-064, FR-065, FR-066, FR-067, FR-068, FR-069, FR-070, FR-071, FR-072, FR-073, FR-074, FR-075, FR-076, FR-077, FR-079, FR-080 |
| 7 | [Stock ledger, balances, low stock, counts and adjustments](build/tasks/task-007-inventory-ledger-balances-and-adjustments.md) | 6 | FR-101, FR-102, FR-103, FR-104, FR-105, FR-106, FR-107, FR-108, FR-109, FR-110, FR-111, FR-112, FR-113, FR-114, FR-115, FR-126, FR-127, FR-128, FR-129, FR-130 |
| 8 | [Multi-branch transfer lifecycle](build/tasks/task-008-stock-transfers.md) | 7 | FR-116, FR-117, FR-118, FR-119, FR-120, FR-121, FR-122, FR-123, FR-124, FR-125 |
| 9 | [Suppliers, purchase orders and goods receiving](build/tasks/task-009-purchasing-suppliers-orders-and-receiving.md) | 7 | FR-131, FR-133, FR-134, FR-135, FR-136, FR-137, FR-138, FR-139, FR-140, FR-141, FR-142, FR-143, FR-144, FR-145, FR-146, FR-147, FR-148, FR-149, FR-150, FR-151, FR-152, FR-153, FR-154 |
| 10 | [POS sale commit, receipts, refunds and sales history](build/tasks/task-010-pos-sales-receipts-and-refunds.md) | 7, 9 | FR-132, FR-155, FR-156, FR-157, FR-158, FR-159, FR-160, FR-161, FR-162, FR-163, FR-164, FR-165, FR-166, FR-167, FR-168, FR-169, FR-170, FR-171, FR-172, FR-173, FR-174, FR-175, FR-176, FR-177, FR-178, FR-188 |
| 11 | [Mobile money, cash payments, callbacks and reconciliation](build/tasks/task-011-payments-mobile-money-and-cash.md) | 10 | FR-179, FR-180, FR-181, FR-182, FR-183, FR-184, FR-185, FR-186, FR-187, FR-189, FR-190, FR-191, FR-192, FR-193, FR-194 |
| 12 | [Notifications, audit log and Redis-backed jobs](build/tasks/task-012-notifications-audit-and-background-jobs.md) | 4 | FR-084, FR-085, FR-086, FR-087, FR-088, FR-089, FR-090, FR-091, FR-092, FR-093, FR-094, FR-095, FR-096, FR-097, FR-098, FR-099, FR-100, FR-213, FR-214, FR-216, NFR-007 |
| 13 | [Dashboard, reports, day closure, imports, exports and attachments](build/tasks/task-013-reports-day-closure-imports-and-attachments.md) | 10, 11 | FR-078, FR-081, FR-082, FR-195, FR-196, FR-197, FR-198, FR-199, FR-200, FR-201, FR-202, FR-203, FR-204, FR-205, FR-206, FR-207, FR-208, FR-209, FR-210, FR-211, FR-212, FR-215 |
| 14 | [Next.js shell, design system and MVP screens](build/tasks/task-014-frontend-application-shell-and-core-screens.md) | 13 | FR-083, FR-085, FR-086, FR-176, FR-177, NFR-008, NFR-009 |
| 15 | [Security hardening, test coverage and release gates](build/tasks/task-015-security-hardening-and-release-gates.md) | 14 | NFR-001, NFR-004, NFR-005, NFR-010, NFR-015 |
| 16 | [README, OpenAPI docs, data inventory and operations runbook](build/tasks/task-016-documentation-and-final-polish.md) | 15 | NFR-013, NFR-014 |
