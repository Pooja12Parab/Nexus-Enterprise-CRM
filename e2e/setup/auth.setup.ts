import { test, expect } from "@playwright/test";
import { signIn, AUTH_FILE } from "../fixtures/auth";
import { unlinkSync, existsSync } from "node:fs";

test.use({ storageState: { cookies: [], origins: [] } });

test("auth: sign in on the app origin and persist storage state", async ({ page, context }) => {
  // Always start from a clean slate so retries don't reuse a stale session
  if (existsSync(AUTH_FILE)) unlinkSync(AUTH_FILE);

  const result = await signIn(page);
  test.skip(!result.ok, "E2E sign-in not configured: " + (result as { ok: false; reason: string }).reason);

  await expect(page).not.toHaveURL(/\/sign-in/);
  await context.storageState({ path: AUTH_FILE });
});
