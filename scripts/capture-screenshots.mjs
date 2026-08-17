/**
 * Capture real screenshots of the running app.
 *
 * Usage:
 *   CLERK_SECRET_KEY=... node scripts/capture-screenshots.mjs
 *
 * Requires the dev server to be running on http://localhost:3000.
 *
 * Auth strategy: signs in via Clerk's sign-in form on the app origin so the
 * __session cookie is set on localhost:3000 (which the middleware inspects).
 * If email-OTP is required (no way to read the inbox), authed captures will
 * fall back to the Clerk Backend API sign-in token. Note: that approach sets
 * the session cookie on accounts.dev and middleware will redirect to /sign-in;
 * the captures for authed pages will then be the Clerk sign-in page.
 */
import { chromium } from "playwright";
import { createClerkClient } from "@clerk/backend";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const BASE_URL = process.env.BASE_URL ?? "http://localhost:3000";
const OUT_DIR = resolve("docs/screenshots");
const TEST_USER = {
  email: process.env.E2E_CLERK_USER_EMAIL ?? "admin+clerk_test@nexus.com",
  password: process.env.E2E_CLERK_USER_PASSWORD ?? "Nexus@2026!",
  otp: process.env.E2E_CLERK_USER_OTP ?? "424242",
};

const VIEWPORT = { width: 1440, height: 900 };

function loadEnv() {
  try {
    const raw = readFileSync(".env", "utf8");
    for (const line of raw.split(/\r?\n/)) {
      const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
      if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
    }
  } catch {}
}
loadEnv();

async function formSignIn(context) {
  const page = await context.newPage();
  await page.goto(BASE_URL + "/sign-in", { waitUntil: "domcontentloaded" });
  // Wait for the Clerk form to mount (cold compile can be slow)
  await page.getByPlaceholder("Enter your email address").waitFor({ timeout: 30_000 });
  await page.getByPlaceholder("Enter your email address").fill(TEST_USER.email);
  await page.getByPlaceholder("Enter your password").fill(TEST_USER.password);
  await page.getByRole("button", { name: "Continue", exact: true }).last().click();

  // Detect second factor
  const otpInput = page
    .locator("input[autocomplete='one-time-code'], input[name='code'], input[name='totp'], input[inputmode='numeric']")
    .first();
  if (await otpInput.isVisible({ timeout: 5_000 }).catch(() => false)) {
    const headings = await page.locator("h1, h2, [role='heading']").allInnerTexts().catch(() => []);
    const isEmailOtp = headings.some((t) => /check your email|verification code|verify your email/i.test(t));
    await page.close();
    if (isEmailOtp) return { ok: false, reason: "email-OTP required" };
    // Try TOTP
    const retry = await context.newPage();
    await retry.goto(BASE_URL + "/sign-in", { waitUntil: "domcontentloaded" });
    await retry.getByPlaceholder("Enter your email address").waitFor({ timeout: 30_000 });
    await retry.getByPlaceholder("Enter your email address").fill(TEST_USER.email);
    await retry.getByPlaceholder("Enter your password").fill(TEST_USER.password);
    await retry.getByRole("button", { name: "Continue", exact: true }).last().click();
    const otp2 = retry.locator("input[autocomplete='one-time-code'], input[name='code'], input[name='totp']").first();
    if (await otp2.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await otp2.fill(TEST_USER.otp);
    }
    try {
      await retry.waitForURL((u) => !u.pathname.startsWith("/sign-in"), { timeout: 30_000 });
      await retry.close();
      return { ok: true };
    } catch {
      await retry.close();
      return { ok: false, reason: "TOTP failed" };
    }
  }
  try {
    await page.waitForURL((u) => !u.pathname.startsWith("/sign-in"), { timeout: 30_000 });
    await page.close();
    return { ok: true };
  } catch {
    const url = page.url();
    const body = await page.locator("body").innerText().catch(() => "");
    await page.close();
    return { ok: false, reason: `sign-in timed out at ${url}; body: ${body.slice(0, 120)}` };
  }
}

const PAGES = [
  { name: "sign-in", path: "/sign-in", auth: false },
  { name: "dashboard", path: "/dashboard", auth: true },
  { name: "directory", path: "/directory", auth: true },
  { name: "profile", path: "/my-profile", auth: true },
  { name: "org-chart", path: "/org-chart", auth: true },
  { name: "onboarding", path: "/onboarding", auth: true },
];

async function main() {
  const browser = await chromium.launch();
  const context = await browser.newContext({ viewport: VIEWPORT, deviceScaleFactor: 1 });

  // Sign in once
  const result = await formSignIn(context);
  const authed = result.ok;
  console.log(authed ? "Auth: form sign-in OK" : `Auth: skipped (${result.reason})`);

  for (const { name, path, auth } of PAGES) {
    const page = await context.newPage();
    try {
      if (!auth) {
        await context.clearCookies();
      } else if (!authed) {
        // We can't proceed for authed pages
        await page.close();
        console.log(`  SKIP  ${path}  (no auth session)`);
        continue;
      }
      // Hide the Next.js dev tools badge (only shown in `next dev`)
      await page.addStyleTag({ content: `nextjs-portal { display: none !important; }` }).catch(() => {});
      const res = await page.goto(BASE_URL + path, { waitUntil: "networkidle", timeout: 30_000 });
      const status = res?.status() ?? 0;
      await page.waitForTimeout(800);
      const out = `${OUT_DIR}/${name}.jpg`;
      await page.screenshot({ path: out, fullPage: false });
      console.log(`  [${status}] ${path}  ->  ${out}`);
    } catch (err) {
      console.error(`  FAIL ${path}: ${err.message}`);
    } finally {
      await page.close();
    }
  }

  await context.close();
  await browser.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
