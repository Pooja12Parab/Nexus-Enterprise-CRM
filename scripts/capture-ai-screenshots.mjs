/**
 * Capture real screenshots of AI features in the running app.
 * Uses E2E_BYPASS_AUTH=1 to access authed pages without Clerk OTP.
 *
 * Run:
 *   E2E_BYPASS_AUTH=1 NEXT_PUBLIC_E2E_BYPASS_AUTH=1 \
 *     node scripts/capture-ai-screenshots.mjs
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
  // Open AI search panel
  const askBtn = page.getByRole("button", { name: /Ask AI/i });
  if (await askBtn.isVisible().catch(() => false)) {
    await askBtn.click();
    await page.waitForTimeout(500);
    const textarea = page.locator("textarea").first();
    if (await textarea.isVisible().catch(() => false)) {
      await textarea.fill("engineers hired last quarter");
      await page.getByRole("button", { name: /Ask/i }).first().click();
      await page.waitForTimeout(3000);
    }
  }
}

async function tryChat() {
  const input = page.getByPlaceholder(/workforce|anything about/i).first();
  if (await input.isVisible().catch(() => false)) {
    await input.fill("How many engineers do we have?");
    await page.getByRole("button", { name: /Send/i }).click();
    await page.waitForTimeout(8000); // wait for streamed response
  }
}

try {
  await shoot("landing", "/");
  await shoot("dashboard", "/dashboard");
  await shoot("directory", "/directory");
  await shoot("ai-search", "/directory", tryAskAi);
  await shoot("onboarding", "/onboarding");
  await shoot("org-chart", "/org-chart");
  await shoot("forbidden", "/403");
  await shoot("hr-assistant", "/hr-assistant", tryChat);
} catch (err) {
  console.error("FAIL:", err);
}

await context.close();
await browser.close();
