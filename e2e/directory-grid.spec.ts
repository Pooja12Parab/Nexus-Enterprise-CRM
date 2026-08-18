import { test, expect } from "@playwright/test";
import { existsSync } from "node:fs";
import { AUTH_FILE } from "./fixtures/auth";

test.skip(!existsSync(AUTH_FILE), `Auth storage state missing at ${AUTH_FILE}. Disable email-OTP in Clerk dashboard and re-run.`);

/**
 * Uses the authed storage state written by e2e/setup/auth.setup.ts.
 * All tests below assume the user is already signed in.
 */

test.describe("Directory Grid — Page Load", () => {
  test("renders heading and employee count", async ({ page }) => {
    await page.goto("/directory");
    await expect(page.getByRole("heading", { name: "Employee Directory" })).toBeVisible();
    await expect(page.getByText(/\d+ employees/)).toBeVisible();
  });
});

test.describe("Directory Grid — Data Rendering", () => {
  test("renders employee avatar, name, ID, department, status, email, location, hire date", async ({ page }) => {
    await page.goto("/directory");
    const grid = page.locator(".h-\\[600px\\]").first();
    await expect(grid).toBeVisible();

    await expect(page.getByText(/EMP-\d+/).first()).toBeVisible();
    await expect(page.getByText(/Engineering|Marketing|Finance|Sales|HR|Operations/).first()).toBeVisible();
    await expect(page.getByText(/Active|Onboarding|On Leave|Inactive/).first()).toBeVisible();
    await expect(page.getByText(/@/).first()).toBeVisible();
    await expect(grid.locator(".rounded-full").first()).toBeVisible();
  });
});

test.describe("Directory Grid — Sorting", () => {
  test("clicking Employee header toggles sortDir asc <-> desc on lastName", async ({ page }) => {
    await page.goto("/directory");
    const employeeHeader = page.getByRole("columnheader", { name: /Employee/i }).first();
    await expect(employeeHeader).toBeVisible();

    // Default is sortBy=lastName, sortDir=asc
    await expect(page).toHaveURL(/[?&]sortBy=lastName|[?&]sortDir=asc|^http:\/\/localhost:3000\/directory$/);

    // First click flips asc -> desc
    await employeeHeader.click();
    await expect(page).toHaveURL(/sortDir=desc/);
    await expect(page).toHaveURL(/sortBy=lastName/);

    // Second click flips desc -> asc
    await employeeHeader.click();
    await expect(page).toHaveURL(/sortDir=asc/);
  });
});

test.describe("Directory Grid — Filtering", () => {
  test("search by name updates URL and clear (X) button resets it", async ({ page }) => {
    await page.goto("/directory");
    const searchInput = page.getByPlaceholder("Search by name, ID, or title...");
    await expect(searchInput).toBeVisible();

    await searchInput.fill("Marcus");
    await expect(page).toHaveURL(/search=Marcus/);

    const clearButton = page.locator("button").filter({ has: page.locator("svg.lucide-x") }).first();
    await expect(clearButton).toBeVisible();
    await clearButton.click();
    await expect(page).not.toHaveURL(/search=/);
  });

  test("department filter updates URL and is reflected in active filter chip", async ({ page }) => {
    await page.goto("/directory");
    const deptSelect = page.locator("select").first();
    await expect(deptSelect).toBeVisible();

    await deptSelect.selectOption("Engineering");
    await expect(page).toHaveURL(/dept=Engineering/);
    await expect(page.getByText("Engineering").first()).toBeVisible();
  });

  test("status filter updates URL", async ({ page }) => {
    await page.goto("/directory");
    const statusSelect = page.locator("select").nth(1);
    await expect(statusSelect).toBeVisible();

    await statusSelect.selectOption("ACTIVE");
    await expect(page).toHaveURL(/status=ACTIVE/);
  });

  test("Clear filters button removes all active filters from the URL", async ({ page }) => {
    await page.goto("/directory?dept=Engineering&status=ACTIVE&search=Marcus");
    const clearButton = page.getByRole("button", { name: /Clear filters/i });
    await expect(clearButton).toBeVisible();

    await clearButton.click();
    await expect(page).not.toHaveURL(/dept=/);
    await expect(page).not.toHaveURL(/status=/);
    await expect(page).not.toHaveURL(/search=/);
  });
});

test.describe("Directory Grid — Pagination", () => {
  test("navigate to next page and back via chevron buttons", async ({ page }) => {
    await page.goto("/directory");
    const nextBtn = page.locator("button").filter({ has: page.locator("svg.lucide-chevron-right") }).first();
    await expect(nextBtn).toBeVisible();
    await nextBtn.click();
    await expect(page).toHaveURL(/page=2/);

    const prevBtn = page.locator("button").filter({ has: page.locator("svg.lucide-chevron-left") }).first();
    await expect(prevBtn).toBeVisible();
    await prevBtn.click();
    await expect(page).toHaveURL(/page=1/);
  });
});

test.describe("Directory Grid — 0 Console Errors", () => {
  test("no console errors on directory page", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (err) => errors.push(err.message));
    await page.goto("/directory");
    await expect(page.getByRole("heading", { name: "Employee Directory" })).toBeVisible();
    expect(errors, errors.join("\n")).toHaveLength(0);
  });
});
