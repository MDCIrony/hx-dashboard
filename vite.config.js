import { defineConfig } from 'vite';

export default defineConfig({
  // CAMBIAR 'dashboard' por el nombre real del repo en GitHub si difiere
  base: process.env.NODE_ENV === 'production' ? '/dashboard/' : '/',
  build: { outDir: 'dist', emptyOutDir: true, sourcemap: true },
  test: { environment: 'node', include: ['test/**/*.test.js'] }
});
