import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    // Required for WebAuthn - localhost is considered secure context
    host: true,
  },
  // Security headers will be configured in production
  // For development, we rely on the dev server
});