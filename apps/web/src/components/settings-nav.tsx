'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

/**
 * Settings sub-navigation.
 *
 * The sidebar has a single "Settings" entry (→ `/settings/business`), which left
 * `/settings/branches`, `/settings/roles` and `/settings/notifications` reachable only by typing
 * the URL. The shell renders this strip on every `/settings/*` screen so the sections — including
 * Appearance — are discoverable, and so a newly added settings screen needs no wiring beyond an
 * entry here and in `lib/routes.ts`.
 */
const SETTINGS_TABS: readonly { href: string; label: string }[] = [
  { href: '/settings/business', label: 'Business' },
  { href: '/settings/branches', label: 'Branches' },
  { href: '/settings/roles', label: 'Roles' },
  { href: '/settings/notifications', label: 'Notifications' },
  { href: '/settings/appearance', label: 'Appearance' },
];
// Team (`/users`) deliberately is NOT a tab here: it is a top-level screen with its own sidebar
// entry, and linking to it from this strip dropped the user out of the `/settings/*` shell — the
// strip vanished and no tab could show as current.

export function SettingsNav() {
  const pathname = usePathname();

  return (
    <nav
      data-testid="settings-nav"
      aria-label="Settings sections"
      className="mb-6 flex flex-wrap items-center gap-1.5 border-b border-border pb-3"
    >
      {SETTINGS_TABS.map(tab => {
        const active = pathname === tab.href;
        return (
          <Link
            key={tab.href}
            href={tab.href}
            aria-current={active ? 'page' : undefined}
            className={
              active
                ? 'rounded-full bg-sunset px-3 py-1.5 text-xs font-semibold text-white transition-colors'
                : 'rounded-full px-3 py-1.5 text-xs font-medium text-ink/60 transition-colors hover:bg-peach hover:text-ink'
            }
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
