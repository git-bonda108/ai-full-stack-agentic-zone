import { defineConfig } from "@playwright/test";

// E2E smoke test. Needs API (8000), ERP (8001) and `npm run dev` (5173) running.
// Run with: npx playwright test   (uses the pre-installed Chromium if PLAYWRIGHT_BROWSERS_PATH is set)
export default defineConfig({
  testDir: "./e2e",
  use: {
    baseURL: process.env.E2E_BASE_URL ?? "http://localhost:5173",
    headless: true,
    // Optional: point at an already-installed Chromium instead of `npx playwright install`
    launchOptions: process.env.PW_CHROMIUM_PATH
      ? { executablePath: process.env.PW_CHROMIUM_PATH }
      : {},
  },
  reporter: [["list"], ["html", { open: "never" }]],
});
