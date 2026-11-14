/**
 * Route registry for the authenticated app shell.
 *
 * Why this exists
 * ---------------
 * `lib/industries.ts` describes navigation for 60+ business types. Many entries point at
 * modules that `docs/11-ui-ux-specification.md` does not define and that the application does
 * not implement (for example `/floor`, `/kitchen`, `/patients`). The UI specification also
 * defines **no** "section index" screens — every screen is concrete (for example
 * `/catalogue/products`, never `/catalogue`).
 *
 * The sidebar must never link to a screen the application cannot render, so the shell resolves
 * every nav path through this registry and drops anything that is not implemented.
 */

/** Section roots used by `industries.ts` → the real screen that represents that section. */
export const SECTION_HOME: Readonly<Record<string, string>> = {
  '/catalogue': '/catalogue/products',
  '/inventory': '/inventory/balances',
  '/purchasing': '/purchasing/purchase-orders',
  '/finance': '/finance/payments',
  '/reports': '/reports/sales',
  '/settings': '/settings/business',
};

/** Screens that exist under `app/(app)` — keep in sync with the route folders. */
export const IMPLEMENTED_ROUTES: readonly string[] = [
  '/dashboard',
  '/pos',
  '/sales',
  '/debts',
  '/transfers',
  '/users',
  '/notifications',
  '/audit-logs',
  '/inventory/balances',
  '/inventory/movements',
  '/inventory/batches',
  '/inventory/adjustments',
  '/inventory/counts',
  '/catalogue/products',
  '/catalogue/categories',
  '/catalogue/brands',
  '/purchasing/purchase-orders',
  '/purchasing/goods-receipts',
  '/purchasing/suppliers',
  '/finance/payments',
  '/finance/day-closure',
  '/reports/sales',
  '/reports/stock',
  '/reports/low-stock',
  '/reports/purchasing',
  '/settings/business',
  '/settings/branches',
  '/settings/users',
  '/settings/roles',
  '/settings/notifications',
  '/settings/appearance',
];

/**
 * Resolve a navigation path to a screen that exists.
 * Returns `null` when the target is not implemented, so callers can omit the link entirely
 * rather than render a 404.
 */
export function resolveNavPath(path: string): string | null {
  const resolved = SECTION_HOME[path] ?? path;
  return IMPLEMENTED_ROUTES.includes(resolved) ? resolved : null;
}
