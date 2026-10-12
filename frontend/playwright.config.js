import { defineConfig, devices } from '@playwright/test';
import path from 'node:path';
import os from 'node:os';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  workers: 1,
  reporter: 'list',
  outputDir: path.join(os.tmpdir(), 'projectguide-playwright-results'),
  use: {
    baseURL: 'http://127.0.0.1:4173',
    reducedMotion: 'reduce',
    trace: 'retain-on-failure',
    ...devices['Desktop Chrome'],
  },
  webServer: {
    command: 'npm run dev -- --host 127.0.0.1 --port 4173 --strictPort',
    url: 'http://127.0.0.1:4173',
    reuseExistingServer: !process.env.CI,
    timeout: 30_000,
  },
});
