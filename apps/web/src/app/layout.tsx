import type { Metadata } from 'next';
import { Inter, Space_Grotesk } from 'next/font/google';
import './globals.css';
import { Providers } from '@/components/providers';
import { BRAND_BOOTSTRAP_SCRIPT } from '@/lib/theme';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });
const spaceGrotesk = Space_Grotesk({ subsets: ['latin'], variable: '--font-display' });

export const metadata: Metadata = {
  title: { default: 'SokoOS', template: '%s · SokoOS' },
  description: 'Business operating platform for Uganda',
  manifest: '/manifest.json',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning className={`${inter.variable} ${spaceGrotesk.variable}`}>
      <body>
        {/*
          Applies the accent colour saved in Settings → Appearance before first paint, so a switch
          never flashes the default orange (see lib/theme.ts). Kept inline and dependency-free.
        */}
        <script dangerouslySetInnerHTML={{ __html: BRAND_BOOTSTRAP_SCRIPT }} />
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
