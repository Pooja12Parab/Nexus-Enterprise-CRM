import { test, expect } from "@playwright/test";

test.describe("Onboarding Flow", () => {
  test("should display onboarding page after sign-in", async ({ page }) => {
    // This is a placeholder E2E test
    // In production, configure Clerk test mode for E2E
    await page.goto("/onboarding");
    await expect(page.locator("h1")).toContainText("Onboard");
  });
});
