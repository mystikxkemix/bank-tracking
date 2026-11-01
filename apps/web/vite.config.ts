import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    // The API runs on 3001 in dev; in prod both are served by the same Node process.
    proxy: { '/api': 'http://localhost:3001' },
  },
  build: { outDir: 'dist', sourcemap: true },
});
