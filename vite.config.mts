import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import pkg from './package.json';
import path from 'path';

// Vite config: dev uses root, build uses relative asset paths
export default defineConfig(({ mode }) => {
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
