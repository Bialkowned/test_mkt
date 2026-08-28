import { defineConfig, devices } from '@playwright/test'

/**
 * Target comes from the environment so the suite is not pinned to a hostname: the same
 * command runs against production, a preview, or a loopback port.
 */
const baseURL = process.env.E2E_BASE_URL || 'https://tester.bialkowned.com'

export default defineConfig({
  testDir: './e2e',
  timeout: 60_000,
  expect: { timeout: 15_000 },
  fullyParallel: true,
  reporter: process.env.CI ? 'line' : 'list',
  use: { baseURL, trace: 'retain-on-failure', ignoreHTTPSErrors: false },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
})
