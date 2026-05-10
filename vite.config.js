import { defineConfig } from 'vite';

export default defineConfig({
  base: process.env.NODE_ENV === 'production' ? '/hx-dashboard/' : '/',
  build: { outDir: 'dist', emptyOutDir: true, sourcemap: true },
  test: { environment: 'node', include: ['test/**/*.test.js'] }
});
