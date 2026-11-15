'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Avatar } from '@/components/ui';
import { getToken, clearSession } from '@/lib/api-client';
import { getIndustryConfig } from '@/lib/industries';
import { resolveNavPath } from '@/lib/routes';
import { SettingsNav } from '@/components/settings-nav';
import { DevSeedButton } from '@/components/dev-seed-button';
import { ThemeFab } from '@/components/theme-fab';

// ── Icons ─────────────────────────────────────────────────────────────────────
function Icon({ name }: { name: string }) {
  const icons: Record<string, React.ReactNode> = {
    dashboard: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M4 5a1 1 0 011-1h4a1 1 0 011 1v5a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM14 5a1 1 0 011-1h4a1 1 0 011 1v3a1 1 0 01-1 1h-4a1 1 0 01-1-1V5zM4 15a1 1 0 011-1h4a1 1 0 011 1v3a1 1 0 01-1 1H5a1 1 0 01-1-1v-3zM14 13a1 1 0 011-1h4a1 1 0 011 1v5a1 1 0 01-1 1h-4a1 1 0 01-1-1v-5z" />,
    pos: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />,
    catalogue: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />,
    inventory: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />,
    sales: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />,
    debts: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />,
    transfers: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />,
    purchasing: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />,
    reports: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />,
    finance: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />,
    users: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />,
    settings: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />,
    bell: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />,
    menu: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />,
    x: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />,
    'sign-out': <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />,
    orders: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />,
    menu2: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />,
    rooms: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />,
    patients: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />,
    prescriptions: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />,
    reservations: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />,
    kitchen: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17" />,
    appointments: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />,
    students: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />,
    vehicles: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 17a2 2 0 11-4 0 2 2 0 014 0zM19 17a2 2 0 11-4 0 2 2 0 014 0z M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l3.414 3.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1m-6-1a1 1 0 001 1h1M5 17a2 2 0 104 0m-4 0a2 2 0 114 0m6 0a2 2 0 104 0m-4 0a2 2 0 114 0" />,
    properties: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />,
    shipments: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />,
    production: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />,
    harvest: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />,
    fuel: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />,
    laundry: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4" />,
    tests: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />,
    projects: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />,
  };
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      {icons[name] ?? icons['dashboard']}
    </svg>
  );
}

// ── Sidebar Nav Item ──────────────────────────────────────────────────────────
function NavItem({ href, label, icon, active, collapsed }: {
  href: string;
  label: string;
  icon: string;
  active: boolean;
  collapsed: boolean;
}) {
  // Map industries.ts icon names to our Icon component names
  const iconMap: Record<string, string> = {
    grid: 'dashboard', monitor: 'pos', receipt: 'sales', cube: 'inventory',
    truck: 'purchasing', tag: 'catalogue', banknotes: 'finance', chart: 'reports',
    users: 'users', settings: 'settings', clock: 'batches',
    'shopping-cart': 'orders', 'building-office': 'rooms', heart: 'patients',
    'document-text': 'prescriptions', calendar: 'reservations',
    'fire': 'kitchen', 'academic-cap': 'students', wrench: 'vehicles',
    home: 'properties', globe: 'shipments', cog: 'production',
    sun: 'harvest', 'light-bulb': 'fuel', droplet: 'laundry',
    beaker: 'tests', 'clipboard-list': 'projects',
  };
  const resolvedIcon = iconMap[icon] ?? icon;
  return (
    <Link
      href={href}
      title={collapsed ? label : undefined}
      className={`nav-item ${active ? 'active' : ''} ${collapsed ? 'collapsed' : ''}`}
    >
      <Icon name={resolvedIcon} />
      {!collapsed && <span>{label}</span>}
    </Link>
  );
}

// ── Main App Shell ────────────────────────────────────────────────────────────
export default function AppLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  // Mobile drawer: close it whenever a nav link takes us to another page.
  useEffect(() => { setMobileOpen(false); }, [pathname]);

  // Get industry from session storage
  const [industryCode, setIndustryCode] = useState('RETAIL');
  const [businessName, setBusinessName] = useState('My Business');
  const [userName, setUserName] = useState('User');

  useEffect(() => {
    // Check auth
    if (!getToken()) {
      router.push('/login');
      return;
    }
    try {
      const code = sessionStorage.getItem('sokoos_industry') ?? 'RETAIL';
      const bname = sessionStorage.getItem('sokoos_business_name') ?? 'My Business';
      const uname = sessionStorage.getItem('sokoos_user_name') ?? 'User';
      setIndustryCode(code);
      setBusinessName(bname);
      setUserName(uname);
    } catch {}
  }, [router]);

  const industry = getIndustryConfig(industryCode);

  function handleSignOut() {
    clearSession();
    router.push('/login');
  }

  // Build nav items from industry config + fixed bottom items
  // industries.ts uses { label, icon, path } — map to { label, icon, href }.
  // Every path is resolved through the route registry so the sidebar can never link to a
  // screen the app does not implement (see lib/routes.ts).
  const topNavItems = (industry.nav ?? [])
    .map((item: { label: string; icon: string; path: string }) => {
      const href = resolveNavPath(item.path);
      return href ? { label: item.label, icon: item.icon, href } : null;
    })
    .filter((item): item is { label: string; icon: string; href: string } => item !== null);

  // Customer credit ("they took it on debt") applies to every kind of shop, so the entry is added
  // here once rather than to each of the 20 nav arrays in industries.ts. It sits directly after
  // Sales when there is one — that is where a shopkeeper looks for "who owes me".
  const DEBTS_ITEM = { href: '/debts', label: 'Debts', icon: 'debts' };
  const salesIdx = topNavItems.findIndex((i) => i.href === '/pos' || i.href === '/sales');
  const debtsAt = salesIdx >= 0 ? salesIdx + 1 : topNavItems.length;
  const navItems = topNavItems.some((i) => i.href === DEBTS_ITEM.href)
    ? topNavItems
    : [...topNavItems.slice(0, debtsAt), DEBTS_ITEM, ...topNavItems.slice(debtsAt)];

  const bottomNavItems = [
    { href: '/users', label: 'Team', icon: 'users' },
    { href: '/settings/business', label: 'Settings', icon: 'settings' },
    { href: '/notifications', label: 'Notifications', icon: 'bell' },
  ];

  // Filter out bottom nav items already in top nav to avoid duplicates
  const topNavHrefs = new Set(navItems.map(i => i.href));
  const filteredBottomNav = bottomNavItems.filter(i => !topNavHrefs.has(i.href));

  return (
    <div className="app-shell">
      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 bg-ink/60 z-30 md:hidden" onClick={() => setMobileOpen(false)} />
      )}

      {/* Sidebar */}
      {/* Sidebar — full width on mobile (it is the drawer), collapse only applies from md up */}
      <aside
        onClick={(e) => { if ((e.target as HTMLElement).closest('a')) setMobileOpen(false); }}
        className={`app-sidebar ${collapsed ? 'w-60 md:w-16' : 'w-60'} ${mobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'} transition-all duration-200 ease-in-out fixed md:sticky top-0 h-screen z-40 flex flex-col`}>
        {/* Logo + Collapse */}
        <div className={`flex items-center ${collapsed ? 'justify-center' : 'justify-between'} px-4 py-4 border-b border-white/10 flex-shrink-0`}>
          {!collapsed && (
            <div>
              <span className="text-lg font-bold text-white font-display">SokoOS</span>
              <p className="text-xs text-white/40 truncate max-w-[140px]">{businessName}</p>
            </div>
          )}
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="p-1.5 rounded-lg hover:bg-white/10 text-white/60 hover:text-white transition-colors hidden md:flex"
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              {collapsed
                ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
                : <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
              }
            </svg>
          </button>
        </div>

        {/* Top nav */}
        <nav className="flex-1 px-2 py-3 overflow-y-auto space-y-0.5">
          {navItems.map(item => (
            <NavItem
              key={item.href}
              href={item.href}
              label={item.label}
              icon={item.icon}
              active={pathname === item.href || pathname.startsWith(item.href + '/')}
              collapsed={collapsed}
            />
          ))}
        </nav>

        {/* Bottom nav */}
        <div className="px-2 py-3 border-t border-white/10 space-y-0.5">
          {filteredBottomNav.map(item => (
            <NavItem
              key={item.href}
              href={item.href}
              label={item.label}
              icon={item.icon}
              active={pathname === item.href || pathname.startsWith(item.href + '/')}
              collapsed={collapsed}
            />
          ))}

          {/* User + Sign out — stacked when collapsed so sign-out is always reachable */}
          <div className={`mt-2 px-2 py-2 ${collapsed ? 'flex flex-col items-center gap-2' : 'flex items-center gap-2'}`}>
            <Avatar name={userName} size="sm" />
            {!collapsed && (
              <div className="flex-1 min-w-0">
                <p className="text-xs text-white/70 truncate">{userName}</p>
              </div>
            )}
            <button
              onClick={handleSignOut}
              className="p-1 rounded hover:bg-white/10 text-white/40 hover:text-white transition-colors"
              title="Sign out"
              aria-label="Sign out"
            >
              <Icon name="sign-out" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main content area */}
      <main className="app-main flex-1 flex flex-col min-w-0">
        {/* Mobile header */}
        <header className="sticky top-0 z-20 flex items-center gap-3 px-4 py-3 bg-sand border-b border-border md:hidden">
          <button
            onClick={() => setMobileOpen(true)}
            className="p-1.5 rounded-lg hover:bg-peach text-ink/60"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <span className="font-semibold text-ink text-sm font-display">SokoOS</span>
        </header>

        {/* Page content */}
        <div className="flex-1 p-4 md:p-6 overflow-y-auto">
          {pathname.startsWith('/settings') && <SettingsNav />}
          {children}
        </div>
      </main>

      {/* Quick theme switcher (bottom-right) + development-only demo seeder above it. */}
      <ThemeFab />
      <DevSeedButton />
    </div>
  );
}
