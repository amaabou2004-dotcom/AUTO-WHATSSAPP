import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    // Le domaine exact du bac à sable change à chaque session.
    allowedHosts: ['.e2b.app'],
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
  },
});
