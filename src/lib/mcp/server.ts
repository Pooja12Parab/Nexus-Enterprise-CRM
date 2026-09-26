import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { registerTools } from "./tools";
import { registerResources } from "./resources";
import { registerPrompts } from "./prompts";

/**
 * Create a fresh MCP server instance. Called per request for stateless mode.
 */
export function createMcpServer(): McpServer {
  const server = new McpServer({
    name: "nexus-crm",
    version: "1.0.0",
  });

  registerTools(server);
  registerResources(server);
  registerPrompts(server);

  return server;
}
