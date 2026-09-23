import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  fullyParallel: false,
  timeout: 30_000,
  expect: { timeout: 5000 },
  use: {
    baseURL: process.env.PW_BASE_URL || 'https://primat-vite.vercel.app',
    trace: 'off',
    screenshot: 'only-on-failure',
  },
  projects: [
    { name: 'mobile-360', use: { browserName: 'chromium', viewport: { width: 360, height: 740 } } },
    { name: 'mobile-390', use: { browserName: 'chromium', viewport: { width: 390, height: 844 } } },
    { name: 'tablet-768', use: { browserName: 'chromium', viewport: { width: 768, height: 1024 } } },
  ],
  reporter: [['list'], ['html', { open: 'never' }]],
});
