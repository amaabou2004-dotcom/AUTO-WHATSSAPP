import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

/**
 * Vite : SPA servie statiquement (ADR-004).
 * Le proxy `/api` évite toute URL absolue côté navigateur — indispensable pour
 * que l'application fonctionne derrière le proxy de prévisualisation.
 */
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    host: '0.0.0.0',
    port: 5173,
    strictPort: true,
    // Le domaine de prévisualisation est dynamique : on ne peut pas le lister à l'avance.
    allowedHosts: true,
    proxy: {
      '/api': {
        target: process.env['API_PROXY_TARGET'] ?? 'http://127.0.0.1:8787',
        changeOrigin: false,
      },
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
  },
});
