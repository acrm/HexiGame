import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import pkg from './package.json';
import path from 'path';

// Vite config: dev uses root, build uses relative asset paths
export default defineConfig(({ mode }) => {
  // Test-only config (vitest runs without mode, so mode may be undefined)
  if ((mode as string | undefined) === 'test' || process.env.VITEST) {
    return {
      plugins: [react()],
      test: {
        environment: 'node',
        include: ['tests/**/*.test.ts'],
        coverage: {
          provider: 'v8',
          include: ['src/logic/**', 'src/templates/**', 'src/tutorial/**'],
        },
      },
    } as Parameters<typeof defineConfig>[0];
  }
  const integrationImpl = mode === 'yandex'
    ? path.resolve(__dirname, 'src/appLogic/integration.yandex.ts')
    : path.resolve(__dirname, 'src/appLogic/integration.null.ts');

  return {
    plugins: [react()],
    base: '', // generate relative paths: assets/...
    server: {
      port: 7777,
    },
    resolve: {
      alias: {
        'integration.impl': integrationImpl,
      },
    },
    define: {
      'import.meta.env.APP_VERSION': JSON.stringify(pkg.version ?? ''),
    },
  };
});
