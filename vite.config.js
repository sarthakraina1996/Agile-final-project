import { defineConfig } from 'vite';
export default defineConfig({
  root: 'client',
  server: { host: '0.0.0.0' },
  build: {
    outDir: '../dist',
    emptyOutDir: true,
    rollupOptions: {
      input: { people: 'client/index.html', hospitality: 'client/hospitality.html' },
    },
  },
});
