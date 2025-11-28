import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import pkg from './package.json';

// Vite config: dev uses root, build uses relative asset paths
export default defineConfig({
  plugins: [react()],
  base: '', // generate relative paths: assets/...
  server: {
    port: 7777,
  },
  define: {
    'import.meta.env.APP_VERSION': JSON.stringify(pkg.version ?? ''),
  },
});
