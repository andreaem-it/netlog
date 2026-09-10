import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  workers: 1,
  retries: 1,
  reporter: "list",
  timeout: 30_000,
  expect: { timeout: 10_000 },
  use: {
    baseURL: process.env.APP_URL ?? "http://127.0.0.1:3100",
    trace: "retain-on-failure",
    // ponytail: dev server compiles routes on first visit (Turbopack), which
    // can be slower than a production navigation.
    navigationTimeout: 15_000,
  },
});
