import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Vite config tuned for GitHub Pages (project pages) and Bun.
export default defineConfig({
  base: './',
  plugins: [react()],
  server: {
    port: 4173,
  },
});
