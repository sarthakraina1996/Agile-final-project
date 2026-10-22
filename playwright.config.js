import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: './tests/browser',
  fullyParallel: false,
  workers: 1,
  use: {
    baseURL: 'http://127.0.0.1:3100',
    launchOptions: { executablePath: '/usr/bin/chromium', args: ['--no-sandbox'] },
    viewport: { width: 1440, height: 1100 },
    trace: 'retain-on-failure',
  },
  webServer: {
    command: 'PORT=3100 DATABASE_PATH=:memory: node server/index.js',
    url: 'http://127.0.0.1:3100',
    reuseExistingServer: false,
    timeout: 30000,
  },
});
