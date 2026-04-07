import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
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
    plugins: [
      react(),
      VitePWA({
        registerType: 'autoUpdate',
        injectRegister: false, // We'll register manually for better control
        strategies: 'injectManifest',
        srcDir: 'src',
        filename: 'sw.ts',
        manifestFilename: 'site.webmanifest',
        manifest: {
          name: 'Hexi Game',
          short_name: 'Hexi',
          description: 'Minimalist hexagonal color puzzle game',
          theme_color: '#00264C',
          background_color: '#00264C',
          display: 'standalone',
          start_url: './',
          scope: './',
          lang: 'en',
          dir: 'ltr',
          orientation: 'portrait-primary',
          icons: [
            {
              src: '/favicon-16x16.png',
              sizes: '16x16',
              type: 'image/png',
              purpose: 'any',
            },
            {
              src: '/favicon-32x32.png',
              sizes: '32x32',
              type: 'image/png',
              purpose: 'any',
            },
            {
              src: '/apple-touch-icon.png',
              sizes: '180x180',
              type: 'image/png',
              purpose: 'any',
            },
            {
              src: '/android-chrome-192x192.png',
              sizes: '192x192',
              type: 'image/png',
              purpose: 'any',
            },
            {
              src: '/android-chrome-192x192.png',
              sizes: '192x192',
              type: 'image/png',
              purpose: 'maskable',
            },
            {
              src: '/android-chrome-512x512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'any',
            },
            {
              src: '/android-chrome-512x512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'maskable',
            },
          ],
          screenshots: [
            {
              src: '/android-chrome-512x512.png',
              sizes: '512x512',
              type: 'image/png',
              form_factor: 'wide',
            },
            {
              src: '/android-chrome-192x192.png',
              sizes: '192x192',
              type: 'image/png',
              form_factor: 'narrow',
            },
          ],
          categories: ['games', 'puzzle'],
          shortcuts: [
            {
              name: 'Play Game',
              short_name: 'Play',
              description: 'Launch Hexi Game',
              url: './',
              icons: [
                {
                  src: '/android-chrome-192x192.png',
                  sizes: '192x192',
                  type: 'image/png',
                }
              ],
            },
          ],
        },
        workbox: {
          globPatterns: [
            '**/*.{js,css,html,ico,png,svg,webmanifest}',
          ],
          // Don't precache source maps in production
          globIgnores: [
            '**/node_modules/**/*',
            'dist/mockServiceWorker.js',
          ],
          // Cache first for static assets
          runtimeCaching: [
            {
              urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
              handler: 'CacheFirst',
              options: {
                cacheName: 'google-fonts-cache',
                expiration: {
                  maxEntries: 20,
                  maxAgeSeconds: 60 * 60 * 24 * 365, // 1 year
                },
              },
            },
            {
              urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
              handler: 'CacheFirst',
              options: {
                cacheName: 'gstatic-fonts-cache',
                expiration: {
                  maxEntries: 20,
                  maxAgeSeconds: 60 * 60 * 24 * 365, // 1 year
                },
              },
            },
            {
              urlPattern: /\.(?:png|gif|jpg|jpeg|svg)$/,
              handler: 'CacheFirst',
              options: {
                cacheName: 'images-cache',
                expiration: {
                  maxEntries: 50,
                  maxAgeSeconds: 60 * 60 * 24 * 30, // 30 days
                },
              },
            },
            {
              urlPattern: /\.(?:mp3|wav|ogg)$/,
              handler: 'CacheFirst',
              options: {
                cacheName: 'audio-cache',
                expiration: {
                  maxEntries: 50,
                  maxAgeSeconds: 60 * 60 * 24 * 30, // 30 days
                },
              },
            },
          ],
          navigateFallback: 'index.html',
          navigateFallbackDenylist: [/^\/admin/, /^\/api/],
          skipWaiting: true,
          clientsClaim: true,
        },
      }),
    ],
    base: '', // generate relative paths: assets/...
    build: {
      rollupOptions: {
        input: {
          main: path.resolve(__dirname, 'index.html'),
          editor: path.resolve(__dirname, 'editor/index.html'),
          fieldLab: path.resolve(__dirname, 'field-lab/index.html'),
        },
      },
    },
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
