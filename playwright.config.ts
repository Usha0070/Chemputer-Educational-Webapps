import { defineConfig, devices } from '@playwright/test';

// Smoke tests run against the production build (`npm run build` first).
// BASE_URL=https://… npm run test:e2e checks a deployed site instead (the page list still comes from dist/).
const remote = process.env.BASE_URL;
export default defineConfig({
  testDir: 'tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['github'], ['list']] : 'list',
  use: { baseURL: remote ?? 'http://localhost:4321', trace: 'retain-on-failure' },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'], viewport: { width: 1280, height: 800 } } },
    { name: 'mobile', use: { ...devices['Desktop Chrome'], viewport: { width: 375, height: 740 }, isMobile: true, hasTouch: true } },
  ],
  webServer: remote
    ? undefined
    : {
        command: 'npm run preview',
        url: 'http://localhost:4321/',
        reuseExistingServer: !process.env.CI,
        timeout: 60_000,
      },
});
