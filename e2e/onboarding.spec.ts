import { test, expect } from "@playwright/test";
import { existsSync } from "node:fs";
import { AUTH_FILE } from "./fixtures/auth";

test.skip(!existsSync(AUTH_FILE), `Auth storage state missing at ${AUTH_FILE}. Run the setup project first.`);

/**
 * Uses the authed storage state written by e2e/setup/auth.setup.ts.
 * The onboarding page lives inside the (dashboard) route group and is
 * protected by middleware.
 */
test.describe("Onboarding Flow", () => {
  test("renders the wizard with the 4-step stepper", async ({ page }) => {
    await page.goto("/onboarding");

    // Stepper exposes all four steps
    await expect(page.getByText("Personal Info")).toBeVisible();
    await expect(page.getByText("Role & Compensation")).toBeVisible();
    await expect(page.getByText("Tax & Documents")).toBeVisible();
    await expect(page.getByText("Review & Submit")).toBeVisible();

    // First step content
    await expect(page.getByRole("heading", { name: "Personal Information" })).toBeVisible();
  });

  test("advances to the next step when the user clicks Continue", async ({ page }) => {
    await page.goto("/onboarding");
    const continueButton = page.getByRole("button", { name: /Continue|Next/ });
    await expect(continueButton).toBeVisible();
    await continueButton.click();
    await expect(page.getByRole("heading", { name: /Role|Compensation/ })).toBeVisible();
  });
});
