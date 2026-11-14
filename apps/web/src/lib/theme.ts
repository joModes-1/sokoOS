/**
 * Brand colour presets for Settings → Appearance.
 *
 * How colour is shared across the app
 * ----------------------------------
 * `docs/11-ui-ux-specification.md` settles on one accent colour carrying brand identity, and every
 * component reads it through a single token: the Tailwind `sunset` family. `tailwind.config.ts`
 * maps that family to the `--brand*` CSS variables declared in `app/globals.css`, so re-pointing
 * those variables re-skins buttons, links, the active nav pill, focus rings, badges, progress bars
 * and the POS highlight at once — no component holds a hex value of its own.
 *
 * Each preset is therefore just an id: the colours themselves live in CSS
 * (`:root[data-brand='…']`), applied by setting `data-brand` on `<html>`. Keep the `swatch`
 * hex here in step with the CSS block of the same id.
 *
 * Neutral surfaces (sand, peach, soil) and text/border tones ARE themed too — each preset in
 * `app/globals.css` re-skins the whole app, so switching theme is visible everywhere at once.
 * Only the semantic colours (success, warning, danger, info) stay fixed: a red "Low stock" badge
 * must stay red in every colourway.
 */

export const BRAND_PRESETS = [
  { id: 'sunset', label: 'Sunset Savanna', swatch: '#C2410C' },
  { id: 'ocean', label: 'Ocean', swatch: '#1D4ED8' },
  { id: 'teal', label: 'Teal', swatch: '#0F766E' },
  { id: 'forest', label: 'Forest', swatch: '#15803D' },
  { id: 'plum', label: 'Plum', swatch: '#7E22CE' },
  { id: 'rose', label: 'Rose', swatch: '#BE123C' },
  { id: 'amber', label: 'Amber', swatch: '#B45309' },
  { id: 'graphite', label: 'Graphite', swatch: '#334155' },
] as const;

export type BrandPreset = (typeof BRAND_PRESETS)[number];
export type BrandId = BrandPreset['id'];

/** The designed default — matches `:root` in app/globals.css. */
export const DEFAULT_BRAND: BrandId = 'sunset';

/** Per-device preference; no server round-trip (see Assumptions in the pass report). */
export const BRAND_STORAGE_KEY = 'sokoos.brand';

export function isBrandId(value: unknown): value is BrandId {
  return typeof value === 'string' && BRAND_PRESETS.some(p => p.id === value);
}

/** Reads the stored preference, falling back to the default when absent or tampered with. */
export function readStoredBrand(): BrandId {
  if (typeof window === 'undefined') return DEFAULT_BRAND;
  try {
    const stored = window.localStorage.getItem(BRAND_STORAGE_KEY);
    return isBrandId(stored) ? stored : DEFAULT_BRAND;
  } catch {
    // localStorage can throw in private mode / when storage is disabled — never break the page.
    return DEFAULT_BRAND;
  }
}

export function storeBrand(id: BrandId): void {
  try {
    window.localStorage.setItem(BRAND_STORAGE_KEY, id);
  } catch {
    /* preference simply does not persist */
  }
}

/** Applies a preset to the document. CSS does the rest. */
export function applyBrand(id: BrandId): void {
  document.documentElement.dataset.brand = id;
}

/**
 * Runs before first paint (injected in `app/layout.tsx`) so the saved colourway is already on
 * `<html>` when the shell renders — no flash of the default orange.
 */
export const BRAND_BOOTSTRAP_SCRIPT =
  `try{var b=localStorage.getItem('${BRAND_STORAGE_KEY}');` +
  `if(b&&/^[a-z]+$/.test(b)){document.documentElement.dataset.brand=b}}catch(e){}`;
