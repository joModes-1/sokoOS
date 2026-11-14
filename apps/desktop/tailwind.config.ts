import type { Config } from 'tailwindcss';

// SokoOS — Sunset Savanna design system (mirrors apps/web/tailwind.config.ts so the
// desktop app keeps the same visual language rather than inventing a new one).
const config: Config = {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        soil: { DEFAULT: '#3A2216', dark: '#2A1810', light: '#4D2E1E' },
        sunset: { DEFAULT: '#C2410C', hover: '#A03008', light: '#FEF0E8', subtle: '#FDDCC8' },
        ochre: { DEFAULT: '#A15C07', light: '#FEF3DC', subtle: '#FDE8A8' },
        ember: { DEFAULT: '#B45309', light: '#FEF3C7' },
        sand: { DEFAULT: '#FBF5EE', dark: '#F3EAE0' },
        peach: { DEFAULT: '#FDE6D3', dark: '#F9C9A8' },
        ink: { DEFAULT: '#1C0F05', light: '#2D1A0A' },
        success: { DEFAULT: '#16A34A', light: '#DCFCE7', dark: '#14532D' },
        warning: { DEFAULT: '#D97706', light: '#FEF3C7', dark: '#78350F' },
        danger: { DEFAULT: '#DC2626', light: '#FEE2E2', dark: '#7F1D1D' },
        info: { DEFAULT: '#0EA5E9', light: '#E0F2FE', dark: '#0C4A6E' },
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
