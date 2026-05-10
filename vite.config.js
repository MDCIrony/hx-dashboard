import { defineConfig } from 'vite';

export default defineConfig({
  // CAMBIAR '<repo>' por el nombre real del repo en GitHub
  base: process.env.NODE_ENV === 'production' ? '/<repo>/' : '/',
  build: { outDir: 'dist', emptyOutDir: true, sourcemap: true },
  test: { environment: 'node', include: ['test/**/*.test.js'] }
});
