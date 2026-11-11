import { configDefaults, defineConfig } from 'vitest/config';

export default defineConfig({
  // Relative base so the build works both locally and on GitHub Pages
  // (https://<user>.github.io/Datadew-Valley/) without changes.
  base: './',
  // Unit tests only; the browser smoke test (tests/e2e) runs with Playwright.
  test: { exclude: [...configDefaults.exclude, 'tests/e2e/**'] },
  build: {
    // Phaser is large; keep it in its own chunk and silence the size warning.
    chunkSizeWarningLimit: 2000,
    rollupOptions: {
      output: { manualChunks: { phaser: ['phaser'] } },
    },
  },
});
