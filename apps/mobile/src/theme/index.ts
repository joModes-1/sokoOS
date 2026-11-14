/**
 * SokoOS Sunset Savanna Design System — React Native
 * Exact match to the web app palette
 */

export const Colors = {
  // ── Core palette ──────────────────────────────────────────────
  soil:    '#3A2216',   // Dark brown — sidebar background
  sunset:  '#C2410C',  // Burnt orange — primary CTA
  ochre:   '#A15C07',  // Deep ochre — secondary accent
  sand:    '#FBF5EE',  // Warm white — main background
  peach:   '#FCECD8',  // Light peach — hover / pressed states
  ink:     '#1C0F05',  // Near-black — primary text

  // ── Semantic ──────────────────────────────────────────────────
  success:  '#16A34A',
  warning:  '#D97706',
  danger:   '#DC2626',
  info:     '#2563EB',

  // ── Neutrals ─────────────────────────────────────────────────
  border:   '#E8DDD0',
  surface:  '#FFFFFF',
  muted:    '#9C8575',   // Subdued text
  disabled: '#C9B99E',

  // ── Sidebar ───────────────────────────────────────────────────
  sidebarBg:         '#3A2216',
  sidebarText:       'rgba(255,255,255,0.75)',
  sidebarActiveText: '#FFFFFF',
  sidebarActiveBg:   'rgba(194,65,12,0.3)',
  sidebarHover:      'rgba(255,255,255,0.08)',

  // ── Status badge backgrounds ──────────────────────────────────
  successBg:  'rgba(22,163,74,0.1)',
  warningBg:  'rgba(217,119,6,0.1)',
  dangerBg:   'rgba(220,38,38,0.1)',
  infoBg:     'rgba(37,99,235,0.1)',
  neutralBg:  '#F5EDE4',
} as const;

export const Typography = {
  // Font families (loaded via expo-font)
  display:  'SpaceGrotesk-Bold',
  bodyBold: 'Inter-SemiBold',
  body:     'Inter-Regular',
  mono:     'JetBrainsMono-Regular',

  // Size scale
  xs:   10,
  sm:   12,
  base: 14,
  md:   16,
  lg:   18,
  xl:   22,
  '2xl': 26,
  '3xl': 32,
} as const;

export const Spacing = {
  xs:  4,
  sm:  8,
  md:  12,
  base: 16,
  lg:  20,
  xl:  24,
  '2xl': 32,
  '3xl': 48,
} as const;

export const Radius = {
  sm:  6,
  md:  10,
  lg:  14,
  xl:  20,
  full: 999,
} as const;

export const Shadow = {
  sm: {
    shadowColor: '#3A2216',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 2,
  },
  md: {
    shadowColor: '#3A2216',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.10,
    shadowRadius: 8,
    elevation: 4,
  },
  lg: {
    shadowColor: '#3A2216',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.14,
    shadowRadius: 16,
    elevation: 8,
  },
} as const;

// ── Convenience helpers ────────────────────────────────────────
export function statusTone(status: string): keyof typeof Colors {
  switch (status.toUpperCase()) {
    case 'ACTIVE': case 'COMPLETED': case 'RECEIVED': case 'CLOSED': case 'SUCCEEDED': return 'success';
    case 'PENDING': case 'SUBMITTED': case 'CONFIRMED': case 'REQUESTED': case 'APPROVED': case 'DISPATCHED': return 'warning';
    case 'CANCELLED': case 'REJECTED': case 'FAILED': case 'EXPIRED': case 'REFUNDED': return 'danger';
    default: return 'muted';
  }
}

export function statusBgTone(status: string): string {
  switch (status.toUpperCase()) {
    case 'ACTIVE': case 'COMPLETED': case 'RECEIVED': case 'CLOSED': case 'SUCCEEDED': return Colors.successBg;
    case 'PENDING': case 'SUBMITTED': case 'CONFIRMED': case 'REQUESTED': case 'APPROVED': case 'DISPATCHED': return Colors.warningBg;
    case 'CANCELLED': case 'REJECTED': case 'FAILED': case 'EXPIRED': case 'REFUNDED': return Colors.dangerBg;
    default: return Colors.neutralBg;
  }
}

export const Theme = { Colors, Typography, Spacing, Radius, Shadow } as const;
export default Theme;
