import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath, URL } from 'node:url';
import path from 'node:path';

// Tauri 2 expects the frontend dev server on a fixed, known port.
const DEV_PORT = 1420;

const sharedSrc = fileURLToPath(new URL('../../packages/shared/src', import.meta.url));

/**
 * @sokoos/shared is authored as ESM TypeScript but imports its own modules with
 * explicit `./x.js` specifiers (NodeNext style, like apps/web). Resolve those back
 * to the `.ts` sources so Vite bundles the shared package as ESM instead of CJS.
 */
function resolveSharedTs(): Plugin {
  return {
    name: 'sokoos-shared-ts-resolver',
    enforce: 'pre',
    resolveId(source, importer) {
      if (
        importer &&
        importer.startsWith(sharedSrc) &&
        source.startsWith('.') &&
        source.endsWith('.js')
      ) {
        return path.resolve(path.dirname(importer), source.replace(/\.js$/, '.ts'));
      }
      return null;
    },
  };
}

export default defineConfig({
  plugins: [react(), resolveSharedTs()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
      '@sokoos/shared': path.join(sharedSrc, 'index.ts'),
    },
  },
  // Tauri renders in a webview, so target a modern, well-supported baseline.
  build: {
    target: 'es2022',
    outDir: 'dist',
    emptyOutDir: true,
    sourcemap: true,
  },
  server: {
    port: DEV_PORT,
    strictPort: true,
  },
  clearScreen: false,
});
