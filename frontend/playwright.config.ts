import { defineConfig, devices } from '@playwright/test'

/**
 * Target comes from the environment so the suite is not pinned to a hostname: the same
 * command runs against production, a preview, or a loopback port.
 */
const baseURL = process.env.E2E_BASE_URL || 'https://tester.bialkowned.com'

export default defineConfig({
  // Serial. These applications rate-limit their own login -- DomusLogic allows 20
  // requests a minute and then bans for five -- so a parallel run burns the
  // allowance and every later test fails with a timeout that reads as a broken app.
  workers: 1,
  // Provisioned QA identities: one run id, and cleanup when the run ends.
  // See backend/core/standards/E2E_STANDARD.md.
  globalSetup: './global-setup',
  globalTeardown: './global-teardown',
  testDir: './e2e',
  timeout: 60_000,
  expect: { timeout: 15_000 },
  fullyParallel: true,
  reporter: process.env.CI ? 'line' : 'list',
  use: { baseURL, trace: 'retain-on-failure', ignoreHTTPSErrors: false },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
})
