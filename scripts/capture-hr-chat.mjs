/**
 * Capture real screenshots of the HR chat with an actual AI conversation.
 */
import { chromium } from "playwright";
import { resolve } from "node:path";

const BASE_URL = process.env.BASE_URL ?? "http://localhost:3000";
const OUT_DIR = resolve("docs/screenshots");
const VIEWPORT = { width: 1440, height: 900 };

const browser = await chromium.launch();
const context = await browser.newContext({ viewport: VIEWPORT, deviceScaleFactor: 1 });
const page = await context.newPage();

await page.addStyleTag({ content: `nextjs-portal { display: none !important; }` }).catch(() => {});
await page.goto(BASE_URL + "/hr-assistant", { waitUntil: "networkidle", timeout: 30_000 });
await page.waitForTimeout(2000);

const input = page.getByPlaceholder(/workforce|anything about/i).first();
await input.click();
await input.fill("How many engineers do we have?");
await page.getByRole("button", { name: /Send/i }).click();

console.log("Waiting for AI response…");
await page.waitForTimeout(15_000); // generous wait for streamed response

await page.screenshot({ path: `${OUT_DIR}/hr-assistant-chat.jpg`, fullPage: false });
console.log("Saved hr-assistant-chat.jpg");

await context.close();
await browser.close();
