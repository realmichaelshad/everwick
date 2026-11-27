/// <reference types="node" />
import { defineConfig } from "@playwright/test";

/**
 * Web end-to-end tests (npm run e2e).
 * - Default: against the production web build on the preview port 3310
 *   (`npm run build` first; `npm run start` is launched if nothing answers).
 * - During development: `E2E_BASE=http://127.0.0.1:3300 npx playwright test`
 *   runs against the dev server and starts nothing.
 */
const external = process.env.E2E_BASE;

export default defineConfig({
  testDir: "tests/e2e",
  timeout: 60_000,
  retries: 0,
  reporter: [["list"]],
  use: {
    baseURL: external ?? "http://127.0.0.1:3310",
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    trace: "retain-on-failure",
  },
  outputDir: ".qa/e2e-results",
  webServer: external
    ? undefined
    : {
        command: "npm run start",
        url: "http://127.0.0.1:3310",
        reuseExistingServer: true,
        timeout: 60_000,
        env: { PORT: "3310" },
      },
});
