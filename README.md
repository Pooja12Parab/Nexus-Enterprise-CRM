# Nexus Enterprise CRM

> A modern, full-stack **Enterprise Customer Relationship Management (CRM)** platform built on Next.js 16, designed to manage employees, departments, organizational hierarchy, and onboarding workflows for mid-to-large organizations. Includes **AI features** (Vercel AI SDK + Google Gemini) and an **MCP server** for AI agent interoperability.

<p align="left">
  <img alt="Next.js" src="https://img.shields.io/badge/Next.js-16.2.9-000000?logo=nextdotjs" />
  <img alt="React" src="https://img.shields.io/badge/React-19-61DAFB?logo=react" />
  <img alt="TypeScript" src="https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript" />
  <img alt="Prisma" src="https://img.shields.io/badge/Prisma-7.8-2D3748?logo=prisma" />
  <img alt="PostgreSQL" src="https://img.shields.io/badge/PostgreSQL-Database-336791?logo=postgresql" />
  <img alt="Clerk" src="https://img.shields.io/badge/Clerk-Auth-6C47FF?logo=clerk" />
  <img alt="Tailwind" src="https://img.shields.io/badge/TailwindCSS-4-38B2AC?logo=tailwindcss" />
  <img alt="AI SDK" src="https://img.shields.io/badge/Vercel%20AI%20SDK-7.x-000000?logo=vercel" />
  <img alt="Gemini" src="https://img.shields.io/badge/Google%20Gemini-3.5-4285F4?logo=google" />
  <img alt="MCP" src="https://img.shields.io/badge/MCP-1.30-FF6F00?logo=protocol" />
  <img alt="Tests" src="https://img.shields.io/badge/Tests-Vitest%20%2B%20Playwright-6DB33F" />
</p>

---

## Summary

Nexus Enterprise CRM is a role-based employee and organization management platform. It provides a virtualized employee directory for 500+ employees, a visual org chart, a multi-step onboarding wizard, employee profile management, **AI-powered natural-language search**, **AI-assisted onboarding summaries**, **a streaming HR chat assistant with database-backed tool calling** — and an **MCP server** exposing all of the above to any AI client (Claude Desktop, ChatGPT, Cursor, etc.).

**Core capabilities**

- Employee directory with sorting, filtering, search, pagination, and row selection (529 employees seeded)
- Employee profile pages with compensation history
- Interactive org chart (manager → subordinates)
- Multi-step onboarding wizard with **AI welcome message generation**
- Department management
- Role-based access control (`SUPER_ADMIN`, `HR_MANAGER`, `DEPT_HEAD`, `EMPLOYEE`)
- Clerk authentication with webhook-driven user sync to PostgreSQL
- **Natural-language employee search** (`/api/ai/search`) — Zod-validated structured outputs
- **Streaming HR Assistant chat** (`/api/chat`) — Vercel AI SDK + Gemini + Prisma-backed tool calls + DB-persisted conversation history
- **MCP server** (`/api/mcp`) — 5 tools, 2 resources, 2 prompts, Streamable HTTP transport, Bearer-token auth
- 48+ unit/component/api tests + Playwright E2E coverage

---

## Screenshots

All screenshots are real captures of the running app against a seeded Postgres database (529 employees + 8 departments). Served via jsDelivr CDN for reliable GitHub rendering.

### Landing
[![Landing](https://cdn.jsdelivr.net/gh/Pooja12Parab/Nexus-Enterprise-CRM@main/docs/screenshots/landing.jpg)](https://cdn.jsdelivr.net/gh/Pooja12Parab/Nexus-Enterprise-CRM@main/docs/screenshots/landing.jpg)

### Sign In
[![Sign In](https://cdn.jsdelivr.net/gh/Pooja12Parab/Nexus-Enterprise-CRM@main/docs/screenshots/sign-in.jpg)](https://cdn.jsdelivr.net/gh/Pooja12Parab/Nexus-Enterprise-CRM@main/docs/screenshots/sign-in.jpg)

### Sign Up
[![Sign Up](https://cdn.jsdelivr.net/gh/Pooja12Parab/Nexus-Enterprise-CRM@main/docs/screenshots/sign-up.jpg)](https://cdn.jsdelivr.net/gh/Pooja12Parab/Nexus-Enterprise-CRM@main/docs/screenshots/sign-up.jpg)

### Dashboard (live Prisma data: 529 employees, 8 departments)
[![Dashboard](https://cdn.jsdelivr.net/gh/Pooja12Parab/Nexus-Enterprise-CRM@main/docs/screenshots/dashboard.jpg)](https://cdn.jsdelivr.net/gh/Pooja12Parab/Nexus-Enterprise-CRM@main/docs/screenshots/dashboard.jpg)

### Employee Directory (529 real employees, virtualized)
[![Employee Directory](https://cdn.jsdelivr.net/gh/Pooja12Parab/Nexus-Enterprise-CRM@main/docs/screenshots/directory.jpg)](https://cdn.jsdelivr.net/gh/Pooja12Parab/Nexus-Enterprise-CRM@main/docs/screenshots/directory.jpg)

### AI Search (real Gemini response — query: "engineers in marketing hired last quarter")
[![AI Search](https://cdn.jsdelivr.net/gh/Pooja12Parab/Nexus-Enterprise-CRM@main/docs/screenshots/ai-search-result.jpg)](https://cdn.jsdelivr.net/gh/Pooja12Parab/Nexus-Enterprise-CRM@main/docs/screenshots/ai-search-result.jpg)

### Employee Profile
[![Employee Profile](https://cdn.jsdelivr.net/gh/Pooja12Parab/Nexus-Enterprise-CRM@main/docs/screenshots/profile.jpg)](https://cdn.jsdelivr.net/gh/Pooja12Parab/Nexus-Enterprise-CRM@main/docs/screenshots/profile.jpg)

### Org Chart
[![Org Chart](https://cdn.jsdelivr.net/gh/Pooja12Parab/Nexus-Enterprise-CRM@main/docs/screenshots/org-chart.jpg)](https://cdn.jsdelivr.net/gh/Pooja12Parab/Nexus-Enterprise-CRM@main/docs/screenshots/org-chart.jpg)

### Onboarding Wizard
[![Onboarding Wizard](https://cdn.jsdelivr.net/gh/Pooja12Parab/Nexus-Enterprise-CRM@main/docs/screenshots/onboarding.jpg)](https://cdn.jsdelivr.net/gh/Pooja12Parab/Nexus-Enterprise-CRM@main/docs/screenshots/onboarding.jpg)

### HR Assistant Chat (real Gemini + Prisma tool calls)
[![HR Assistant Chat](https://cdn.jsdelivr.net/gh/Pooja12Parab/Nexus-Enterprise-CRM@main/docs/screenshots/hr-assistant-chat.jpg)](https://cdn.jsdelivr.net/gh/Pooja12Parab/Nexus-Enterprise-CRM@main/docs/screenshots/hr-assistant-chat.jpg)

### MCP Server (live curl — 5 tools, real Prisma responses)
[![MCP Server](https://cdn.jsdelivr.net/gh/Pooja12Parab/Nexus-Enterprise-CRM@main/docs/screenshots/mcp-endpoint.jpg)](https://cdn.jsdelivr.net/gh/Pooja12Parab/Nexus-Enterprise-CRM@main/docs/screenshots/mcp-endpoint.jpg)

### 403 Forbidden
[![403 Forbidden](https://cdn.jsdelivr.net/gh/Pooja12Parab/Nexus-Enterprise-CRM@main/docs/screenshots/forbidden.jpg)](https://cdn.jsdelivr.net/gh/Pooja12Parab/Nexus-Enterprise-CRM@main/docs/screenshots/forbidden.jpg)

> For the full project documentation, see [README.detailed.md](README.detailed.md). For the AI integration plan, see [`docs/AI_INTEGRATION.md`](docs/AI_INTEGRATION.md). For the MCP server plan, see [`docs/MCP_INTEGRATION.md`](docs/MCP_INTEGRATION.md).

---

## Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Configure environment
cp .env.example .env
# Fill in DATABASE_URL, Clerk keys, GOOGLE_GENERATIVE_AI_API_KEY, generate MCP_API_KEY with: openssl rand -hex 32

# 3. Set up the database
npm run db:generate
npm run db:push
npm run db:seed          # seeds 529 employees + 8 departments

# 4. Start dev server
npm run dev              # http://localhost:3000
```

The default `.env.example` enables `E2E_BYPASS_AUTH=1` so `npm run dev` works immediately for demos without requiring a 6-digit email OTP from Clerk. See [Authentication](#authentication--demo-mode) below.

---

## Scripts

| Command | Purpose |
|---|---|
| `npm run dev` | Start Next.js dev server |
| `npm run build` | Production build |
| `npm start` | Start production server |
| `npm run lint` | ESLint |
| `npm run type-check` | TypeScript (`tsc --noEmit`) |
| `npm test` | Run Vitest unit/component/api tests |
| `npm run test:watch` | Vitest in watch mode |
| `npm run test:e2e` | Playwright E2E tests |
| `npm run db:generate` | Generate Prisma client |
| `npm run db:push` | Push schema to database |
| `npm run db:seed` | Seed sample data (529 employees) |
| `npm run db:studio` | Open Prisma Studio |

---

## Architecture (TL;DR)

- **App Router** under `src/app/` with a `(dashboard)` route group for authenticated pages
- **Prisma + PostgreSQL** for persistence (`User`, `EmployeeProfile`, `Department`, `Salary`, `AuditLog`, plus `AiUsageLog`, `ChatThread`, `ChatMessage` for AI features)
- **Clerk** for authentication; **`svix`-verified webhook** at `/api/webhooks/clerk` syncs users to the DB
- **React Query + nuqs** for data fetching and URL-driven filter/sort/pagination state
- **TanStack Table + TanStack Virtual** for the 500+ row directory grid
- **Zod** for schema validation, **react-hook-form** for forms
- **Zustand** for client state (e.g. row selection)
- **Tailwind CSS v4** for styling
- **Vercel AI SDK 7.x + @ai-sdk/google + Gemini 3.5-flash-lite** for AI features:
  - `Output.object({ schema })` for structured outputs (Zod-validated)
  - `streamText` + `createUIMessageStreamResponse` for Server-Sent Events streaming
  - `useChat` + `DefaultChatTransport` for client-side chat UI
  - `tool()` with Zod `inputSchema` for real Prisma queries in the chat loop
  - Per-user rate limiting + cost tracking (`AiUsageLog`)
- **Model Context Protocol (MCP) v1.30.1**:
  - **Streamable HTTP transport** at `/api/mcp` (current MCP spec 2025-06-18)
  - **5 tools**: `list_employees`, `search_employees`, `count_by_department`, `get_employee`, `get_employee_stats`
  - **2 resources**: `crm://stats/summary`, `crm://departments`
  - **2 prompts**: `onboarding_checklist`, `performance_review`
  - **Dual auth**: `Authorization: Bearer <MCP_API_KEY>` for external clients, Clerk session for internal
  - **HR Assistant consumes same tools via `@ai-sdk/mcp`'s `createMCPClient`** — single source of truth
  - **Compatible with**: Claude Desktop, ChatGPT, Cursor, VS Code, Cline, Continue, and any MCP-compatible client

---

## Documentation

- **[README.detailed.md](README.detailed.md)** — full project documentation: features, tech stack, architecture, project structure, environment variables, Prisma schema, RBAC, scripts, testing, API reference, deployment, troubleshooting, and contributing.
- **[`docs/AI_INTEGRATION.md`](docs/AI_INTEGRATION.md)** — AI features plan: stack decisions, code examples, interview talking points.
- **[`docs/MCP_INTEGRATION.md`](docs/MCP_INTEGRATION.md)** — MCP server plan: research, SDK API, implementation phases, client examples.
- **[`docs/deploy-plan.md`](docs/deploy-plan.md)** — production deployment guide (Vercel + Neon + Clerk).

---

## Connect Claude Desktop to the MCP server

Once `npm run dev` is running:

1. Install [Claude Desktop](https://claude.ai/download)
2. Open **Settings → Developer → Edit Config** (`claude_desktop_config.json`)
3. Add:
   ```json
   {
     "mcpServers": {
       "nexus-crm": {
         "url": "http://localhost:3000/api/mcp",
         "headers": { "Authorization": "Bearer <your MCP_API_KEY from .env>" }
       }
     }
   }
   ```
4. Restart Claude Desktop
5. Click the 🔨 (tools) icon — you'll see 5 nexus-crm tools
6. Ask: *"How many engineers do we have?"* — Claude calls `count_by_department` and answers with **70 engineers**

---

## Authentication & Demo Mode

This repo includes a **test-only auth bypass** so demos and screenshot capture don't require reading a 6-digit email OTP from Clerk.

- `E2E_BYPASS_AUTH=1` (and `NEXT_PUBLIC_E2E_BYPASS_AUTH=1`) injects a synthetic `SUPER_ADMIN` session
- The middleware skips Clerk auth entirely
- The ClerkProvider client component is skipped (so `useUser`/`UserButton` don't crash)
- The `/api/*` route handlers and protected pages return data as if the bypass user were signed in

**Production behavior is unaffected** as long as `E2E_BYPASS_AUTH` is unset in Vercel project env vars. For real Clerk auth locally, set `E2E_BYPASS_AUTH=0` (or remove) and sign in normally via the form.

**This is a common pattern** in portfolio projects: keeps demo simple while production runs real auth. The bypass code is gated, reviewed, and ~30 lines total — clearly marked with comments.

---

## Testing

- **Vitest** — unit (hooks, utils), component, and API integration tests
- **Playwright** — end-to-end directory flow (sign-in, sort, filter, paginate, select)
- `npm test` for the lower pyramid, `npm run test:e2e` for E2E

---

## License

Private / unlicensed (update as appropriate for your distribution).
