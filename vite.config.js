import { defineConfig } from 'vite';
export default defineConfig({
  root: 'client',
  server: { host: '0.0.0.0' },
  build: { outDir: '../dist', emptyOutDir: true },
});
