import { createMCPClient } from "@ai-sdk/mcp";
import type { ToolSet } from "ai";

let _client: Awaited<ReturnType<typeof createMCPClient>> | null = null;
let _toolsPromise: Promise<ToolSet> | null = null;

/**
 * Returns a shared MCP client connected to the in-process MCP server.
 * Used by the HR Assistant chat so the same tools are exposed internally
 * and externally via /api/mcp.
 */
async function getMcpClient() {
  if (!_client) {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
    _client = await createMCPClient({
      transport: {
        type: "http",
        url: `${baseUrl}/api/mcp`,
        headers: process.env.MCP_API_KEY
          ? { Authorization: `Bearer ${process.env.MCP_API_KEY}` }
          : {},
      },
    });
  }
  return _client;
}

/**
 * Returns the tools exposed by the MCP server, ready to pass to Vercel AI SDK's
 * `streamText({ tools })`. Fetches once and caches.
 */
export async function getMcpTools(): Promise<ToolSet> {
  if (!_toolsPromise) {
    _toolsPromise = (async () => {
      const client = await getMcpClient();
      return await client.tools();
    })();
  }
  return _toolsPromise;
}

/** For tests: clear the cached client + tools. */
export function resetMcpClient() {
  _client = null;
  _toolsPromise = null;
}
