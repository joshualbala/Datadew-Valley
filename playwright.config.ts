import { defineConfig } from '@playwright/test';

/**
 * Smoke test in a real browser against the built site (npm run build first).
 * Locally it uses your installed Chrome; in CI the workflow installs Chromium.
 */
export default defineConfig({
  testDir: 'tests/e2e',
  timeout: 90_000,
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    baseURL: 'http://localhost:4173/',
    viewport: { width: 1280, height: 720 },
    channel: process.env.CI ? undefined : 'chrome',
  },
  webServer: {
    command: 'npx vite preview --port 4173 --strictPort',
    url: 'http://localhost:4173/',
    reuseExistingServer: !process.env.CI,
  },
});
