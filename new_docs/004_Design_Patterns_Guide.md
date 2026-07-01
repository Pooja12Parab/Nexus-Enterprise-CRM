# Design Patterns Guide

## Nexus Enterprise CRM

---

| **Document ID** | NEXUS-DP-001 |
|---|---|
| **Version** | 2.0 |
| **Date** | 2026-06-28 |
| **Author** | Nexus Engineering Team |
| **Status** | Draft |

---

## Table of Contents

1. [Overview](#1-overview)
2. [Architectural Patterns](#2-architectural-patterns)
3. [State Management Patterns](#3-state-management-patterns)
4. [Component Patterns](#4-component-patterns)
5. [Data Access Patterns](#5-data-access-patterns)
6. [Validation Patterns](#6-validation-patterns)
7. [Auth & Security Patterns](#7-auth--security-patterns)
8. [UI & Styling Patterns (Tailwind CSS)](#8-ui--styling-patterns-tailwind-css)
9. [Error Handling Patterns](#9-error-handling-patterns)
10. [Testing Patterns](#10-testing-patterns)
11. [Pattern Decision Matrix](#11-pattern-decision-matrix)

---

## 1. Overview

This document catalogs all design patterns for Nexus Enterprise CRM. Each entry: Problem → Solution → Implementation → Trade-offs.

---

## 2. Architectural Patterns

### 2.1 BFF (Backend For Frontend)

Purpose-built API endpoints in Next.js Route Handlers returning data shaped for the React client. Prevents over-fetching and the "chatty client" anti-pattern.
- **Where**: `app/api/employees/`, `app/api/departments/`, `app/api/onboard/`

### 2.2 Layered Architecture

Presentation → State → BFF/API → Data Access → Database. Each layer communicates only with adjacent layers.
- **Where**: React Components → nuqs/Zustand/Query → API Routes → Prisma → PostgreSQL

### 2.3 Monorepo with Shared Package

Single Next.js repo. `shared/` directory with Zod schemas + TypeScript types imported by both `app/` (API) and `components/` (client). Single source of truth.

### 2.4 Provider Wrapper Pattern

A dedicated `Providers` component (`lib/providers.tsx`) wraps `QueryClientProvider` + `NuqsAdapter` to provide TanStack Query and nuqs URL state to the dashboard layout. This keeps the root layout clean and separates concerns.

```
app/layout.tsx (root):
  <ClerkProvider>
    {children}

app/(dashboard)/layout.tsx (auth shell):
  <ClerkProvider>
    <Providers>              ← lib/providers.tsx
      <QueryClientProvider>
        <NuqsAdapter>
          {children}
```

---

## 3. State Management Patterns

### 3.1 URL-as-State (nuqs)

All filter/pagination/sort state encoded in URL search params. URL = single source of truth. Bookmarkable, shareable.
- **Where**: `hooks/use-directory-filters.ts` — `useQueryState` for `dept`, `status`, `search`, `page`, `sortBy`, `sortDir`
- Uses `parseAsStringEnum` for constrained values (sortBy, sortDir) and `parseAsInteger` for page
- Requires `<NuqsAdapter>` from `nuqs/adapters/next/app` in the provider tree

### 3.2 Optimistic UI (React Query)

`useMutation` with `onMutate` updates cache immediately, confirms or rolls back on server response.
- **Where**: Onboarding flow — new employee appears in list after `invalidateQueries(["employees"])`

### 3.3 Draft Persistence (Zustand + localStorage)

Zustand store with `persist` middleware auto-saves form state to localStorage. Survives tab close.
- **Where**: `stores/onboarding-draft.ts` — `create()(persist(...))` with `partialize`

### 3.4 Row Selection State (Zustand, in-memory)

Zustand store using a `Set<string>` for selected row IDs. No persistence needed — selection is ephemeral.
- **Where**: `stores/selection.ts` — `toggleId`, `selectAll`, `clearSelection`, `isSelected`

### 3.5 Sidebar UI State (Zustand, in-memory)

Zustand store for sidebar collapse/expand state. Lost on page refresh (intentional).
- **Where**: `stores/sidebar.ts` — `isOpen`, `isCollapsed`, `toggle`, `collapse`, `expand`

### 3.6 State Category Segregation

| State | Tool | Persistence | Shareable |
|---|---|---|---|
| Server Data | TanStack Query | In-memory (staleTime 30s, gcTime 5min) | No |
| URL Filters | nuqs | Browser URL (survives refresh) | Yes — copy/paste URL |
| Form Drafts | Zustand + localStorage | localStorage (survives tab close) | No |
| Row Selection | Zustand (in-memory Set) | Lost on page refresh | No |
| Sidebar Toggle | Zustand (in-memory) | Lost on page refresh | No |

---

## 4. Component Patterns

### 4.1 Headless Component (TanStack)

TanStack Table/Virtual provides sorting/filtering/pagination logic as headless hooks. 100% rendering control via Tailwind CSS. No MUI dependency.
- **Where**: `EmployeeDataGrid.tsx` — `useReactTable` + `useVirtualizer`

### 4.2 Container/Presentational

Container (data fetching, state, logic) + Presentational (pure UI, props-in, JSX-out). Separates concerns, enables testing.
- **Where**: `useDirectoryFilters` + `useEmployees` + `useDepartments` (containers) → `FilterBar` + `EmployeeDataGrid` (presentational)

### 4.3 Compound Component (Wizard)

Parent `<Wizard>` uses React Context to share `currentStep`/`goNext`/`goBack` with `<WizardContent>` and `<WizardStepper>`. No prop drilling.
- **Where**: `components/onboarding/Wizard.tsx`

### 4.4 Render Props (TanStack Columns)

Column `cell` render functions receive row data, return JSX. Enables per-cell custom rendering (avatar, badges, formatted dates).
- **Where**: `columns` array in `EmployeeDataGrid`

### 4.5 Error Boundary Pattern

Class-based React Error Boundary wraps feature sections. Component crash → fallback UI without unmounting entire app.
- **Where**: `<ErrorBoundary fallback={<ErrorCard />}>` in dashboard layout

### 4.6 Skeleton Loading Pattern

Loading states use `animate-pulse` skeleton placeholders matching the final layout dimensions, avoiding layout shift.
- **Where**: `EmployeeDataGrid` — 8 skeleton rows during initial load

---

## 5. Data Access Patterns

### 5.1 Transaction (Prisma $transaction)

All-or-nothing atomicity for multi-write operations (employee + salary + audit log).
- **Where**: `POST /api/onboard`

### 5.2 Pagination + Count (Parallel)

Single `$transaction` with `findMany` + `count` — atomic read with consistent total.
- **Where**: `GET /api/employees`

### 5.3 Dynamic Query Builder

Build `whereClause` object dynamically based on present URL params. Single Prisma query handles all filter combinations.
- **Where**: `GET /api/employees` route handler

### 5.4 PrismaPg Adapter

Uses `@prisma/adapter-pg` for connection pooling with Prisma v7. Singleton pattern prevents multiple instances in development.
- **Where**: `lib/prisma.ts` — `new PrismaClient({ adapter: new PrismaPg(DATABASE_URL) })`

### 5.5 Sequential Employee ID Generation

Employee IDs (EMP-001, EMP-002...) are generated by querying the last record's ID and incrementing, wrapped inside the transaction.
- **Where**: `POST /api/onboard` — `findFirst({ orderBy: { employeeId: "desc" } })`

---

## 6. Validation Patterns

### 6.1 Schema Parity (Zod)

Single Zod schema in `shared/` imported by both React Hook Form (client) and API route (server). Zero drift between client and server validation.
- **Where**: `shared/schemas/onboarding.ts` → `zodResolver()` in RHF + `safeParse()` in API

### 6.2 Coercion + Validation

Zod coerces URL string params to correct types then validates: `z.coerce.number().int().min(1)`.
- **Where**: `shared/schemas/employee.ts` — `employeeQuerySchema` (page, limit)

### 6.3 Partial Update Schema

Separate schema for PATCH operations where all fields are optional but still validated when present.
- **Where**: `shared/schemas/employee.ts` — `employeeUpdateSchema`

---

## 7. Auth & Security Patterns

### 7.1 Externalized Auth (Clerk v7)

All auth externalized to Clerk (SAML/SSO/MFA). App only checks `(await auth()).userId` and `sessionClaims.role`.
- **Where**: `middleware.ts`, every API route handler

### 7.2 Middleware RBAC Gate (clerkMiddleware)

Next.js middleware uses `clerkMiddleware` (Clerk v7 API) with `createRouteMatcher` for public routes and a `PROTECTED_ROUTES` map for role-based access.
- **Where**: `middleware.ts` — `clerkMiddleware(async (auth, req) => { ... })`

### 7.3 Defense-in-Depth Validation

Client validates for UX (instant feedback). Server always re-validates with same Zod schema before DB. Protects against curl/Postman bypass.
- **Where**: Every API route

### 7.4 Helper Response Functions

Standardized `unauthorizedResponse()` (401) and `forbiddenResponse()` (403) helpers ensure consistent error format across all API routes.
- **Where**: `lib/api-utils.ts`

---

## 8. UI & Styling Patterns (Tailwind CSS)

### 8.1 Utility-First CSS (Tailwind v4) — PRIMARY STYLING SYSTEM

**MUI is entirely removed.** All components use Tailwind CSS utility classes. No `sx` prop, no `styled()`, no `ThemeProvider`. Tailwind v4 uses a **CSS-first configuration** model — no `tailwind.config.js` needed.

| Rule | Description |
|---|---|
| **Utility-First** | All styles via Tailwind classes in `className` |
| **Design Tokens** | Defined via `@theme` directive in `app/globals.css` |
| **Responsive** | Tailwind breakpoints (`sm:`, `md:`, `lg:`, `xl:`) |
| **Dark Mode** | `dark:` variant for color utilities |
| **cn() Helper** | `clsx` + `tailwind-merge` for conditional classes |
| **Config** | `@import "tailwindcss"` — no `tailwind.config.js` |
| **PostCSS** | `postcss.config.mjs` with `@tailwindcss/postcss` plugin |
| **Dynamic inline styles** | Allowed only for runtime-driven values (e.g., `transform: translateY()` in virtualization). Static styles always use classes. |
| **Icons** | All icons from `lucide-react` — no SVG inline or icon font |

### 8.2 Design Tokens (`app/globals.css` using `@theme`)

```css
/* app/globals.css */
@import "tailwindcss";

@theme {
  /* Nexus brand colors */
  --color-nexus-50: #eff6ff;
  --color-nexus-100: #dbeafe;
  --color-nexus-200: #bfdbfe;
  --color-nexus-300: #93c5fd;
  --color-nexus-400: #60a5fa;
  --color-nexus-500: #3b82f6;
  --color-nexus-600: #2563eb;
  --color-nexus-700: #1d4ed8;
  --color-nexus-800: #1e40af;
  --color-nexus-900: #1e3a5f;

  /* Status colors */
  --color-status-active: #16a34a;
  --color-status-onboarding: #ca8a04;
  --color-status-leave: #dc2626;
  --color-status-inactive: #6b7280;

  /* Custom spacing */
  --spacing-table-row: 48px;
  --spacing-sidebar: 240px;

  /* Custom shadows */
  --shadow-card: 0 1px 3px 0 rgb(0 0 0 / 0.08);

  /* Fonts */
  --font-sans: var(--font-geist-sans, system-ui, -apple-system, sans-serif);
  --font-mono: var(--font-geist-mono, ui-monospace, monospace);
}
```

### 8.3 Component Classes (`@layer components`)

Reusable component classes are defined in `globals.css` using `@layer components`:

```css
@layer components {
  .btn-primary {
    @apply px-4 py-2 rounded-md font-medium bg-nexus-500 text-white
      hover:bg-nexus-600 disabled:opacity-50 transition-colors;
  }

  .btn-secondary {
    @apply px-4 py-2 rounded-md font-medium border border-gray-300 text-gray-700
      bg-white hover:bg-gray-50 disabled:opacity-50 transition-colors;
  }

  .input-field {
    @apply w-full px-3 py-2 rounded-md border border-gray-300
      focus:outline-none focus:ring-2 focus:ring-nexus-500 text-sm
      bg-white text-gray-900 placeholder-gray-400;
  }

  .table-header {
    @apply h-table-row px-4 border-b border-gray-200 bg-gray-50
      text-xs font-semibold text-gray-700 uppercase tracking-wider;
  }
}
```

> **Note**: While Tailwind v4 documentation suggests avoiding `@layer components`, the project uses it for `.btn-primary`, `.btn-secondary`, `.input-field`, and `.table-header` as a pragmatic approach for frequently reused composite classes. This is an intentional trade-off for developer convenience.

### 8.4 cn() Utility

```typescript
// lib/utils.ts
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
export function cn(...inputs: ClassValue[]) { return twMerge(clsx(inputs)); }
```

### 8.5 Component Examples with Tailwind

**StatusBadge (color-coded ring badge):**
```tsx
const statusStyles: Record<EmpStatus, string> = {
  ACTIVE: "bg-green-50 text-green-700 ring-green-600/20",
  ONBOARDING: "bg-yellow-50 text-yellow-700 ring-yellow-600/20",
  LEAVE: "bg-red-50 text-red-700 ring-red-600/20",
  INACTIVE: "bg-gray-50 text-gray-600 ring-gray-500/20",
};

export function StatusBadge({ status }: { status: EmpStatus }) {
  return (
    <span className={cn("inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset", statusStyles[status])}>
      {statusLabels[status] || status}
    </span>
  );
}
```

**Avatar (initials circle):**
```tsx
export function Avatar({ firstName, lastName, size = "md" }: AvatarProps) {
  return (
    <div className={cn("rounded-full bg-nexus-100 flex items-center justify-center font-medium text-nexus-700 shrink-0", sizeClasses[size])}>
      {getInitials(firstName, lastName)}
    </div>
  );
}
```

**FilterChip (removable pill):**
```tsx
export function FilterChip({ label, value, onRemove }: FilterChipProps) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-gray-200 bg-gray-50 px-3 py-1 text-sm text-gray-700">
      <span className="text-gray-500">{label}:</span>
      <span className="font-medium">{value}</span>
      <button onClick={onRemove} className="ml-0.5 rounded-full p-0.5 text-gray-400 hover:bg-gray-200 hover:text-gray-600">
        <X className="h-3 w-3" />
      </button>
    </span>
  );
}
```

### 8.6 Tailwind v4 Setup Checklist

| Step | Action |
|---|---|
| 1 | `npm install -D tailwindcss @tailwindcss/postcss postcss` |
| 2 | Create `postcss.config.mjs` with `@tailwindcss/postcss` plugin |
| 3 | Replace `app/globals.css` with `@import "tailwindcss"` + `@theme` tokens |
| 4 | Add `cn()` helper to `lib/utils.ts` (`clsx` + `tailwind-merge`) |
| 5 | **Remove** `tailwind.config.ts`, previous PostCSS config, all `@tailwind` directives |
| 6 | **Remove** all MUI imports, `ThemeProvider`, `sx`, `styled()` |
| 7 | Run `npx @tailwindcss/upgrade` to auto-migrate class names |

---

## 9. Error Handling Patterns

### 9.1 Standardized Error Response

All API errors use `{ error: { code, message, details? } }`. Shared `handleApiError()` maps exception types to responses: `ZodError`→400, `UNAUTHORIZED`→403, fallback→500.
- **Where**: `lib/api-utils.ts` — `handleApiError(error)`, `unauthorizedResponse()`, `forbiddenResponse()`

### 9.2 Error Boundary

React Error Boundaries wrap feature sections. Component crash → fallback UI without unmounting entire app.
- **Where**: `<ErrorBoundary fallback={<ErrorCard />}>` in dashboard layout

### 9.3 Server Error Banner

Onboarding page displays server errors in a red banner above the wizard form, allowing users to retry without losing form state.
- **Where**: `app/(dashboard)/onboarding/page.tsx` — `serverError` state + red banner

---

## 10. Testing Patterns

### 10.1 Test Pyramid

```
          ╱╲
         ╱ E2E ╲           Playwright — critical flows only
        ╱────────╲
       ╱          ╲
      ╱ Integration╲         Vitest + vi.mock — API routes, mocked DB
     ╱──────────────╲
    ╱                ╲
   ╱   Unit Tests     ╲       Vitest — Zod schemas, utils, stores
  ╱────────────────────╲
```

### 10.2 Mock at the Boundary (vi.mock, not MSW)

Mock at integration boundaries using `vi.mock()`: `vi.mock('@clerk/nextjs/server')` for auth, `vi.mock('@/lib/prisma')` for DB. Test handler logic, not infra. The project does **not** use MSW — `vi.mock()` provides sufficient isolation with less complexity.
- **Where**: `__tests__/api/employees.test.ts`

```typescript
// Example using vi.mock (not MSW)
vi.mock("@clerk/nextjs/server", () => ({
  auth: () => Promise.resolve({
    userId: "user_hr1",
    sessionClaims: { role: "HR_MANAGER" },
  }),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    employeeProfile: { findMany: vi.fn().mockResolvedValue([]), count: vi.fn().mockResolvedValue(0) },
    $transaction: vi.fn().mockResolvedValue([[], 0]),
  },
}));
```

### 10.3 Schema Unit Tests

Zod schemas are tested exhaustively: valid data, boundary values, invalid types, optional fields, and missing required fields.
- **Where**: `__tests__/schemas/onboarding.test.ts`, `__tests__/schemas/employee.test.ts`

### 10.4 E2E Placeholder

E2E tests are minimal (single placeholder test) due to Clerk authentication requirements. Full E2E requires Clerk test mode configuration.
- **Where**: `e2e/onboarding.spec.ts`

---

## 11. Pattern Decision Matrix

| Pattern | Layer | Complexity | Risk If Omitted |
|---|---|---|---|
| **BFF** | Architecture | Medium | Over-fetching, inconsistent APIs |
| **Layered Architecture** | Architecture | Low | Tight coupling, untestable code |
| **Provider Wrapper** | Architecture | Low | Provider nesting in root layout |
| **URL-as-State** | State | Low | No shareable state, lost filters |
| **Schema Parity** | Validation | Low | Client/server validation drift |
| **Headless Components** | UI | Medium | Styling lock-in, conflicts |
| **Tailwind Utility-First** | UI/Styling | Low | Inconsistent styling, CSS bloat |
| **Transaction** | Data | Medium | Partial writes, data corruption |
| **Externalized Auth** | Security | Medium | Auth vulnerabilities |
| **Defense-in-Depth** | Security | Low | Malicious request bypass |
| **Middleware RBAC** | Security | Low | Inconsistent permissions |
| **Draft Persistence** | State | Low | Lost form progress |
| **Row Selection State** | State | Low | No bulk action support |
| **Test Pyramid** | Testing | Low | Flaky E2E-only, slow CI |
| **Mock at Boundary** | Testing | Low | Flaky integration tests |
| **Error Boundary** | Error | Low | Full page crash from one component |
| **Compound Component** | UI | Medium | Prop drilling, messy wizard code |
| **Container/Presentational** | UI | Low | Hard to test/reuse components |
| **Skeleton Loading** | UX | Low | Layout shift during loading |
| **PrismaPg Adapter** | Data | Low | Connection pool exhaustion |

---

*End of Document*