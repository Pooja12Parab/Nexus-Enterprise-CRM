import { chromium } from "playwright";
import { resolve } from "node:path";

const BASE_URL = process.env.BASE_URL ?? "http://localhost:3000";
const OUT_DIR = resolve("docs/screenshots");
const VIEWPORT = { width: 1440, height: 900 };

const browser = await chromium.launch();
const context = await browser.newContext({ viewport: VIEWPORT, deviceScaleFactor: 1 });
const page = await context.newPage();

await page.addStyleTag({ content: `nextjs-portal { display: none !important; }` }).catch(() => {});
await page.goto(BASE_URL + "/onboarding", { waitUntil: "networkidle", timeout: 30_000 });
await page.waitForTimeout(1500);

// Walk through wizard to step 4
const stepHeaders = await page.locator("text=/Step \\d/i, text=/Personal|Role|Tax|Review/").all();
console.log("Steps found:", stepHeaders.length);

// Click Next / Continue until we reach Review step
for (let i = 0; i < 5; i++) {
  const next = page.getByRole("button", { name: /Next|Continue/i }).first();
  if (await next.isVisible().catch(() => false)) {
    await next.click();
    await page.waitForTimeout(500);
  }
}

const reviewHeading = page.getByText(/Review & Submit/i);
if (await reviewHeading.isVisible().catch(() => false)) {
  console.log("Reached Review step");
  // Find the Generate button
  const generateBtn = page.getByRole("button", { name: /Generate with AI/i });
  if (await generateBtn.isVisible().catch(() => false)) {
    // Fill required fields first if any are needed
    await generateBtn.click();
    console.log("Clicked Generate");
    await page.waitForTimeout(8000);
  } else {
    console.log("Generate button not visible");
  }
} else {
  console.log("Could not reach Review step");
}

await page.screenshot({ path: `${OUT_DIR}/onboarding-summary.jpg`, fullPage: false });
console.log("Saved onboarding-summary.jpg");

await context.close();
await browser.close();
