import { defineConfig, devices } from "@playwright/test";
import path from "node:path";

const PORT = 3000;
const BASE_URL = `http://localhost:${PORT}`;
const isCI = !!process.env.CI;
const AUTH_FILE = path.resolve(__dirname, "e2e/.auth/user.json");

/**
 * E2E test credentials come from env. Defaults match the dev Clerk test user
 * already configured for this repo (see .env / existing specs).
 *
 * Authed tests (directory-grid, onboarding) are skipped by default because
 * Clerk requires an email-OTP second factor that the test cannot retrieve
 * from the real inbox. To unskip:
 *   1. In the Clerk dashboard, disable email-OTP for this test user
 *      (Users > admin+clerk_test@nexus.com > Email addresses > Verification: off)
 *   2. Delete e2e/.auth/user.json if it exists
 *   3. Re-run: npm run test:e2e
 */
export const TEST_USER = {
  email: process.env.E2E_CLERK_USER_EMAIL ?? "admin+clerk_test@nexus.com",
  password: process.env.E2E_CLERK_USER_PASSWORD ?? "Nexus@2026!",
  otp: process.env.E2E_CLERK_USER_OTP ?? "424242",
};

/** Path to the storageState file written by e2e/setup/auth.setup.ts. */
export const AUTH_FILE_PATH = AUTH_FILE;

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: isCI,
  retries: isCI ? 2 : 0,
  workers: isCI ? 1 : undefined,
  reporter: isCI ? [["github"], ["html", { open: "never" }]] : "html",
  timeout: 60_000,
  expect: { timeout: 10_000 },
  use: {
    baseURL: BASE_URL,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },
  projects: [
    {
      name: "setup",
      testMatch: /setup\/.*\.setup\.ts/,
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "chromium",
      // Unauthed tests only — authed tests live in the `authed` project
      // below and skip if no storage state exists.
      testIgnore: [/\.auth\//, /fixtures\//, /setup\//, /directory-grid\.spec\.ts/, /onboarding\.spec\.ts/],
      use: { ...devices["Desktop Chrome"] },
      dependencies: ["setup"],
    },
    {
      name: "authed",
      testMatch: /(directory-grid|onboarding)\.spec\.ts/,
      use: { ...devices["Desktop Chrome"], storageState: AUTH_FILE },
      dependencies: ["setup"],
    },
  ],
  webServer: {
    command: isCI ? "npm run build && npm start" : "npm run dev",
    url: BASE_URL,
    reuseExistingServer: !isCI,
    timeout: 180_000,
    stdout: "pipe",
    stderr: "pipe",
    env: {
      CLERK_SECRET_KEY: process.env.CLERK_SECRET_KEY ?? "",
    },
  },
});
