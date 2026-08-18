import { test, expect } from "@playwright/test";

/**
 * Auth setup. Signs in via the form and persists storageState.
 * Skips if email-OTP is required (the only sane default in this env).
 */
import { signIn, AUTH_FILE } from "../fixtures/auth";
import { unlinkSync, existsSync } from "node:fs";

test.use({ storageState: { cookies: [], origins: [] } });

test("auth: sign in on the app origin and persist storage state", async ({ page, context }) => {
  if (existsSync(AUTH_FILE)) unlinkSync(AUTH_FILE);

  const result = await signIn(page);
  test.skip(!result.ok, "E2E sign-in not configured: " + (result as { ok: false; reason: string }).reason);

  await expect(page).not.toHaveURL(/\/sign-in/);
  await context.storageState({ path: AUTH_FILE });
});
