import { defineConfig } from "@playwright/test"

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    baseURL: "http://localhost:8000",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    actionTimeout: 15000,
  },
  projects: [
    {
      name: "chromium",
      use: { browserName: "chromium" },
    },
  ],
  timeout: 30000,
})
