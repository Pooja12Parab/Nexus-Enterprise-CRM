import { test, expect } from "@playwright/test";

test.describe("Directory Grid — Page Load & Auth", () => {
  test("signs in and navigates to /directory", async ({ page }) => {
    await page.goto("/sign-in");
    // Fill Clerk sign-in form
    await page.getByPlaceholder("Enter your email address").fill("admin+clerk_test@nexus.com");
    await page.getByPlaceholder("Enter your password").fill("Nexus@2026!");
    await page.getByRole("button", { name: "Continue", exact: true }).last().click();
    // Handle OTP if prompted
    const otpInput = page.locator("input[data-testid='otp-input']").first();
    if (await otpInput.isVisible({ timeout: 3000 }).catch(() => false)) {
      await page.keyboard.press("Digit4");
      await page.keyboard.press("Digit2");
      await page.keyboard.press("Digit4");
      await page.keyboard.press("Digit2");
      await page.keyboard.press("Digit4");
      await page.keyboard.press("Digit2");
    }
    await page.waitForURL("http://localhost:3000/", { timeout: 15000 });
    // Navigate to directory
    await page.goto("/directory");
    await page.waitForURL("/directory");
    // Check console errors
    const errors = await page.context().pages()[0].evaluate(() =>
      (window as any).__CONSOLE_ERRORS || []
    ).catch(() => []);
    // Verify page content
    await expect(page.locator("h1")).toContainText("Employee Directory");
    const countText = page.locator("text=/\\d+ employees/");
    await expect(countText).toBeVisible();
  });
});

test.describe("Directory Grid — Data Rendering", () => {
  test.use({ storageState: undefined });

  test("renders employee avatar, name, and ID", async ({ page }) => {
    await page.goto("/directory");
    await page.waitForTimeout(2000);
    // Check avatar initials
    const avatar = page.locator("[class*='rounded-full']").first();
    await expect(avatar).toBeVisible();
    // Check name and ID
    await expect(page.locator("text=/EMP-\\d+/").first()).toBeVisible();
  });
});

test.describe("Directory Grid — Sorting", () => {
  test("clicking Employee header sorts ascending then descending", async ({ page }) => {
    await page.goto("/directory");
    await page.waitForTimeout(2000);
    // Click Employee header
    const employeeHeader = page.locator("text=Employee").last();
    await employeeHeader.click();
    await expect(page).toHaveURL(/sortBy=lastName/);
    await expect(page).toHaveURL(/sortDir=asc/);
    // Click again for descending
    await employeeHeader.click();
    await expect(page).toHaveURL(/sortDir=desc/);
  });
});

test.describe("Directory Grid — Filtering", () => {
  test("search by name updates URL", async ({ page }) => {
    await page.goto("/directory");
    await page.waitForTimeout(2000);
    const searchInput = page.getByPlaceholder("Search by name, ID, or title...");
    await searchInput.fill("Marcus");
    await expect(page).toHaveURL(/search=Marcus/);
    // Clear search
    const clearBtn = page.locator("button").filter({ has: page.locator("svg.lucide-x") }).first();
    if (await clearBtn.isVisible().catch(() => false)) {
      await clearBtn.click();
      await expect(page).not.toHaveURL(/search=/);
    }
  });

  test("select department filter", async ({ page }) => {
    await page.goto("/directory");
    await page.waitForTimeout(2000);
    const deptSelect = page.locator("select").first();
    await deptSelect.selectOption("Engineering");
    await expect(page).toHaveURL(/dept=Engineering/);
  });

  test("select status filter", async ({ page }) => {
    await page.goto("/directory");
    await page.waitForTimeout(2000);
    const statusSelect = page.locator("select").nth(1);
    await statusSelect.selectOption("ACTIVE");
    await expect(page).toHaveURL(/status=ACTIVE/);
  });

  test("clear filters button appears and works", async ({ page }) => {
    await page.goto("/directory");
    await page.waitForTimeout(2000);
    // Set a filter first
    const deptSelect = page.locator("select").first();
    await deptSelect.selectOption("Engineering");
    // Clear filters button should appear
    const clearBtn = page.locator("text=Clear filters");
    await expect(clearBtn).toBeVisible();
    await clearBtn.click();
    // URL should return to clean state
    await expect(page).not.toHaveURL(/dept=/);
  });
});

test.describe("Directory Grid — Pagination", () => {
  test("navigate to next page and back", async ({ page }) => {
    await page.goto("/directory");
    await page.waitForTimeout(2000);
    // Click Next
    const nextBtn = page.locator("button").filter({ has: page.locator("svg.lucide-chevron-right") });
    await nextBtn.click();
    await expect(page).toHaveURL(/page=2/);
    // Click Previous
    const prevBtn = page.locator("button").filter({ has: page.locator("svg.lucide-chevron-left") });
    await prevBtn.click();
    await expect(page).toHaveURL(/page=1/);
  });
});

test.describe("Directory Grid — 0 Console Errors", () => {
  test("no console errors on directory page", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (err) => errors.push(err.message));
    await page.goto("/directory");
    await page.waitForTimeout(3000);
    expect(errors).toHaveLength(0);
  });
});