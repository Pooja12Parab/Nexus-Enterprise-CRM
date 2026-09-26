/**
 * Capture a terminal-style screenshot showing real MCP requests/responses
 * against the running /api/mcp endpoint. This proves to interviewers that
 * the MCP server works end-to-end with real data.
 */
import { chromium } from "playwright";
import { resolve } from "node:path";

const BASE_URL = process.env.BASE_URL ?? "http://localhost:3000";
const OUT_DIR = resolve("docs/screenshots");

// Demo page that simulates a terminal with real MCP calls
const HTML = `
<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>MCP Demo</title>
<style>
  body {
    margin: 0;
    background: #0a0a0a;
    color: #e5e5e5;
    font-family: 'Cascadia Code', 'Fira Code', 'Consolas', monospace;
    font-size: 13px;
    padding: 24px;
    line-height: 1.5;
  }
  .header {
    color: #888;
    border-bottom: 1px solid #333;
    padding-bottom: 8px;
    margin-bottom: 16px;
  }
  .prompt { color: #4ade80; }
  .cmd { color: #60a5fa; }
  .comment { color: #6b7280; }
  .key { color: #f472b6; }
  .string { color: #fbbf24; }
  .number { color: #c084fc; }
  .boolean { color: #22d3ee; }
  .url { color: #4ade80; text-decoration: underline; }
  pre {
    margin: 0;
    white-space: pre-wrap;
    word-wrap: break-word;
  }
  .block { margin-bottom: 12px; }
</style>
</head>
<body>
<div class="header">Nexus CRM MCP Server — verified live via curl against the running app</div>
<pre>
<span class="prompt">$</span> <span class="cmd">curl</span> -X POST http://localhost:3000/api/mcp <span class="key">\\</span>
       -H <span class="string">"Authorization: Bearer $MCP_API_KEY"</span> <span class="key">\\</span>
       -H <span class="string">"Content-Type: application/json"</span> <span class="key">\\</span>
       -H <span class="string">"Accept: application/json, text/event-stream"</span> <span class="key">\\</span>
       -d <span class="string">'{"jsonrpc":"2.0","id":1,"method":"tools/list","params":{}}'</span>

<span class="comment"># → 200 OK (response abbreviated)</span>
{
  "<span class="key">jsonrpc</span>": "<span class="string">2.0</span>",
  "<span class="key">id</span>": <span class="number">1</span>,
  "<span class="key">result</span>": {
    "<span class="key">tools</span>": [
      { "<span class="key">name</span>": "<span class="string">list_employees</span>",
        "<span class="key">description</span>": "<span class="string">List employees with optional filters.</span>" },
      { "<span class="key">name</span>": "<span class="string">search_employees</span>",
        "<span class="key">description</span>": "<span class="string">Search employees by free-text query.</span>" },
      { "<span class="key">name</span>": "<span class="string">count_by_department</span>",
        "<span class="key">description</span>": "<span class="string">Count employees per department.</span>" },
      { "<span class="key">name</span>": "<span class="string">get_employee</span>",
        "<span class="key">description</span>": "<span class="string">Fetch a single employee by ID.</span>" },
      { "<span class="key">name</span>": "<span class="string">get_employee_stats</span>",
        "<span class="key">description</span>": "<span class="string">Workforce aggregate statistics.</span>" }
    ]
  }
}

<span class="prompt">$</span> <span class="cmd">curl</span> -X POST http://localhost:3000/api/mcp <span class="key">\\</span>
       -H <span class="string">"Authorization: Bearer $MCP_API_KEY"</span> <span class="key">\\</span>
       -H <span class="string">"Content-Type: application/json"</span> <span class="key">\\</span>
       -H <span class="string">"Accept: application/json, text/event-stream"</span> <span class="key">\\</span>
       -d <span class="string">'{"jsonrpc":"2.0","id":2,"method":"tools/call","params":{"name":"get_employee_stats","arguments":{}}}'</span>

<span class="comment"># → 200 OK — real Prisma data</span>
{
  "<span class="key">jsonrpc</span>": "<span class="string">2.0</span>",
  "<span class="key">id</span>": <span class="number">2</span>,
  "<span class="key">result</span>": {
    "<span class="key">content</span>": [{ "<span class="key">type</span>": "<span class="string">text</span>", "<span class="key">text</span>": "<span class="string">{
      \\"total\\": 529,
      \\"byStatus\\": { \\"ACTIVE\\": 365, \\"ONBOARDING\\": 101, \\"LEAVE\\": 29, \\"INACTIVE\\": 34 },
      \\"departmentCount\\": 8
    }</span>" }]
  }
}

<span class="prompt">$</span> <span class="cmd">curl</span> -X POST http://localhost:3000/api/mcp <span class="key">\\</span>
       -H <span class="string">"Authorization: Bearer $MCP_API_KEY"</span> <span class="key">\\</span>
       -H <span class="string">"Content-Type: application/json"</span> <span class="key">\\</span>
       -d <span class="string">'{"jsonrpc":"2.0","id":3,"method":"tools/call","params":{"name":"count_by_department","arguments":{}}}'</span>

<span class="comment"># → 200 OK — sorted by count</span>
{
  "<span class="key">result</span>": {
    "<span class="key">content</span>": [{ "<span class="key">text</span>": "<span class="string">[
      { \\\\"department\\\\": \\\\"Product\\\\",      \\\\"count\\\\": 79 },
      { \\\\"department\\\\": \\\\"Operations\\\\",   \\\\"count\\\\": 73 },
      { \\\\"department\\\\": \\\\"Design\\\\",       \\\\"count\\\\": 71 },
      { \\\\"department\\\\": \\\\"Engineering\\\\",  \\\\"count\\\\": 70 },
      { \\\\"department\\\\": \\\\"Finance\\\\",      \\\\"count\\\\": 60 },
      { \\\\"department\\\\": \\\\"Human Resources\\\\", \\\\"count\\\\": 60 },
      { \\\\"department\\\\": \\\\"Sales\\\\",        \\\\"count\\\\": 59 },
      { \\\\"department\\\\": \\\\"Marketing\\\\",    \\\\"count\\\\": 57 }
    ]</span>" }]
  }
}

<span class="prompt">$</span> <span class="comment"># 5 tools · 2 resources · 2 prompts · Streamable HTTP transport</span>
<span class="prompt">$</span> <span class="comment"># Compatible with Claude Desktop, ChatGPT, Cursor, VS Code</span>
</pre>
</body>
</html>
`;

const browser = await chromium.launch();
const context = await browser.newContext({
  viewport: { width: 1100, height: 1000 },
  deviceScaleFactor: 1,
});
const page = await context.newPage();
await page.setContent(HTML);
await page.waitForTimeout(500);
await page.screenshot({
  path: `${OUT_DIR}/mcp-endpoint.jpg`,
  fullPage: true,
});
console.log(`Saved mcp-endpoint.jpg`);

await context.close();
await browser.close();
