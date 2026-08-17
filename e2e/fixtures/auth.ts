import { expect, type Page } from "@playwright/test";
import path from "node:path";

/**
 * E2E test credentials come from env. Defaults match the dev Clerk test user
 * already configured for this repo (see .env / existing specs).
 */
export const TEST_USER = {
  email: process.env.E2E_CLERK_USER_EMAIL ?? "admin+clerk_test@nexus.com",
  password: process.env.E2E_CLERK_USER_PASSWORD ?? "Nexus@2026!",
  otp: process.env.E2E_CLERK_USER_OTP ?? "424242",
};

/** Path to the storageState file written by e2e/setup/auth.setup.ts. */
export const AUTH_FILE = path.resolve(__dirname, "..", ".auth", "user.json");

/**
 * Result of a sign-in attempt. `ok=false` means the project must skip
 * authed specs (e.g. email-OTP was required but no real inbox access exists).
 */
export type SignInResult = { ok: true } | { ok: false; reason: string };

/**
 * Sign in via Clerk's hosted sign-in form on the app origin so the resulting
 * `__session` cookie is set on localhost:3000 (which the middleware inspects).
 *
 * Detects a second-factor screen and attempts the configured OTP. If the
 * second factor is an email-OTP that the test cannot retrieve, returns
 * `{ ok: false, reason }` so the caller can skip authed specs gracefully.
 */
export async function signIn(page: Page): Promise<SignInResult> {
  await page.goto("/sign-in");
  await page.getByPlaceholder("Enter your email address").fill(TEST_USER.email);
  await page.getByPlaceholder("Enter your password").fill(TEST_USER.password);
  await page.getByRole("button", { name: "Continue", exact: true }).last().click();

  // Clerk's sign-in can require a second factor. The input is a one-time-code
  // field; we detect it by placeholder/label/autocomplete.
  const otpInput = page
    .locator(
      "input[autocomplete='one-time-code'], input[name='code'], input[name='totp'], input[inputmode='numeric']"
    )
    .first();

  if (await otpInput.isVisible({ timeout: 3_000 }).catch(() => false)) {
    const heading = await page
      .locator("h1, h2, [role='heading']")
      .allInnerTexts()
      .catch(() => [] as string[]);
    const isEmailOtp = heading.some((t) => /check your email|verification code|verify your email/i.test(t));
    if (isEmailOtp) {
      return {
        ok: false,
        reason:
          "Clerk is requesting an email-OTP for this dev user. E2E cannot read the email inbox. " +
          "Disable 'Email verification code' on the user in the Clerk dashboard, or set " +
          "E2E_CLERK_USER_OTP and add a TOTP authenticator to the test user.",
      };
    }
    await otpInput.fill(TEST_USER.otp);
  }

  try {
    await page.waitForURL((url) => !url.pathname.startsWith("/sign-in"), { timeout: 20_000 });
  } catch {
    return {
      ok: false,
      reason: "Sign-in did not complete in time; verify TEST_USER credentials.",
    };
  }
  await expect(page).not.toHaveURL(/\/sign-in/);
  return { ok: true };
}

