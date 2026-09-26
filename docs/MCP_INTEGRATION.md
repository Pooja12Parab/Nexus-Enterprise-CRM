# MCP Integration Plan

> **Status:** Design document only — no code written yet.
> **Goal:** Expose Nexus Enterprise CRM's HR data (employees, departments, workforce stats) as an **MCP server** so any MCP-compatible AI client — Claude Desktop, ChatGPT, Cursor, VS Code, custom agents — can connect and query your data. Optionally, consume this MCP server from the existing Vercel AI SDK HR Assistant chat for full tool interoperability.
> **Stack (verified live):** MCP TypeScript SDK v2.x · `@modelcontextprotocol/server` · `@modelcontextprotocol/node` · `@modelcontextprotocol/express` · `@ai-sdk/mcp` 2.0.x · Streamable HTTP transport

---

## What I verified before writing this doc

Every claim below was re-verified against live sources (not training-data memory) for the Sep 2026 MCP ecosystem.

| Claim | Source verified |
|---|---|
| MCP is an open JSON-RPC 2.0 standard; supports Tools / Resources / Prompts / Sampling / Roots / Elicitation | <https://modelcontextprotocol.io/specification/2025-06-18> |
| Official TypeScript SDK v2.x exists, packages: `@modelcontextprotocol/server`, `@modelcontextprotocol/node`, `@modelcontextprotocol/express` | <https://ts.sdk.modelcontextprotocol.io/v2/> (context7) |
| `McpServer.registerTool()` with Zod input schemas is the current API | <https://ts.sdk.modelcontextprotocol.io/v2/servers/tools> |
| Streamable HTTP transport for HTTP-based servers (replaces deprecated SSE) | <https://ts.sdk.modelcontextprotocol.io/v2/api/@modelcontextprotocol/node> |
| Vercel AI SDK has `@ai-sdk/mcp` 2.0.60+ with `createMCPClient()` for HTTP / SSE / stdio transports | <https://ai-sdk.dev/docs/ai-sdk-core/mcp-tools> (context7) |
| `createMCPClient({ transport: { type: 'http', url: '...' } })` is the production-recommended transport | Same as above |
| Next.js 16+ has built-in MCP endpoint at `/_next/mcp` for **coding agents** (separate use case) | <https://nextjs.org/docs/app/guides/mcp> |
| OpenAI Agents SDK and ChatGPT both support MCP as of 2026 | <https://modelcontextprotocol.io/introduction> |
| `@modelcontextprotocol/sdk` is the de-facto canonical SDK across all language ecosystems | <https://ts.sdk.modelcontextprotocol.io/v2/> |

---

## What is MCP? (for context)

**Model Context Protocol (MCP)** is an open standard (introduced by Anthropic late 2024, now industry-wide) that defines how AI applications discover and invoke tools from external servers. Think **"USB-C for AI"** — one protocol that works with every LLM client.

**Architecture:**

```
┌──────────────────┐                ┌──────────────────┐
│  MCP Client      │                │  MCP Server       │
│  (Claude Desktop)│  ──JSON-RPC──►│  (Your CRM)      │
│  (ChatGPT)       │                │                  │
│  (Cursor / VSCode)│               │  exposes:         │
│  (your chat UI)   │                │   - Tools         │
└──────────────────┘                │   - Resources     │
                                    │   - Prompts       │
                                    └──────────────────┘
```

**For your CRM:**

- **Server** = Nexus CRM exposes its data as MCP tools (`listEmployees`, `countByDepartment`, `getEmployeeStats`, etc.)
- **Client** = any MCP-compatible AI app can connect, ask "how many engineers?", and your real Prisma queries run

This is the **standardized way to expose data to AI**. Every new AI tool being built today supports MCP. Your competitors will be MCP-compatible by end of 2026.

---

## What this delivers for your portfolio

| Audience | Before MCP | After MCP |
|---|---|---|
| **Recruiter (HR Assistant role)** | "I added AI features" | "I built an MCP server exposing real Prisma data, consumable by Claude Desktop, ChatGPT, and any MCP client" |
| **Hiring manager (technical screen)** | Q: "How would you expose your data to AI?" | A: "MCP server using `@modelcontextprotocol/server` v2.x with Streamable HTTP transport and Clerk JWT auth — let me show you the repo" |
| **AI agents** (real users) | Can't access your CRM data | Can query your workforce directly from their preferred tool |

---

## Architecture (final, locked)

### Two-component design

**Component 1 — MCP server (exposes CRM data)**

Hosted as a **Next.js Route Handler** at `/api/mcp/[transport]` or a separate Node.js process. Uses Streamable HTTP transport (the current 2026 standard — SSE is deprecated).

```
┌─────────────────────────────────────────────────────────────┐
│             Nexus CRM MCP Server                              │
│             /api/mcp (Next.js Route Handler)                 │
│                                                              │
│   Tools exposed via McpServer.registerTool():                │
│     • list_employees    (Zod-validated Prisma query)        │
│     • count_by_department                                  │
│     • list_departments                                      │
│     • get_employee_stats                                   │
│     • search_employees                                      │
│     • get_employee (by ID)                                  │
│   Resources (file-like data):                                │
│     • company-info://departments (departments + counts)    │
│     • crm://stats/summary (workforce stats JSON)            │
│   Prompts (templated workflows):                              │
│     • onboarding_checklist (template for new hires)         │
│     • performance_review_template                            │
└─────────────────────────────────────────────────────────────┘
```

**Component 2 — MCP client (consumes the server)**

The existing `/api/chat` HR Assistant route switches from inline `tool()` definitions to consuming the **same tools via MCP**:

```ts
import { createMCPClient } from "@ai-sdk/mcp";

const mcpClient = await createMCPClient({
  transport: {
    type: "http",
    url: `${process.env.NEXT_PUBLIC_APP_URL}/api/mcp`,
  },
});

const tools = await mcpClient.tools();

const result = streamText({
  model: google("gemini-3.5-flash-lite"),
  messages,
  tools,  // Same tools exposed externally + used internally
  stopWhen: stepCountIs(5),
});
```

This gives us **single source of truth**: the tools defined once on the MCP server are consumed by both internal chat and external AI clients. No code duplication.

---

## Decisions (locked)

### 1. SDK: `@modelcontextprotocol/server` v2.x

- **Why:** Official, maintained by the MCP working group, TypeScript-first, Zod-validated tools
- **Why not FastMCP:** FastMCP is Python-only
- **Why not build my own JSON-RPC:** Reinventing the wheel; the spec is complex (session management, capability negotiation, streaming)

### 2. Transport: Streamable HTTP

- **Why:** Modern, replaces deprecated SSE, works with Next.js Route Handlers, supports both streaming and request-response
- **Why not stdio:** Stdio is for local-only desktop clients (Claude Desktop)
- **Why not SSE:** Officially deprecated in MCP spec 2025-03-26; SSE is being phased out

### 3. Hosting: Next.js Route Handler at `/api/mcp`

- **Why:** Same deployment as the rest of the app (Vercel), no separate service to manage
- **Alternative considered:** Standalone Node process — rejected because it adds deployment complexity

### 4. Auth: Clerk session token (same as other API routes)

- **Why:** Consistent with rest of the app, no separate auth layer
- **For external AI clients** (Claude Desktop, ChatGPT): they'd need to authenticate somehow. Options:
  - **OAuth 2.1 flow** (official MCP recommendation for production)
  - **API key in header** (simpler, fine for portfolio)
  - **Public endpoints with rate limiting** (simplest, fine for demo)
- **My recommendation:** API key in `Authorization: Bearer <key>` header for external clients, Clerk session for internal clients. One endpoint, two auth paths.

### 5. Migration strategy: refactor existing `aiTools` to live ON the MCP server

- **Why:** Eliminates duplication (today's `src/lib/ai/tools.ts` and tomorrow's MCP server tools would be the same code)
- **How:** Move tool definitions from `src/lib/ai/tools.ts` to `src/lib/mcp/tools.ts`. The MCP server exposes them. The HR Assistant chat consumes them via `createMCPClient`.

### 6. Tests: in-memory MCP transport

- Use `@modelcontextprotocol/sdk` test helpers + `InMemoryTransport` for unit tests
- Use a local running MCP server for E2E tests

---

## File plan

### Create (10)

```
src/lib/mcp/
├── server.ts                      ← McpServer instance + tool registrations
├── tools/
│   ├── list-employees.ts
│   ├── count-by-department.ts
│   ├── list-departments.ts
│   ├── get-employee-stats.ts
│   ├── search-employees.ts
│   └── get-employee.ts
├── resources.ts                   ← MCP Resources (departments, stats)
├── prompts.ts                     ← MCP Prompts (onboarding checklist, review template)
├── auth.ts                        ← dual auth: Clerk session OR API key
└── client.ts                      ← factory that returns a connected MCP client (for internal use)

src/app/api/mcp/route.ts           ← Streamable HTTP transport endpoint

src/__tests__/lib/mcp/
├── server.test.ts
└── tools.test.ts

e2e/mcp-server.spec.ts             ← Playwright test that connects Claude-style MCP client

docs/screenshots/
└── mcp-claude-desktop.jpg         ← Real screenshot of Claude Desktop connected to your MCP server
```

### Modify (4)

```
src/lib/ai/tools.ts                 ← REMOVED, replaced by src/lib/mcp/tools/*
src/lib/ai/schemas.ts               ← moved to src/lib/mcp/schemas.ts
src/app/api/chat/route.ts           ← uses createMCPClient() to consume tools
src/components/ai/ChatPanel.tsx     ← (no change, already uses useChat)
package.json                       ← add @modelcontextprotocol/server, @modelcontextprotocol/node, @modelcontextprotocol/express
.env.example                       ← add MCP_API_KEY for external clients
README.md                          ← add MCP section + Claude Desktop screenshot
README.detailed.md                 ← add MCP architecture + use cases
```

**Total LOC:** ~500 new + 200 modified. ~1–2 days of focused work.

---

## API design (the tools exposed by the MCP server)

### Tool definitions

```ts
import { McpServer } from "@modelcontextprotocol/server";
import * as z from "zod";
import { prisma } from "@/lib/prisma";

export function registerTools(server: McpServer) {
  server.registerTool(
    "list_employees",
    {
      description: "List employees with optional filters. Returns up to 50 employees.",
      inputSchema: z.object({
        department: z.string().optional().describe("Filter by department name"),
        status: z.enum(["ACTIVE", "ONBOARDING", "LEAVE", "INACTIVE"]).optional(),
        search: z.string().optional().describe("Substring match against name, email, job title"),
        limit: z.number().int().min(1).max(100).optional().default(50),
      }),
    },
    async ({ department, status, search, limit }) => {
      const where: Record<string, unknown> = {};
      if (department) where.department = { name: department };
      if (status) where.status = status;
      if (search) {
        where.OR = [
          { firstName: { contains: search, mode: "insensitive" } },
          { lastName: { contains: search, mode: "insensitive" } },
          { jobTitle: { contains: search, mode: "insensitive" } },
          { email: { contains: search, mode: "insensitive" } },
        ];
      }
      const employees = await prisma.employeeProfile.findMany({
        where,
        include: { department: { select: { name: true } } },
        take: limit ?? 50,
        orderBy: { lastName: "asc" },
      });
      return {
        content: [{
          type: "text",
          text: JSON.stringify(employees.map((e) => ({
            id: e.id, name: `${e.firstName} ${e.lastName}`,
            title: e.jobTitle, department: e.department.name, status: e.status,
          })), null, 2),
        }],
      };
    }
  );

  // ... similar for count_by_department, get_employee_stats, etc.
}
```

### Route Handler

```ts
// src/app/api/mcp/route.ts
import { createMcpExpressApp } from "@modelcontextprotocol/express";
import { NodeStreamableHTTPServerTransport } from "@modelcontextprotocol/node";
import { McpServer } from "@modelcontextprotocol/server";
import { registerTools } from "@/lib/mcp/server";
import { auth } from "@/lib/auth";

const mcpApp = createMcpExpressApp();

async function handleMcpRequest(req: Request) {
  // Auth: accept Clerk session OR Bearer API key
  const apiKey = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (apiKey) {
    if (apiKey !== process.env.MCP_API_KEY) {
      return new Response("Unauthorized", { status: 401 });
    }
  } else {
    const { userId } = await auth();
    if (!userId) {
      return new Response("Unauthorized", { status: 401 });
    }
  }

  const server = new McpServer({ name: "nexus-crm", version: "1.0.0" });
  registerTools(server);
  const transport = new NodeStreamableHTTPServerTransport({ sessionIdGenerator: undefined });
  await server.connect(transport);

  // Adapt Next.js Request to Node.js IncomingMessage — handled by Next.js
  return transport.handleRequest(req, { status: (code) => code } as any, req.body);
}

export const POST = handleMcpRequest;
export const GET = handleMcpRequest; // for SSE capability declaration
```

---

## Resources & Prompts (added value beyond just tools)

```ts
// Resources
server.registerResource(
  "departments",
  "company-info://departments",
  {
    title: "Company Departments",
    description: "All departments with employee counts",
  },
  async (uri) => {
    const departments = await prisma.department.findMany({
      include: { _count: { select: { employees: true } } },
    });
    return {
      contents: [{
        uri: uri.href,
        mimeType: "application/json",
        text: JSON.stringify(departments, null, 2),
      }],
    };
  }
);

// Prompts
server.registerPrompt(
  "onboarding_checklist",
  {
    description: "Generate an onboarding checklist for a new hire",
    argsSchema: z.object({
      department: z.string().describe("Department name"),
      role: z.string().describe("Job title"),
    }),
  },
  ({ department, role }) => ({
    messages: [{
      role: "user",
      content: {
        type: "text",
        text: `Generate a 7-day onboarding checklist for a new ${role} in ${department}.`,
      },
    }],
  })
);
```

---

## MCP client integration (refactor existing chat)

```ts
// src/lib/mcp/client.ts
import { createMCPClient } from "@ai-sdk/mcp";

let _client: Awaited<ReturnType<typeof createMCPClient>> | null = null;

export async function getMcpTools() {
  if (!_client) {
    _client = await createMCPClient({
      transport: {
        type: "http",
        url: `${process.env.NEXT_PUBLIC_APP_URL}/api/mcp`,
        headers: process.env.MCP_API_KEY
          ? { Authorization: `Bearer ${process.env.MCP_API_KEY}` }
          : {},
      },
    });
  }
  return await _client.tools();
}
```

Then in `/api/chat/route.ts`:

```ts
import { getMcpTools } from "@/lib/mcp/client";

// ... inside POST handler
const tools = await getMcpTools();
const result = streamText({
  model: getModel().model,
  messages: await convertToModelMessages(validatedMessages),
  system: "...",
  tools,  // <-- comes from MCP server
  stopWhen: stepCountIs(5),
});
```

**Net effect:** Zero duplication. The same tool definitions serve both internal chat and external MCP clients.

---

## Environment variables

```
MCP_API_KEY=<random 32-byte hex>
```

Generated with `openssl rand -hex 32`. Shared with external clients (Claude Desktop, ChatGPT) who paste it into their MCP config.

---

## Auth options for external clients

External MCP clients (Claude Desktop, ChatGPT, Cursor) connect by configuring their `mcpServers` config with a command or URL.

### Option A — Public read-only endpoint (easiest, demo-friendly)

```json
// claude_desktop_config.json
{
  "mcpServers": {
    "nexus-crm": {
      "url": "https://your-vercel-app.vercel.app/api/mcp",
      "headers": { "Authorization": "Bearer <your MCP_API_KEY>" }
    }
  }
}
```

✅ Works with every modern MCP client. Best for portfolio.

### Option B — OAuth 2.1 flow (production-grade)

OAuth client registration + token exchange. The MCP TypeScript SDK supports this via the `authProvider` config. ~3 days extra work.

✅ Industry standard. Impressive but overkill for v1.

### My recommendation: Option A

The `Authorization: Bearer <key>` approach is what GitHub's MCP server, Cloudflare's MCP, etc. all do for simple cases. Easy to demo, easy to revoke.

---

## Testing strategy

### Unit (Vitest)

```ts
import { describe, it, expect } from "vitest";
import { McpServer } from "@modelcontextprotocol/server";
import { Client } from "@modelcontextprotocol/client";
import { InMemoryTransport } from "@modelcontextprotocol/sdk";

describe("MCP server", () => {
  it("exposes list_employees tool", async () => {
    const server = new McpServer({ name: "test", version: "1.0.0" });
    registerTools(server);

    const client = new Client({ name: "test-client", version: "1.0.0" });
    const [clientTransport, serverTransport] = InMemoryTransport.createPair();
    await Promise.all([server.connect(serverTransport), client.connect(clientTransport)]);

    const result = await client.callTool({ name: "list_employees", arguments: {} });
    expect(result.content).toBeTruthy();
  });
});
```

### E2E (Playwright)

Mock an MCP client connection to `/api/mcp`, send `tools/list`, verify response includes expected tools.

### Manual demo

Connect Claude Desktop (if you have it) to `http://localhost:3000/api/mcp`. Ask "how many engineers?" — Claude calls your tool, returns the answer.

---

## Implementation phases (3-4 days of work)

### Phase 1 — Foundation (Day 1, ~3 hours)

1. Install: `npm install @modelcontextprotocol/server @modelcontextprotocol/node @modelcontextprotocol/express @modelcontextprotocol/client`
2. Create `src/lib/mcp/server.ts` — McpServer instance + tool registrations
3. Create `src/lib/mcp/tools/*.ts` — 6 tool files (move from `src/lib/ai/tools.ts`)
4. Create `src/lib/mcp/schemas.ts` — shared Zod schemas
5. Write Vitest unit tests for each tool

### Phase 2 — Route Handler + Auth (Day 1, ~2 hours)

1. Create `src/app/api/mcp/route.ts` — Streamable HTTP transport with dual auth
2. Add `MCP_API_KEY` to `.env.example`
3. Test locally with curl + a simple MCP client

### Phase 3 — Refactor HR Assistant to consume MCP (Day 2, ~2 hours)

1. Create `src/lib/mcp/client.ts` — `getMcpTools()` factory
2. Modify `src/app/api/chat/route.ts` — use `getMcpTools()` instead of inline `aiTools`
3. Delete old `src/lib/ai/tools.ts` and `src/lib/ai/schemas.ts`
4. Re-run E2E + capture new HR chat screenshot

### Phase 4 — Claude Desktop demo + screenshot (Day 2, ~1 hour)

1. Install Claude Desktop (free) from <https://claude.ai/download>
2. Configure with `claude_desktop_config.json` pointing at your local MCP server
3. Ask Claude "how many engineers?" — verify it calls your tool
4. Take a screenshot of Claude Desktop using your MCP server
5. Add to README

### Phase 5 — Resources & Prompts (Day 3, ~1 hour)

1. Add 2 MCP Resources (`departments`, `stats`)
2. Add 2 MCP Prompts (`onboarding_checklist`, `performance_review`)
3. Test with Claude Desktop

### Phase 6 — Documentation + commit (Day 3, ~1 hour)

1. Update `README.md` and `README.detailed.md`
2. Add `docs/MCP_INTEGRATION.md` (this doc)
3. Commit + push

---

## Cost & rate limits

**$0 — MCP is just a wire protocol.** The tools it calls are the same Prisma queries we already have.

For external clients, add per-key rate limiting:
- 100 requests/minute per API key
- 1000 requests/day per API key

---

## Security considerations

1. **API key in headers** — never in URLs. HTTPS only.
2. **No PII in tool results for unauthenticated callers** — restrict external endpoint to summary tools only; require Clerk auth for employee-level data
3. **Rate limiting per API key** — prevent abuse
4. **Audit log** — log every tool call to `AiUsageLog` table (already exists)
5. **Revocation** — rotating `MCP_API_KEY` immediately invalidates all external clients

---

## Interview talking points (real, not made up)

1. **"Why MCP?"** — "It's the USB-C of AI. Every major AI tool (Claude, ChatGPT, Cursor, VS Code) supports it. By exposing my CRM as an MCP server, any of those tools can query my workforce data without custom integration."

2. **"Why not just call the API directly?"** — "I could, but then I'd have to write a custom integration for each client. MCP gives me one server, every AI client works. Industry standard."

3. **"How do you handle auth?"** — "Dual path. Internal requests use Clerk session cookies. External AI clients use `Authorization: Bearer <MCP_API_KEY>` — like GitHub's MCP server, Cloudflare's MCP, etc."

4. **"How do you prevent abuse?"** — "Per-API-key rate limiting (token bucket), audit log in `AiUsageLog`, and the key can be revoked instantly."

5. **"What's the difference between MCP resources and tools?"** — "Tools are functions the model calls. Resources are file-like data the model reads (like `departments://` URI). Tools mutate; resources describe state."

6. **"What about MCP servers for code agents?"** — "Next.js 16 has built-in MCP at `/_next/mcp` via `next-devtools-mcp`. That's a separate use case — exposing dev-server state to coding agents. Different ecosystem from data MCP."

7. **"Why Streamable HTTP over SSE?"** — "SSE was deprecated in MCP spec 2025-03-26. Streamable HTTP is the current standard, supports both request-response and streaming, works with any HTTP server including Vercel."

8. **"Can your MCP server be tested independently?"** — "Yes — `InMemoryTransport` from the SDK lets me write unit tests that spin up a real MCP server and connect a real client in the same process. No network needed."

---

## Risk & mitigation

| Risk | Mitigation |
|---|---|
| SDK API changes (MCP is evolving fast) | Pin to specific SDK version in `package.json`; check changelog on upgrade |
| External client misuse | API key rotation, rate limiting, audit log |
| Next.js Route Handler limits (10s default) | Use `maxDuration = 60` export |
| Prisma cold start latency | Use Prisma's `pgBouncer` connection pooling (already in place) |
| Tool output size (huge results) | Cap with `limit` param, default 50 |

---

## Out of scope for v1

- ❌ OAuth 2.1 flow (use API key for now)
- ❌ Multi-tenant isolation (single-tenant CRM)
- ❌ Bidirectional sampling (server-initiated LLM calls)
- ❌ Persistent MCP sessions (stateless is fine for portfolio)
- ❌ MCP-Apps (interactive UI in chat) — too new (2026), low ROI for portfolio

---

## What I need from you

1. ✅ Confirm **"go"** to start implementation
2. ⚠️ Optional: install Claude Desktop if you want to test external client integration
3. ⚠️ Optional: set up a second Clerk OAuth app for production MCP (out of scope for v1)

When you approve, I'll start with **Phase 1: Foundation** and verify each phase before moving on.
