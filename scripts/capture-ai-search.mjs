import { chromium } from "playwright";
import { resolve } from "node:path";

const BASE_URL = process.env.BASE_URL ?? "http://localhost:3000";
const OUT_DIR = resolve("docs/screenshots");
const VIEWPORT = { width: 1440, height: 900 };

const browser = await chromium.launch();
const context = await browser.newContext({ viewport: VIEWPORT, deviceScaleFactor: 1 });
const page = await context.newPage();

await page.addStyleTag({ content: `nextjs-portal { display: none !important; }` }).catch(() => {});
await page.goto(BASE_URL + "/directory", { waitUntil: "networkidle", timeout: 30_000 });
await page.waitForTimeout(1500);

const askBtn = page.getByRole("button", { name: /Ask AI/i });
await askBtn.click();
await page.waitForTimeout(500);

const textarea = page.locator("textarea").first();
await textarea.fill("engineers in marketing hired last quarter");
await page.getByRole("button", { name: /^Ask$/i }).click();

console.log("Waiting for AI search…");
await page.waitForTimeout(10_000);

await page.screenshot({ path: `${OUT_DIR}/ai-search-result.jpg`, fullPage: false });
console.log("Saved ai-search-result.jpg");

await context.close();
await browser.close();
