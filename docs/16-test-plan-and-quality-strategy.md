# Test Plan and Quality Strategy

**Product:** SokoOS — interconnected business operating platform for B2B commerce, inventory management and business operations
**Scope of this plan:** MVP = Phase 1 Foundation + Phase 2 Business operations. Deferred phases (Phase 3 Supplier ecosystem, Phase 4 Finance, Phase 5 AI capabilities, Phase 6 Expansion, dedicated React Native app, patient medical records) are explicitly **not tested** in this plan.
**Requirement sources:** FR-001–FR-216 and NFR-001–NFR-014 from `docs/03-cleaned-srs.md`; business rules BR-001–BR-022 from the PRD (referenced as a range, never restated); `testing.strategy` and `rules.business` rows of the decision ledger.
**Primary quality driver:** NFR-010 (unit tests for stock, pricing, tax, refund, purchase order, payment, forecasting and permission logic; integration tests for sale+inventory, PO+receiving, transfers, supplier lifecycle, payment reconciliation, import and AI authorization; E2E scenarios A–G).

## Test Layers

Tests are written alongside implementation, not after it. Every layer below has a fixed ID family, a fixed runner and a fixed gate. A layer that is not green blocks the merge.

| Layer | ID family | Scope | Tooling | Runs in | Blocking |
|---|---|---|---|---|---|
| L1 Unit | `TC-<AREA>-###` (pure functions) | Money arithmetic, tax, pricing, discount caps, stock balance derivation, negative-stock rule, refund netting, PO totals, state machines, permission resolution, Zod schemas | Vitest (backend + shared), Jest-compatible | CI on every push | Yes |
| L2 Integration (module + real DB) | `TC-<AREA>-###` (service level) | Service + PostgreSQL + Redis with real transactions, row locks, unique constraints and append-only grants | Vitest + ephemeral PostgreSQL/Redis containers | CI on every push | Yes |
| L3 API contract | `TC-API-###` | Every `/v1/` endpoint: status codes, error envelope, pagination shape, OpenAPI diff | supertest against the NestJS app + OpenAPI 3.1 diff check | CI on every push | Yes |
| L4 RBAC, tenancy and security | `TC-RBAC-###`, `TC-TEN-###`, `TC-SEC-###` | Guard chain, cross-tenant 404, cross-branch 403, default deny, token handling, rate limits, signed-URL scoping | supertest | CI on every push | Yes |
| L5 End-to-end | `TC-E2E-###` | Browser scenarios A–G through the Next.js PWA against a seeded staging-like database | Playwright (Chromium, Firefox, WebKit) | CI nightly + every release candidate | Yes for A–G smoke |
| L6 Migration and schema | `TC-MIG-###` | Migrations apply/rollback on an empty database, constraints, grants, tenant-leading indexes | Prisma migrate + raw SQL assertions | CI on every push | Yes |
| L7 Performance | `TC-PERF-###` | p95 read < 500 ms, p95 write < 1 s at 50 concurrent users (NFR-001) | k6 against a seeded environment | Pre-release | Yes |
| L8 Accessibility and compatibility | `TC-A11Y-###`, `TC-UI-###` | WCAG 2.1 AA on authenticated screens (NFR-008), PWA installability and browser matrix (NFR-009) | axe-core via Playwright, Lighthouse PWA audit | CI on every push (critical rules), pre-release (full) | Yes for critical axe violations |
| L9 Operations | `TC-OPS-###` | Backup restore drill (NFR-004), job retry and failure surfacing (FR-216), log redaction (NFR-007), health/readiness probes | Scripted drill + manual verification | Pre-release | Yes |
| L10 UAT | `TC-UAT-###` | Full POS → payment → receipt path with the chosen mobile money provider sandbox, plus day closure | Manual scripted run on staging | Pre-release | Yes |

### L1 — Unit tests

| Area | What is asserted | Requirement IDs |
|---|---|---|
| Money and tax | Integer minor-unit arithmetic, no float, currency carried explicitly, tax computed in basis points | FR-068, FR-159, NFR-012 |
| Pricing | Selling price below cost returns a warning and still persists; discount cap enforced | FR-069, FR-161 |
| Stock | Balance = sum of movements for the same product/variant/batch/branch; negative-stock rule; FEFO batch selection; expired batches excluded | FR-102, FR-113, FR-114, FR-132, FR-165 |
| Refunds | Refund quantity cannot exceed sold quantity net of prior refunds; reversing movement targets the original batch | FR-170, FR-172 |
| Purchase orders | Server-side totals; submit validation; state machine transitions | FR-138, FR-140, FR-151 |
| Payments | State machine `PENDING → SUCCEEDED/FAILED/EXPIRED/ORPHANED`; cash change computation; expiry at 15 minutes | FR-183, FR-187, FR-189 |
| Permissions | Permission resolution, default deny, `admin.*` immutability | FR-053, FR-054 |
| Auth | Password policy (≥10 chars, three classes), code TTL and attempt counter, lockout window | FR-002, FR-006, FR-018 |
| Jobs | Bounded retry policy and terminal failure classification | FR-216 |

### L2 — Integration tests

Each test opens a real transaction against PostgreSQL and asserts both the committed rows and the absence of partial writes.

| Scenario | Assertion | Requirement IDs |
|---|---|---|
| Sale + inventory | One transaction writes `sales`, `sale_items`, stock movements and the payment link; a stock failure rolls back everything | FR-162, FR-163, NFR-006 |
| PO + receiving | One transaction writes movements, batches, `goods_receipts`, `goods_receipt_items` and increments received quantities | FR-147 |
| Transfers | Dispatch writes negative movements at origin only; receive writes positive movements at destination only; insufficient stock leaves zero partial movements | FR-120, FR-121, FR-122 |
| Supplier lifecycle | Create → use on PO → soft delete → historical PO still resolves the supplier name | FR-133, FR-134 |
| Payment reconciliation | Mismatch list pairs payments without a completed sale and sales without a successful payment | FR-191 |
| Import | Row-by-row transactional apply; a failing row does not abort previously applied rows; error report retained | FR-208, FR-209 |
| Append-only enforcement | `UPDATE`/`DELETE` on `stock_movements`, `audit_logs`, `payment_webhook_events`, `import_rows` is rejected by the database role | FR-106, FR-093, NFR-006 |
| Idempotency | Repeated sale idempotency key returns the original sale; repeated provider event id is rejected; repeated day closure returns 409 | FR-164, FR-185, FR-205 |

### L3 — API contract tests

| Check | Rule | Requirement IDs |
|---|---|---|
| Error envelope | Every 4xx/5xx body is exactly `{ error: { code, message, details, requestId } }` with no stack trace or SQL | NFR-011 |
| Request id | Every response carries `X-Request-Id`, traceable to exactly one log entry | NFR-007 |
| Versioning | Every route is registered under `/v1/`; the OpenAPI document lists every registered route | NFR-013 |
| Pagination | List responses use `{ items, page, pageSize, total, totalPages }` | NFR-002 |
| Filter allowlisting | Unknown filter or sort parameters return 400 `VALIDATION_ERROR` | NFR-011 |
| Timestamps and currency | All API timestamps are UTC ISO-8601; display currency defaults to USD | NFR-012 |
| Method prohibition | `PUT`/`DELETE` on `/v1/inventory/movements/{id}` returns 405 | FR-106 |

### L4 — RBAC, tenancy and security tests

| Check | Expected | Requirement IDs |
|---|---|---|
| Each of the four roles on representative endpoints outside its permission set | 403 `FORBIDDEN` | FR-051, FR-054 |
| Endpoint with no declared permission | Denied by default | FR-054 |
| Cross-tenant resource id | 404 `RESOURCE_NOT_FOUND`, never 403, never existence disclosure | FR-028, FR-033 |
| Cashier or Inventory Clerk with no branch assignment | 403 `BRANCH_SCOPE_REQUIRED` | FR-041 |
| Branch Manager reading another branch's balances, sales or transfers | 403 or empty result, never data | FR-042, FR-174 |
| Branch Manager audit-log query | Only branch-scoped entries | FR-094 |
| Removing an `admin.*` permission from Business Admin | 409 `ADMIN_PERMISSION_IMMUTABLE` | FR-053 |
| Attachment or product image signed URL for another tenant's key | 403, no URL issued | FR-077, FR-212 |
| Auth rate limits and lockout | 429 with `Retry-After`; lockout message does not disclose email existence | FR-018, FR-019, FR-020 |
| MFA disable attempt by an admin role | 409 `MFA_REQUIRED_FOR_ROLE` | FR-011 |
| Log redaction | No password, token or full payment credential appears in any log line | NFR-007 |

### L5 — End-to-end scenarios

Playwright drives the real Next.js PWA against a seeded database. Scenario definitions are in **Critical Flows**. Each scenario runs as a smoke subset on every release candidate and in full nightly.

### L6 — Migration and schema tests

| Check | Expected | Requirement IDs |
|---|---|---|
| All migrations apply to an empty database and roll back | Clean apply and clean rollback | NFR-006 |
| Every business-owned table | Non-null `tenant_id` and an index leading with `tenant_id` | FR-028 |
| Uniqueness | Duplicate business slug, branch code per tenant, category name per tenant, brand name per tenant (case-insensitive), SKU per tenant, barcode per tenant when present, supplier name per tenant, receipt number per tenant, `(provider, provider_event_id)`, `(branch_id, business_date)` on day closures, idempotency key per tenant are all rejected | FR-023, FR-036, FR-061, FR-065, FR-072, FR-073, FR-134, FR-166, FR-185, FR-205 |
| Soft delete | Soft-deletable tables expose `deleted_at`; no business row is hard-deleted | FR-031 |
| Money columns | Integer minor units with an explicit currency column; quantities `numeric(18,3)`; timestamps `timestamptz` | FR-068, NFR-012 |

### L7 — Performance tests

| Test | Load | Threshold | Requirement IDs |
|---|---|---|---|
| Read endpoints (`/v1/products`, `/v1/inventory/balances`, `/v1/sales`, `/v1/reports/*`) | 50 concurrent users, 10-minute ramp | p95 < 500 ms | NFR-001 |
| Write endpoints (sale commit, goods receipt, transfer dispatch, adjustment) | 50 concurrent users | p95 < 1 s | NFR-001 |
| POS sale commit under contention on the same variant | 20 concurrent commits on one variant | No oversell, no deadlock, correct 409s | FR-163, FR-114 |
| Dashboard summary | 50 concurrent users | p95 < 500 ms | FR-081 |

### L8 — Accessibility and compatibility tests

| Test | Expected | Requirement IDs |
|---|---|---|
| axe-core scan on every authenticated screen | Zero critical or serious violations | NFR-008 |
| Keyboard-only completion of POS sale and goods receipt | Fully operable, visible focus | NFR-008 |
| Colour contrast on negative-balance red display | Meets AA contrast | FR-115, NFR-008 |
| Browser matrix: last two Chrome, Firefox, Edge; Safari 14+; current Android Chrome | Core flows pass | NFR-009 |
| PWA installability and offline shell | Installable, manifest and service worker valid | NFR-009 |

### L9 — Operations tests

| Test | Expected | Requirement IDs |
|---|---|---|
| Backup restore drill in staging | Restore succeeds and row counts match the source snapshot | NFR-004 |
| Job retry and failure surfacing | Bounded retries, then `failed` with error detail visible in the UI | FR-214, FR-216 |
| Health and readiness probes | `/v1/health`, `/v1/health/live`, `/v1/health/ready` return 200 within 2 s | NFR-003 |
| Log and audit completeness | Every critical action writes an audit row with actor, action, target, timestamp and context | FR-092, FR-095, NFR-007 |
| Uptime monitoring | Synthetic check every minute; 99.5% monthly target tracked | NFR-003 |

### L10 — UAT

| Script | Steps | Requirement IDs |
|---|---|---|
| `TC-UAT-001` Mobile money sale | Cashier sells, pays with the chosen provider sandbox, callback marks the sale paid, receipt prints | FR-179, FR-181, FR-182 |
| `TC-UAT-002` Duplicate callback | Replay the provider callback; no duplicate payment or movement | FR-185 |
| `TC-UAT-003` Day closure | Cash count, discrepancy with reason, closure, second closure rejected | FR-204, FR-205 |
| `TC-UAT-004` Import | Upload a CSV with deliberate row errors; error report lists row, column, value and error | FR-208 |

## Critical Flows

Priority: **P0** = release gate. Automation column names the layer that must cover the flow.

| Flow | Steps | Requirement IDs | Test IDs | Priority | Automation |
|---|---|---|---|---|---|
| F1 Onboarding | Register → verify by phone → account `ACTIVE` → create business → default branch → settings | FR-001–FR-008, FR-021–FR-024, FR-030 | TC-AUTH-001, TC-AUTH-002, TC-BIZ-001, TC-E2E-A | P0 | Unit + API + E2E |
| F2 Access control | Invite user → accept → role and branch binding → MFA per role → sign-in with MFA | FR-045–FR-047, FR-009, FR-059 | TC-BIZ-004, TC-AUTH-005, TC-RBAC-001, TC-E2E-A | P0 | API + E2E |
| F3 Session security | Sign-in → rotating refresh → reuse detection → lockout after 10 failures | FR-015, FR-018, FR-019 | TC-AUTH-006, TC-AUTH-007 | P0 | API |
| F4 Tenant isolation | Two tenants, cross-tenant id on every resource family | FR-028, FR-033, FR-042 | TC-TEN-001, TC-TEN-002, TC-SEC-001 | P0 | API |
| F5 Catalogue setup | Category → brand → product → variant → barcode → search → price change audit | FR-061–FR-080 | TC-CAT-001–TC-CAT-006, TC-E2E-B | P0 | Unit + API + E2E |
| F6 Catalogue import | CSV/XLSX import of products, suppliers, categories, opening stock with per-row errors | FR-207–FR-209 | TC-IMP-001, TC-IMP-002, TC-E2E-B | P0 | Integration + E2E |
| F7 Stock adjustment | Adjustment with reason → exactly one movement and one audit entry → negative-stock rejection | FR-109–FR-114 | TC-INV-003, TC-INV-004, TC-INV-005 | P0 | Unit + Integration |
| F8 Stock count | Count session → counted quantities → delta → one adjustment per line with reason `STOCK_COUNT` | FR-129, FR-130 | TC-INV-006 | P1 | Integration |
| F9 Purchasing | PO `DRAFT` → `SUBMITTED` → `CONFIRMED` → goods receipt with batch and expiry → `PARTIALLY_RECEIVED` → `RECEIVED` → `CLOSED` | FR-137–FR-154 | TC-PO-001–TC-PO-008, TC-E2E-D | P0 | Unit + Integration + E2E |
| F10 Over-receipt | Receipt exceeding ordered quantity requires explicit confirmation and is flagged | FR-148, FR-149 | TC-PO-006 | P0 | Integration |
| F11 Transfer | Request → approve → dispatch (stock-checked) → receive with shortfall note → close | FR-116–FR-125 | TC-TRF-001–TC-TRF-007, TC-E2E-E | P0 | Unit + Integration + E2E |
| F12 Transfer failure | Dispatch with insufficient origin stock returns 409 with zero partial movements | FR-121 | TC-TRF-004 | P0 | Integration |
| F13 POS sale | Scan/search → cart → server-side totals → cash payment → sale commit → receipt | FR-155–FR-168, FR-183, FR-184 | TC-POS-001–TC-POS-008, TC-E2E-C | P0 | Unit + Integration + E2E |
| F14 Oversell prevention | Concurrent commits on the same variant; second commit returns 409 `INSUFFICIENT_STOCK` | FR-163, FR-114 | TC-POS-005, TC-PERF-003 | P0 | Integration + Performance |
| F15 Duplicate sale prevention | Repeated idempotency key returns the original sale, no duplicate movement | FR-164 | TC-POS-006 | P0 | Integration |
| F16 Expired batch | Expired batch never sellable in POS; listed separately for write-off | FR-132, FR-158, FR-103 | TC-INV-002, TC-POS-004 | P0 | Unit + Integration |
| F17 Refund | Full and partial refund → reversing movements to the original batch → sale state updated | FR-169–FR-172, FR-188 | TC-POS-009, TC-PAY-006 | P0 | Unit + Integration |
| F18 Mobile money | Initiate → `PENDING` → callback → `SUCCEEDED`; duplicate callback rejected; expiry job at 15 minutes | FR-179–FR-182, FR-185, FR-187 | TC-PAY-001–TC-PAY-005, TC-E2E-G | P0 | Integration + E2E + UAT |
| F19 Payment reconciliation | Mismatch list; manual correction recorded as an audited adjustment, never an edit | FR-190–FR-192 | TC-PAY-007, TC-PAY-008 | P0 | Integration |
| F20 Replenishment | Balance crosses reorder level → notification → PO raised from low-stock list | FR-126–FR-128, FR-202 | TC-INV-007, TC-NOT-002, TC-E2E-F | P0 | Integration + E2E |
| F21 End-of-day | Cash session → expected vs counted → discrepancy reason → closure → second closure 409 → immutability | FR-193, FR-204–FR-206 | TC-RPT-005, TC-RPT-006, TC-E2E-F | P0 | Integration + E2E |
| F22 Reporting | Sales by period excluding refunds; stock report asserting closing balance equals sum of movements | FR-195–FR-199 | TC-RPT-001–TC-RPT-004 | P0 | Integration |
| F23 Audit trail | Every critical action writes one append-only entry; searchable by actor, action, target, date range | FR-091–FR-100 | TC-AUD-001–TC-AUD-004 | P0 | Integration |
| F24 Notifications | In-app notification for each of the nine event types; unread count; WhatsApp selectable only when the provider is enabled | FR-084–FR-090 | TC-NOT-001–TC-NOT-004 | P0 | Integration |
| F25 Attachments | Upload via pre-signed URL with MIME allowlist and tenant-prefixed key; read via short-lived signed URL; download audited | FR-210–FR-212 | TC-DOC-001–TC-DOC-003 | P1 | Integration |
| F26 Jobs | Export, notification, payment expiry and reconciliation jobs; status `queued/running/succeeded/failed`; bounded retry | FR-213–FR-216 | TC-IMP-003, TC-OPS-002 | P0 | Integration + Ops |

### E2E scenarios A–G

*Assumption:* the decision ledger fixes "E2E scenarios A–G" without naming them. The mapping below is the smallest conventional set that covers the confirmed primary workflows and the MVP scope; it is the definition used by `TC-E2E-*`.

| Scenario | Name | Steps | Requirement IDs |
|---|---|---|---|
| A | Onboarding and access | Register → verify → create business (retail) → create branch → invite Cashier → accept → MFA sign-in as Business Admin → Cashier signs in and sees only POS | FR-001–FR-009, FR-021–FR-024, FR-035, FR-045–FR-047 |
| B | Catalogue and opening stock | Create category, brand, product, variant with barcode → import a CSV containing one valid and one invalid row → review error report → post opening-stock adjustment | FR-061–FR-080, FR-207–FR-209 |
| C | POS sale to receipt | Cashier scans barcode → cart → cash payment → sale commits → receipt renders → reprint creates no new sale or movement | FR-155–FR-168, FR-183, FR-184 |
| D | Purchasing to goods receipt | Create supplier → PO `DRAFT` → `SUBMITTED` → `CONFIRMED` → receive partial with batch and expiry → `PARTIALLY_RECEIVED` → receive remainder → `RECEIVED` → `CLOSED` | FR-133–FR-154 |
| E | Multi-branch transfer | Branch Manager requests transfer → approves → Inventory Clerk dispatches → destination receives with a shortfall note → close after acknowledgement | FR-116–FR-125 |
| F | Replenishment and end-of-day | Sale drives balance to reorder level → low-stock notification → PO raised → cash session → day closure with discrepancy reason → second closure rejected | FR-126–FR-128, FR-204–FR-206 |
| G | Mobile money and reconciliation | Cashier sells → mobile money payment `PENDING` → provider callback → `SUCCEEDED` → duplicate callback rejected → mismatch list empty → partial refund | FR-179–FR-192 |

## Coverage

### Coverage targets

| Area | Metric | Target | Rationale |
|---|---|---|---|
| Backend domain logic (stock, pricing, tax, refund, PO, payment, permissions) | Line coverage | ≥ 90% | NFR-010; these modules carry the release gates |
| Backend overall | Line coverage | ≥ 80% | NFR-010 |
| Backend overall | Branch coverage | ≥ 75% | Guards and state machines |
| Guards and permission resolution | Line coverage | 100% | FR-054, NFR-005 |
| Frontend components and hooks | Line coverage | ≥ 60% | UI risk is covered by E2E instead |
| Protected endpoints | Endpoints with at least one 403 test | 100% | FR-054 |
| Protected endpoints | Endpoints with at least one cross-tenant 404 test | 100% | FR-028 |
| P0 functional requirements | Requirements with at least one automated test ID | 100% | Traceability gate |
| E2E scenarios A–G | Scenarios passing on the release candidate | 7 of 7 | NFR-010 |

A CI check parses the requirement IDs referenced in test names and fails the build when a P0 requirement has no test ID. This is the mechanism that keeps the traceability table honest.

### Release gates

| Gate | Evidence required | Requirement IDs | Blocking |
|---|---|---|---|
| Financials | Unit and integration tests green for money arithmetic, tax, PO totals, sale totals, cash change, refund netting and report derivation; no float in any monetary path | FR-068, FR-138, FR-159, FR-160, FR-183, FR-196, FR-197 | Yes |
| Stock reconciliation | Balance equals sum of movements for every seeded product/variant/batch/branch; stock report drift assertion returns zero drift; append-only grants verified | FR-102, FR-106, FR-111, FR-199 | Yes |
| Duplicate prevention | Duplicate email 409, duplicate SKU/barcode/branch code/receipt number 409, repeated sale idempotency key returns the original sale, repeated provider event rejected, second day closure 409 | FR-003, FR-072, FR-073, FR-164, FR-185, FR-205 | Yes |
| E2E | Scenarios A–G pass on the release candidate in Chromium; A, C, D, E also pass in Firefox and WebKit | NFR-010 | Yes |
| Backups | Restore drill in staging succeeds and row counts match | NFR-004 | Yes |
| Import errors | Import of a file with deliberate row errors produces a per-row report with row number, column, value and error, and applies valid rows | FR-208, FR-209 | Yes |
| Security review | No unresolved P0 or P1 findings; every protected endpoint has server-side authorization | NFR-005 | Yes |
| Performance | p95 read < 500 ms and p95 write < 1 s at 50 concurrent users | NFR-001 | Yes |
| Accessibility | Zero critical or serious axe violations on authenticated screens | NFR-008 | Yes |
| UAT | Mobile money sandbox sale, duplicate callback and day closure scripts pass on staging | FR-179–FR-185, FR-204–FR-206 | Yes |

### CI pipeline

| Stage | Command (conceptual) | Fails the build on |
|---|---|---|
| Install | `pnpm install --frozen-lockfile` | Lockfile drift |
| Lint and format | `pnpm lint` | Any lint error |
| Typecheck | `pnpm typecheck` | Any type error |
| Unit | `pnpm test:unit` | Any failure or coverage below target |
| Integration | `pnpm test:integration` (ephemeral PostgreSQL + Redis containers) | Any failure |
| Migration | `pnpm test:migrations` | Apply/rollback failure, missing tenant index, missing grant |
| API contract | `pnpm test:api` + OpenAPI diff | Envelope mismatch, undocumented route, breaking change without a new version prefix |
| RBAC and security | `pnpm test:security` | Any missing 403 or cross-tenant 404 |
| Build | `pnpm build` | Build failure |
| Dependency audit and secret scan | `pnpm audit` + secret scanner | High or critical advisory, any committed secret |
| E2E smoke | `pnpm test:e2e --grep @smoke` | Any smoke scenario failure |
| Nightly E2E | `pnpm test:e2e` (all scenarios, three browsers) | Any scenario failure |

Docker is used in CI to provide ephemeral PostgreSQL and Redis only. Production hosting remains managed Node hosting with managed PostgreSQL, per the decision ledger.

### Environments and test data

| Environment | Purpose | Data |
|---|---|---|
| Local | Developer loop | Seeded fixtures, ephemeral database |
| CI | All automated layers | Seeded fixtures, ephemeral database per job |
| Staging | E2E, performance, UAT, restore drill | Seeded fixtures plus provider sandbox credentials |
| Production | Smoke checks and synthetic uptime only | No test data |

Seed fixtures are deterministic and created by a single `seed` script:

| Fixture | Contents |
|---|---|
| Tenant T1 | Retail business, currency USD, negative stock disabled, branches B1 (shop) and B2 (warehouse) |
| Tenant T2 | Pharmacy business, used exclusively for cross-tenant isolation tests |
| Users | One Business Admin, one Branch Manager, one Cashier, one Inventory Clerk per tenant; one Cashier with no branch assignment; one deactivated user with historical sales |
| Catalogue | One non-batch product, one batch-tracked product with a non-expired batch, one batch-tracked product with an expired batch, one product with a selling price below cost |
| Purchasing | One supplier, one PO in each lifecycle state |
| Sales | One completed cash sale, one partially refunded sale, one sale with a `PENDING` mobile money payment |
| Jobs | One succeeded export job, one failed import job with an error report |

### Provider simulation

| Integration | Test approach |
|---|---|
| MTN MoMo and Airtel Money | Provider sandbox in staging and UAT; signed callback fixtures in CI. Callback signature verification, provider event id storage and duplicate rejection are always tested against fixtures, never against a live provider. |
| WhatsApp notifications | Out of scope while the provider is not enabled; the channel is asserted to be unselectable and the in-app channel is asserted to always be enabled (FR-088, FR-089). |
| Object storage | Local S3-compatible container in CI; signed-URL expiry and tenant-prefix scoping asserted directly. |
| Email | Deferred in the decision ledger; no email delivery test exists. Verification and reset flows are tested through the phone channel and through the API response contract only. |
| AI model providers | Deferred (Phase 5). No AI test exists in this plan. |

### Flake, quarantine and defect policy

| Rule | Detail |
|---|---|
| Flake budget | A test that fails intermittently twice in 14 days is quarantined with an owner and a fix date; quarantined tests cannot be release gates |
| Retries | One automatic retry in CI for E2E only; a retry that passes is still reported as flaky |
| Time control | All TTL, expiry and lockout tests use an injectable clock; no test sleeps for a real 10 or 15 minutes |
| Determinism | No test depends on wall-clock ordering, random ids or unordered query results |
| Severity | S1 = wrong money or stock, cross-tenant leak, duplicate sale or payment → fix before any other work; S2 = broken primary flow → fix within the current phase; S3 = cosmetic → backlog |
| Regression rule | Every S1 and S2 defect adds a permanent automated test at the lowest layer that can reproduce it |

### Explicitly out of scope for this plan

| Excluded | Reason |
|---|---|
| Phase 3 Supplier ecosystem, marketplace listings, offers and orders | Deferred in the decision ledger |
| Phase 4 Finance accounts, journal entries and expenses | Deferred |
| Phase 5 AI capabilities and AI authorization tests | Deferred |
| Phase 6 Expansion | Deferred |
| Dedicated React Native application | Deferred; the PWA is the tested client |
| Patient medical records | Explicitly out of scope |
| Email delivery | Deferred integration |
| Load beyond 50 concurrent users | NFR-001 defines the MVP target |