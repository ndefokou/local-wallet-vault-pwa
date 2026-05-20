import { defineConfig, Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import wasm from 'vite-plugin-wasm';
import topLevelAwait from 'vite-plugin-top-level-await';
import path from 'path';
import { readFileSync } from 'fs';

// Plugin to serve manifest in dev mode
const serveManifestDev = (): Plugin => ({
  name: 'serve-manifest-dev',
  configureServer(server) {
    server.middlewares.use((req, res, next) => {
      if (req.url === '/manifest.webmanifest' || req.url === '/manifest.json') {
        const manifestPath = path.resolve(__dirname, 'public/manifest.json');
        try {
          const manifest = readFileSync(manifestPath, 'utf-8');
          res.setHeader('Content-Type', 'application/manifest+json');
          res.end(manifest);
        } catch {
          next();
        }
      } else {
        next();
      }
    });
  }
});

// Base path for GitHub Pages deployment
const basePath = process.env.GITHUB_PAGES ? '/local-wallet-vault-pwa/' : '/';

// https://vitejs.dev/config/
export default defineConfig({
  // Base path for GitHub Pages deployment
  // For local development, this can be set to '/' or removed
  base: basePath,
  plugins: [
    wasm(),
    topLevelAwait(),
    react(),
    serveManifestDev(),
    VitePWA({
      registerType: 'prompt',
      includeAssets: ['favicon.svg', 'favicon-16x16.png', 'favicon-32x32.png', 'apple-touch-icon.png', 'offline.html', 'icons/*.png'],
      manifest: {
        name: 'Local Wallet Vault',
        short_name: 'Wallet Vault',
        description: 'A local encrypted wallet vault PWA using WebAuthn PRF and OPFS',
        theme_color: '#1e293b',
        background_color: '#0f172a',
        display: 'standalone',
        orientation: 'portrait-primary',
        scope: basePath,
        start_url: basePath,
        id: 'local-wallet-vault-pwa',
        icons: [
          {
            src: '/icons/icon-72x72.png',
            sizes: '72x72',
            type: 'image/png',
            purpose: 'any'
          },
          {
            src: '/icons/icon-96x96.png',
            sizes: '96x96',
            type: 'image/png',
            purpose: 'any'
          },
          {
            src: '/icons/icon-128x128.png',
            sizes: '128x128',
            type: 'image/png',
            purpose: 'any'
          },
          {
            src: '/icons/icon-144x144.png',
            sizes: '144x144',
            type: 'image/png',
            purpose: 'any'
          },
          {
            src: '/icons/icon-152x152.png',
            sizes: '152x152',
            type: 'image/png',
            purpose: 'any'
          },
          {
            src: '/icons/icon-192x192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any'
          },
          {
            src: '/icons/icon-384x384.png',
            sizes: '384x384',
            type: 'image/png',
            purpose: 'any'
          },
          {
            src: '/icons/icon-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any'
          },
          {
            src: '/icons/icon-192x192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'maskable'
          },
          {
            src: '/icons/icon-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable'
          }
        ],
        categories: ['finance', 'security', 'utilities'],
        shortcuts: [
          {
            name: 'Create Vault',
            short_name: 'Create',
            description: 'Create a new wallet vault',
            url: `${basePath}create-vault`
          },
          {
            name: 'Unlock Vault',
            short_name: 'Unlock',
            description: 'Unlock your wallet vault',
            url: `${basePath}unlock`
          }
        ]
      },
      workbox: {
        // Precache static assets
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2,wasm}'],
        // For SPA, serve index.html for navigation requests
        // This allows client-side routing to work
        navigateFallback: 'index.html',
        // Don't fallback for these paths
        navigateFallbackDenylist: [/^\/api/, /\/opfs/, /\.enc\.json$/, /\.wasm$/],
        // Skip waiting for immediate activation
        skipWaiting: true,
        clientsClaim: true,
        // Runtime caching strategies
        runtimeCaching: [
          {
            // Cache WASM files
            urlPattern: /\.wasm$/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'wasm-cache',
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 30 // 30 days
              }
            }
          },
          {
            // Cache static assets
            urlPattern: /\.(?:js|css|html|ico|png|svg|woff2)$/i,
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'static-assets',
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 60 * 60 * 24 * 7 // 7 days
              }
            }
          },
          {
            // Don't cache vault data or OPFS operations
            urlPattern: /\.(?:enc\.json|opfs)$/i,
            handler: 'NetworkOnly'
          }
        ]
      },
      devOptions: {
        enabled: true,
        type: 'module',
        suppressWarnings: true
      }
    })
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    // Required for WebAuthn - localhost is considered secure context
    host: true,
    headers: {
      // Security headers for development (relaxed for Vite dev server)
      // Production should have stricter CSP configured at the hosting level
      'Permissions-Policy': 'publickey-credentials-create=(self), publickey-credentials-get=(self)',
      'Referrer-Policy': 'no-referrer',
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
    },
    fs: {
      strict: false
    }
  },
  preview: {
    host: true,
    headers: {
      'Permissions-Policy': 'publickey-credentials-create=(self), publickey-credentials-get=(self)',
      'Referrer-Policy': 'no-referrer',
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
    }
  },
  // Security headers for production builds
  // These should also be configured on your hosting platform
});