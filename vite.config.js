import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:8788',
        // Keep the browser-facing Host and Origin together so the worker's
        // same-origin write checks remain effective through the dev proxy.
        changeOrigin: false,
      },
    },
  },
});
