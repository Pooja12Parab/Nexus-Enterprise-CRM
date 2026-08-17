# Nexus Enterprise CRM

> A modern, full-stack **Enterprise Customer Relationship Management (CRM)** platform built on Next.js 16, designed to manage employees, departments, organizational hierarchy, and onboarding workflows for mid-to-large organizations.

<p align="left">
  <img alt="Next.js" src="https://img.shields.io/badge/Next.js-16.2.9-000000?logo=nextdotjs" />
  <img alt="React" src="https://img.shields.io/badge/React-19-61DAFB?logo=react" />
  <img alt="TypeScript" src="https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript" />
  <img alt="Prisma" src="https://img.shields.io/badge/Prisma-7.8-2D3748?logo=prisma" />
  <img alt="PostgreSQL" src="https://img.shields.io/badge/PostgreSQL-Database-336791?logo=postgresql" />
  <img alt="Clerk" src="https://img.shields.io/badge/Clerk-Auth-6C47FF?logo=clerk" />
  <img alt="Tailwind" src="https://img.shields.io/badge/TailwindCSS-4-38B2AC?logo=tailwindcss" />
  <img alt="Tests" src="https://img.shields.io/badge/Tests-Vitest%20%2B%20Playwright-6DB33F" />
</p>

---

## Summary

Nexus Enterprise CRM is a role-based employee and organization management platform. It provides a virtualized employee directory for 500+ employees, a visual org chart, a multi-step onboarding wizard, employee profile management, and Clerk-powered authentication with webhooks for user sync.

**Core capabilities**

- Employee directory with sorting, filtering, search, pagination, and row selection
- Employee profile pages with compensation history
- Interactive org chart (manager → subordinates)
- Multi-step onboarding wizard
- Department management
- Role-based access control (`SUPER_ADMIN`, `HR_MANAGER`, `DEPT_HEAD`, `EMPLOYEE`)
- Clerk authentication with webhook-driven user sync to PostgreSQL
- 48+ unit/component/api tests + Playwright E2E coverage

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

### Employee Profile
[![Employee Profile](https://cdn.jsdelivr.net/gh/Pooja12Parab/Nexus-Enterprise-CRM@main/docs/screenshots/profile.jpg)](https://cdn.jsdelivr.net/gh/Pooja12Parab/Nexus-Enterprise-CRM@main/docs/screenshots/profile.jpg)

### Org Chart
[![Org Chart](https://cdn.jsdelivr.net/gh/Pooja12Parab/Nexus-Enterprise-CRM@main/docs/screenshots/org-chart.jpg)](https://cdn.jsdelivr.net/gh/Pooja12Parab/Nexus-Enterprise-CRM@main/docs/screenshots/org-chart.jpg)

### Onboarding Wizard
[![Onboarding Wizard](https://cdn.jsdelivr.net/gh/Pooja12Parab/Nexus-Enterprise-CRM@main/docs/screenshots/onboarding.jpg)](https://cdn.jsdelivr.net/gh/Pooja12Parab/Nexus-Enterprise-CRM@main/docs/screenshots/onboarding.jpg)

### 403 Forbidden
[![403 Forbidden](https://cdn.jsdelivr.net/gh/Pooja12Parab/Nexus-Enterprise-CRM@main/docs/screenshots/forbidden.jpg)](https://cdn.jsdelivr.net/gh/Pooja12Parab/Nexus-Enterprise-CRM@main/docs/screenshots/forbidden.jpg)

> For the full project documentation, see [README.detailed.md](README.detailed.md).

---

## Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Configure environment
cp .env.example .env
# Fill in DATABASE_URL, Clerk keys, CLERK_WEBHOOK_SECRET

# 3. Set up the database
npm run db:generate
npm run db:push
npm run db:seed          # seeds 515 employees + 12 departments

# 4. Start dev server
npm run dev              # http://localhost:3000
```

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
| `npm run db:seed` | Seed sample data |
| `npm run db:studio` | Open Prisma Studio |

---

## Architecture (TL;DR)

- **App Router** under `src/app/` with a `(dashboard)` route group for authenticated pages
- **Prisma + PostgreSQL** for persistence (`User`, `EmployeeProfile`, `Department`, `Salary`, `AuditLog`)
- **Clerk** for authentication; **`svix`-verified webhook** at `/api/webhooks/clerk` syncs users to the DB
- **React Query + nuqs** for data fetching and URL-driven filter/sort/pagination state
- **TanStack Table + TanStack Virtual** for the 500+ row directory grid
- **Zod** for schema validation, **react-hook-form** for forms
- **Zustand** for client state (e.g. row selection)
- **Tailwind CSS v4** for styling

---

## Documentation

- **[README.detailed.md](README.detailed.md)** — full project documentation: features, tech stack, architecture, project structure, environment variables, Prisma schema, RBAC, scripts, testing, API reference, deployment, troubleshooting, and contributing.

---

## Testing

- **Vitest** — unit (hooks, utils), component, and API integration tests
- **Playwright** — end-to-end directory flow (sign-in, sort, filter, paginate, select)
- `npm test` for the lower pyramid, `npm run test:e2e` for E2E

---

## License

Private / unlicensed (update as appropriate for your distribution).
