'use client';

import { useState } from 'react';
import { useLoadDemoData } from '@/hooks/use-queries';

// Inlined at build time, so this whole component compiles out of a production build.
const IS_DEV = process.env.NODE_ENV !== 'production';

/**
 * Floating "Load demo data" button, development builds only.
 *
 * It asks the API to seed the *signed-in* business, so it works for any test tenant without
 * knowing the business id: a pharmacy gets medicines, an electronics workshop gets repairs.
 */
export function DevSeedButton() {
  const seed = useLoadDemoData();
  const [note, setNote] = useState<string | null>(null);

  if (!IS_DEV) return null;

  async function run() {
    if (!window.confirm(
      'Load demo data into this business?\n\n'
      + 'This replaces any demo catalogue and demo sales here with a fresh 30 days of trading. '
      + 'Products and sales you created by hand are left alone.',
    )) return;

    setNote('Loading demo data…');
    try {
      const result = await seed.mutateAsync();
      setNote(
        `${result.businessName ?? 'Business'} (${result.businessType ?? 'type unknown'}): `
        + `${result.products ?? 0} products, ${result.sales ?? 0} sales, ${result.debts ?? 0} debts`,
      );
    } catch (error) {
      setNote(error instanceof Error ? error.message : 'Demo data failed to load');
    }
  }

  return (
    <div className="fixed bottom-[4.25rem] right-4 z-30 flex flex-col items-end gap-1.5 print:hidden">
      {note && (
        <div className="max-w-xs rounded-lg bg-ink px-3 py-2 text-xs text-white shadow-lg">
          {note}
        </div>
      )}
      <button
        type="button"
        onClick={run}
        disabled={seed.isPending}
        className="rounded-full bg-ink px-4 py-2 text-xs font-semibold text-white shadow-lg ring-1 ring-white/20 transition hover:bg-ink/90 disabled:opacity-60"
        title="Development only"
      >
        {seed.isPending ? 'Loading demo data…' : '⚡ Load demo data'}
      </button>
    </div>
  );
}