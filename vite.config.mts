import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Vite config: dev uses root, build uses relative asset paths
export default defineConfig({
  plugins: [react()],
  base: '', // generate relative paths: assets/...
  server: {
    port: 7777,
  },
});
