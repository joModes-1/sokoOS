import { defineConfig, type Plugin } from 'vitest/config';
import { fileURLToPath, URL } from 'node:url';
import path from 'node:path';

const sharedSrc = fileURLToPath(new URL('../../packages/shared/src', import.meta.url));

/** Mirror of vite.config.ts: resolve @sokoos/shared `./x.js` specifiers to `.ts`. */
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
  plugins: [resolveSharedTs()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
      '@sokoos/shared': path.join(sharedSrc, 'index.ts'),
    },
  },
  test: {
    environment: 'node',
    include: ['src/**/*.spec.ts'],
  },
});
