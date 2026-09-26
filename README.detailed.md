# Nexus Enterprise CRM

A modern, full-stack Enterprise CRM platform for managing employees, departments, organizational hierarchy, onboarding, and compensation — built on **Next.js 16**, **React 19**, **Prisma 7**, **PostgreSQL**, and **Clerk** authentication.

> 📦 **Deployment:** See [`docs/deploy-plan.md`](docs/deploy-plan.md) for the full production deployment guide (Vercel + Neon + Clerk).
>
> 🤖 **AI integration:** See [`docs/AI_INTEGRATION.md`](docs/AI_INTEGRATION.md) for the Vercel AI SDK + Google Gemini integration plan.

---

## Table of Contents

1. [About the Project](#about-the-project)
2. [Screenshots](#screenshots)
3. [Features](#features)
4. [Tech Stack](#tech-stack)
5. [Architecture](#architecture)
6. [Project Structure](#project-structure)
7. [Getting Started](#getting-started)
8. [Environment Variables](#environment-variables)
9. [Database & Prisma](#database--prisma)
10. [Authentication & Authorization](#authentication--authorization)
11. [Scripts](#scripts)
12. [Testing](#testing)
13. [API Reference](#api-reference)
14. [Deployment](#deployment)
15. [Roadmap](#roadmap)
16. [Contributing](#contributing)
17. [Troubleshooting](#troubleshooting)
18. [License](#license)

---

## About the Project

Nexus Enterprise CRM is a role-based internal platform that gives an organization a single source of truth for its people. It is designed for HR managers, department heads, and individual employees with different permissions and views.

The product centers on four workflows:

- **Directory** — search, sort, filter, and select across the full employee roster
- **Profile** — view and edit employee profile, contact info, and compensation history
- **Org Chart** — explore the reporting hierarchy visually
- **Onboarding** — guided multi-step wizard for new hires

The app is bootstrapped with `create-next-app` and extended with a typed Prisma data layer, Clerk auth, Clerk webhooks for user sync, and a comprehensive test pyramid (Vitest + Playwright).

---

## Screenshots

All screenshots are captured live from the running app against a seeded Postgres database (515 employees + 12 departments). Served via jsDelivr CDN for reliable rendering on GitHub.

### Landing
[![Landing](https://cdn.jsdelivr.net/gh/Pooja12Parab/Nexus-Enterprise-CRM@main/docs/screenshots/landing.jpg)](https://cdn.jsdelivr.net/gh/Pooja12Parab/Nexus-Enterprise-CRM@main/docs/screenshots/landing.jpg)

### Sign In
[![Sign In](https://cdn.jsdelivr.net/gh/Pooja12Parab/Nexus-Enterprise-CRM@main/docs/screenshots/sign-in.jpg)](https://cdn.jsdelivr.net/gh/Pooja12Parab/Nexus-Enterprise-CRM@main/docs/screenshots/sign-in.jpg)

### Sign Up
[![Sign Up](https://cdn.jsdelivr.net/gh/Pooja12Parab/Nexus-Enterprise-CRM@main/docs/screenshots/sign-up.jpg)](https://cdn.jsdelivr.net/gh/Pooja12Parab/Nexus-Enterprise-CRM@main/docs/screenshots/sign-up.jpg)

### Dashboard
[![Dashboard](https://cdn.jsdelivr.net/gh/Pooja12Parab/Nexus-Enterprise-CRM@main/docs/screenshots/dashboard.jpg)](https://cdn.jsdelivr.net/gh/Pooja12Parab/Nexus-Enterprise-CRM@main/docs/screenshots/dashboard.jpg)

### Employee Directory
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

### 403 Forbidden
[![403 Forbidden](https://cdn.jsdelivr.net/gh/Pooja12Parab/Nexus-Enterprise-CRM@main/docs/screenshots/forbidden.jpg)](https://cdn.jsdelivr.net/gh/Pooja12Parab/Nexus-Enterprise-CRM@main/docs/screenshots/forbidden.jpg)

---

## Features

### Employee Directory
- Virtualized data grid (TanStack Virtual) for 500+ rows
- Column sorting with URL state (`nuqs`)
- Search by name/email (debounced API filter)
- Filter by department and employment status
- Server-side pagination with Previous/Next controls
- Multi-row selection with Zustand store
- Clear filter chips + "Clear all" affordance
- Zero console errors verified by E2E

### Employee Profile
- Avatar, contact info, job details
- Compensation history (Salary records)
- Manager reference + direct reports
- Editable fields gated by role

### Org Chart
- Manager → subordinates recursive tree
- Built from the `EmployeeProfile.managerId` self-relation
- Visual hierarchy with department grouping

### Onboarding Wizard
- 4-step flow: Personal Info → Job Details → Documents → Review
- `react-hook-form` + `zod` validation
- Persists progress per session

### Dashboard
- KPI cards (total employees, departments, active, on leave)
- Recent activity surface

### Settings
- Per-user preferences and account info

### Cross-cutting
- Role-based access control (`SUPER_ADMIN`, `HR_MANAGER`, `DEPT_HEAD`, `EMPLOYEE`)
- Clerk webhook → DB user sync
- Audit log table for sensitive actions
- Type-safe end-to-end (TypeScript strict, Zod at boundaries)
- Fully tested pyramid

### AI Search (`/directory`)
- Natural-language query converted to structured Prisma filters via Google Gemini
- Zod-validated structured outputs (`Output.object({ schema })`)
- Per-user rate limiting + cost tracking in `AiUsageLog`

### AI Onboarding Summary (`/onboarding`)
- "Generate with AI" button on the Review step drafts a 2-sentence welcome blurb from profile fields
- Same Vercel AI SDK pipeline as the search

### HR Assistant Chat (`/hr-assistant`)
- Streaming chat with `useChat` + `DefaultChatTransport` + `createUIMessageStreamResponse`
- Real Prisma tools defined via `tool({ inputSchema, execute })`:
  - `listEmployees` — filter by department, status, search
  - `countByDepartment` — workforce distribution
  - `listDepartments` — all departments with employee counts
  - `getEmployeeStats` — total / by-status / department-count aggregations
- Conversation history persisted to PostgreSQL (`ChatThread` + `ChatMessage` tables)
- Multi-step agent loop via `stopWhen: stepCountIs(5)`

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16.2.9 (App Router, Route Groups) |
| UI | React 19.2.7 |
| Language | TypeScript 5 |
| Styling | Tailwind CSS v4 (PostCSS) |
| Database | PostgreSQL |
| ORM | Prisma 7.8 (with `@prisma/adapter-pg`) |
| Auth | Clerk (`@clerk/nextjs` 7) |
| Webhooks | `svix` for signature verification |
| AI SDK | Vercel AI SDK 7 (`ai`, `@ai-sdk/google`, `@ai-sdk/react`) |
| LLM | Google Gemini 3.5-flash-lite (verified on free tier) |
| Data fetching | TanStack React Query 5 |
| URL state | `nuqs` 2 |
| Table / Virtualization | TanStack Table 8 + TanStack Virtual 3 |
| Forms | react-hook-form 7 + `@hookform/resolvers` + Zod 3 |
| Client state | Zustand 5 |
| Icons | lucide-react |
| Utility | clsx, tailwind-merge, dotenv |
| Testing | Vitest 3 + Testing Library + jsdom, Playwright 1.54 |
| Linting | ESLint 9 + `eslint-config-next` |

---

## Architecture

```
Browser
  │
  │  (Clerk session cookie)
  ▼
Next.js App Router  ──►  Middleware (clerkMiddleware)
  │                        │
  │                        ├── Public:  /, /sign-in, /sign-up, /403
  │                        └── Protected: /dashboard, /directory, ...
  │
  ├── Server Components (data via Prisma)
  ├── Client Components (React Query + nuqs + Zustand)
  │
  ├── /api/employees       GET (paginated/search/filter)  PATCH/:id
  ├── /api/departments     GET
  ├── /api/onboard         POST
  └── /api/webhooks/clerk  POST  (svix-verified)
                                │
                                ▼
                          Prisma Client  ──►  PostgreSQL
```

- **Auth flow**: Clerk hosts the user. On sign-up, Clerk posts a `user.created` webhook (verified via `svix`) which writes a `User` and (optionally) an `EmployeeProfile` to Postgres.
- **State strategy**: Server state in React Query; URL state in `nuqs`; ephemeral client state in Zustand.
- **Form strategy**: `react-hook-form` + `zod` resolvers; schemas live in `src/shared/schemas/`.

---

## Project Structure

```
Nexus_Enterprise_CRM/
├── prisma/
│   ├── schema.prisma          # User, EmployeeProfile, Department, Salary, AuditLog
│   └── seed.ts                # 515 employees, 12 departments
├── public/                    # static assets
├── src/
│   ├── app/
│   │   ├── (dashboard)/       # route group — auth required
│   │   │   ├── dashboard/
│   │   │   ├── directory/
│   │   │   │   └── [id]/      # employee detail
│   │   │   ├── my-profile/
│   │   │   ├── onboarding/
│   │   │   ├── org-chart/
│   │   │   └── settings/
│   │   ├── 403/               # forbidden page
│   │   ├── api/
│   │   │   ├── departments/
│   │   │   ├── employees/[id]/
│   │   │   ├── onboard/
│   │   │   └── webhooks/clerk/
│   │   ├── sign-in/[[...sign-in]]/
│   │   └── sign-up/[[...sign-up]]/
│   ├── components/
│   │   ├── directory/         # EmployeeDataGrid, FilterBar, etc.
│   │   ├── layout/            # Sidebar, TopBar, Shell
│   │   ├── onboarding/
│   │   └── ui/                # primitives (Button, Input, Badge, Card)
│   ├── hooks/                 # useEmployees, useDepartments
│   ├── lib/                   # prisma client, clerk helpers, utils
│   ├── shared/
│   │   ├── schemas/           # zod schemas
│   │   └── types/             # shared TypeScript types
│   ├── stores/                # zustand stores
│   └── __tests__/             # api/ components/ hooks/ schemas/ stores/
├── e2e/                       # Playwright specs
├── docs/screenshots/          # README images
├── implementation_plan.md
├── playwright.config.ts
├── vitest.config.ts
├── prisma.config.ts
├── eslint.config.mjs
├── next.config.ts
├── tailwind (via PostCSS)
├── tsconfig.json
└── package.json
```

---

## Getting Started

### Prerequisites
- Node.js 20+
- npm 10+
- PostgreSQL 14+ running locally or reachable via `DATABASE_URL`
- A Clerk application (free tier is fine) with publishable + secret keys and a webhook signing secret

### Install

```bash
git clone <your-repo-url>
cd Nexus_Enterprise_CRM
npm install
```

### Configure environment

```bash
cp .env.example .env
```

Fill in the values (see [Environment Variables](#environment-variables)).

### Set up the database

```bash
npm run db:generate     # generate Prisma client
npm run db:push         # apply schema to PostgreSQL
npm run db:seed         # seed 515 employees + 12 departments
```

### Run the dev server

```bash
npm run dev
```

Open <http://localhost:3000> and sign in.

### Configure the Clerk webhook (local dev)

Use the Clerk CLI or dashboard to forward `user.created`, `user.updated`, and `user.deleted` events to:

```
POST http://localhost:3000/api/webhooks/clerk
```

Set `CLERK_WEBHOOK_SECRET` in `.env` to the value Clerk provides.

---

## Environment Variables

All variables are defined in `.env.example`. Copy it to `.env` and fill in:

| Variable | Required | Description |
|---|---|---|
| `DATABASE_URL` | yes | PostgreSQL connection string |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | yes | Clerk publishable key |
| `CLERK_SECRET_KEY` | yes | Clerk secret key |
| `NEXT_PUBLIC_CLERK_SIGN_IN_URL` | yes | `/sign-in` |
| `NEXT_PUBLIC_CLERK_SIGN_UP_URL` | yes | `/sign-up` |
| `NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL` | yes | `/dashboard` |
| `NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL` | yes | `/dashboard` |
| `CLERK_WEBHOOK_SECRET` | yes | `whsec_…` from Clerk dashboard |
| `NEXT_PUBLIC_APP_URL` | yes | `http://localhost:3000` for dev |
| `NEXT_PUBLIC_CLERK_SIGN_IN_FALLBACK_REDIRECT_URL` | no | `/` |
| `NEXT_PUBLIC_CLERK_SIGN_UP_FALLBACK_REDIRECT_URL` | no | `/` |
| `ADMIN_USER` | no | Bootstrap admin email |
| `ADMIN_PASSWORD` | no | Bootstrap admin password |

---

## Database & Prisma

Schema (`prisma/schema.prisma`) — 5 models:

- **User** — Clerk-synced; one-to-one with `EmployeeProfile`; role enum
- **EmployeeProfile** — first/last name, job title, department FK, manager self-relation, status enum, hire date, contact, tax info (JSON)
- **Department** — name + reverse relation to employees
- **Salary** — amount, effective date, notes; cascade-deleted with employee
- **AuditLog** — user action records (cascade-deleted with user)

Enums:
- `UserRole`: `SUPER_ADMIN`, `HR_MANAGER`, `DEPT_HEAD`, `EMPLOYEE`
- `EmpStatus`: `ONBOARDING`, `ACTIVE`, `ON_LEAVE`, `TERMINATED`

Useful commands:

```bash
npm run db:studio     # GUI
npm run db:push       # sync schema (no migrations in this project)
npm run db:seed       # idempotent reseed
```

---

## Authentication & Authorization

- **Clerk** manages sessions, sign-in, and sign-up.
- **`clerkMiddleware`** protects the `(dashboard)` route group; unauthenticated users are redirected to `/sign-in`.
- **Webhook sync** (`/api/webhooks/clerk`) verifies the `svix` signature, then upserts the `User` row. This guarantees the DB user exists before any authenticated request.
- **RBAC** is enforced server-side by inspecting `sessionClaims`/`user.role` and gating Server Components and API routes.
- A `/403` page is shown when a user lacks the required role.

---

## Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start Next.js dev server with HMR |
| `npm run build` | Production build |
| `npm start` | Run the production build |
| `npm run lint` | ESLint (Next.js config) |
| `npm run type-check` | `tsc --noEmit` |
| `npm test` | Vitest — unit/component/api (one-shot) |
| `npm run test:watch` | Vitest in watch mode |
| `npm run test:e2e` | Playwright E2E suite |
| `npm run db:generate` | `prisma generate` |
| `npm run db:push` | Push schema to database |
| `npm run db:seed` | Seed sample data (515 employees) |
| `npm run db:studio` | Open Prisma Studio |

---

## Testing

The project implements a complete test pyramid:

| Layer | Tool | What it covers |
|---|---|---|
| Unit (hooks/utils) | Vitest | `useEmployees`, `useDepartments`, stores, schemas |
| Component | Vitest + Testing Library | `EmployeeDataGrid`, `FilterBar`, UI primitives |
| API integration | Vitest | `/api/employees`, `/api/departments`, search/filter/sort |
| E2E | Playwright | Sign-in, directory sort/filter/paginate/select, 0 console errors |
| Screenshots | Playwright + `scripts/capture-screenshots.mjs` | Real PNG/JPG captures of each route for the README |

Run the full pyramid locally:

```bash
npm test                  # lower 3 layers
npm run test:e2e          # E2E (requires dev server + Clerk test user)
node scripts/capture-screenshots.mjs   # capture README screenshots
```

---

## API Reference

All API routes live under `src/app/api/`.

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/employees` | Paginated directory list. Query: `page`, `limit`, `search`, `departmentId`, `status`, `sortBy`, `sortDir` |
| `GET` | `/api/employees/[id]` | Single employee profile |
| `PATCH` | `/api/employees/[id]` | Update employee (role-gated) |
| `GET` | `/api/departments` | List departments with `employeeCount` |
| `POST` | `/api/onboard` | Submit onboarding wizard data |
| `POST` | `/api/webhooks/clerk` | Clerk user lifecycle webhook (svix-verified) |

See `src/shared/schemas/` for the Zod request/response shapes.

---

## Deployment

Recommended: **Vercel**.

1. Push the repository to GitHub.
2. Import the project in Vercel.
3. Add all environment variables from `.env.example` to the Vercel project settings.
4. Provision a managed PostgreSQL (Neon, Supabase, RDS) and set `DATABASE_URL`.
5. Configure the Clerk webhook in production to POST to `https://<your-domain>/api/webhooks/clerk`.
6. Build command: `npm run build` · Output: default Next.js.
7. After first deploy, run `npm run db:push` and `npm run db:seed` against the production database (or seed via a one-off script).

---

## Roadmap

- [ ] Salary management UI (read-only today, write coming)
- [ ] Department CRUD for `HR_MANAGER`
- [ ] Email notifications on onboarding completion
- [ ] CSV export from the directory
- [ ] Mobile-optimized directory
- [ ] Real-time org chart drag-to-reassign (manager change)

---

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feat/your-feature`
3. Run `npm test` and `npm run lint` before pushing
4. Open a Pull Request describing the change and test coverage

Please follow the existing TypeScript strict, ESLint, and Tailwind conventions.

---

## Troubleshooting

**`Prisma Client did not initialize`**
Run `npm run db:generate` after `npm install`.

**`Clerk: Missing publishable key`**
Verify `.env` has both `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` and `CLERK_SECRET_KEY` and that the dev server was restarted.

**Webhook returns 401**
`CLERK_WEBHOOK_SECRET` is wrong, or the request body was read before signature verification (must read raw body).

**`/directory` shows 0 employees**
Run `npm run db:seed`.

**Tests fail with `TextEncoder is not defined`**
This is a known jsdom gap; Vitest config already polyfills it. If you customize `vitest.config.ts`, preserve the `setupFiles` entry.

---

## License

Private / unlicensed by default. Replace with your project's license (e.g. MIT) before public distribution.
