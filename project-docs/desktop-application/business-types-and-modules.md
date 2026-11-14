# Business Types and Modules — SokoOS Desktop Track

**Purpose:** Describe how the existing platform handles different businesses, industries, modules, permissions, and configuration, with a separation between what is confirmed in code and what is assumed from docs.

**Why this matters for the desktop app:** The desktop application must respect the same business scoping and permission model as the web app. If module availability differs by business, the desktop UI must adapt.

---

## 1. Industry types present in the codebase

The shared package defines a fixed set of business/industry types:

- `RETAIL` — Shop / Supermarket
- `PHARMACY` — Pharmacy
- `RESTAURANT` — Restaurant / Café
- `WHOLESALE` — Wholesale / Distribution
- `MANUFACTURING` — Manufacturing
- `AGRICULTURE` — Farm / Agriculture
- `HOSPITALITY` — Hotel / Lodge
- `AUTOMOTIVE` — Garage / Automotive
- `CONSTRUCTION` — Construction
- `BEAUTY` — Salon / Beauty
- `EDUCATION` — School / Training
- `SERVICES` — Services / Projects
- `FUEL_STATION` — Fuel Station
- `LOGISTICS` — Logistics / Courier
- `LAUNDRY` — Laundry / Dry Cleaning
- `LABORATORY` — Medical Laboratory
- `REAL_ESTATE` — Property / Real Estate
- `OTHER` — Other Business

These are real constants in `packages/shared/src/constants/BUSINESS_TYPES`, not aspirational product copy.

---

## 2. Business size tiers present in the codebase

The shared package also defines size tiers:

- `MICRO` — 1 person
- `SMALL` — 2–5 workers
- `GROWING` — 6–15 workers
- `ESTABLISHED` — 16–50 workers
- `ENTERPRISE` — 50+ workers

Each tier has a description and a price label. These are real constants in `packages/shared/src/constants/BUSINESS_SIZES`.

Registration captures both `businessType` and `businessSize`, so the platform does distinguish businesses at registration time.

---

## 3. How the web app reflects industry differences

The app shell builds navigation from an industry configuration retrieved via `getIndustryConfig(...)` from `apps/web/src/lib/industries.ts`. That means the visible menu can differ by industry. For the desktop app, this is the main visible sign that “not every business has the same UI.”

There is also an `apps/web/src/lib/industries.ts` file that maps an industry code to navigation items and other industry-specific UI configuration.

---

## 4. Modules present in the platform

Based on the existing API modules and shared schemas, the platform includes:

- Auth and account lifecycle
- Businesses, branches, and user management
- RBAC and invitations
- Catalogue: categories, brands, products, variants
- Inventory: balances, movements, batches, adjustments, low stock, counts
- Transfers: multi-branch stock movement lifecycle
- Purchasing: suppliers, purchase orders, goods receipts
- Sales and POS: sale commit, receipts, refunds
- Payments: mobile money, cash, day closure
- Reports and dashboard
- Audit logs
- Notifications
- Jobs, imports, exports, attachments

These are not hypothetical modules; they correspond to real API modules in `apps/api/src/modules` and real shared schemas in `packages/shared/src/schemas`.

---

## 5. What is confirmed about module enablement

Confirmed:
- Different industries exist and are stored on registration.
- Different sizes exist and are stored on registration.
- The web navigation can vary by industry.
- Permissions differ by role.
- Some operations are clearly only meaningful for some businesses: stock batches, FEFO/expiry, expired-batch exclusion from sales, transfers, receiving, day closure, supplier POs, etc.

So the platform clearly has the shape of a configurable business platform, not a one-size-fits-all app.

---

## 6. What is not yet confirmed as dynamic module enablement

Important distinction for the desktop track:

- We have industry types and size tiers.
- We have roles and permissions.
- We do **not** yet have confirmed evidence, from this investigation pass, of a fully dynamic per-business “enabled modules” feature flag system that gates every backend endpoint by an explicit module list.

That does not mean the platform lacks module scoping; it means the desktop documentation should not assume a single clean “enabled modules” flag exists unless it is verified in the codebase. Module availability may currently be expressed through:
- Roles and permissions
- Industry-specific UI configuration
- Whether a business has branches/suppliers/products/batches/etc. configured
- Subscription/business profile concepts documented in the existing docs

Until verified, the desktop app should be designed conservatively: show only what the backend permits, and do not assume that two businesses of the same industry type have identical available operations.

---

## 7. What this means for the desktop application

1. **Do not build one desktop app per industry.** The platform is shared. The desktop app should be one application that respects business configuration.
2. **Drive UI from the same permission/resource model the API uses.** If the API says a user can create sales but not approve transfers, the desktop app must reflect that.
3. **Do not assume full module coverage for every business.** Some businesses may use only a few modules; some may have batches, expiry, transfers, suppliers, and day closure; some may not.
4. **Treat industry config as UI guidance, not as the whole truth.** The backend is the authority for what a user can actually do.
5. **Verify module enablement before freezing the desktop module map.** If a dynamic module/feature flag system exists or is planned, the desktop app should consume it from the backend rather than hardcoding module sets per industry.

---

## 8. Desktop-relevant module prioritization

For an offline-first desktop app, not all modules are equal. The first candidates are the ones that businesses actually do on the floor and away from the server:

- Sales and POS
- Inventory lookups and key stock operations
- Transfers (request/approve/dispatch/receive) where applicable
- Purchasing and goods receiving where applicable
- Payments and day closure where applicable
- Customer/supplier context where applicable
- Reporting where it can be computed locally from synchronized data

Modules that are more administrative and less offline-critical may initially be web-first:
- Complex imports/exports
- Full audit-log administration
- Notification preferences and delivery plumbing
- Heavy configuration screens

This is an implementation prioritization, not a product decision to drop any module permanently.

---

## 8.1 Offline-first module scoping rule

For each module, the desktop app should answer:
- Can this be done offline at all?
- Can it be done fully offline, or only partially?
- Can it be done without creating financial/stock conflicts?
- Does it need special sync handling?

Examples:
- Recording a cash sale with a receipt can be offline-friendly if it is created locally with a stable local id, queued for sync, and later reconciled.
- Receiving stock against a PO is sync-sensitive because it affects balances and PO status.
- Day closure is sensitive because it is branch-scoped and time-boundary-sensitive; offline day closure must be carefully designed rather than naively mirrored.

---

## 9. Gaps to document and verify

Before freezing the desktop module model, verify:
1. Whether business type drives any hard module constraints beyond UI navigation.
2. Whether subscription/business profile determines feature availability.
3. Whether there is a backend notion of enabled modules per business.
4. Which endpoints are truly global vs business-scoped vs branch-scoped.
5. Which offline operations are safe to stage locally without violating server invariants.

## 10. Module availability decision rule for the desktop app

Until the gaps above are resolved, the desktop app should use this conservative rule:

- Use the backend as the authority for what a user can do.
- Hide UI for operations the current user/business/branch cannot perform.
- Do not assume two businesses of the same industry type have identical available operations.
- Prefer per-business configuration and permissions over industry-based hardcoding.

This keeps the desktop application aligned with the existing platform even if module enablement is implemented through roles, permissions, industry config, and business profile rather than a single enabled-modules flag.
