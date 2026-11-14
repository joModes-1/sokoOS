import type { Config } from 'tailwindcss';

// SokoOS — Sunset Savanna design system
const config: Config = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        // ── Sunset Savanna palette ──────────────────────────────────
        // Every family below is driven by CSS variables (app/globals.css), so the theme chosen in
        // Settings → Appearance re-skins the WHOLE app — surfaces, sidebar, text, borders and
        // accents together. Only the semantic status colours stay fixed.
        soil: {
          DEFAULT: 'rgb(var(--soil-rgb) / <alpha-value>)',
          dark: 'rgb(var(--soil-dark-rgb) / <alpha-value>)',
          light: 'rgb(var(--soil-light-rgb) / <alpha-value>)',
        },
        sunset: {
          // Driven by CSS variables (app/globals.css) rather than fixed hex, so the accent colour
          // chosen in Settings → Appearance flows to every component that uses `sunset` —
          // backgrounds, text, borders, focus rings, active nav and alpha modifiers alike.
          DEFAULT: 'rgb(var(--brand-rgb) / <alpha-value>)',
          hover: 'rgb(var(--brand-hover-rgb) / <alpha-value>)',
          light: 'rgb(var(--brand-light-rgb) / <alpha-value>)',
          subtle: 'rgb(var(--brand-subtle-rgb) / <alpha-value>)',
        },
        ochre: {
          DEFAULT: '#A15C07',
          light: '#FEF3DC',
          subtle: '#FDE8A8',
        },
        ember: {
          DEFAULT: '#B45309',
          light: '#FEF3C7',
        },
        sand: {
          DEFAULT: 'rgb(var(--bg-rgb) / <alpha-value>)',
          dark: 'rgb(var(--surface-sunken-rgb) / <alpha-value>)',
        },
        peach: {
          DEFAULT: 'rgb(var(--brand-light-rgb) / <alpha-value>)',
          dark: 'rgb(var(--brand-subtle-rgb) / <alpha-value>)',
        },
        ink: {
          DEFAULT: 'rgb(var(--text-rgb) / <alpha-value>)',
          light: 'rgb(var(--text-muted-rgb) / <alpha-value>)',
        },
        // Neutral border pair — was missing entirely, which made every `border-border` /
        // `divide-border` utility in the app render nothing.
        border: {
          DEFAULT: 'rgb(var(--border-rgb) / <alpha-value>)',
          strong: 'rgb(var(--border-strong-rgb) / <alpha-value>)',
        },
        // ── Semantic ────────────────────────────────────────────────
        success: { DEFAULT: '#16A34A', light: '#DCFCE7', dark: '#14532D' },
        warning: { DEFAULT: '#D97706', light: '#FEF3C7', dark: '#78350F' },
        danger:  { DEFAULT: '#DC2626', light: '#FEE2E2', dark: '#7F1D1D' },
        info:    { DEFAULT: '#0EA5E9', light: '#E0F2FE', dark: '#0C4A6E' },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        display: ['Space Grotesk', 'Inter', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        DEFAULT: '8px',
        sm: '6px',
        md: '8px',
        lg: '12px',
        xl: '16px',
        '2xl': '20px',
      },
      boxShadow: {
        sm: '0 1px 3px rgba(28,15,5,0.07), 0 1px 2px rgba(28,15,5,0.04)',
        DEFAULT: '0 2px 6px rgba(28,15,5,0.08), 0 1px 2px rgba(28,15,5,0.05)',
        md: '0 4px 12px rgba(28,15,5,0.10), 0 1px 4px rgba(28,15,5,0.06)',
        lg: '0 8px 24px rgba(28,15,5,0.12), 0 2px 8px rgba(28,15,5,0.07)',
        xl: '0 16px 40px rgba(28,15,5,0.14), 0 4px 12px rgba(28,15,5,0.08)',
      },
    },
  },
  plugins: [],
};
export default config;
