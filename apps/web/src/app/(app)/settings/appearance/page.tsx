'use client';

import { useEffect, useState } from 'react';
import { PageHeader, Card, Button, Alert } from '@/components/ui';
import {
  BRAND_PRESETS, DEFAULT_BRAND, applyBrand, readStoredBrand, storeBrand, type BrandId,
} from '@/lib/theme';

/**
 * Appearance settings — pick the theme (docs/11-ui-ux-specification.md: "one accent colour
 * carries brand identity", extended per product feedback so a theme re-skins the whole app).
 *
 * Choosing a swatch only sets `data-brand` on `<html>`; the colours live in `app/globals.css`:
 * each preset re-points the accent AND the neutral tokens (sidebar, page background, sunken
 * surfaces, borders, text tones), so the entire app restyles together. Status colours stay put
 * so a warning still reads as a warning in every theme.
 */
export default function AppearanceSettingsPage() {
  const [brand, setBrand] = useState<BrandId>(DEFAULT_BRAND);

  // The pre-paint bootstrap script (app/layout.tsx) has already applied the stored colour; this
  // syncs React state with it so the "Current" marker is right.
  useEffect(() => {
    const stored = readStoredBrand();
    setBrand(stored);
    applyBrand(stored);
  }, []);

  function choose(id: BrandId) {
    setBrand(id);
    applyBrand(id);
    storeBrand(id);
  }

  const isDefault = brand === DEFAULT_BRAND;

  return (
    <div className="max-w-2xl">
      <PageHeader title="Appearance" />

      <Card>
        <h2 className="font-semibold text-ink mb-1">Theme</h2>
        <p className="text-sm text-ink/50 mb-4">
          Restyles the whole app — sidebar, background, cards, buttons and links. Status colours —
          low stock, errors, completed — never change, so a warning still reads as a warning in
          every theme.
        </p>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {BRAND_PRESETS.map(preset => {
            const active = preset.id === brand;
            return (
              <button
                key={preset.id}
                type="button"
                onClick={() => choose(preset.id)}
                aria-pressed={active}
                title={`Use the ${preset.label} accent`}
                className={`flex items-center gap-2 rounded-xl border p-3 text-left transition-colors ${
                  active ? 'border-sunset bg-sunset/5 ring-1 ring-sunset' : 'border-border hover:border-sunset/60 hover:bg-sand'
                }`}
              >
                <span
                  className="h-6 w-6 flex-shrink-0 rounded-full ring-1 ring-inset ring-black/10"
                  style={{ background: preset.swatch }}
                  aria-hidden
                />
                <span className="min-w-0">
                  <span className="block truncate text-xs font-semibold text-ink">{preset.label}</span>
                  <span className="block text-[10px] text-ink/40">{active ? 'Current' : preset.swatch}</span>
                </span>
              </button>
            );
          })}
        </div>
      </Card>

      <Card className="mt-6">
        <h2 className="font-semibold text-ink mb-4">Preview</h2>
        <div className="flex flex-wrap items-center gap-3">
          <Button data-testid="accent-preview-button">New sale</Button>
          <span className="badge badge-brand">Active</span>
          <span className="badge badge-success">In stock</span>
          <span className="badge badge-danger">Out of stock</span>
          <a href="/dashboard" className="text-sm font-medium text-sunset hover:underline">Reports →</a>
        </div>
        <div className="progress-bar mt-5">
          <div className="progress-fill" style={{ width: '62%' }} />
        </div>
        <p className="text-xs text-ink/40 mt-2">62% of today&apos;s target</p>
      </Card>

      <div className="mt-6 flex items-center gap-3">
        <Button
          variant="secondary"
          onClick={() => choose(DEFAULT_BRAND)}
          disabled={isDefault}
        >
          Reset to Sunset Savanna
        </Button>
        {isDefault && <span className="text-xs text-ink/40">Already on the default colourway.</span>}
      </div>

      {!isDefault && (
        <Alert tone="info" className="mt-6">
          This preference is stored on this device only, so each till can carry its own colourway.
        </Alert>
      )}
    </div>
  );
}
