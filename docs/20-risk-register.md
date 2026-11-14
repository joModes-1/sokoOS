# Risk Register

**Product:** SokoOS — interconnected business operating platform for B2B commerce, inventory management and business operations
**Release covered:** MVP = Phase 1 Foundation + Phase 2 Business operations
**Document status:** Build-ready. Risk IDs R-001–R-042 are introduced here. Requirement references reuse FR IDs from `docs/02-product-requirements-document.md` (FR-001–FR-216), business-rule IDs BR-001–BR-022 from the same document, and user-story IDs US-001–US-066. No requirement is renumbered.
**Owners:** roles, not people — the MVP is built by one developer with an AI coding agent, so "Tech Lead", "Backend", "DevOps", "Security", "Finance" and "Founder/Product" denote responsibilities held by the same small team.

## Risks

Probability and impact are assessed for the MVP window (build to first production tenants). "Design mitigated" means the mitigation is already specified in the PRD and must be implemented and tested; "Mitigated" means the control is in place by construction; "Accepted" means the risk is knowingly carried with no further action in MVP.

| Risk ID | Risk | Category | Probability | Impact | Mitigation | Early warning signal | Owner | Linked IDs | Status |
|---|---|---|---|---|---|---|---|---|---|
| R-001 | Pricing assumptions are proposed, not validated market prices — the top risk named in the decision ledger | Product/Market | High | High | Treat every price point as a hypothesis; keep plan and pricing values configurable in `subscriptions` and business settings with no hard-coded price lists; run structured interviews with retailers, pharmacies and wholesalers before publishing pricing; instrument activation and conversion from launch; revisit after the first month | Pilot users decline, negotiate down, or stall at the pricing screen; low trial-to-active conversion | Founder/Product | FR-029, success metrics | Open |
| R-002 | Mobile money onboarding and sandbox access for MTN MoMo and Airtel Money is slow or restricted | Integration | Medium | High | Confirm merchant/aggregator accounts and sandbox credentials before starting the payment build; implement a provider adapter interface so a channel can be added or swapped without touching sale logic; cash tender is always available as a fallback | No sandbox credentials within two weeks of starting payment work | Founder/Tech Lead | FR-179, FR-186, US-054 | Open |
| R-003 | Duplicate or late payment callbacks double-count money | Data | Medium | High | Idempotency key on sale submission; provider event id uniqueness on callbacks; state guard on the payment state machine; late success recorded as `ORPHANED`; reconciliation report; integration test that replays the same callback twice | Reconciliation report shows payments without a completed sale | Backend | BR-011, BR-012, FR-186, FR-190 | Design mitigated |
| R-004 | Cross-tenant data leakage | Security | Medium | High | Tenant-scoped repository layer; tenant id on every business-owned row; automated isolation test per endpoint; tenant-prefixed object keys; short-lived signed URLs; cross-tenant reads return `404` and never leak existence | Any endpoint test that returns another tenant's row; unexpected object key without tenant prefix | Security/Backend | BR-013, FR-075, FR-210 | Design mitigated |
| R-005 | Branch-scope bypass — a branch-scoped user reads or writes another branch | Security | Medium | High | Branch scope resolved server-side from `user_roles` plus branch assignment on every request; branch-scoped tests for balances, movements, transfers, sales, receipts, closures and reports | A Cashier or Inventory Clerk sees a branch selector with more than their assigned branch | Security/Backend | BR-014, FR-040, US-013 | Design mitigated |
| R-006 | Stock balances drift from the immutable movement ledger | Data | Medium | High | Balances projected inside the same transaction as every movement; no update or delete path on `stock_movements`; reconciliation assertion in the stock report; stock-reconciliation release gate | Stock report reconciliation check reports non-zero drift | Backend | BR-001, BR-002, FR-198 | Design mitigated |
| R-007 | Overselling under concurrent tills — two cashiers sell the last unit | Data | Medium | High | Availability check and movement write in one transaction with row-level locking on the balance row; commit rejected with `409` and a machine-readable reason; idempotency key; concurrency test selling the last unit from two sessions | Any sale committed with a negative balance while negative stock is disabled | Backend | BR-003, BR-008, FR-162 | Open |
| R-008 | Expired batch sold to a customer | Compliance/Data | Medium | High | Expiry evaluated at the moment of sale, not only at receiving; FEFO within non-expired batches; expired stock listed separately for write-off; unit tests on the expiry boundary (`expires_at` equal to now) | Expired batch appears in POS search results or in a completed sale | Backend | BR-006, FR-131, FR-155 | Design mitigated |
| R-009 | Ugandan Data Protection and Privacy Act 2019 compliance gaps | Compliance | Medium | High | Data inventory and lawful-basis map for personal data (users, customers, suppliers); privacy notice at registration; data-subject request procedure; breach notification runbook; configurable retention; patient medical records explicitly out of scope; legal review before launch | A data-subject request cannot be answered from existing tooling | Founder/Security | BR-017, FR-025, FR-091 | Open |
| R-010 | Tax and fiscal-receipt rules unclear or changing | Compliance | Medium | Medium | Tax modelled as configurable classes per product with no hard-coded rates; receipts render from stored sale data so a rate change never rewrites history; accounting review before launch | A pilot tenant asks for a tax treatment the model cannot express | Founder/Finance | FR-067, FR-166, BR-009 | Open |
| R-011 | WhatsApp channel unavailable because it is subject to provider confirmation | Integration | Medium | Medium | In-app notifications are the guaranteed channel; channel abstraction with per-event, per-channel preferences; WhatsApp enabled only when a provider is confirmed; no workflow depends on WhatsApp delivery | Provider terms or pricing cannot be confirmed before launch | Tech Lead | FR-084, FR-087, US-026 | Open |
| R-012 | Email channel is deferred, so verification and password reset depend on phone delivery | Integration | Medium | High | Phone-first verification; provider abstraction for the chosen messaging provider; rate limits and lockout on code attempts; assumption: an admin-assisted reset path exists for a user who cannot receive a code | Verification completion rate below expectation during pilot onboarding | Backend | FR-005, FR-013, FR-018 | Open |
| R-013 | OTP delivery cost and reliability in Uganda | Integration/Ops | Medium | Medium | Code expiry of 10 minutes, maximum 5 attempts, resend throttling, delivery-failure logging, fallback to admin-assisted verification; monitor delivery success rate | Delivery failure rate above 5% or cost per verified user above plan | Tech Lead | FR-005, FR-018 | Open |
| R-014 | MFA lockout — a lost device locks a business out of its own account | Operational | Medium | Medium | Recovery codes issued once at enrolment; a second Business Admin can reset an enrolment; every MFA change audited; documented recovery runbook | A support request that cannot be resolved with recovery codes | Backend | FR-009, FR-010, US-006 | Design mitigated |
| R-015 | Poor connectivity at POS causes duplicate or lost sales | Operational | High | High | Idempotency key on every sale submission so a retry returns the original sale; no client-side stock decrement; explicit `AWAITING_PAYMENT` state with polling; PWA caches only the app shell, never stock or price responses; assumption: there is no offline sale queue in MVP, so a sale cannot be completed without connectivity | Cashiers reporting repeated "failed" sales that later appear as completed | Tech Lead | BR-011, FR-162, FR-176 | Open |
| R-016 | Managed hosting tier cannot meet the performance or availability targets | Ops | Medium | Medium | Load test at 50 concurrent users before launch; indexes on tenant/branch/date access paths; Redis caching for catalogue and dashboard reads; connection pooling; provider tier review; staging mirrors production | p95 read latency above 500 ms or write latency above 1 s in staging | DevOps | performance NFR, availability NFR | Open |
| R-017 | CI runs in Docker while production is managed Node hosting, causing environment drift | Ops | Medium | Medium | Pin the same Node runtime version in both; run migrations through the release pipeline against staging then production; post-deploy smoke test; no Docker in production per the decision ledger | A migration or dependency that passes CI and fails on the managed host | DevOps | — | Open |
| R-018 | Backups exist but cannot be restored | Ops | Medium | High | Automated daily backups with 14-day retention; restore drill into staging before launch; backups release gate; documented recovery point and recovery time assumptions | Restore drill fails or exceeds the agreed recovery window | DevOps | BR-017 | Open |
| R-019 | CSV/XLSX import corrupts the catalogue or opening stock | Data | Medium | High | Per-row validation with a row/column/value error report; dry-run report before apply; transactional apply; opening stock imported as movements with reason `OPENING_BALANCE`, never as a balance edit; import-error release gate | Import error report shows rows applied that should have been rejected | Backend | FR-207, BR-002, BR-004 | Open |
| R-020 | Scope creep into deferred phases (marketplace, finance, AI, expansion, React Native) | Delivery | High | Medium | Deferred list is explicit in the PRD; no tables, screens or endpoints for deferred entities; AGENTS rules constrain the coding agent; small tasks; every new request checked against the deferred list before work starts | A pull request that adds a deferred table, route or screen | Tech Lead | BR-019, US-016 | Mitigated |
| R-021 | One developer plus an AI coding agent cannot deliver the MVP in the expected window | Delivery | High | High | P0-first ordering; thin vertical slices per primary workflow; automated tests written with each slice; weekly scope review against the release gates; P1 and P2 stories dropped first | Two consecutive weeks without a completed P0 story | Founder/Tech Lead | — | Open |
| R-022 | RBAC complexity delays the MVP | Delivery | Medium | Medium | Seed the four system roles per tenant; default-deny permission guard on every controller action; custom role editing (US-016) is P1 and may ship after launch; permission tests per endpoint | Permission work consuming more than one sprint of effort | Tech Lead | FR-052, BR-015 | Open |
| R-023 | Audit gaps — a critical action is not recorded | Compliance/Security | Medium | Medium | Enumerated critical-action list; audit interceptor; append-only storage; one test per enumerated action; audit search is P0 | A stock, money or permission change found without a matching audit entry | Security/Backend | BR-016, FR-091 | Design mitigated |
| R-024 | Retention and deletion policy is assumed, not confirmed | Compliance | Medium | Medium | Soft delete on business records, hard delete on verification, reset, invitation and refresh tokens; retention values configurable; policy documented before launch; legal review | A tenant asking for deletion of records that cannot be deleted | Founder/Security | BR-017 | Open |
| R-025 | Two pricing paths diverge (POS vs receipts vs reports) | Data/Finance | Medium | High | One pricing service used by POS, receipts, refunds and reports; integer minor units with explicit currency; golden tests asserting POS total, receipt total and report total agree for the same sale | Any report total that differs from the receipt for the same sale | Backend | BR-009, FR-166, FR-195 | Design mitigated |
| R-026 | Currency mismatch — USD display default against UGX trading reality | Product/Finance | Medium | Medium | Explicit currency on every monetary row; tenant currency setting; no implicit FX conversion path; display default is USD per the decision ledger and is revisited with pilot users | Pilot tenants re-entering amounts in a second currency | Founder/Product | BR-018 | Open |
| R-027 | Refund abuse or over-refund | Finance/Security | Medium | Medium | Refund validated against `sale_items` net of prior refunds inside a transaction; permission required; reversing movements written to the original batch; refund audited | Refund total for a sale exceeding its paid total | Backend | BR-010, FR-169 | Design mitigated |
| R-028 | Day closure bypassed, duplicated or closed without a discrepancy reason | Finance | Low | Medium | Unique constraint per branch per business date; non-zero discrepancy requires a reason; closed day immutable; corrections are new audited adjustment records | Two closures for the same branch and date, or a closure with a blank reason | Backend | BR-021, FR-204 | Design mitigated |
| R-029 | Object storage exposure — public bucket or leaked signed URL | Security | Medium | High | Private bucket; tenant-prefixed keys; short-lived signed URLs; MIME allowlist and size cap; downloads audited | An object reachable without a signed URL | Security/Backend | FR-075, FR-210 | Design mitigated |
| R-030 | PWA or service worker serves stale stock or prices to POS | Technical | Medium | Medium | Never cache stock, price or payment responses; cache only the app shell and static assets; TanStack Query invalidation after every mutation; explicit cache-control headers on API responses | A cashier selling an item that was already sold out | Tech Lead | FR-155, FR-162 | Open |
| R-031 | WCAG 2.1 AA not met | Compliance/UX | Medium | Low | Keyboard path for every POS action; visible focus management; contrast checks in the neutral design system; accessibility assertions in the E2E suite | A core flow that cannot be completed by keyboard alone | Tech Lead | — | Open |
| R-032 | Observability gaps — no centralized logs or error monitoring in early builds | Ops | Medium | Medium | Centralized logging, error monitoring and audit logs with actor/action/target/timestamp/context wired before the first staging deploy; alerts on payment callback failures and job failures | An incident diagnosed only by reading the database | DevOps | BR-016 | Open |
| R-033 | Pharmacy-specific regulatory requirements beyond the Data Protection Act | Compliance | Medium | Medium | Batch and expiry controls, mandatory adjustment reasons, no patient medical records in scope; confirm requirements with the pilot pharmacy before launch | Pilot pharmacy requests a capability the model cannot express | Founder/Product | FR-131, FR-109 | Open |
| R-034 | Personal data of customers and suppliers handled without a defined basis | Compliance | Medium | Medium | Collect the minimum (name, phone, TIN where required); tenant-scoped access; audit on export and download; retention configurable | A tenant exporting personal data with no audit entry | Security | FR-133, FR-091 | Open |
| R-035 | Concurrent receiving against one purchase order | Data | Low | Medium | Receiving transaction locks the PO and its lines; received quantities incremented atomically; over-receipt requires explicit confirmation and is flagged | Received quantity exceeding ordered quantity without a flag | Backend | BR-020, FR-145 | Design mitigated |
| R-036 | Redis or job queue failure stalls notifications, exports and payment expiry | Ops | Medium | Medium | Bounded retries then surfaced failure; job status visible in the UI; payment expiry also enforced by a scheduled sweep; queue depth and failure rate monitored | Jobs queued beyond the retry bound with no surfaced error | DevOps | FR-213, FR-186 | Open |
| R-037 | Success metrics undefined — targets are set only after the first month | Product | Medium | Medium | Instrument weekly active users and completion of the six primary workflows from launch; targets set after the first month per the decision ledger; founding-team dashboard | No reliable activation number available at the end of month one | Founder/Product | FR-081 | Open |
| R-038 | Self-service registration admits junk or duplicate tenants | Product | Low | Medium | Phone verification before any business data is created; unique business identifier; duplicate detection on legal name plus TIN; assumption: no platform approval step in MVP | Duplicate tenants appearing in the same week | Founder/Product | FR-021, FR-005 | Accepted |
| R-039 | No platform-operator UI — internal support works through database access | Operational/Security | Medium | Medium | Read-only tooling by default; break-glass procedure with a named approver; every administrative action audited; no direct writes to stock or financial tables | A support action that cannot be reconstructed from the audit log | Security | BR-001, BR-016 | Accepted |
| R-040 | English-only and USD assumptions mismatch local user expectations | Product | Low | Medium | i18n-ready string layer and explicit currency field from day one; no hard-coded locale strings in components; revisit with pilot users | Users asking for Luganda or UGX-first display | Founder/Product | BR-018 | Accepted |
| R-041 | Supplier coordination (Phase 3) is the connective tissue users expect from "interconnected" | Product | Medium | Medium | MVP builds the primitives (catalogue, balances, movements, transfers, purchase orders); onboarding states explicitly that the supplier marketplace is not in MVP | Pilot users asking to place orders with suppliers inside SokoOS | Founder/Product | FR-116, FR-137 | Accepted |
| R-042 | Data migration from spreadsheets and paper is the real onboarding cost | Delivery/Product | High | Medium | CSV/XLSX import with per-row error reporting is P0; opening stock imported as movements; assisted import for the first pilot tenants | A pilot tenant unable to load its catalogue within one week | Founder/Tech Lead | FR-207 | Open |

### Scoring key

| Probability × Impact | Priority | Required action |
|---|---|---|
| High × High | Critical | Mitigate before coding the affected module starts; re-review weekly |
| High × Medium or Medium × High | Important | Mitigate before launch; tracked at every release gate |
| Medium × Medium or Low × High | Moderate | Mitigate where cheap; otherwise monitor with a named early warning signal |
| Low × Medium or Medium × Low | Monitor | Documented; reviewed at release gates only |
| Low × Low | Accept | No action in MVP |

### Critical risks (High × High) — mitigate before the affected module is built

| Risk ID | Risk | Mitigation must be complete before |
|---|---|---|
| R-001 | Unvalidated pricing assumptions | Any pricing page or subscription screen is built |
| R-015 | Connectivity-driven duplicate or lost sales | POS sale commit (FR-162) is built |
| R-021 | Single developer plus AI agent capacity | Each phase gate; scope is cut, not the gates |
| R-042 | Migration cost of onboarding real tenants | First pilot tenant onboarding |

### Risks accepted without mitigation in MVP

| Risk ID | Risk | Why accepted | Revisit trigger |
|---|---|---|---|
| R-038 | Junk or duplicate tenants from self-service registration | Phone verification plus unique identifiers is proportionate for a pilot tenant count | More than 20 tenants or the first abusive tenant |
| R-039 | Support through database access with no operator UI | Building an operator console is Phase 6 work and would delay the MVP | First support incident that cannot be resolved read-only |
| R-040 | English-only, USD display default | i18n-ready structure is cheap; translation is not needed for the pilot cohort | First pilot tenant requesting another language or UGX-first display |
| R-041 | Supplier marketplace absent from MVP | Phase 3 is explicitly deferred; the primitives it needs are built now | Pilot users blocking on supplier ordering |

### Risk ownership summary

| Owner | Risks |
|---|---|
| Founder/Product | R-001, R-009, R-010, R-026, R-037, R-038, R-040, R-041 |
| Founder/Tech Lead | R-002, R-021, R-042 |
| Tech Lead | R-011, R-013, R-015, R-020, R-022, R-030, R-031 |
| Backend | R-003, R-006, R-007, R-008, R-012, R-014, R-019, R-025, R-027, R-028, R-035 |
| Security | R-004, R-005, R-023, R-029, R-034, R-039 |
| DevOps | R-016, R-017, R-018, R-032, R-036 |
| Founder/Finance | R-010, R-026 |

### Risk-to-release-gate mapping

The decision ledger defines release gates on financials, stock reconciliation, duplicate prevention, E2E, backups and import errors. Each gate closes specific risks; a gate is not passed while any mapped risk is still Open with an untested mitigation.

| Release gate | Risks it closes | Evidence required |
|---|---|---|
| Financials | R-003, R-025, R-027, R-028 | Golden tests: POS total = receipt total = report total; refund cannot exceed sold quantity net of prior refunds; day closure unique per branch per date |
| Stock reconciliation | R-006, R-007, R-008, R-019, R-035 | Reconciliation check reports zero drift; concurrency test on the last unit; expiry boundary test; import dry-run and apply report |
| Duplicate prevention | R-003, R-015 | Replayed sale submission returns the original sale; replayed provider callback creates no second payment or movement |
| E2E scenarios A–G | R-005, R-012, R-014, R-030 | End-to-end runs of the six primary workflows plus the deferred-scope check, on staging, with branch-scoped and admin users |
| Backups | R-018 | Restore drill into staging completed within the documented recovery window |
| Import errors | R-019, R-042 | Per-row error report produced for a deliberately malformed file; no partial application of a failed row |

### Review cadence and triggers

| Cadence | Action |
|---|---|
| Weekly during build | Review all Open risks with a High probability or High impact; update Status; confirm the next module's critical risks are mitigated first |
| At each phase gate | Re-score every risk; move Design mitigated to Mitigated only when the test exists and passes |
| Before production launch | Confirm every release gate above; confirm no Critical risk remains Open; confirm accepted risks are still acceptable |
| On trigger events | Immediate re-review when: a payment provider changes terms or availability; a pilot tenant reports a stock or money discrepancy; a cross-tenant or cross-branch access is suspected; a restore drill fails; a deferred-phase feature is requested by a paying tenant |

### Assumptions recorded as risks

These are assumptions made where the decision ledger is silent. Each is written as the smallest conventional option consistent with the ledger, and each is carried as a risk until confirmed.

| Assumption | Carried as |
|---|---|
| Verification codes expire in 10 minutes with a maximum of 5 attempts | R-012, R-013 |
| Invitation tokens expire in 7 days | R-012 |
| Password reset tokens are single-use and expire in 30 minutes | R-012 |
| Failed sign-ins lock for 15 minutes after 10 attempts per email | R-012 |
| A pending mobile money payment expires after 15 minutes | R-003, R-036 |
| Parked sales are held client-side only; a reload discards an unpaid cart | R-015 |
| A sale may be split across at most two tenders | R-003 |
| FEFO is used to pick batches within non-expired stock | R-008 |
| Low-stock re-notification is suppressed for 24 hours | R-037 |
| Day-closure discrepancy tolerance defaults to zero and is configurable per branch | R-028 |
| Negative stock defaults to disabled and is overridable per branch | R-007 |
| Product image uploads are capped at 5 MB | R-029 |
| Business registration is self-service with no platform approval step | R-038 |
| Suppliers are not SokoOS users in MVP | R-041 |
| Subscription billing and collection are not implemented in MVP | R-001 |
| No platform-operator interface exists in MVP | R-039 |
| Notification email is not a channel in MVP | R-012 |
| The chosen messaging provider is used for verification codes and is not named in the decision ledger | R-012, R-013 |
| The chosen WhatsApp provider is confirmed only when terms are agreed | R-011 |