import { defineConfig, devices } from "@playwright/test";

// The preview server's port. CI_PORT lets two worktrees run the browser suite at
// once without fighting over it, as parallel agents on one machine do.
const PORT = Number(process.env.CI_PORT || 4186);

// Viewports configured for mobile portrait first, plus desktop fallback.
export default defineConfig({
  testDir: "tests/browser",
  testMatch: "counter-intelligence.spec.js",
  timeout: 180_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [["list"]],
  use: {
    baseURL: `http://127.0.0.1:${PORT}`,
    // Full-suite retain-on-failure traces were heavy enough to SIGKILL the worker on this Mac.
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },
  projects: [
    {
      name: "phone-portrait-430x932",
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 430, height: 932 },
        isMobile: true,
        hasTouch: true,
        deviceScaleFactor: 3,
      },
    },
    {
      name: "phone-portrait-390x844",
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 390, height: 844 },
        isMobile: true,
        hasTouch: true,
        deviceScaleFactor: 3,
      },
    },
    // What Safari actually gives the page on Kevin's two phones, in WebKit: the screen
    // minus the status bar and Safari's toolbars (Playwright's device descriptors).
    {
      name: "safari-iphone16promax-440x763",
      use: { ...devices["iPhone 16 Pro Max"] },
    },
    {
      name: "safari-iphone14-390x664",
      use: { ...devices["iPhone 14"] },
    },
    {
      name: "phone-portrait-375x667",
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 375, height: 667 },
        isMobile: true,
        hasTouch: true,
        deviceScaleFactor: 2,
      },
    },
    {
      name: "desktop-1440x900",
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 1440, height: 900 },
      },
    },
  ],
  webServer: {
    command: `npx vite preview --host 127.0.0.1 --port ${PORT} --strictPort`,
    url: `http://127.0.0.1:${PORT}`,
    // Gate starts one preview and reuses it across per-project browser steps
    // (PLAYWRIGHT_REUSE_SERVER=1). Standalone `npx playwright test` still boots its own.
    reuseExistingServer: process.env.PLAYWRIGHT_REUSE_SERVER === "1",
    timeout: 30_000,
  },
});
