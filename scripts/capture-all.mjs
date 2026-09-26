/**
 * Capture real screenshots of the app + MCP endpoint.
 * Runs against a running dev server with E2E_BYPASS_AUTH=1.
 */
import { chromium } from "playwright";
import { resolve } from "node:path";

const BASE_URL = process.env.BASE_URL ?? "http://localhost:3000";
const OUT_DIR = resolve("docs/screenshots");
const VIEWPORT = { width: 1440, height: 900 };

const browser = await chromium.launch();
const context = await browser.newContext({ viewport: VIEWPORT, deviceScaleFactor: 1 });
const page = await context.newPage();

async function shoot(name, url, prep) {
  await page.addStyleTag({ content: `nextjs-portal { display: none !important; }` }).catch(() => {});
  if (prep) await prep();
  await page.waitForTimeout(800);
  const res = await page.goto(BASE_URL + url, { waitUntil: "networkidle", timeout: 30_000 });
  await page.waitForTimeout(1500);
  const out = `${OUT_DIR}/${name}.jpg`;
  await page.screenshot({ path: out, fullPage: false });
  console.log(`  [${res?.status() ?? "?"}] ${url} -> ${out}`);
}

async function tryAskAi() {
  const askBtn = page.getByRole("button", { name: /Ask AI/i });
  if (await askBtn.isVisible().catch(() => false)) {
    await askBtn.click();
    await page.waitForTimeout(500);
    const textarea = page.locator("textarea").first();
    if (await textarea.isVisible().catch(() => false)) {
      await textarea.fill("engineers in marketing hired last quarter");
      await page.getByRole("button", { name: /^Ask$/i }).click();
      await page.waitForTimeout(3500);
    }
  }
}

async function tryChat() {
  const input = page.getByPlaceholder(/workforce|anything about/i).first();
  if (await input.isVisible().catch(() => false)) {
    await input.fill("How many engineers do we have?");
    await page.getByRole("button", { name: /Send/i }).click();
    await page.waitForTimeout(8000);
  }
}

async function tryOnboardingSummary() {
  // Walk to step 4 if possible
  for (let i = 0; i < 5; i++) {
    const next = page.getByRole("button", { name: /Continue|Next/i }).first();
    if (await next.isVisible().catch(() => false)) {
      await next.click();
      await page.waitForTimeout(500);
    }
  }
  const review = page.getByText(/Review & Submit/i);
  if (await review.isVisible().catch(() => false)) {
    const gen = page.getByRole("button", { name: /Generate with AI/i });
    if (await gen.isVisible().catch(() => false)) {
      // Fill required fields first
      const firstName = page.locator('input[name="firstName"]').first();
      const lastName = page.locator('input[name="lastName"]').first();
      const email = page.locator('input[name="email"]').first();
      if (await firstName.isVisible().catch(() => false)) await firstName.fill("Ava");
      if (await lastName.isVisible().catch(() => false)) await lastName.fill("Sharma");
      if (await email.isVisible().catch(() => false)) await email.fill("ava.sharma@nexus.local");
      await page.waitForTimeout(500);
      await gen.click();
      await page.waitForTimeout(8000);
    }
  }
}

try {
  await shoot("landing", "/");
  await shoot("sign-in", "/sign-in");
  await shoot("sign-up", "/sign-up");
  await shoot("dashboard", "/dashboard");
  await shoot("directory", "/directory");
  await shoot("ai-search", "/directory", tryAskAi);
  await shoot("onboarding", "/onboarding");
  await shoot("org-chart", "/org-chart");
  await shoot("forbidden", "/403");
  await shoot("hr-assistant", "/hr-assistant", tryChat);
  await shoot("onboarding-summary", "/onboarding", tryOnboardingSummary);
} catch (err) {
  console.error("FAIL:", err);
}

await context.close();
await browser.close();
