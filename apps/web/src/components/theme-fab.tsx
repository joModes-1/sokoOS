'use client';

import { useEffect, useState } from 'react';
import { applyBrand, BRAND_PRESETS, DEFAULT_BRAND, isBrandId, readStoredBrand, storeBrand, type BrandId } from '@/lib/theme';

/**
 * Floating quick theme switcher, bottom-right corner. One click opens the colourway picker;
 * picking a preset applies it immediately (same presets as Settings → Appearance) and stores
 * the choice per device. Rendered in the app shell, on every screen.
 */
export function ThemeFab() {
  const [open, setOpen] = useState(false);
  const [current, setCurrent] = useState<BrandId>(DEFAULT_BRAND);

  // Read the live brand from <html> (set by the bootstrap script or the appearance page),
  // and keep following it if the theme is changed elsewhere while this is mounted.
  useEffect(() => {
    const root = document.documentElement;
    const sync = () => {
      const b = root.dataset.brand;
      setCurrent(isBrandId(b) ? b : DEFAULT_BRAND);
    };
    setCurrent(readStoredBrand());
    const mo = new MutationObserver(sync);
    mo.observe(root, { attributes: true, attributeFilter: ['data-brand'] });
    return () => mo.disconnect();
  }, []);

  function pick(id: BrandId) {
    applyBrand(id);
    storeBrand(id);
    setCurrent(id);
    setOpen(false);
  }

  const activePreset = BRAND_PRESETS.find((p) => p.id === current) ?? BRAND_PRESETS[0];

  return (
    <div className="fixed bottom-4 right-4 z-40 print:hidden">
      {open && (
        <>
          {/* Click-away catcher */}
          <div className="fixed inset-0" onClick={() => setOpen(false)} aria-hidden />
          <div
            role="dialog"
            aria-label="Choose a theme"
            className="absolute bottom-12 right-0 z-10 w-64 rounded-2xl border border-border bg-surface p-3 shadow-xl"
          >
            <p className="mb-2 px-1 text-xs font-semibold uppercase tracking-wide text-ink/50">Theme</p>
            <div className="grid grid-cols-4 gap-1.5">
              {BRAND_PRESETS.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => pick(p.id)}
                  title={p.label}
                  aria-pressed={current === p.id}
                  className={`flex flex-col items-center gap-1.5 rounded-lg p-1.5 transition-colors ${
                    current === p.id ? 'bg-sand' : 'hover:bg-sand'
                  }`}
                >
                  <span
                    aria-hidden
                    className={`h-7 w-7 rounded-full ring-2 ring-offset-2 ${
                      current === p.id ? 'ring-ink/50' : 'ring-transparent'
                    }`}
                    style={{ background: p.swatch }}
                  />
                  <span className="text-[10px] leading-tight text-ink/60">{p.label.split(' ')[0]}</span>
                </button>
              ))}
            </div>
            <p className="mt-2 border-t border-border px-1 pt-2 text-[10px] text-ink/40">
              Restyles the whole app
            </p>
          </div>
        </>
      )}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label="Change theme"
        aria-expanded={open}
        title="Change theme"
        className="relative flex h-11 w-11 items-center justify-center rounded-full border border-border bg-surface text-ink/70 shadow-lg transition hover:text-ink hover:shadow-xl active:scale-95"
      >
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.8}
            d="M4.098 19.902a3.75 3.75 0 005.304 0l6.401-6.402M6.75 21A3.75 3.75 0 013 17.25V4.125C3 3.504 3.504 3 4.125 3h5.25c.621 0 1.125.504 1.125 1.125v4.072M6.75 21a3.75 3.75 0 003.75-3.75V8.197M6.75 21h13.125c.621 0 1.125-.504 1.125-1.125v-5.25c0-.621-.504-1.125-1.125-1.125h-4.072M10.5 8.197l2.88-2.88c.438-.439 1.15-.439 1.59 0l3.712 3.713c.44.44.44 1.152 0 1.59l-2.879 2.88M6.75 17.25h.008v.008H6.75v-.008z"
          />
        </svg>
        {/* Dot showing the active colourway */}
        <span
          aria-hidden
          className="absolute bottom-1.5 right-1.5 h-2.5 w-2.5 rounded-full ring-1 ring-white/60"
          style={{ background: activePreset.swatch }}
        />
      </button>
    </div>
  );
}
