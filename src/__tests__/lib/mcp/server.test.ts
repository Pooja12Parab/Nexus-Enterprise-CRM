import { describe, it, expect } from "vitest";
import { Client } from "@modelcontextprotocol/sdk/client";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { registerTools } from "@/lib/mcp/tools";
import { registerResources } from "@/lib/mcp/resources";
import { registerPrompts } from "@/lib/mcp/prompts";

/**
 * In-memory MCP test — spins up a real MCP server + client in the same process.
 * Uses the SDK's InMemoryTransport pair to avoid any network.
 */
async function withMcpServer<T>(
  setup: (server: McpServer) => void,
  fn: (client: Client) => Promise<T>
): Promise<T> {
  const server = new McpServer({ name: "test", version: "0.0.0" });
  setup(server);
  const client = new Client({ name: "test-client", version: "0.0.0" });
  const [clientT, serverT] = InMemoryTransport.createLinkedPair();
  await Promise.all([client.connect(clientT), server.connect(serverT)]);
  try {
    return await fn(client);
  } finally {
    await client.close();
  }
}

describe("MCP server — tools", () => {
  it("lists 5 registered tools", async () => {
    await withMcpServer((s) => registerTools(s), async (client) => {
      const { tools } = await client.listTools();
      const names = tools.map((t) => t.name).sort();
      expect(names).toEqual([
        "count_by_department",
        "get_employee",
        "get_employee_stats",
        "list_employees",
        "search_employees",
      ]);
    });
  });

  it("get_employee_stats returns aggregate data", async () => {
    await withMcpServer((s) => registerTools(s), async (client) => {
      const result = (await client.callTool({
        name: "get_employee_stats",
        arguments: {},
      })) as { content: Array<{ text: string }> };
      const data = JSON.parse(result.content[0].text);
      expect(data).toHaveProperty("total");
      expect(data).toHaveProperty("byStatus");
      expect(data).toHaveProperty("departmentCount");
      expect(typeof data.total).toBe("number");
    });
  });

  it("count_by_department returns a sorted array", async () => {
    await withMcpServer((s) => registerTools(s), async (client) => {
      const result = (await client.callTool({
        name: "count_by_department",
        arguments: {},
      })) as { content: Array<{ text: string }> };
      const data = JSON.parse(result.content[0].text);
      expect(Array.isArray(data)).toBe(true);
      for (let i = 1; i < data.length; i++) {
        expect(data[i - 1].count).toBeGreaterThanOrEqual(data[i].count);
      }
    });
  });

  it("list_employees with search filter", async () => {
    await withMcpServer((s) => registerTools(s), async (client) => {
      const result = (await client.callTool({
        name: "list_employees",
        arguments: { search: "Engineer", limit: 5 },
      })) as { content: Array<{ text: string }> };
      const data = JSON.parse(result.content[0].text);
      expect(Array.isArray(data)).toBe(true);
      expect(data.length).toBeLessThanOrEqual(5);
    });
  });
});

describe("MCP server — resources", () => {
  it("exposes 2 resources", async () => {
    await withMcpServer((s) => registerResources(s), async (client) => {
      const { resources } = await client.listResources();
      const uris = resources.map((r) => r.uri).sort();
      expect(uris).toContain("crm://stats/summary");
      expect(uris).toContain("crm://departments");
    });
  });
});

describe("MCP server — prompts", () => {
  it("exposes 2 prompts", async () => {
    await withMcpServer(
      (s) => {
        registerTools(s);
        registerPrompts(s);
      },
      async (client) => {
        const { prompts } = await client.listPrompts();
        const names = prompts.map((p) => p.name).sort();
        expect(names).toEqual(["onboarding_checklist", "performance_review"]);
      }
    );
  });

  it("renders onboarding_checklist prompt correctly", async () => {
    await withMcpServer(
      (s) => {
        registerTools(s);
        registerPrompts(s);
      },
      async (client) => {
        const result = (await client.getPrompt({
          name: "onboarding_checklist",
          arguments: { department: "Engineering", role: "Senior Engineer" },
        })) as { messages: Array<{ content: { text: string } }> };
        const text = result.messages[0].content.text;
        expect(text).toContain("Engineering");
        expect(text).toContain("Senior Engineer");
      }
    );
  });
});
