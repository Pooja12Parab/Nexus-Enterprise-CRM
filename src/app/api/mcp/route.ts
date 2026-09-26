import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import { auth } from "@/lib/auth";
import { createMcpServer } from "@/lib/mcp/server";

/**
 * MCP server endpoint at /api/mcp
 *
 * Transport: Streamable HTTP (MCP spec 2025-06-18 — replaces deprecated SSE)
 * Auth: dual-path
 *   - External AI clients (Claude Desktop, ChatGPT): Authorization: Bearer <MCP_API_KEY>
 *   - Internal callers (HR Assistant chat): Clerk session via the auth() shim
 *
 * Stateless: each request gets a fresh McpServer instance.
 */

function isAuthorizedByApiKey(req: Request): boolean {
  const authHeader = req.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) return false;
  const key = authHeader.slice("Bearer ".length).trim();
  return !!process.env.MCP_API_KEY && key === process.env.MCP_API_KEY;
}

async function isAuthorizedByClerk(): Promise<boolean> {
  try {
    const { userId } = await auth();
    return !!userId;
  } catch {
    return false;
  }
}

async function authorize(req: Request): Promise<boolean> {
  if (isAuthorizedByApiKey(req)) return true;
  return await isAuthorizedByClerk();
}

async function handle(req: Request): Promise<Response> {
  if (!(await authorize(req))) {
    return new Response(
      JSON.stringify({
        jsonrpc: "2.0",
        id: null,
        error: { code: -32001, message: "Unauthorized" },
      }),
      { status: 401, headers: { "Content-Type": "application/json" } }
    );
  }

  const transport = new WebStandardStreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
  });

  const server = createMcpServer();
  await server.connect(transport);

  return transport.handleRequest(req);
}

export const GET = handle;
export const POST = handle;
export const DELETE = handle;
