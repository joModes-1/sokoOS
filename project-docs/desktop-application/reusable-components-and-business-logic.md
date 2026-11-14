# Reusable Components and Business Logic — SokoOS Desktop Track

**Purpose:** Inventory what can be reused from the existing platform in a Tauri 2 desktop application, what must be adapted, and what should not be reused as-is.

**Guiding rule:** Reuse contracts, validators, money logic, error vocabulary, and UI design patterns first. Do not duplicate business logic just because it is convenient.

---

## 1. High-value reuse targets

### 1.1 Shared schemas
`packages/shared/src/schemas` contains Zod schemas for:
- Auth and registration
- Catalogue
- Inventory and stock transfers
- Sales, payments, refunds, day closure
- Purchasing and goods receipts

These are the single best source of truth for form validation, payload shape, and type inference. The desktop app should use the same schemas directly, ideally via the shared package or a desktop-appropriate variant of it.

### 1.2 Money helpers
`packages/shared/src/money/index.ts` contains minor-unit arithmetic, formatting, parsing, line-total computation, and guards against floats. This is exactly the kind of logic that should not be reimplemented separately for the desktop app.

### 1.3 Error codes
`packages/shared/src/errors/index.ts` defines the machine-readable error vocabulary. The desktop app should map API errors to the same codes and the same UX semantics.

### 1.4 Permissions and roles
`packages/shared/src/constants/PERMISSIONS` and `ROLE_DEFAULTS` give the desktop app the real permission strings and the default role permission sets. The desktop UI should gate features using these exact values, not invented equivalents.

### 1.5 Business-type and size constants
`BUSINESS_TYPES` and `BUSINESS_SIZES` give the desktop app the same industry/size vocabulary the platform uses.

---

## 2. UI reuse targets

### 2.1 Component patterns
`apps/web/src/components/ui` and the surrounding component layer provide input, button, select, textarea, card, table, alert, avatar, chart, and layout patterns. The desktop app should reuse the visual design language: colors, spacing, typography intent, and interaction patterns.

### 2.2 Forms and validation patterns
The web app uses React Hook Form plus Zod. The desktop app can reuse the same schemas and a similar validation discipline, even if the exact component framework wiring differs.

### 2.3 Design tokens
The Tailwind token set in `apps/web/src/app/globals.css` defines the brand language. The desktop app should preserve that language rather than invent a new one.

---

## 3. Logic reuse targets

### 3.1 Line-total and tax computation logic
The existing `computeLineTotal` logic is the kind of thing that must stay consistent between web and desktop. If the desktop app computes line totals locally for display or offline preview, it must match the server’s semantics. Reusing the shared money helpers is the safest way to do that.

### 3.2 Sale total and payment enforcement semantics
The backend enforces that payments cover the sale total and that totals are derived consistently. The desktop app does not need to reimplement the server’s enforcement rules as local truth, but it does need to know them so offline UX does not promise impossible operations.

### 3.3 Refund, transfer, PO, and receipt lifecycle rules
These are embedded in the backend today. The desktop app should reuse the contracts and the rules, not reimplement alternate business rules locally.

### 3.4 Stock movement and batch semantics
Batch tracking, expiry exclusion, and movement-based balances are part of the existing domain model. Any offline stock operation should respect them.

---

## 4. What should be adapted, not copied

### 4.1 API client
The web API client is a strong template, but the desktop app will likely need its own client with:
- Secure local token storage
- Offline queueing
- Sync retry and status reporting
- Desktop logging and diagnostics

The web client’s request building, header logic, error mapping, and URL conventions are all reusable as a design reference and possibly as shared code.

### 4.2 State management
TanStack Query usage in the web app is a good model for server-state management, but the desktop app may choose a different local caching and offline queue approach. The principle of separating server state from UI state should be preserved.

### 4.3 Routing
Next.js routing is not reusable in Tauri. The desktop app will need its own navigation model. The web app’s screen structure is still a useful guide for what screens exist and how they relate.

---

## 5. What should not be reused as-is

- Browser-only storage for tokens and session state.
- SSR assumptions.
- Web-only devtools or browser APIs used as core infrastructure.
- Mock data or test helpers unless they genuinely reflect the real API contracts.
- Any code that depends on being served by a web server at runtime.

---

## 6. Packaging reuse without disrupting existing apps

The cleanest approach is to keep reuse in packages that existing apps already consume or can consume safely:
- `packages/shared` is the natural home for schemas, money, errors, and constants.
- If desktop-specific offline/sync abstractions are needed, they should live in the desktop app or in a dedicated desktop/shared package, not in a package that would force changes into the web/mobile/backend apps.

The desktop track should avoid editing web, mobile, or backend packages just to accommodate desktop reuse unless there is a clear reason and the change is reviewed.

---

## 7. Reuse decision summary

| Area | Reuse | Notes |
|---|---|---|
| Zod schemas | Yes | Primary contract source |
| Money helpers | Yes | Do not reimplement |
| Error codes | Yes | Same vocabulary |
| Permissions/roles | Yes | Same strings and defaults |
| Industry/size constants | Yes | Same vocabulary |
| UI components/patterns | Adapt | Preserve design language |
| API client pattern | Adapt | Secure storage, offline queue |
| Forms/validation discipline | Adapt | Same schemas, possibly different UI framework wiring |
| TanStack Query patterns | Inform | Not necessarily copied directly |
| Next.js routing/SSR | No | Desktop is its own client |
| Token storage model | No | Must be desktop-native and secure |
| Backend enforcement rules | Do not reimplement | Mirror contracts, not alternate rules |
