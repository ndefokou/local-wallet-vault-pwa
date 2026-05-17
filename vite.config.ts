import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import wasm from 'vite-plugin-wasm';
import topLevelAwait from 'vite-plugin-top-level-await';
import path from 'path';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    wasm(),
    topLevelAwait(),
    react(),
    VitePWA({
      registerType: 'prompt',
      includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'masked-icon.svg'],
      manifest: {
        name: 'Local Wallet Vault',
        short_name: 'Wallet Vault',
        description: 'A local encrypted wallet-related vault PWA using WebAuthn PRF and OPFS',
        theme_color: '#ffffff',
        background_color: '#ffffff',
        display: 'standalone',
        scope: '/',
        start_url: '/',
        icons: [
          {
            src: '/icons/icon-192x192.svg',
            sizes: '192x192',
            type: 'image/svg+xml'
          },
          {
            src: '/icons/icon-512x512.svg',
            sizes: '512x512',
            type: 'image/svg+xml'
          },
          {
            src: '/icons/icon-512x512.svg',
            sizes: '512x512',
            type: 'image/svg+xml',
            purpose: 'any maskable'
          }
        ]
      },
      workbox: {
        // Only precache static assets, not vault data
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        // Don't cache OPFS or vault-related requests
        navigateFallback: null,
        runtimeCaching: [
          {
            // Don't cache anything - this is a local-first app
            urlPattern: /^https:\/\/.*\.(?:json|enc)$/i,
            handler: 'NetworkOnly',
          }
        ]
      },
      devOptions: {
        enabled: true
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
  },
  // Security headers for production builds
  // These should also be configured on your hosting platform
});