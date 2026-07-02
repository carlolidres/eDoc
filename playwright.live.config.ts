import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './tests/e2e',
  testMatch: 'phase8-live.spec.ts',
  fullyParallel: false,
  reporter: 'list',
  use: {
    baseURL: 'https://carlolidres.github.io/eDoc/',
    trace: 'retain-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
})
