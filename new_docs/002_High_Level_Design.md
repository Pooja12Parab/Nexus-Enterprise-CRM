# High-Level Design (HLD)

## Nexus Enterprise CRM

---

| **Document ID** | NEXUS-HLD-001 |
|---|---|
| **Version** | 2.0 |
| **Date** | 2026-06-28 |
| **Author** | Nexus Engineering Team |
| **Status** | Draft |

---

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [System Architecture Diagram](#2-system-architecture-diagram)
3. [Technology Stack](#3-technology-stack)
4. [Core Subsystems & Workflows](#4-core-subsystems--workflows)
5. [Data Flow Architecture](#5-data-flow-architecture)
6. [Authentication & Authorization Flow](#6-authentication--authorization-flow)
7. [Component Architecture](#7-component-architecture)
8. [State Management Strategy](#8-state-management-strategy)
9. [Route Design](#9-route-design)
10. [Deployment Architecture](#10-deployment-architecture)

---

## 1. Architecture Overview

Nexus Enterprise CRM follows a **decoupled BFF (Backend For Frontend) architecture** using Next.js App Router:

- **Frontend**: React 19 with Server Components + Client Components for interactive features
- **BFF Layer**: Next.js API Route Handlers providing purpose-built endpoints for the React client
- **Database**: PostgreSQL accessed via Prisma ORM v7 with type-safe queries (`@prisma/adapter-pg` for connection pooling)
- **Authentication**: Clerk — fully externalized auth provider (SAML/SSO/MFA)
- **State Management**: URL-driven state (nuqs with `<NuqsAdapter>`), server cache (TanStack Query v5), and transient UI state (Zustand v5)

```
┌─────────────────────────────────────────────────────────┐
│                      CLIENT BROWSER                      │
│  ┌─────────┐  ┌───────────┐  ┌──────────────────────┐   │
│  │ React 19 │  │ TanStack  │  │ URL State (nuqs)     │   │
│  │ RSC + CC │  │ Virtual   │  │ ?dept=Eng&status=..  │   │
│  └────┬─────┘  └───────────┘  └──────────────────────┘   │
└───────┼───────────────────────────────────────────────────┘
        │  HTTPS
        ▼
┌───────────────────────────────────────────────────────────┐
│                    NEXT.JS APP ROUTER                      │
│  ┌───────────────┐  ┌────────────────────────────────┐    │
│  │  Middleware    │  │  API Route Handlers (BFF)      │    │
│  │  (RBAC Gate)  │  │  GET/POST /api/employees       │    │
│  │  clerkMiddleware  │  GET /api/departments          │    │
│  │  createRouteMatcher│ POST /api/onboard             │    │
│  └───────────────┘  └───────────┬────────────────────┘    │
│       │                         │                          │
│       ▼                         ▼                          │
│  ┌──────────────────────────────────────────────────┐     │
│  │              Prisma ORM (Type-Safe)               │     │
│  │    adapter: PrismaPg (database URL connection)    │     │
│  └──────────────────────┬───────────────────────────┘     │
└─────────────────────────┼─────────────────────────────────┘
                          │
                          ▼
               ┌─────────────────────┐
               │   PostgreSQL DB     │
               └─────────────────────┘
```

---

## 2. System Architecture Diagram

```
┌────────────────────────────────────────────────────────────────────┐
│                         EXTERNAL SERVICES                          │
│  ┌──────────┐   ┌──────────┐   ┌─────────────────────────────┐    │
│  │  Clerk   │   │  Vercel  │   │  SMTP / Notification Service │    │
│  │  (Auth)  │   │ (Hosting)│   │  (Future)                    │    │
│  └────┬─────┘   └────┬─────┘   └──────────────┬──────────────┘    │
└───────┼──────────────┼────────────────────────┼────────────────────┘
        │              │                        │
        ▼              ▼                        ▼
┌───────────────────────────────────────────────────────────────────┐
│                       NEXUS CRM APPLICATION                        │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │                     PRESENTATION LAYER                       │   │
│  │  ┌──────────┐  ┌───────────┐  ┌──────────┐  ┌───────────┐  │   │
│  │  │ Dashboard │  │ Directory │  │ Onboard  │  │ Org Chart │  │   │
│  │  └──────────┘  └─────┬─────┘  └────┬─────┘  └───────────┘  │   │
│  │         ┌────────────┼─────────────┼────────────┐            │   │
│  │         ▼            ▼             ▼            ▼            │   │
│  │  ┌──────────────────────────────────────────────────────┐   │   │
│  │  │   SHARED UI: DataGrid | FilterBar | Wizard | Sidebar│   │   │
│  │  │   AppHeader | Avatar | StatusBadge | ErrorBoundary  │   │   │
│  │  │   Card | EmptyState | LoadingSpinner | Pagination    │   │   │
│  │  └──────────────────────┬───────────────────────────────┘   │   │
│  └─────────────────────────┼───────────────────────────────────┘   │
│  ┌─────────────────────────┼───────────────────────────────────┐   │
│  │                   STATE MANAGEMENT                           │   │
│  │  ┌──────────┐  ┌───────────┐  ┌──────────┐                  │   │
│  │  │  nuqs    │  │  Zustand  │  │  React   │                  │   │
│  │  │ (+Adapter)│  │ (Drafts,  │  │  Query   │                  │   │
│  │  │          │  │  Selection,│  │          │                  │   │
│  │  │          │  │  Sidebar)  │  │          │                  │   │
│  │  └──────────┘  └───────────┘  └──────────┘                  │   │
│  └─────────────────────────────────────────────────────────────┘   │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │                     BFF (API) LAYER                          │   │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐       │   │
│  │  │ /api/employees│  │ /api/depts   │  │ /api/onboard │       │   │
│  │  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘       │   │
│  │         └─────────────────┼─────────────────┘                │   │
│  │                           ▼                                  │   │
│  │  ┌──────────────────────────────────────────────────────┐   │   │
│  │  │         Zod Validation (shared/)                      │   │   │
│  │  └──────────────────────────────────────────────────────┘   │   │
│  └─────────────────────────┬───────────────────────────────────┘   │
│  ┌─────────────────────────┼───────────────────────────────────┐   │
│  │                   DATA ACCESS LAYER                          │   │
│  │  ┌──────────────────────────────────────────────────────┐   │   │
│  │  │  Prisma Client v7 │ PrismaPg Adapter │ Schema        │   │   │
│  │  │  Migrations │ Seed (prisma/seed.ts) │ prisma.config.ts│   │   │
│  │  └──────────────────────┬───────────────────────────────┘   │   │
│  └─────────────────────────┼───────────────────────────────────┘   │
└────────────────────────────┼───────────────────────────────────────┘
                             │
                             ▼
                   ┌─────────────────────┐
                   │   PostgreSQL DB     │
                   │  (RDS / Supabase)   │
                   └─────────────────────┘
```

---

## 3. Technology Stack

| Layer | Technology | Version | Purpose |
|---|---|---|---|
| **Framework** | Next.js (App Router) | 16.2.9 | SSR, API routes, middleware, file-based routing |
| **UI Library** | React | 19.2.7 | Component model with concurrent features |
| **Icons** | lucide-react | 1.21.0 | Consistent icon set for all UI components |
| **Styling** | Tailwind CSS | v4 | CSS-first configuration (`@import "tailwindcss"`, `@theme` directive); replaces MUI entirely |
| **Table** | TanStack Table | v8.21.3 | Headless table: sorting, filtering, pagination |
| **Virtualization** | TanStack Virtual | v3.13.6 | DOM windowing for 50K+ rows |
| **Forms** | React Hook Form + @hookform/resolvers | 7.80.0 / 5.4.0 | Performant forms; dual-purpose validation |
| **URL State** | nuqs | 2.8.9 | Type-safe URL search param management |
| **Server Cache** | TanStack Query | v5.82.0 | API caching, refetch, optimistic updates |
| **Transient State** | Zustand | v5.0.14 | Draft persistence, UI toggle state, row selection |
| **Auth** | Clerk (@clerk/nextjs) | 7.5.9 | SAML/SSO, MFA, user management |
| **ORM** | Prisma + @prisma/adapter-pg | 7.8.0 | Type-safe queries, schema migrations, connection pooling |
| **Database** | PostgreSQL | 17 | Relational data store |
| **Fonts** | Geist (via next/font/google) | — | System UI font (Geist Sans + Geist Mono) |

---

## 4. Core Subsystems & Workflows

### 4.1 Subsystem Map

```
┌───────────────────────────────────────────────────────────┐
│                     NEXUS CRM                              │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌───────────┐ │
│  │ Auth     │  │ Directory│  │ Onboard  │  │ Reporting  │ │
│  │ Subsystem│  │ Subsystem│  │ Subsystem│  │ (Future)   │ │
│  │ • Clerk  │  │ • TanStk │  │ • RHF    │  │            │ │
│  │ • Middle │  │ • nuqs   │  │ • Zod    │  │            │ │
│  │   ware   │  │ • Query  │  │ • Zustnd │  │            │ │
│  │ • RBAC   │  │ • Dept   │  │          │  │            │ │
│  │          │  │   Hook   │  │          │  │            │ │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └─────┬──────┘ │
│       └─────────────┼─────────────┼───────────────┘        │
│                     │             │                         │
│                     ▼             ▼                         │
│               ┌────────────────────────┐                    │
│               │   Shared schemas + lib │                    │
│               │   (Zod, Types, Utils)  │                    │
│               └───────────┬────────────┘                    │
│                           ▼                                 │
│                   ┌──────────────┐                          │
│                   │   Prisma DB  │                          │
│                   └──────────────┘                          │
└───────────────────────────────────────────────────────────┘
```

### 4.2 Key Workflow: Employee Directory (List → Filter → Share)

```
HR Manager navigates to /directory
        │
        ▼
React Query fetches GET /api/employees?page=1&limit=50
        │
        ▼
TanStack Table renders virtualized rows
        │
        ▼
HR Manager selects Department filter: "Engineering"
        │
        ▼
nuqs updates URL: /directory?dept=Engineering
        │
        ▼
React Query detects query key change → automatic refetch
        │
        ▼
GET /api/employees?dept=Engineering&page=1&limit=50
        │
        ▼
HR Manager copies URL → shares with colleague
→ Colleague sees exact same filtered view
```

### 4.3 Key Workflow: Multi-Step Onboarding

```
HR Manager clicks "Onboard New Employee"
        │
        ▼
Step 1: Personal Info (Zod validates inline, FormProvider context)
        │
        ▼
[Save Draft] → Zustand persists to localStorage
        │
        ▼
Step 2: Role & Compensation (Zod validates inline)
        │
        ▼
Step 3: Tax & Compensation
        │
        ▼
Step 4: Review & Sign
        │
        ▼
[Submit] → POST /api/onboard
        │
        ▼
API: Zod validates request body (same schema!)
        │
        ├── Pass → Prisma creates EmployeeProfile + Salary + AuditLog → 201
        │          → invalidateQueries(["employees"]) → redirect to /directory
        └── Fail → Returns 400 with validation errors
        │
        ▼
Server error displayed in red banner if submission fails
```

---

## 5. Data Flow Architecture

### 5.1 Read Path (Employee Directory)

```
┌──────────┐    1. User navigates     ┌───────────────┐
│  Browser │ ─────────────────────────→│ Next.js Router │
└────┬─────┘                           └───────┬───────┘
     │                                         │
     │ 2. Client mounts with NuqsAdapter        │ 3. Shell pre-renders
     ▼                                         ▼
┌───────────┐                          ┌───────────────┐
│ TanStack  │ 4. useQuery fires       │  Page Shell   │
│ Query     │────────────────────────→│  (RSC)        │
└─────┬─────┘                          └───────────────┘
      │
      │ 5. GET /api/employees?dept=X&page=1
      ▼
┌───────────────┐    6. await auth()   ┌───────────────┐
│ API Route     │─────────────────────→│ Clerk Session │
│ Handler       │←─────────────────────│               │
└───────┬───────┘    7. sessionClaims  └───────────────┘
        │ 8. Build Prisma where clause (dynamic)
        ▼
┌───────────────┐    9. $transaction   ┌───────────────┐
│ Prisma Client │  (findMany + count)  │ PostgreSQL    │
│ (PrismaPg)    │─────────────────────→│               │
│               │←─────────────────────│               │
└───────┬───────┘   10. Results        └───────────────┘
        │ 11. JSON response + pagination meta
        ▼
┌───────────────┐
│ React Query   │ 12. Cache (staleTime 30s, gcTime 5min)
│ Cache         │
└───────────────┘
```

### 5.2 Write Path (Onboarding)

```
┌──────────┐   1. Fill form             ┌───────────────┐
│ RHF Form  │───────────────────────────→│ Zod Schema    │
│ + Zod     │←─── 2. Inline validation──│ (Client-side) │
└────┬─────┘                            └───────────────┘
     │ 3. FormProvider + FormContext
     │    for multi-step wizard
     │ 4. onSubmit → POST /api/onboard
     ▼
┌───────────────┐  5. await auth() +   ┌───────────────┐
│ API Route     │     RBAC check       │ Clerk         │
│ Handler       │─────────────────────→│               │
│ (try/catch)   │                      └───────────────┘
└───────┬───────┘
        │ 6. Zod safeParse(body) — SAME schema!
        ├── Fail ──→ 400 { error: { code, message, details } }
        ▼ Pass
┌───────────────┐  7. $transaction     ┌───────────────┐
│ Prisma Client ├─ (create Employee +  ─→│ PostgreSQL    │
│ (PrismaPg)    │    Salary + AuditLog) │               │
└───────┬───────┘                      └───────────────┘
        │ 8. Return 201 + new employee
        ▼
┌───────────────┐
│ React Query   │ 9. invalidateQueries(["employees"])
│ (invalidate)  │    → router.push("/directory")
└───────────────┘
```

---

## 6. Authentication & Authorization Flow

```
1. Request Initiation → User accesses protected route (/directory)
2. clerkMiddleware (async) → createRouteMatcher checks public routes
   → If not public && !userId → redirectToSignIn
            │
3. RBAC Gate → getRoutePrefix matches pathname to PROTECTED_ROUTES:
     /directory  → HR_MANAGER, SUPER_ADMIN
     /onboarding → HR_MANAGER, SUPER_ADMIN
     /org-chart  → HR_MANAGER, SUPER_ADMIN
     /my-profile → All authenticated
     /settings   → SUPER_ADMIN only
     → Authorized: continue  |  Unauthorized: redirect /403
            │
4. API Handler → await auth() re-validates userId + sessionClaims.role
     → unauthorizedResponse() if no userId
     → forbiddenResponse() if role not allowed
     → DEPT_HEAD scope restriction applied at query level
```

---

## 7. Component Architecture

### Component Tree

> **Note**: `<ClerkProvider>` wraps the root layout. `<Providers>` (QueryClientProvider + NuqsAdapter) wraps the dashboard layout. See `app/layout.tsx` (root) and `app/(dashboard)/layout.tsx` (authenticated shell).

```
<App>
├── app/layout.tsx (Root):
│   <ClerkProvider>
│       <html> <body> {children}
│
├── app/(dashboard)/layout.tsx (Auth Shell):
│   <ClerkProvider>  ← ClerkProvider secondary only for appearance config
│   <Providers>
│       <QueryClientProvider>
│       <NuqsAdapter>
│           <div flex h-screen>
│               <Sidebar>
│                   ├── Logo + Collapse button
│                   ├── <NavItem to="/dashboard">
│                   ├── <NavItem to="/directory">
│                   ├── <NavItem to="/onboarding">
│                   ├── <NavItem to="/org-chart">
│                   ├── <NavItem to="/my-profile">
│                   └── <NavItem to="/settings">
│               <div flex-1>
│                   <AppHeader>
│                       ├── Search input (global)
│                       ├── Notification bell
│                       └── <UserButton> (Clerk)
│                   <main>
│                       <ErrorBoundary>
│                           {page content}
│
│   └── [Dashboard Page] → Card-based stats, recent onboarding, dept distribution
│
│   └── [Directory Page]
│       ├── <h1> + employee count + Onboard button
│       ├── <FilterBar>
│       │   ├── <SearchInput> (with icon + clear button)
│       │   ├── <select> Department (dynamic from useDepartments)
│       │   ├── <select> Status
│       │   └── Clear filters button
│       ├── <FilterChip> × N (active filters)
│       ├── <LoadingSpinner> (when loading)
│       ├── <ErrorCard> (on error with retry)
│       ├── <EmptyState> (no results with clear filters action)
│       └── <EmployeeDataGrid>
│           ├── <table> with sticky headers
│           ├── <thead> sortable columns with lucide sort icons
│           ├── <tbody> virtualized rows (TanStack Virtual)
│           │   └── Row: checkbox | Avatar | Name+ID | Title | Dept | Status | Email | Location | Hire Date
│           └── <PaginationFooter> (page controls + selection count)
│
│   └── [Onboarding Page]
│       ├── <FormProvider> (RHF context)
│       ├── <SaveDraftButton>
│       ├── Error banner (on server error)
│       ├── <Wizard totalSteps={4}>
│       │   ├── <WizardStepper>
│       │   ├── <WizardContent>
│       │   │   ├── <PersonalInfoStep>   (step 0)
│       │   │   ├── <RoleDetailsStep>    (step 1)
│       │   │   ├── <TaxCompStep>        (step 2)
│       │   │   └── <ReviewSignStep>     (step 3)
│       │   └── <StepNavigation onFinalSubmit={submit} />
│
│   └── [Profile Page]
│       └── (placeholder)
```

### Component Responsibility Matrix

| Component | Responsibility | State Source | Key Props |
|---|---|---|---|
| `Providers` | Wraps QueryClientProvider + NuqsAdapter | — | `children` |
| `Sidebar` | Navigation menu with collapse/expand | Zustand (sidebar store) | — |
| `AppHeader` | Global search, notifications, user menu | Clerk UserButton | — |
| `FilterBar` | Dept/status dropdowns + search + filter chips | nuqs URL + useDepartments | — |
| `FilterChip` | Active filter with dismiss button | nuqs URL | `label`, `value`, `onRemove` |
| `EmployeeDataGrid` | TanStack Table + Virtual + sort/paginate | React Query + nuqs | `data[]`, `isLoading` |
| `StatusBadge` | Colored pill for employee status | — | `status`, `className` |
| `Avatar` | Initials circle avatar | — | `firstName`, `lastName`, `size` |
| `PaginationFooter` | Page controls + selection count | nuqs + Zustand (selection) | `page`, `totalPages`, `totalCount`, `onPageChange` |
| `Wizard` | Compound component with step context | Zustand (draft) | `totalSteps`, `initialStep`, `onStepChange` |
| `WizardStepper` | Step indicator + current step highlight | Wizard context | — |
| `SaveDraftButton` | Persists form to localStorage | Zustand (draft store) | — |
| `ErrorBoundary` | Catches render errors, shows fallback | React ErrorBoundary | `fallback` |
| `ErrorCard` | Error display with retry button | — | `title`, `message`, `onRetry` |
| `EmptyState` | Empty/no-results display | — | `icon`, `title`, `description`, `action` |
| `Card`, `CardHeader`, `CardContent` | Reusable card layout components | — | `className`, `children` |
| `LoadingSpinner` | Animated loading indicator | — | `size`, `label` |
| `SearchInput` | Debounced search input | — | `value`, `onChange`, `placeholder`, `debounceMs` |

---

## 8. State Management Strategy

### Provider Architecture

```
app/layout.tsx (root):
  <ClerkProvider>
    {children}

app/(dashboard)/layout.tsx (authenticated shell):
  <ClerkProvider>         ← Secondary instance for Clerk UI appearance config
    <Providers>           ← src/lib/providers.tsx
      <QueryClientProvider>   ← TanStack Query (staleTime 30s, gcTime 5min)
        <NuqsAdapter>         ← nuqs URL state adapter
          {children}
```

### State Categories

```
┌──────────────────────────────────────────────────────────────┐
│                     STATE ARCHITECTURE                        │
│                                                               │
│  SERVER STATE (TanStack Query v5)                             │
│  • Employee list (paginated, filtered, sorted)                │
│  • Department list (staleTime: 5min)                         │
│  • Employee detail                                            │
│  staleTime: 30s, gcTime: 5min                                │
│  placeholderData: keepPreviousData for smooth pagination     │
│                                                               │
│  URL STATE (nuqs v2 + NuqsAdapter)                            │
│  • ?dept=Engineering  • ?status=Active  • ?page=3            │
│  • ?search=Marcus  • ?sortBy=lastName  • ?sortDir=asc        │
│  → Bidirectional sync: URL ⟷ Component State                 │
│  → Shareable, bookmarkable, survives refresh                 │
│  → parseAsStringEnum for sortBy, parseAsInteger for page     │
│                                                               │
│  TRANSIENT UI STATE (Zustand v5)                              │
│  • Sidebar open/closed (in-memory)                           │
│  • Form drafts (localStorage via persist middleware)         │
│  • Selected row IDs (in-memory Set)                          │
│  • Notification toasts (future)                              │
│                                                               │
│  RULE: If it needs URL sharing → nuqs                         │
│        If it needs to survive tab close → Zustand+persist    │
│        If it comes from server → TanStack Query               │
│        If it's ephemeral UI state → Zustand (in-memory)       │
└──────────────────────────────────────────────────────────────┘
```

### State Flow

```
URL params (nuqs) → React Query key → API call → DB
       ↑                                        │
       │                                        ▼
       │                              React Query Cache
       │                              (keepPreviousData)
       │                                        │
       └────────── Component renders ←─────────┘
                         │
                         ▼
                    Zustand Store
              (drafts, sidebar, selection)
```

---

## 9. Route Design

| Route | Page | Auth | Roles | App Router Files |
|---|---|---|---|---|
| `/` | Landing | No | All | `page.tsx` |
| `/sign-in` | Clerk Sign-In | No | Unauthenticated | `page.tsx` |
| `/sign-up` | Clerk Sign-Up | No | Unauthenticated | `page.tsx` |
| `/dashboard` | Dashboard Overview | Yes | All authenticated | `page.tsx` |
| `/directory` | Employee Directory Grid | Yes | HR_MANAGER, SUPER_ADMIN | `page.tsx` |
| `/directory/[id]` | Employee Detail | Yes | HR_MANAGER, SUPER_ADMIN | `page.tsx` (placeholder) |
| `/onboarding` | New Employee Wizard | Yes | HR_MANAGER, SUPER_ADMIN | `page.tsx` |
| `/org-chart` | Organization Chart | Yes | HR_MANAGER, SUPER_ADMIN | `page.tsx` (placeholder) |
| `/my-profile` | Self-Service Profile | Yes | All authenticated | `page.tsx` (placeholder) |
| `/settings` | Admin Settings | Yes | SUPER_ADMIN | `page.tsx` (placeholder) |
| `/403` | Forbidden | No | All | `page.tsx` |
| `/api/employees` | Employee API (BFF) | Yes | HR_MANAGER, SUPER_ADMIN, DEPT_HEAD | `route.ts` |
| `/api/departments` | Department API (BFF) | Yes | All authenticated | `route.ts` |
| `/api/onboard` | Onboarding API (BFF) | Yes | HR_MANAGER, SUPER_ADMIN | `route.ts` |

---

## 10. Deployment Architecture

```
┌────────────────────────────────────────────────────────────┐
│                      DEPLOYMENT                             │
│                                                             │
│  ┌──────────┐         ┌──────────────────────────────┐     │
│  │  GitHub  │  push   │        VERCEL                 │     │
│  │  Repo    │────────→│  Build: npm ci → prisma gen  │     │
│  └──────────┘         │       → next build            │     │
│                       │                               │     │
│                       │  Edge Middleware (CDN)        │     │
│                       │  Serverless: API + SSR + ISR  │     │
│                       └──────────────┬───────────────┘     │
│                                      │                      │
│                                      ▼                      │
│                           ┌────────────────────┐           │
│                           │  PostgreSQL (RDS)  │           │
│                           │  / Supabase        │           │
│                           └────────────────────┘           │
│                                                             │
│  Environments: Dev (localhost) → Preview (PR) →             │
│                Staging → Production (crm.nexus.internal)    │
│                                                             │
│  Config: prisma.config.ts for Prisma CLI env loading       │
└────────────────────────────────────────────────────────────┘
```

---

*End of Document*