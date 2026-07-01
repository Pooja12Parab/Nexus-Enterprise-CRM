# Technical Learning Guide: Nexus Enterprise CRM

## From MERN to Next.js Enterprise — A Hands-On Code Walkthrough

---

| **Document ID** | NEXUS-LEARN-001 |
|---|---|
| **Version** | 1.0 |
| **Date** | 2026-06-28 |
| **Author** | Nexus Engineering Team |
| **Target Audience** | Developers with MERN stack experience |

---

## How to Use This Guide

This guide is for developers who know the MERN stack (MongoDB, Express, React, Node.js) but are new to the technologies used in Nexus Enterprise CRM.

**Each section follows this pattern:**

| Step | What You'll Learn |
|---|---|
| ❓ **The MERN Way** | How you'd do this in a MERN app |
| 🔍 **Why Change?** | What problem the Nexus approach solves |
| 🛠️ **How It Works** | Core concepts with diagrams |
| 📁 **Where to Find It** | File paths in the project |
| 💻 **Code Walkthrough** | Line-by-line explanation of actual code |
| 🧪 **Try It Yourself** | Small exercise to reinforce learning |
| ⚠️ **Common Mistakes** | Pitfalls to avoid |

---

## Table of Contents

1. [Before You Start — Project Overview](#1-before-you-start--project-overview)
2. [The Request Journey — From Browser to Database](#2-the-request-journey--from-browser-to-database)
3. [Next.js App Router — File-Based Routing](#3-nextjs-app-router--file-based-routing)
4. [Clerk Authentication — Auth Without Passwords](#4-clerk-authentication--auth-without-passwords)
5. [Prisma ORM — Type-Safe Database Access](#5-prisma-orm--type-safe-database-access)
6. [API Routes (BFF Pattern) — The Backend For Frontend](#6-api-routes-bff-pattern--the-backend-for-frontend)
7. [Zod Validation — Runtime Type Safety](#7-zod-validation--runtime-type-safety)
8. [TanStack Query — Server State Management](#8-tanstack-query--server-state-management)
9. [nuqs — URL-Driven State](#9-nuqs--url-driven-state)
10. [Zustand — Lightweight Client State](#10-zustand--lightweight-client-state)
11. [TanStack Table & Virtual — High-Performance Data Grid](#11-tanstack-table--virtual--high-performance-data-grid)
12. [React Hook Form + Multi-Step Wizard](#12-react-hook-form--multi-step-wizard)
13. [Tailwind CSS v4 — Utility-First Styling](#13-tailwind-css-v4--utility-first-styling)
14. [Testing — From Unit to E2E](#14-testing--from-unit-to-e2e)

---

## 1. Before You Start — Project Overview

### ❓ The MERN Way

In a typical MERN project, you have two separate applications:

```
my-mern-app/
├── client/              ← React app (Create React App or Vite)
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   └── App.js
│   └── package.json
├── server/              ← Express API
│   ├── routes/
│   ├── models/          ← Mongoose schemas
│   ├── middleware/       ← Auth middleware
│   └── package.json
└── package.json         ← Root (usually just scripts)
```

**Problems with this setup:**
- CORS configuration needed between client and server
- Two separate deployments
- Client and server can get out of sync
- Shared types must be manually duplicated

### 🔍 Why Change?

Nexus Enterprise CRM uses **Next.js** — a React framework that combines frontend AND backend in a single project.

| MERN | Nexus (Next.js) |
|---|---|
| Express routes in a separate folder | API routes in `app/api/` |
| CORS configuration | Same origin — no CORS |
| Two deployments | One deployment to Vercel |
| Mongoose for MongoDB | Prisma for PostgreSQL |
| JWT auth (manual) | Clerk (external auth provider) |

### 🛠️ Project Structure

```
nexus-enterprise-crm/
├── prisma/                          ← Database layer (like Mongoose models)
│   ├── schema.prisma                ← Data model definition
│   └── seed.ts                      ← Initial test data
├── src/
│   ├── app/                         ← Next.js App Router (pages + API)
│   │   ├── layout.tsx               ← Root layout
│   │   ├── globals.css              ← Tailwind + design tokens
│   │   ├── page.tsx                 ← Landing page (/)
│   │   ├── (dashboard)/             ← Route group (authenticated pages)
│   │   │   ├── layout.tsx           ← Dashboard shell
│   │   │   ├── directory/           ← /directory page
│   │   │   ├── onboarding/          ← /onboarding page
│   │   │   └── ...                   ← Other pages
│   │   ├── api/                     ← API route handlers
│   │   │   ├── employees/route.ts   ← GET /api/employees
│   │   │   ├── departments/route.ts ← GET /api/departments
│   │   │   └── onboard/route.ts     ← POST /api/onboard
│   │   └── middleware.ts            ← Clerk auth middleware
│   ├── components/                  ← React components
│   ├── hooks/                       ← Custom React hooks
│   ├── lib/                         ← Library code
│   ├── stores/                      ← Zustand state stores
│   └── shared/                      ← Shared between client + server
│       ├── schemas/                 ← Zod validation schemas
│       └── types/                   ← TypeScript type definitions
├── e2e/                             ← Playwright E2E tests
└── src/__tests__/                   ← Vitest unit/integration tests
```

### 📁 Key Insight: Shared Code

The `src/shared/` folder is the most important concept. In a MERN app, you'd define validation in the frontend AND AGAIN in the backend. Here, ONE schema serves BOTH:

```typescript
// src/shared/schemas/onboarding.ts  ← SINGLE source of truth
import { z } from "zod";
export const onboardingSchema = z.object({
  firstName: z.string().min(2),
  // ... defined ONCE
});

// Used in CLIENT (React Hook Form):
import { onboardingSchema } from "@/shared/schemas/onboarding";
const methods = useForm({ resolver: zodResolver(onboardingSchema) });

// Used in SERVER (API route):
import { onboardingSchema } from "@/shared/schemas/onboarding";
const parsed = onboardingSchema.safeParse(body);
```

The `@/` path is an alias configured in `tsconfig.json` pointing to `./src/*`. This is like `baseUrl` in a MERN project.

### 🧪 Try It Yourself

1. Open the project in VS Code
2. Run `npm install` (takes 30-60 seconds)
3. Copy `.env.example` to `.env` and fill in the values
4. Run `npm run dev` to start the development server
5. Visit `http://localhost:3000`

### ⚠️ Common Mistakes

- **Don't** try to run a separate Express server — Next.js includes the API layer
- **Don't** install MUI or Bootstrap — this project uses Tailwind CSS
- **The `@/` path** works because of `tsconfig.json` paths — don't use relative imports like `../../shared/`

---

## 2. The Request Journey — From Browser to Database

### ❓ The MERN Way

In a MERN app, when a user visits a page:

```
Browser → React App (port 3000) → fetch() → Express API (port 5000) → Mongoose → MongoDB
```

Two servers, two ports, CORS headers needed.

### 🔍 Why Change?

In Next.js, everything runs on one server:

```
Browser → Next.js Server (port 3000) → API Route → Prisma → PostgreSQL
```

**No CORS.** **One deployment.** **Shared types.**

### 🛠️ The Full Journey for /directory?dept=Engineering

Let's trace what happens when an HR Manager visits the employee directory with a department filter applied.

```
Step 1: Browser requests /directory?dept=Engineering
         │
         ▼
Step 2: clerkMiddleware (middleware.ts)
         │  Checks if user is authenticated
         │  Checks if user has HR_MANAGER or SUPER_ADMIN role
         │  If not → redirect to /sign-in or /403
         │
         ▼
Step 3: Next.js renders the page shell
         │  app/(dashboard)/layout.tsx wraps the page
         │  Sidebar + AppHeader are rendered
         │
         ▼
Step 4: Directory page mounts (client-side)
         │  useDirectoryFilters() reads ?dept=Engineering from URL
         │  useEmployees() executes the query
         │
         ▼
Step 5: fetch() → GET /api/employees?dept=Engineering
         │
         ▼
Step 6: API Route Handler (app/api/employees/route.ts)
         │  await auth() → verify user is authenticated
         │  employeeQuerySchema.safeParse() → validate params
         │  Build dynamic Prisma where clause
         │
         ▼
Step 7: Prisma Client → PostgreSQL
         │  $transaction([findMany, count])
         │  Returns: { data: [...], meta: { totalCount, page, ... } }
         │
         ▼
Step 8: Response flows back through the same path
         │  TanStack Query caches the result
         │  EmployeeDataGrid renders virtualized rows
```

### 📁 Files Involved (in order)

| Step | File | Purpose |
|---|---|---|
| 2 | `src/middleware.ts` | Auth + RBAC gate |
| 3 | `src/app/(dashboard)/layout.tsx` | Dashboard shell (sidebar, header) |
| 4 | `src/hooks/use-directory-filters.ts` | Read URL params |
| 4 | `src/hooks/use-employees.ts` | Fetch employees with React Query |
| 5 | `src/app/api/employees/route.ts` | API handler |
| 6 | `src/lib/prisma.ts` | Prisma client |
| 6 | `src/shared/schemas/employee.ts` | Zod validation |
| 7 | `prisma/schema.prisma` | Database model |

### 🧪 Try It Yourself

Add a `console.log` at each layer and visit `/directory`:

1. In `middleware.ts`: `console.log("[Middleware]", req.nextUrl.pathname)`
2. In `api/employees/route.ts`: `console.log("[API] Fetching employees with:", parsed.data)`
3. In `hooks/use-employees.ts`: `console.log("[Query] Fetching:", params)`

Watch the terminal output as you reload the page.

---

## 3. Next.js App Router — File-Based Routing

### ❓ The MERN Way

In Express, you define routes explicitly:

```javascript
// Express
app.get('/directory', (req, res) => { ... });
app.get('/directory/:id', (req, res) => { ... });
app.post('/api/employees', (req, res) => { ... });
```

The file structure doesn't matter — you manually wire up every route.

### 🔍 Why Change?

In Next.js App Router, **the file path IS the route**. No route definitions needed. Just create a file in the right folder.

```
app/directory/page.tsx       →  /directory
app/directory/[id]/page.tsx  →  /directory/123 (dynamic)
app/api/employees/route.ts   →  /api/employees (API, not page)
```

### 🛠️ How Routing Works

#### Pages (return HTML)

```
src/app/
├── page.tsx              →  /  (landing page)
├── layout.tsx            →  wraps ALL pages (fonts, ClerkProvider)
├── (dashboard)/          →  route group (doesn't affect URL)
│   ├── layout.tsx        →  wraps only dashboard pages (sidebar)
│   ├── dashboard/page.tsx →  /dashboard
│   ├── directory/page.tsx →  /directory
│   ├── directory/[id]/page.tsx →  /directory/some-uuid
│   ├── onboarding/page.tsx →  /onboarding
│   ├── my-profile/page.tsx →  /my-profile
│   └── settings/page.tsx →  /settings
├── sign-in/              →  Clerk handles this
├── 403/page.tsx          →  /403 (forbidden)
└── not-found.tsx         →  Custom 404
```

#### API Routes (return JSON)

```
src/app/api/
├── employees/route.ts    →  GET/POST /api/employees
├── employees/[id]/route.ts →  GET/PUT/DELETE /api/employees/123
├── departments/route.ts  →  GET /api/departments
└── onboard/route.ts      →  POST /api/onboard
```

#### Special Files

| File | Purpose | MERN Equivalent |
|---|---|---|
| `layout.tsx` | Shared wrapper for all pages in folder | A wrapper component in React Router |
| `loading.tsx` | Shows while page is loading | N/A (you'd manually show a spinner) |
| `error.tsx` | Catches errors in the route segment | Error boundary component |
| `not-found.tsx` | Custom 404 page | N/A (default is blank) |
| `page.tsx` | The page content | A route component |
| `route.ts` | API endpoint (returns JSON, not HTML) | Express route handler |

#### Route Groups: The `(dashboard)` Folder

Folders wrapped in parentheses like `(dashboard)` are **route groups**. They organize code without affecting the URL. The page at `(dashboard)/directory/page.tsx` serves at `/directory`, not `/(dashboard)/directory`.

**Why use route groups?** They let you have different layouts for different sections:

```
(dashboard)/layout.tsx  →  Provides sidebar + header for all dashboard pages
marketing/layout.tsx    →  Different layout for landing pages
```

### 💻 Code Walkthrough: Dashboard Layout

```typescript
// src/app/(dashboard)/layout.tsx
import { ClerkProvider } from "@clerk/nextjs";
import { Providers } from "@/lib/providers";
import { Sidebar } from "@/components/layout/Sidebar";
import { AppHeader } from "@/components/layout/AppHeader";
import { ErrorBoundary } from "@/components/ui/ErrorBoundary";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ClerkProvider>
      <Providers>                {/* QueryClient + NuqsAdapter */}
        <div className="flex h-screen">
          <Sidebar />            {/* Fixed left navigation */}
          <div className="flex flex-1 flex-col">
            <AppHeader />        {/* Top bar with search + user menu */}
            <main>
              <ErrorBoundary>    {/* Catches rendering errors */}
                {children}       {/* The page content goes here */}
              </ErrorBoundary>
            </main>
          </div>
        </div>
      </Providers>
    </ClerkProvider>
  );
}
```

**Key insight:** Every page inside `(dashboard)/` automatically gets the sidebar, header, and error boundary. You don't need to import them in each page.

### 💻 Code Walkthrough: Directory Page

```typescript
// src/app/(dashboard)/directory/page.tsx
"use client";  // ← This tells Next.js this is a Client Component

import { useEmployees } from "@/hooks/use-employees";
import { useDirectoryFilters } from "@/hooks/use-directory-filters";
import { EmployeeDataGrid } from "@/components/directory/EmployeeDataGrid";
import { FilterBar } from "@/components/directory/FilterBar";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { ErrorCard } from "@/components/ui/ErrorCard";
import { EmptyState } from "@/components/ui/EmptyState";

export default function DirectoryPage() {
  const { filters } = useDirectoryFilters();           // Read URL params
  const { data, isLoading, isError, error, refetch } = useEmployees({  // Fetch data
    page: filters.page,
    dept: filters.dept,
    status: filters.status,
    search: filters.search,
    sortBy: filters.sortBy,
    sortDir: filters.sortDir,
  });

  // Each state has a dedicated UI component
  if (isLoading) return <LoadingSpinner size="lg" label="Loading employees..." />;
  if (isError) return <ErrorCard message={error?.message} onRetry={() => refetch()} />;
  if (data?.data.length === 0) return <EmptyState title="No employees found" />;

  return (
    <div>
      <FilterBar />
      <EmployeeDataGrid data={data.data} isLoading={isLoading} />
    </div>
  );
}
```

Notice the `"use client"` directive at the top. In Next.js:
- **Server Components** (default) — run on the server, cannot use hooks or browser APIs
- **Client Components** (`"use client"`) — run in the browser, can use hooks, state, effects

### 🧪 Try It Yourself

1. Create a new file `src/app/hello/page.tsx` with some simple JSX
2. Visit `/hello` — it works automatically
3. Add `"use client"` and try using `useState` inside it
4. Add a `loading.tsx` in the same folder with "Loading..." text
5. Observe the loading state when you navigate to `/hello`

### ⚠️ Common Mistakes

- **Forgetting `"use client"`** — If you use hooks like `useState`, `useEffect`, or `useQuery`, you MUST add `"use client"` at the top
- **Putting page files in wrong place** — `page.tsx` must be inside a folder with the route name
- **Confusing route groups** — `(dashboard)/directory/page.tsx` serves at `/directory`, not `/(dashboard)/directory`
- **Missing `layout.tsx`** — Without a layout, each page is independent (no shared header/sidebar)

---

## 4. Clerk Authentication — Auth Without Passwords

### ❓ The MERN Way

In a MERN app, you'd build authentication yourself:

1. Create a User model in Mongoose
2. Build `/api/auth/signup` — hash password with bcrypt, save to DB
3. Build `/api/auth/login` — compare password, sign a JWT, return it
4. Store JWT in localStorage on the frontend
5. Create auth middleware that verifies JWT on every request
6. Create a `useAuth` hook that checks localStorage for the token

**Problems:** You handle password security, token expiration, refresh tokens, email verification, password reset, and if you need SSO or MFA — you build all of that too.

### 🔍 Why Change?

Clerk is an **external auth provider**. It handles:
- Sign-in/sign-up UI (customizable)
- Password management and hashing
- Session management (tokens, cookies)
- MFA (Multi-Factor Authentication)
- SSO/SAML (Enterprise Single Sign-On)
- Social login (Google, GitHub, etc.)
- User management dashboard

Your app only needs to check: "Is this user authenticated? What role do they have?"

### 🛠️ How Clerk Works

```
1. User visits /directory
         │
         ▼
2. clerkMiddleware (runs on every request)
         │
         ├── Is this a public route? (/, /sign-in, /sign-up)
         │     → Yes: allow access
         │     → No: check if user is authenticated
         │
         ├── Is user authenticated?
         │     → No: redirect to /sign-in
         │     → Yes: check role permissions
         │
         └── Does user have the right role?
               → No: redirect to /403
               → Yes: allow access, pass userId + sessionClaims to the page
```

### 📁 Key Files

| File | Purpose |
|---|---|
| `src/middleware.ts` | Clerk middleware for route protection + RBAC |
| `src/app/layout.tsx` | Root layout wraps everything in `<ClerkProvider>` |
| `src/app/(dashboard)/layout.tsx` | Dashboard layout with secondary ClerkProvider for appearance |
| All API routes | Use `await auth()` to get current user |

### 💻 Code Walkthrough: middleware.ts

```typescript
// src/middleware.ts
import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

// Step 1: Define which routes are public (no auth required)
const isPublicRoute = createRouteMatcher([
  "/",                    // Landing page
  "/sign-in(.*)",         // Clerk sign-in (wildcard for all sub-routes)
  "/sign-up(.*)",         // Clerk sign-up
  "/api/webhooks(.*)",    // Clerk webhooks (if needed)
]);

// Step 2: Define which roles can access each route
const PROTECTED_ROUTES = {
  "/directory":   ["HR_MANAGER", "SUPER_ADMIN"],
  "/onboarding":  ["HR_MANAGER", "SUPER_ADMIN"],
  "/settings":    ["SUPER_ADMIN"],               // Only Super Admin
  "/dashboard":   ["HR_MANAGER", "SUPER_ADMIN", "DEPT_HEAD", "EMPLOYEE"],  // All roles
  "/my-profile":  ["HR_MANAGER", "SUPER_ADMIN", "DEPT_HEAD", "EMPLOYEE"],
};

// Step 3: Helper function to match route prefix (handles /directory/123)
function getRoutePrefix(pathname) {
  return Object.keys(PROTECTED_ROUTES).find((route) =>
    pathname.startsWith(route)
  );
}

// Step 4: The middleware itself
export default clerkMiddleware(async (auth, req) => {
  // 4a: Allow public routes immediately
  if (isPublicRoute(req)) {
    return NextResponse.next();
  }

  // 4b: Check authentication
  const { userId, sessionClaims, redirectToSignIn } = await auth();

  if (!userId) {
    // Not logged in → redirect to sign-in
    const signInUrl = new URL("/sign-in", req.url);
    signInUrl.searchParams.set("redirect_url", req.url);
    return redirectToSignIn({ returnBackUrl: req.url });
  }

  // 4c: Check role-based access
  const routePrefix = getRoutePrefix(req.nextUrl.pathname);
  if (routePrefix) {
    const allowedRoles = PROTECTED_ROUTES[routePrefix];
    const userRole = sessionClaims?.role;  // From Clerk session
    if (!userRole || !allowedRoles.includes(userRole)) {
      // Not authorized → 403 page
      return NextResponse.redirect(new URL("/403", req.url));
    }
  }

  // 4d: Everything checks out
  return NextResponse.next();
});

// Step 5: Configure which paths trigger the middleware
export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
```

**What's happening line by line:**
- Line 2: `clerkMiddleware` is the new Clerk v7 API. The old `authMiddleware` is deprecated.
- Line 5: `createRouteMatcher` replaces the old `publicRoutes: [...]` config
- Line 35: The middleware function is **async** — `auth()` returns a Promise
- Line 41: `redirectToSignIn` is Clerk's built-in redirect helper
- Line 52: `sessionClaims?.role` — this is a custom claim set on the Clerk user record
- Line 65: The matcher regex excludes static files (images, favicon) from middleware

### 💻 Code Walkthrough: Using Auth in API Routes

```typescript
// In any API route handler:
import { auth } from "@clerk/nextjs/server";

export async function GET(request: NextRequest) {
  // 🔴 MERN devs: this replaces JWT verification middleware
  const { userId, sessionClaims } = await auth();

  // Check 1: Is user logged in?
  if (!userId) {
    return unauthorizedResponse(); // Returns 401 JSON
  }

  // Check 2: Does user have permission?
  const role = sessionClaims?.role as string;
  if (role !== "HR_MANAGER" && role !== "SUPER_ADMIN") {
    return forbiddenResponse(); // Returns 403 JSON
  }

  // User is authenticated and authorized → process the request
  // ... your API logic here
}
```

**Key difference from MERN:** You don't parse a JWT. You don't look up the user in the database. Clerk tells you `userId` and `sessionClaims` directly.

### 🧪 Try It Yourself

1. Sign up at Clerk.dev, create an application
2. Copy the API keys to your `.env` file
3. Sign in to the app at `http://localhost:3000/sign-in`
4. Try visiting `/settings` — you should be redirected to `/403`
5. Check your Clerk Dashboard — you'll see the user session

### ⚠️ Common Mistakes

- **Not awaiting `auth()`** — In Clerk v7, `auth()` returns a Promise. You MUST use `await auth()`.
- **Using `authMiddleware`** — That's the old API. Use `clerkMiddleware` instead.
- **Not handling the redirect** — Clerk provides `redirectToSignIn()`. Use it instead of manually constructing redirect URLs.
- **Assuming Clerk is free for production** — Clerk has a free tier but enterprise features (SSO/MFA) are paid.

---

## 5. Prisma ORM — Type-Safe Database Access

### ❓ The MERN Way

In MERN with Mongoose:

```javascript
// Define a schema
const employeeSchema = new mongoose.Schema({
  firstName: String,
  lastName: String,
  department: { type: mongoose.Schema.Types.ObjectId, ref: 'Department' },
  status: { type: String, enum: ['ACTIVE', 'INACTIVE'], default: 'ACTIVE' },
});

// Create a model
const Employee = mongoose.model('Employee', employeeSchema);

// Query
const employees = await Employee.find({ status: 'ACTIVE' })
  .populate('department')
  .sort({ lastName: 1 });

// No TypeScript types — you're on your own
// employee.firstName could be anything at runtime
```

**Problems:**
- No type safety — `employee.firstName` might not exist, might be a number, etc.
- MongoDB doesn't enforce relations — you can save anything in any field
- Schema changes are manual — no migration history

### 🔍 Why Change?

Prisma is an ORM (Object-Relational Mapper) for TypeScript:

```typescript
// Prisma generates these types automatically:
const employee: EmployeeProfile & {
  department: Department;
} = await prisma.employeeProfile.findUnique({
  where: { id: "123" },
  include: { department: true },
});

// TypeScript KNOWS employee.firstName is a string
// TypeScript KNOWS employee.department.name is a string
```

**Key benefits over Mongoose:**
1. **Auto-generated TypeScript types** — your editor knows every field
2. **Strict schema** — PostgreSQL enforces data types at the database level
3. **Migrations** — schema changes are tracked and versioned
4. **Relations** — foreign keys are enforced by the database

### 🛠️ How Prisma Works

```
1. You write schema.prisma (data model)
         │
         ▼
2. prisma generate → creates @prisma/client with full TypeScript types
         │
         ▼
3. You import PrismaClient and use type-safe queries
         │
         ▼
4. prisma db push / prisma migrate deploy → syncs schema to PostgreSQL
```

### 📁 Key Files

| File | Purpose |
|---|---|
| `prisma/schema.prisma` | Data model (equivalent to Mongoose schemas) |
| `prisma/seed.ts` | Initial test data (equivalent to MongoDB seed scripts) |
| `src/lib/prisma.ts` | Prisma client singleton (connection management) |
| `prisma.config.ts` | Prisma CLI configuration (env loading) |

### 💻 Code Walkthrough: Schema

```prisma
// prisma/schema.prisma

// 🔴 MERN devs: think of this as a Mongoose schema
// but with strict types and relations

generator client {
  provider = "prisma-client-js"  // Generates TypeScript client
}

datasource db {
  provider = "postgresql"  // 🔴 Not MongoDB!
  // url = env("DATABASE_URL") is read from .env
}

model User {
  id        String    @id              // Clerk user ID (not a MongoDB ObjectId)
  email     String    @unique          // Unique constraint
  role      UserRole  @default(EMPLOYEE) // Enum with default value
  profile   EmployeeProfile?           // Optional 1:1 relation (User has one EmployeeProfile)
  auditLogs AuditLog[]                  // 1:M relation (User has many AuditLogs)
  createdAt DateTime  @default(now()) @map("created_at")
  updatedAt DateTime  @updatedAt @map("updated_at")

  @@map("users")  // Table name in PostgreSQL
}

enum UserRole {
  SUPER_ADMIN
  HR_MANAGER
  DEPT_HEAD
  EMPLOYEE
}

model EmployeeProfile {
  id               String            @id @default(uuid())  // UUID, not ObjectId
  employeeId       String            @unique               // "EMP-001"
  user             User?             @relation(fields: [userId], references: [id])  // Foreign key
  userId           String?           @unique
  firstName        String
  lastName         String
  jobTitle         String?
  location         String?
  department       Department        @relation(fields: [departmentId], references: [id])
  departmentId     String            // Foreign key column
  status           EmpStatus         @default(ONBOARDING)
  salaries         Salary[]          // 1:M relation (one employee has many salaries)
  managerId        String?           // Self-referencing relation (manager is also an employee)
  manager          EmployeeProfile?  @relation("ManagerSubordinates", fields: [managerId], references: [id])
  subordinates     EmployeeProfile[] @relation("ManagerSubordinates")
  hireDate         DateTime?
  phoneNumber      String?
  emergencyContact String?
  taxInfo          Json?             // JSON field for flexible data
  createdAt        DateTime          @default(now())
  updatedAt        DateTime          @updatedAt

  @@map("employee_profiles")
}

model Department {
  id        String            @id @default(uuid())
  name      String            @unique
  employees EmployeeProfile[]  // Inverse of EmployeeProfile.department
  createdAt DateTime          @default(now())
  updatedAt DateTime          @updatedAt

  @@map("departments")
}

model Salary {
  id            String          @id @default(uuid())
  employee      EmployeeProfile @relation(fields: [employeeId], references: [id], onDelete: Cascade)
  employeeId    String
  amount        Decimal         @db.Decimal(10, 2)  // Decimal type for money
  effectiveDate DateTime
  notes         String?
  createdAt     DateTime        @default(now())

  @@map("salaries")
}

model AuditLog {
  id        String   @id @default(uuid())
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  userId    String
  action    String               // "EMPLOYEE_CREATED", "SALARY_UPDATED"
  targetId  String?
  metadata  Json?               // Flexible JSON for extra info
  timestamp DateTime @default(now())

  @@map("audit_logs")
}

enum EmpStatus {
  ACTIVE
  INACTIVE
  ONBOARDING
  LEAVE
}
```

**Key concepts explained:**

| Prisma Concept | Mongoose Equivalent |
|---|---|
| `@id` | `_id` (auto-generated) |
| `@default(uuid())` | Not needed (MongoDB generates ObjectId) |
| `@relation(fields: [...], references: [...])` | `ref: 'ModelName'` in Mongoose |
| `@@map("table_name")` | `collection: 'table_name'` |
| `@unique` | `unique: true` |
| `EmployeeProfile[]` | Array of references |
| `onDelete: Cascade` | Not automatic in MongoDB |
| `@db.Decimal(10, 2)` | Just `Number` in Mongoose |
| `Json?` | Any valid JSON (like Mixed type in Mongoose) |

### 💻 Code Walkthrough: Prisma Client

```typescript
// src/lib/prisma.ts
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

// 🔴 MERN devs: this replaces mongoose.connect()
// Singleton pattern prevents multiple connections in dev (hot reload)
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    adapter: new PrismaPg(process.env.DATABASE_URL!), // Connection pooling
  });

// In development, Next.js hot-reloads modules.
// Without this, a new PrismaClient would be created on every reload.
if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
```

### 🧪 Try It Yourself

1. Look at `prisma/schema.prisma` and compare it to a Mongoose schema you've written
2. Run `npx prisma generate` — watch the TypeScript types being generated
3. Run `npx prisma studio` — opens a browser-based database viewer
4. Try adding a new field to the `Department` model and run `npx prisma db push`

### ⚠️ Common Mistakes

- **Forgetting to run `prisma generate`** — after changing schema, you must regenerate the client
- **Using `prisma db push` in production** — use `prisma migrate deploy` instead (safer)
- **Not using `@prisma/adapter-pg`** — Prisma v7 requires the adapter for PostgreSQL connection pooling
- **Importing from `@prisma/client` incorrectly** — always import from the generated client: `import { PrismaClient } from "@prisma/client"`
- **Not understanding `$transaction`** — for multiple operations that must all succeed or all fail (like creating employee + salary + audit log)

---

---

## 6. API Routes (BFF Pattern) — The Backend For Frontend

### ❓ The MERN Way

In Express, you create a route handler:

```javascript
// Express route
app.get('/api/employees', async (req, res) => {
  const employees = await Employee.find(req.query);
  res.json(employees);
});
```

This API could be consumed by the React frontend, a mobile app, or any client. It's a **general-purpose API**.

### 🔍 Why Change?

In Next.js, API routes live INSIDE the same project as the frontend. They're called **BFF (Backend For Frontend)** — purpose-built endpoints that return data shaped EXACTLY for this specific frontend.

**BFF vs General API:**

| General API (Express) | BFF (Next.js API Routes) |
|---|---|
| Serves multiple clients (web, mobile, third-party) | Serves ONLY this frontend |
| Returns generic data | Returns data shaped for this UI |
| Has its own deployment, auth, rate limiting | Shares deployment with frontend |
| Needs CORS configuration | Same origin — no CORS |

### 🛠️ How API Routes Work

```
File: src/app/api/employees/route.ts
Route: GET /api/employees
         │
         ▼
1. await auth() → Get user + role
2. employeeQuerySchema.safeParse() → Validate URL params
3. Build dynamic whereClause
4. prisma.$transaction() → Query database
5. Return { data, meta } → Paginated response
```

### 📁 Key Files

| File | Route | Purpose |
|---|---|---|
| `src/app/api/employees/route.ts` | `GET /api/employees` | List employees (paginated, filtered, sorted) |
| `src/app/api/employees/[id]/route.ts` | `GET /api/employees/:id` | Single employee detail |
| `src/app/api/departments/route.ts` | `GET /api/departments` | Department list for dropdown |
| `src/app/api/onboard/route.ts` | `POST /api/onboard` | Create new employee |

### 💻 Code Walkthrough: GET /api/employees

```typescript
// src/app/api/employees/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { handleApiError, unauthorizedResponse, forbiddenResponse } from "@/lib/api-utils";
import { employeeQuerySchema } from "@/shared/schemas/employee";
import { auth } from "@clerk/nextjs/server";

export async function GET(request: NextRequest) {
  try {
    // Step 1: 🔴 MERN devs: this replaces JWT middleware
    const { userId, sessionClaims } = await auth();
    if (!userId) return unauthorizedResponse();     // 401 — not logged in

    const role = sessionClaims?.role as string | undefined;
    if (role !== "HR_MANAGER" && role !== "SUPER_ADMIN" && role !== "DEPT_HEAD") {
      return forbiddenResponse();  // 403 — wrong role
    }

    // Step 2: Parse and validate URL query params
    // 🔴 MERN devs: this replaces manual req.query parsing
    const { searchParams } = new URL(request.url);
    const parsed = employeeQuerySchema.safeParse({
      page: searchParams.get("page") || "1",
      dept: searchParams.get("dept"),
      status: searchParams.get("status"),
      search: searchParams.get("search"),
      sortBy: searchParams.get("sortBy") || "lastName",
      sortDir: searchParams.get("sortDir") || "asc",
      limit: searchParams.get("limit") || "50",
    });

    if (!parsed.success) {
      return NextResponse.json(
        { error: { code: "VALIDATION_ERROR", message: "Invalid query parameters",
                   details: parsed.error.flatten().fieldErrors } },
        { status: 400 }
      );
    }

    // Step 3: Build dynamic filter
    const { page, dept, status, search, sortBy, sortDir, limit } = parsed.data;
    const skip = (page - 1) * limit;

    // 🔴 MERN devs: this replaces Mongoose's dynamic query building
    const whereClause: Record<string, unknown> = {};
    if (dept && dept !== "All") whereClause.department = { name: dept };
    if (status && status !== "All") whereClause.status = status;
    if (search) {
      whereClause.OR = [
        { firstName: { contains: search, mode: "insensitive" } },
        { lastName: { contains: search, mode: "insensitive" } },
        { employeeId: { contains: search, mode: "insensitive" } },
        { jobTitle: { contains: search, mode: "insensitive" } },
      ];
    }

    // Step 4: Execute parallel queries (data + count) in a transaction
    // 🔴 MERN devs: this is like Promise.all() but with DB transaction safety
    const [employees, totalCount] = await prisma.$transaction([
      prisma.employeeProfile.findMany({
        where: whereClause,
        include: {
          department: { select: { id: true, name: true } },
          user: { select: { email: true } },
        },
        skip,                 // Pagination offset
        take: limit,          // Page size
        orderBy: { [sortBy]: sortDir },
      }),
      prisma.employeeProfile.count({ where: whereClause }),
    ]);

    // Step 5: Return paginated response
    return NextResponse.json({
      data: employees,
      meta: {
        totalCount,
        page,
        totalPages: Math.ceil(totalCount / limit),
        limit,
      },
    });
  } catch (error) {
    return handleApiError(error);  // Caught any error → standardized response
  }
}
```

**Why `$transaction` for parallel queries?**

```typescript
// 🔴 MERN: You'd do:
const data = await Employee.find(query);
const total = await Employee.countDocuments(query);

// But between these two calls, another user might add/delete data.
// The total and data could be inconsistent.

// ✅ Nexus: $transaction runs both queries atomically
const [data, total] = await prisma.$transaction([
  prisma.employeeProfile.findMany({ ... }),
  prisma.employeeProfile.count({ ... }),
]);
// The data and total are guaranteed to be consistent.
```

### 💻 Code Walkthrough: POST /api/onboard

```typescript
// src/app/api/onboard/route.ts
export async function POST(request: Request) {
  try {
    // Auth + RBAC check (same pattern as GET)
    const { userId, sessionClaims } = await auth();
    if (!userId) return unauthorizedResponse();

    const role = sessionClaims?.role as string | undefined;
    if (role !== "HR_MANAGER" && role !== "SUPER_ADMIN") {
      return forbiddenResponse();
    }

    // Parse and validate request body with Zod
    const body = await request.json();
    const parsed = onboardingSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: { code: "VALIDATION_ERROR", message: "Validation failed",
                   details: parsed.error.flatten().fieldErrors } },
        { status: 400 }
      );
    }

    // 🔴 MERN devs: THIS is why $transaction is important
    // We need to: 1) Create Employee  2) Create Salary  3) Create AuditLog
    // If any fails, ALL must be rolled back
    const result = await prisma.$transaction(async (tx) => {
      // Generate employee ID: EMP-001, EMP-002, etc.
      const lastEmployee = await tx.employeeProfile.findFirst({
        orderBy: { employeeId: "desc" },
        select: { employeeId: true },
      });
      const lastNumber = lastEmployee
        ? parseInt(lastEmployee.employeeId.replace("EMP-", ""))
        : 0;
      const employeeId = `EMP-${String(lastNumber + 1).padStart(3, "0")}`;

      // Create the employee profile
      const profile = await tx.employeeProfile.create({
        data: {
          employeeId,
          firstName: parsed.data.firstName,
          lastName: parsed.data.lastName,
          departmentId: parsed.data.departmentId,
          jobTitle: parsed.data.jobTitle,
          status: "ONBOARDING",
          managerId: parsed.data.managerId,
          hireDate: parsed.data.startDate ?? new Date(),
          phoneNumber: parsed.data.phoneNumber,
          location: parsed.data.location,
          salaries: {
            create: {
              amount: parsed.data.salaryAmount,
              effectiveDate: new Date(),
            },
          },
        },
      });

      // Log the action
      await tx.auditLog.create({
        data: {
          userId,
          action: "EMPLOYEE_CREATED",
          targetId: profile.id,
          metadata: { employeeId, departmentId: parsed.data.departmentId },
        },
      });

      return profile;
    });

    return NextResponse.json({ data: result }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
```

### 💻 Code Walkthrough: GET /api/departments

```typescript
// src/app/api/departments/route.ts
// 🔴 MERN devs: This is the simplest API route — a straightforward read

export async function GET() {
  try {
    const departments = await prisma.department.findMany({
      include: {
        _count: { select: { employees: true } },  // Get employee count per department
      },
      orderBy: { name: "asc" },
    });

    // Shape data for the frontend dropdown
    const result = departments.map((d) => ({
      id: d.id,
      name: d.name,
      employeeCount: d._count.employees,   // Show count in dropdown: "Engineering (42)"
    }));

    return NextResponse.json(result);
  } catch (error) {
    return handleApiError(error);
  }
}
```

### 🧪 Try It Yourself

1. Open `src/app/api/employees/route.ts` and follow the full flow
2. Try making a request with invalid params: `curl "http://localhost:3000/api/employees?page=0"` — see the 400 response
3. Try making a request without auth: the middleware will redirect you
4. Open `src/app/api/departments/route.ts` — notice how simple it is compared to the employees route

### ⚠️ Common Mistakes

- **Not wrapping in try/catch** — always use `try/catch` with `handleApiError()` for consistent error responses
- **Forgetting `await auth()`** — it's async in Clerk v7
- **Not checking role** — always check `sessionClaims?.role` even if middleware already checked (defense-in-depth)
- **Assuming `request.json()` succeeds** — it can throw if body is malformed

---

## 7. Zod Validation — Runtime Type Safety

### ❓ The MERN Way

In a MERN app, TypeScript types exist only at compile time:

```typescript
// TypeScript interface — disappears at runtime!
interface EmployeeData {
  firstName: string;
  age: number;
}

// What happens when an API sends this?
fetch("/api/employees").then((data) => {
  // TypeScript thinks data.firstName is a string...
  // But what if the API sends { firstName: null }?
  // TypeScript won't catch it!
});
```

For validation, you'd typically:
- Use Joi or express-validator on the backend
- Use Formik/Yup on the frontend
- Write validation logic TWICE — once for each side

### 🔍 Why Change?

**Zod** is a TypeScript-first schema validation library. You define a schema ONCE, and it generates TypeScript types automatically:

```typescript
import { z } from "zod";

// Define the schema ONCE
export const onboardingSchema = z.object({
  firstName: z.string().min(2, "Too short!"),
  age: z.number().min(18, "Must be 18+"),
});

// TypeScript type is INFERRED from the schema
// No need to write a separate interface!
type OnboardingData = z.infer<typeof onboardingSchema>;
// type OnboardingData = { firstName: string; age: number }
```

### 🛠️ How Zod Works

```
Schema definition (shared/schemas/)
         │
         ├── Client side: zodResolver() in React Hook Form
         │     → Validates form input as user types
         │     → Shows inline error messages
         │
         └── Server side: safeParse() in API route
               → Validates incoming request body/params
               → Returns 400 with error details
```

### 📁 Key Files

| File | Schema | Used By |
|---|---|---|
| `src/shared/schemas/onboarding.ts` | `onboardingSchema` | Form + POST /api/onboard |
| `src/shared/schemas/employee.ts` | `employeeQuerySchema` | GET /api/employees params |
| `src/shared/schemas/employee.ts` | `employeeUpdateSchema` | PATCH /api/employees/:id body |

### 💻 Code Walkthrough: Onboarding Schema

```typescript
// src/shared/schemas/onboarding.ts
import { z } from "zod";

export const onboardingSchema = z.object({
  // String with minimum and maximum length
  firstName: z.string().min(2, "First name must be at least 2 characters").max(50),
  lastName: z.string().min(2, "Last name must be at least 2 characters").max(50),

  // UUID format validation
  departmentId: z.string().uuid("Invalid department ID"),

  // String with minimum length
  jobTitle: z.string().min(3, "Job title must be at least 3 characters"),

  // Number with min/max range
  salaryAmount: z.number()
    .min(40000, "Minimum salary is $40,000")
    .max(500000, "Maximum salary is $500,000"),

  // Optional fields (user may or may not provide them)
  managerId: z.string().uuid().optional(),
  startDate: z.date().optional(),
  email: z.string().email("Invalid email address").optional(),
  phoneNumber: z.string().min(10).max(15).optional(),
  location: z.string().min(2).optional(),
});

// 🔴 MERN devs: This type is INFERRED from the schema
// You don't need to write a separate TypeScript interface!
export type OnboardingData = z.infer<typeof onboardingSchema>;
// Equivalent to:
// interface OnboardingData {
//   firstName: string;
//   lastName: string;
//   departmentId: string;
//   jobTitle: string;
//   salaryAmount: number;
//   managerId?: string;
//   startDate?: Date;
//   email?: string;
//   phoneNumber?: string;
//   location?: string;
// }
```

### 💻 Code Walkthrough: Employee Query Schema

```typescript
// src/shared/schemas/employee.ts
import { z } from "zod";

export const employeeQuerySchema = z.object({
  // 🔴 Coerce: URL params are always strings, but we want numbers
  // "1" → 1, "abc" → error
  page: z.coerce.number().int().min(1).default(1),

  // Optional string params (might not be in URL)
  dept: z.string().optional(),
  status: z.string().optional(),      // Not an enum — validated at handler level

  // Search must be at least 1 character if provided
  search: z.string().min(1).optional(),

  // Enum restricts to specific values
  sortBy: z.enum(["firstName", "lastName", "jobTitle", "status", "createdAt", "employeeId"])
    .default("lastName"),
  sortDir: z.enum(["asc", "desc"]).default("asc"),

  // Number with min/max bounds
  limit: z.coerce.number().int().min(1).max(100).default(50),
});

export type EmployeeQuery = z.infer<typeof employeeQuerySchema>;

// Separate schema for PATCH updates (all fields optional)
export const employeeUpdateSchema = z.object({
  jobTitle: z.string().min(3).optional(),
  status: z.enum(["ACTIVE", "INACTIVE", "ONBOARDING", "LEAVE"]).optional(),
  departmentId: z.string().uuid().optional(),
  location: z.string().optional(),
  phoneNumber: z.string().optional(),
});

export type EmployeeUpdate = z.infer<typeof employeeUpdateSchema>;
```

**Key Zod concepts explained:**

| Zod Method | What It Does | MERN Equivalent |
|---|---|---|
| `z.string().min(2)` | String with minimum length | `{ type: String, minlength: 2 }` |
| `z.number().min(0)` | Number with minimum value | `{ type: Number, min: 0 }` |
| `z.coerce.number()` | Convert string to number (for URL params) | `parseInt(req.query.page)` |
| `z.string().uuid()` | UUID format validation | Regex validation |
| `z.string().email()` | Email format validation | Regex or validator lib |
| `z.enum(["A", "B"])` | Must be one of the listed values | `{ enum: ['A', 'B'] }` |
| `.optional()` | Field may be missing | Not required |
| `.default(x)` | Default value if missing | `default: x` |
| `z.date()` | Must be a valid Date object | `{ type: Date }` |
| `z.infer<typeof schema>` | Get TypeScript type FROM schema | N/A (manual interface) |

### 💻 How Schema Is Used (Client and Server)

**Client side (React Hook Form):**

```typescript
// Form validation as user types
const methods = useForm<OnboardingData>({
  resolver: zodResolver(onboardingSchema),  // Zod validates on every change
  mode: "onChange",                          // Validate as user types
});

// In the form:
<input {...register("firstName")} />
{errors.firstName && <span>{errors.firstName.message}</span>}
// Error shows immediately when user types less than 2 characters
```

**Server side (API route):**

```typescript
// 🔴 MERN devs: This replaces manual validation in Express
const parsed = onboardingSchema.safeParse(body);

if (!parsed.success) {
  // Return 400 with field-level errors
  return NextResponse.json({
    error: {
      code: "VALIDATION_ERROR",
      details: parsed.error.flatten().fieldErrors
      // { firstName: ["First name must be at least 2 characters"] }
    }
  }, { status: 400 });
}

// TypeScript now KNOWS parsed.data has the correct types
const { firstName, lastName, salaryAmount } = parsed.data;
```

### 🧪 Try It Yourself

1. Open `src/shared/schemas/onboarding.ts` and add a new field: `notes: z.string().max(500).optional()`
2. Run `npm run type-check` — the TypeScript type is automatically updated
3. Try submitting the onboarding form with invalid data — see the error messages
4. Try sending a POST to `/api/onboard` with invalid JSON via curl/Postman — see the 400 response

### ⚠️ Common Mistakes

- **Not using `z.coerce` for URL params** — URL params are always strings. `z.coerce.number()` automatically converts "5" → 5
- **Forgetting `.optional()`** — If a field might not be present, it MUST be `.optional()`
- **Using `parse()` instead of `safeParse()`** — `parse()` throws on error, `safeParse()` returns `{ success, data, error }` — always prefer `safeParse()` in API routes
- **Not sharing schemas** — The whole point of `shared/` is to use the same schema on client AND server. Don't duplicate!

---

## 8. TanStack Query — Server State Management

### ❓ The MERN Way

In a typical MERN app, you fetch data in a React component like this:

```javascript
function EmployeeList() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetch('/api/employees')
      .then(res => res.json())
      .then(data => {
        setData(data);
        setLoading(false);
      })
      .catch(err => {
        setError(err);
        setLoading(false);
      });
  }, []);  // Runs once when component mounts

  if (loading) return <Spinner />;
  if (error) return <Error />;
  return <Table data={data} />;
}
```

**Problems:**
- **No caching** — Every time the component mounts, it fetches again (even if data hasn't changed)
- **No background refetch** — If another user adds data, this component won't know
- **No retry** — If the network fails, the error just shows
- **No pagination state** — You'd need additional useState for page, filters, etc.
- **No loading state for pagination** — Page change shows a loading spinner (bad UX)

### 🔍 Why Change?

TanStack Query (formerly React Query) provides:

| Feature | What It Does |
|---|---|
| **Automatic caching** | Data stays in memory, no refetch on mount |
| **Background refetch** | Silently checks for new data when window is refocused |
| **Automatic retry** | Failed requests retry (configurable) |
| **Loading + error states** | Returns `isLoading`, `isError`, `error` automatically |
| **`keepPreviousData`** | Shows old data while fetching new page (smooth pagination) |
| **Cache invalidation** | After mutation (e.g., creating employee), invalidate the cache |

### 📁 Key Files

| File | What It Exports | Purpose |
|---|---|---|
| `src/lib/providers.tsx` | `<Providers>` | Wraps app in QueryClientProvider + NuqsAdapter |
| `src/hooks/use-employees.ts` | `useEmployees()` | Fetch paginated/filtered employees |
| `src/hooks/use-departments.ts` | `useDepartments()` | Fetch department list for dropdown |

### 💻 Code Walkthrough: Query Provider

```typescript
// src/lib/providers.tsx
"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState, type ReactNode } from "react";
import { NuqsAdapter } from "nuqs/adapters/next/app";

export function Providers({ children }: { children: ReactNode }) {
  // 🔴 MERN devs: This replaces manual fetch calls in useEffect
  // QueryClient manages caching, refetching, and retrying

  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30_000,        // Data is "fresh" for 30 seconds
            gcTime: 5 * 60_000,       // Keep in cache 5 min after unmount
            retry: 1,                 // Retry once on failure
            refetchOnWindowFocus: false,  // Don't refetch on tab switch
          },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>
      <NuqsAdapter>{children}</NuqsAdapter>
    </QueryClientProvider>
  );
}
```

**Key settings explained:**

| Setting | Value | Meaning |
|---|---|---|
| `staleTime` | 30,000 (30s) | Within 30 seconds, use cached data without refetching |
| `gcTime` | 300,000 (5min) | After component unmounts, keep data in cache for 5 min |
| `retry` | 1 | If request fails, retry once |
| `refetchOnWindowFocus` | false | Don't refetch when user switches back to tab |

### 💻 Code Walkthrough: useEmployees Hook

```typescript
// src/hooks/use-employees.ts
import { useQuery, keepPreviousData } from "@tanstack/react-query";
import type { EmployeeQuery } from "@/shared/schemas/employee";
import type { PaginatedResponse, EmployeeRow } from "@/shared/types";

async function fetchEmployees(
  params: EmployeeQuery
): Promise<PaginatedResponse<EmployeeRow>> {

  // Build URL search params from the query object
  const sp = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== "All" && v !== "") {
      sp.set(k, String(v));
    }
  });

  // 🔴 MERN devs: This is the same fetch() you'd use, but wrapped by TanStack Query
  const res = await fetch(`/api/employees?${sp.toString()}`);

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body?.error?.message || "Failed to fetch employees");
  }

  return res.json();
}

export function useEmployees(params: Partial<EmployeeQuery>) {
  // 🔴 MERN devs: Every unique set of params creates a unique cache key
  // ?dept=Engineering → key: ["employees", { dept: "Engineering", ... }]
  // ?dept=Sales → key: ["employees", { dept: "Sales", ... }]
  // Changing filters automatically creates a new cache entry

  const fullParams: EmployeeQuery = {
    ...params,
    page: params.page ?? 1,
    sortBy: params.sortBy ?? "lastName",
    sortDir: params.sortDir ?? "asc",
    limit: params.limit ?? 50,
  } as EmployeeQuery;

  return useQuery({
    queryKey: ["employees", fullParams],  // Unique identifier for this query
    queryFn: () => fetchEmployees(fullParams),  // The fetch function
    staleTime: 30_000,
    gcTime: 5 * 60_000,
    placeholderData: keepPreviousData,  // 🔴 KEY: Show OLD data while fetching NEW page
  });
}
```

**The magic of `keepPreviousData`:**

```
User is on page 1 → data shows pages 1-50
User clicks "Next" → page 2 starts fetching

❌ Without keepPreviousData:
   - Data disappears
   - Loading spinner shows
   - Page 2 data arrives → re-render
   → FLASHING, LAYOUT SHIFT

✅ With keepPreviousData:
   - Page 1 data stays visible
   - Page 2 fetches in background
   - Page 2 data arrives → smooth transition
   → NO FLASHING, NO LAYOUT SHIFT
```

### 💻 Code Walkthrough: useDepartments Hook

```typescript
// src/hooks/use-departments.ts
export function useDepartments() {
  return useQuery({
    queryKey: ["departments"],
    queryFn: async () => {
      const res = await fetch("/api/departments");
      if (!res.ok) throw new Error("Failed to fetch departments");
      return res.json();
    },
    staleTime: 5 * 60_000,    // Departments rarely change — cache for 5 minutes
    gcTime: 30 * 60_000,       // Keep in cache for 30 minutes
  });
}
```

### 💻 Cache Invalidation (Onboarding → Directory)

When an employee is onboarded (created), we need to tell TanStack Query that the employee list is now stale:

```typescript
// In the onboarding page, after successful submission:
import { useQueryClient } from "@tanstack/react-query";

const queryClient = useQueryClient();

async function handleSubmit() {
  const res = await fetch("/api/onboard", { method: "POST", ... });

  if (res.ok) {
    // 🔴 Tell TanStack Query: "The employee list is now stale, refetch it"
    queryClient.invalidateQueries({ queryKey: ["employees"] });

    // Navigate to directory — it will show the new employee
    router.push("/directory");
  }
}
```

**Without cache invalidation:** The directory page would show stale data (missing the new employee) for up to 30 seconds (staleTime).

### 🧪 Try It Yourself

1. Open DevTools Network tab and visit `/directory`
2. Apply a filter — notice the query key changes and a new request fires
3. Remove the filter — notice the old data is already cached (instant, no request)
4. Change `staleTime` to `0` in `providers.tsx` and observe how often requests fire
5. Change `keepPreviousData` to `undefined` and paginate — see the loading flash

### ⚠️ Common Mistakes

- **Not using `keepPreviousData` for pagination** — without it, each page change shows a loading spinner (bad UX)
- **Wrong queryKey structure** — `["employees", params]` means every unique params object creates a new cache entry. If you change how params is structured, caching breaks.
- **Forgetting to invalidate after mutations** — after creating/updating/deleting data, always call `invalidateQueries` to refetch
- **Not checking `res.ok`** — always check if fetch succeeded before parsing JSON

---

## 9. nuqs — URL-Driven State

### ❓ The MERN Way

In a typical React app, you manage filter/pagination state with useState:

```javascript
function Directory() {
  const [dept, setDept] = useState("All");
  const [page, setPage] = useState(1);

  // Problem 1: Refreshing the page loses all filters
  // Problem 2: Can't send a link to a specific view
  // Problem 3: Browser back button doesn't work as expected
}
```

To solve this, you'd manually sync state to the URL:

```javascript
// Manual URL sync — error-prone
useEffect(() => {
  const params = new URLSearchParams();
  if (dept !== "All") params.set("dept", dept);
  if (page > 1) params.set("page", String(page));
  window.history.replaceState(null, "", `?${params}`);
}, [dept, page]);
```

### 🔍 Why Change?

**nuqs** (Next.js URL Query State) automatically syncs state to the URL:

```typescript
// ❌ MERN: useState + manual URL sync (buggy)
const [dept, setDept] = useState("All");
useEffect(() => { /* manually update URL */ }, [dept]);

// ✅ Nexus: nuqs handles URL sync automatically
const [dept, setDept] = useQueryState("dept", parseAsString.withDefault("All"));
// URL updates automatically when setDept is called
// URL changes are reflected in dept automatically
```

### 🛠️ How nuqs Works

```
User selects "Engineering" filter
         │
         ▼
setDept("Engineering")  ← Same API as useState
         │
         ▼
nuqs updates URL: /directory?dept=Engineering
         │
         ▼
User copies URL → sends to colleague
         │
         ▼
Colleague opens URL → nuqs reads ?dept=Engineering
         │
         ▼
React Query sees new params → refetches with department filter
```

### 📁 Key Files

| File | What It Exports | Purpose |
|---|---|---|
| `src/hooks/use-directory-filters.ts` | `useDirectoryFilters()` | All directory filter/pagination state |
| `src/lib/providers.tsx` | `<NuqsAdapter>` | Must wrap the app for nuqs to work |

### 💻 Code Walkthrough: useDirectoryFilters

```typescript
// src/hooks/use-directory-filters.ts
import { useQueryState, parseAsString, parseAsInteger, parseAsStringEnum } from "nuqs";

export function useDirectoryFilters() {
  // 🔴 MERN devs: Each of these replaces a useState + manual URL sync

  // Simple string param (any value)
  const [dept, setDept] = useQueryState("dept", parseAsString.withDefault("All"));

  // Simple string param (any value)
  const [status, setStatus] = useQueryState("status", parseAsString.withDefault("All"));

  // String param (empty default = not in URL unless user searches)
  const [search, setSearch] = useQueryState("search", parseAsString.withDefault(""));

  // Number param (URL stores string, nuqs parses to integer)
  const [page, setPage] = useQueryState("page", parseAsInteger.withDefault(1));

  // Enum param (only allows specific values)
  const [sortBy, setSortBy] = useQueryState(
    "sortBy",
    parseAsStringEnum(["firstName", "lastName", "jobTitle", "status", "createdAt", "employeeId"])
      .withDefault("lastName")
  );

  // Enum param (asc or desc only)
  const [sortDir, setSortDir] = useQueryState(
    "sortDir",
    parseAsStringEnum(["asc", "desc"]).withDefault("asc")
  );

  // Clear all filters at once
  const clearFilters = () => {
    setDept("All");
    setStatus("All");
    setSearch("");
    setPage(1);
  };

  // Derived state — is any filter active?
  const hasActiveFilters = dept !== "All" || status !== "All" || search !== "";

  return {
    filters: { dept, status, search, page, sortBy, sortDir },
    setters: { setDept, setStatus, setSearch, setPage, setSortBy, setSortDir },
    clearFilters,
    hasActiveFilters,
  };
}
```

**The URL that this generates:**

```
/directory?dept=Engineering&status=ACTIVE&search=Marcus&page=3&sortBy=lastName&sortDir=asc
```

Copy this URL, send it to anyone, and they'll see EXACTLY the same view.

### 💻 How nuqs Connects to React Query

```typescript
// In the directory page:
function DirectoryPage() {
  // Step 1: Read state from URL
  const { filters } = useDirectoryFilters();

  // Step 2: Pass URL state as query params
  // When URL changes → query key changes → automatic refetch
  const { data, isLoading } = useEmployees({
    page: filters.page,
    dept: filters.dept,
    status: filters.status,
    search: filters.search,
    sortBy: filters.sortBy,
    sortDir: filters.sortDir,
  });

  // ...render UI
}
```

**Data flow:**

```
URL: ?dept=Engineering&page=2
         │
         ▼
nuqs reads URL → { dept: "Engineering", page: 2 }
         │
         ▼
React Query key: ["employees", { dept: "Engineering", page: 2 }]
         │
         ▼
Fetch: GET /api/employees?dept=Engineering&page=2
```

When the URL changes, a new React Query key is created, which triggers a refetch. This is **automatic** — no useEffect needed.

### 🧪 Try It Yourself

1. Visit `/directory` and apply some filters
2. Look at the URL bar — you'll see `?dept=...&status=...` updating as you select
3. Copy the URL and open it in an incognito window — same filtered view
4. Click browser Back button — the filters change, and data refetches automatically
5. Try setting `parseAsInteger` to `parseAsString` for page — see what happens

### ⚠️ Common Mistakes

- **Forgetting `<NuqsAdapter>`** — nuqs won't work without the adapter wrapping your app
- **Not using `.withDefault()`** — without defaults, the state could be `null`
- **Using `parseAsString` for numbers** — URL params are strings. Use `parseAsInteger` for numbers
- **Storing sensitive data in URL** — Never put passwords, tokens, or PII in URL params (they're in browser history)

---

## 10. Zustand — Lightweight Client State

### ❓ The MERN Way

In a MERN app, you'd use Redux or React Context for global state:

**Redux approach:**
```javascript
// actions.js, reducers.js, store.js, constants.js... lots of boilerplate
const ADD_EMPLOYEE = 'ADD_EMPLOYEE';
function employeeReducer(state, action) { ... }
const store = createStore(employeeReducer);
```

**Context approach:**
```javascript
const SidebarContext = createContext();
function SidebarProvider({ children }) {
  const [isOpen, setOpen] = useState(true);
  // Problem: Every context consumer re-renders on any change
  return <SidebarContext.Provider value={{ isOpen, setOpen }}>{children}</SidebarContext.Provider>;
}
```

### 🔍 Why Change?

Zustand is a tiny state management library (1KB) with NO boilerplate:

```typescript
import { create } from "zustand";

// Define store — just a function!
const useStore = create((set) => ({
  count: 0,
  increment: () => set((state) => ({ count: state.count + 1 })),
}));

// Use anywhere — just a hook!
function Counter() {
  const count = useStore((state) => state.count);  // Selective subscription
  const increment = useStore((state) => state.increment);
  return <button onClick={increment}>{count}</button>;
}
```

**Zustand vs Redux vs Context:**

| Feature | Zustand | Redux | Context |
|---|---|---|---|
| Bundle size | 1KB | 11KB+ | 0KB (built-in) |
| Boilerplate | None | Actions, reducers, store | Provider component |
| Selective re-renders | Yes (automatic) | Yes (via selectors) | No (all consumers) |
| Middleware | Built-in (persist, etc.) | Requires middleware | N/A |
| TypeScript | Excellent | Good | Good |

### 📁 Key Files

| File | Store | What It Holds | Persistence |
|---|---|---|---|
| `src/stores/onboarding-draft.ts` | `useOnboardingDraft` | Form data + current step | localStorage |
| `src/stores/selection.ts` | `useSelection` | Selected row IDs | In-memory |
| `src/stores/sidebar.ts` | `useSidebar` | Sidebar open/closed | In-memory |

### 💻 Code Walkthrough: Draft Persistence (localStorage)

```typescript
// src/stores/onboarding-draft.ts
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

interface DraftState {
  draft: Partial<OnboardingData> | null;  // Partial = not all fields required
  currentStep: number;
  setDraft: (draft: Partial<OnboardingData>) => void;
  setStep: (step: number) => void;
  clearDraft: () => void;
}

export const useOnboardingDraft = create<DraftState>()(
  // 🔴 persist middleware = automatic localStorage sync
  persist(
    (set) => ({
      draft: null,
      currentStep: 0,
      setDraft: (draft) => set({ draft }),
      setStep: (currentStep) => set({ currentStep }),
      clearDraft: () => set({ draft: null, currentStep: 0 }),
    }),
    {
      name: "nexus-onboarding-draft",  // localStorage key
      storage: createJSONStorage(() => localStorage),
      // Only persist these fields (not functions)
      partialize: (state) => ({
        draft: state.draft,
        currentStep: state.currentStep,
      }),
    }
  )
);

// Usage in the wizard:
const { draft, setDraft, currentStep, setStep } = useOnboardingDraft();

// When user fills a form field:
setDraft({ firstName: "Marcus" });  // Auto-saves to localStorage

// When navigating steps:
setStep(2);  // Auto-saves current step

// On successful submit:
clearDraft();  // Clears localStorage
```

**What happens if the user closes the tab?**
1. User fills step 1 → data saves to Zustand → Zustand persist writes to localStorage
2. User closes browser (accidentally or intentionally)
3. User opens the app again → navigates to /onboarding
4. Zustand persist reads from localStorage → draft is restored
5. User continues from where they left off!

### 💻 Code Walkthrough: Row Selection (In-Memory)

```typescript
// src/stores/selection.ts
import { create } from "zustand";

interface SelectionState {
  selectedIds: Set<string>;  // Set is perfect for unique IDs
  toggleId: (id: string) => void;
  selectAll: (ids: string[]) => void;
  clearSelection: () => void;
  isSelected: (id: string) => boolean;
}

export const useSelection = create<SelectionState>((set, get) => ({
  selectedIds: new Set(),

  toggleId: (id) =>
    set((s) => {
      const next = new Set(s.selectedIds);
      if (next.has(id)) next.delete(id);    // Already selected → remove
      else next.add(id);                     // Not selected → add
      return { selectedIds: next };
    }),

  selectAll: (ids) => set({ selectedIds: new Set(ids) }),

  clearSelection: () => set({ selectedIds: new Set() }),

  isSelected: (id) => get().selectedIds.has(id),
}));

// Usage in EmployeeDataGrid:
const { selectedIds, toggleId, isSelected } = useSelection();

// Checkbox click:
<input
  checked={isSelected(employee.id)}
  onChange={() => toggleId(employee.id)}
/>

// Show selection count:
<span>{selectedIds.size} selected</span>
```

**Why use Set instead of Array?**

```typescript
// Array approach (slow for large datasets):
const arr = [1, 2, 3, 4, 5];
arr.includes(3);  // O(n) — checks every element

// Set approach (fast):
const set = new Set([1, 2, 3, 4, 5]);
set.has(3);  // O(1) — instant check
```

### 💻 Code Walkthrough: Sidebar State (In-Memory)

```typescript
// src/stores/sidebar.ts
import { create } from "zustand";

interface SidebarState {
  isOpen: boolean;
  isCollapsed: boolean;
  toggle: () => void;
  collapse: () => void;
  expand: () => void;
}

export const useSidebar = create<SidebarState>((set) => ({
  isOpen: true,
  isCollapsed: false,

  toggle: () =>
    set((s) => ({
      isOpen: !s.isOpen,
      isCollapsed: !s.isCollapsed,
    })),

  collapse: () => set({ isOpen: false, isCollapsed: true }),
  expand: () => set({ isOpen: true, isCollapsed: false }),
}));

// Usage in Sidebar component:
const { isOpen, toggle } = useSidebar();

return (
  <aside className={isOpen ? "w-60" : "w-16"}>
    <button onClick={toggle}>
      {isOpen ? <ChevronLeft /> : <ChevronRight />}
    </button>
    {isOpen && <nav>...</nav>}
  </aside>
);
```

**Why not persist sidebar state?** It resets on page refresh, which is intentional. Users might want the sidebar open on desktop but collapsed on a small window — keeping it ephemeral means they get the default every time.

### 🧪 Try It Yourself

1. Open the onboarding wizard, fill some fields, close the browser tab
2. Open the app again and go to /onboarding — your draft is restored!
3. Check localStorage in DevTools → Application → Local Storage → `nexus-onboarding-draft`
4. Open the selection store and add a `console.log` to see when `selectedIds` changes
5. Try building your own Zustand store (e.g., a `useNotifications` store for toast messages)

### ⚠️ Common Mistakes

- **Not using `partialize`** — Without it, persist stores the entire state (including functions). Functions can't be serialized to JSON and cause errors.
- **Using Redux for simple state** — Zustand is 1KB and no boilerplate. Use it for simple UI state.
- **Storing server data in Zustand** — Server data belongs in TanStack Query (caching, refetching, invalidation). Only UI state goes in Zustand.
- **Forgetting `Set` can't be serialized** — `JSON.stringify` turns a Set into `{}`. Use arrays or use Zustand's persist with a custom serializer.

---


---

## 11. TanStack Table & Virtual — High-Performance Data Grid

### ❓ The MERN Way

In a typical React app, you'd render a table like this:

```javascript
function EmployeeTable({ employees }) {
  return (
    <table>
      <thead>
        <tr>
          <th>Name</th>
          <th>Department</th>
          <th>Status</th>
        </tr>
      </thead>
      <tbody>
        {employees.map((emp) => (
          <tr key={emp.id}>
            <td>{emp.firstName} {emp.lastName}</td>
            <td>{emp.department.name}</td>
            <td>{emp.status}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
```

**Problems with 50,000 employees:**
- Browser renders 50,000 DOM nodes — crashes or becomes unusable
- Sorting requires custom state management
- Selection (checkboxes) requires additional state
- Column resizing/reordering is complex to implement

### 🔍 Why Change?

TanStack Table provides **headless table logic** — it manages sorting, selection, pagination, and column definitions without rendering any HTML. YOU provide the rendering with Tailwind CSS.

TanStack Virtual provides **DOM virtualization** — only render the ~20-30 rows visible on screen, not all 50,000.

**Together they achieve 60fps scrolling with 50K+ rows.**

### 🛠️ How Virtualization Works

```
Without Virtualization:
┌─────────────────────────┐
│ Row 1                   │  ← Visible
│ Row 2                   │  ← Visible
│ Row 3                   │  ← Visible
│ ...                     │
│ Row 50,000              │  ← OFFscreen but rendered = 50,000 DOM nodes!
└─────────────────────────┘

With Virtualization (TanStack Virtual):
┌─────────────────────────┐
│ [spacer div, height:    │  ← Creates scrollbar
│  2,400,000px for 50K]   │
├─────────────────────────┤
│ Row 22                  │  ← ABSOLUTE positioned
│ Row 23                  │  ← Only these ~30 rows
│ Row 24                  │  ← actually in the DOM
│ ...                     │
│ Row 52                  │
├─────────────────────────┤
│ [spacer div continues]  │
└─────────────────────────┘

Result: Only ~30 DOM nodes instead of 50,000!
```

### 📁 Key Files

| File | What It Does |
|---|---|
| `src/components/directory/EmployeeDataGrid.tsx` | The full data grid with table + virtualizer |
| `src/stores/selection.ts` | Row checkbox selection state (Zustand) |
| `src/components/ui/StatusBadge.tsx` | Color-coded status pill |
| `src/components/ui/Avatar.tsx` | Initials circle avatar |

### 💻 Code Walkthrough: Column Definitions

```typescript
// Inside EmployeeDataGrid.tsx

// 🔴 MERN devs: Each column defines:
// 1. What data to show (accessorKey / accessorFn)
// 2. How to render it (cell function returns JSX)
// 3. How wide it is (size)

const columns: ColumnDef<EmployeeRowType>[] = [
  {
    id: "select", size: 40,
    // Header = checkbox in the column header (select all)
    header: () => (
      <input type="checkbox"
        className="h-4 w-4 rounded border-gray-300 text-nexus-500 cursor-pointer"
        checked={data.length > 0 && selectedIds.size === data.length}
        onChange={(e) =>
          e.target.checked
            ? selectAll(data.map((r) => r.id))
            : clearSelection()
        } />
    ),
    // Cell = checkbox for each row
    cell: ({ row }) => (
      <input type="checkbox"
        className="h-4 w-4 rounded border-gray-300 text-nexus-500 cursor-pointer"
        checked={selectedIds.has(row.original.id)}
        onChange={() => toggleId(row.original.id)} />
    ),
  },
  {
    id: "name", header: "Employee", size: 250, accessorKey: "lastName",
    cell: ({ row }) => (
      <div className="flex items-center gap-3">
        {/* 🔴 MERN devs: Avatar component generates initials circles */}
        <Avatar firstName={row.original.firstName} lastName={row.original.lastName} size="md" />
        <div className="min-w-0">
          <p className="text-sm font-medium text-gray-900 truncate">
            {row.original.firstName} {row.original.lastName}
          </p>
          <p className="text-xs text-gray-500">{row.original.employeeId}</p>
        </div>
      </div>
    ),
  },
  {
    accessorKey: "jobTitle", header: "Role", size: 200,
    cell: ({ getValue }) => (
      <span className="text-sm text-gray-700">
        {getValue<string>() || "—"}   {/* Show dash if null */}
      </span>
    ),
  },
  {
    id: "department", header: "Department", size: 160,
    accessorFn: (row) => row.department.name,  // Nested property
    cell: ({ getValue }) => (
      <span className="text-sm text-gray-600">{getValue<string>()}</span>
    ),
  },
  {
    accessorKey: "status", header: "Status", size: 130,
    cell: ({ getValue }) => (
      <StatusBadge status={getValue() as EmpStatus} />
    ),
  },
  {
    id: "email", header: "Email", size: 220,
    accessorFn: (row) => row.user.email,
    cell: ({ getValue }) => (
      <span className="text-sm text-gray-500 truncate">{getValue<string>()}</span>
    ),
  },
  {
    accessorKey: "location", header: "Location", size: 130,
    cell: ({ getValue }) => (
      <span className="text-sm text-gray-500">{getValue<string>() || "—"}</span>
    ),
  },
  {
    accessorKey: "hireDate", header: "Hire Date", size: 130,
    cell: ({ getValue }) => {
      const date = getValue<Date | null>();
      if (!date) return <span className="text-sm text-gray-400">—</span>;
      return (
        <span className="text-sm text-gray-500">
          {new Date(date).toLocaleDateString("en-US", {
            year: "numeric", month: "short", day: "numeric"
          })}
        </span>
      );
    },
  },
];
```

**Key TanStack Table concepts:**

| Concept | What It Does | Code |
|---|---|---|
| `accessorKey` | Read a direct property from the row data | `accessorKey: "jobTitle"` |
| `accessorFn` | Compute a value from the row data | `accessorFn: (row) => row.department.name` |
| `cell` | Render function for each cell | Returns JSX |
| `header` | Render function for the column header | Returns JSX |
| `size` | Column width in pixels | `size: 250` |

### 💻 Code Walkthrough: Manual Sorting (URL-Synced)

```typescript
// 🔴 MERN devs: This is different from client-side sorting!
// Sorting is synced to URL via nuqs, then sent to the API.

const table = useReactTable({
  data,
  columns,
  getCoreRowModel: getCoreRowModel(),
  getSortedRowModel: getSortedRowModel(),
  manualSorting: true,  // ← TELLS TanStack: "We handle sorting ourselves via URL"
  state: {
    sorting: [{ id: filters.sortBy, desc: filters.sortDir === "desc" }],
  },
  onSortingChange: (updater) => {
    // When user clicks a column header:
    // 1. TanStack tells us the new sort state
    // 2. We update nuqs URL state
    // 3. URL changes → React Query key changes → API refetches with new sort
    if (typeof updater === "function") {
      const current = [{ id: filters.sortBy, desc: filters.sortDir === "desc" }];
      const next = updater(current);
      if (next.length > 0) {
        setters.setSortBy(next[0].id as typeof filters.sortBy);
        setters.setSortDir(next[0].desc ? "desc" : "asc");
      }
    }
  },
});
```

**Sort flow:**

```
User clicks "Department" header
         │
         ▼
TanStack calls onSortingChange with new sort
         │
         ▼
nuqs updates URL: /directory?sortBy=department&sortDir=asc
         │
         ▼
React Query key changes: ["employees", { sortBy: "department", ... }]
         │
         ▼
API fetches: GET /api/employees?sortBy=department&sortDir=asc
         │
         ▼
Prisma adds: ORDER BY department.name ASC
```

### 💻 Code Walkthrough: Virtualization

```typescript
const rowVirtualizer = useVirtualizer({
  count: rows.length,           // Total rows (could be 50,000)
  getScrollElement: () => containerRef.current,  // The scrollable container
  estimateSize: () => 56,       // Each row is ~56px tall
  overscan: 10,                 // Render 10 extra rows above/below for smooth scroll
});

// In the render:
return (
  <div ref={containerRef} className="h-[600px] overflow-auto" style={{ contain: "strict" }}>
    <table className="w-full table-fixed">
      <thead className="sticky top-0 z-10">{/* headers */}</thead>
      <tbody>
        {/* 🔴 This spacer row creates the scrollbar for 50K rows */}
        <tr style={{ height: `${rowVirtualizer.getTotalSize()}px` }}>
          <td colSpan={columns.length} className="p-0">
            <div style={{ position: "relative" }}>
              {rowVirtualizer.getVirtualItems().map((virtualRow) => {
                const row = rows[virtualRow.index];
                return (
                  <div key={row.id}
                    // 🔴 ONLY inline style: absolute positioning for virtual scrolling
                    style={{
                      position: "absolute",
                      top: 0,
                      left: 0,
                      width: "100%",
                      transform: `translateY(${virtualRow.start}px)`,
                    }}>
                    <div className="grid items-center gap-3 px-4 h-14 border-b border-gray-100 hover:bg-gray-50"
                      style={{ gridTemplateColumns: "40px 250px 200px 160px 130px 220px 130px 130px" }}>
                      {row.getVisibleCells().map((cell) => (
                        <div key={cell.id} className="overflow-hidden">
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
);
```

### 💻 Code Walkthrough: Loading Skeleton

```typescript
// 🔴 MERN devs: Instead of a generic spinner, we show skeleton rows
// that match the table layout — no layout shift!

if (isLoading) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-card p-8">
      <div className="animate-pulse space-y-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="h-12 bg-gray-100 rounded" />
        ))}
      </div>
    </div>
  );
}
```

### 🧪 Try It Yourself

1. Open the directory page and observe how many DOM nodes are rendered (DevTools → Elements)
2. Compare the DOM count to the total data count (shown in the page header)
3. Remove the `useVirtualizer` and render all rows — test with a large dataset
4. Click a column header to sort — notice the URL updates
5. Check multiple rows — notice the selection count in the footer

### ⚠️ Common Mistakes

- **Not using `manualSorting: true`** — without this, TanStack sorts client-side only, and the URL won't sync
- **Putting inline styles everywhere** — only virtualizer positioning needs inline styles. Everything else should be Tailwind classes
- **Forgetting `overscan`** — without overscan, scrolling might show blank rows before new ones render
- **Using `<tr>` elements for virtual rows** — virtual rows need absolute positioning, which doesn't work with table rows. Use `<div>` with CSS grid instead

---

## 12. React Hook Form + Multi-Step Wizard

### ❓ The MERN Way

In a typical React app, form state management looks like:

```javascript
function OnboardingForm() {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    // ... many fields
  });
  const [errors, setErrors] = useState({});

  // Manual validation
  function validate() {
    const errs = {};
    if (formData.firstName.length < 2) errs.firstName = 'Too short!';
    // ...many more validation rules
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  // Manual submit
  function handleSubmit() {
    if (!validate()) return;
    fetch('/api/onboard', { method: 'POST', body: JSON.stringify(formData) });
  }

  // No draft saving
  // No multi-step navigation
  // Validation logic duplicated in backend
}
```

**Problems:**
- Manual validation — easy to miss rules
- No draft saving — user loses data on browser close
- Multi-step logic is complex (which fields on which step?)
- Validation must be rewritten on the backend

### 🔍 Why Change?

React Hook Form + Zod provides:

| Feature | What It Does |
|---|---|
| **Zod integration** | Share validation schemas with backend (no duplication) |
| **Inline validation** | Errors show as user types (mode: "onChange") |
| **FormProvider context** | Share form state across wizard steps |
| **Draft saving** | Zustand persists form data to localStorage |

### 🛠️ How the Wizard Works

```
FormProvider wraps the entire wizard
         │
         ├── Step 0: PersonalInfoStep (firstName, lastName, email, phone)
         │     → Validated by onboardingSchema
         │     → Errors show inline beneath fields
         │
         ├── Step 1: RoleDetailsStep (department, jobTitle, salary)
         │     → Validated by onboardingSchema
         │
         ├── Step 2: TaxCompStep (taxInfo, compensation details)
         │
         └── Step 3: ReviewSignStep (review all data, submit)
               → Submit → POST /api/onboard
               → Success: invalidate cache → redirect to /directory
               → Error: show red banner, form data preserved
```

### 📁 Key Files

| File | Purpose |
|---|---|
| `src/app/(dashboard)/onboarding/page.tsx` | Main wizard page (connects everything) |
| `src/components/onboarding/Wizard.tsx` | Compound component (step context) |
| `src/components/onboarding/WizardStepper.tsx` | Step indicator UI |
| `src/components/onboarding/PersonalInfoStep.tsx` | Step 1 form fields |
| `src/components/onboarding/RoleDetailsStep.tsx` | Step 2 form fields |
| `src/components/onboarding/TaxCompStep.tsx` | Step 3 form fields |
| `src/components/onboarding/ReviewSignStep.tsx` | Step 4 review + submit |
| `src/components/onboarding/StepNavigation.tsx` | Next/Back/Submit buttons |
| `src/components/onboarding/SaveDraftButton.tsx` | Manual save draft |
| `src/stores/onboarding-draft.ts` | Draft persistence (localStorage) |

### 💻 Code Walkthrough: Wizard Page Setup

```typescript
// src/app/(dashboard)/onboarding/page.tsx
"use client";

export default function OnboardingPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { draft, currentStep, clearDraft, setStep } = useOnboardingDraft();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  // 🔴 MERN devs: This ONE useForm call manages ALL wizard steps
  // FormProvider shares this across all step components
  const methods = useForm<OnboardingData>({
    resolver: zodResolver(onboardingSchema),  // Zod validates automatically
    defaultValues: draft ?? {                  // Restore draft if exists
      firstName: "",
      lastName: "",
      departmentId: "",
      jobTitle: "",
      salaryAmount: undefined,
    },
    mode: "onChange",  // Validate on every input change (instant feedback)
  });

  // Submit handler
  const handleSubmit = async () => {
    const isValid = await methods.trigger();  // Validate all fields
    if (!isValid) return;

    setIsSubmitting(true);
    setServerError(null);

    try {
      const res = await fetch("/api/onboard", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(methods.getValues()),
      });

      if (!res.ok) {
        const body = await res.json();
        throw new Error(body?.error?.message || "Failed to onboard employee");
      }

      // Success! Clear draft, invalidate cache, go to directory
      clearDraft();
      queryClient.invalidateQueries({ queryKey: ["employees"] });
      router.push("/directory");
    } catch (err) {
      // Show error banner — form data is preserved!
      setServerError(err instanceof Error ? err.message : "An unexpected error occurred");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Onboard New Employee</h1>
          <p className="text-sm text-gray-500">Complete all steps to create a new employee record</p>
        </div>
        <FormProvider {...methods}>
          <SaveDraftButton />  {/* Manual save button */}
        </FormProvider>
      </div>

      {/* 🔴 Server error banner — preserves form data on error */}
      {serverError && (
        <div className="rounded-md bg-red-50 border border-red-200 p-4">
          <p className="text-sm text-red-700">{serverError}</p>
        </div>
      )}

      {/* Wizard with all steps */}
      <FormProvider {...methods}>
        <Wizard totalSteps={4} initialStep={currentStep || 0} onStepChange={setStep}>
          <WizardStepper />          {/* Shows: Step 1 → Step 2 → Step 3 → Step 4 */}
          <WizardContent>
            <PersonalInfoStep />     {/* Step 0 */}
            <RoleDetailsStep />      {/* Step 1 */}
            <TaxCompStep />          {/* Step 2 */}
            <ReviewSignStep />       {/* Step 3 */}
          </WizardContent>
          <StepNavigation onFinalSubmit={handleSubmit} isSubmitting={isSubmitting} />
        </Wizard>
      </FormProvider>
    </div>
  );
}
```

### 💻 Code Walkthrough: Step Component Example

```typescript
// src/components/onboarding/RoleDetailsStep.tsx
import { useFormContext } from "react-hook-form";
import type { OnboardingData } from "@/shared/schemas/onboarding";
import { useOnboardingDraft } from "@/stores/onboarding-draft";

export function RoleDetailsStep() {
  // 🔴 MERN devs: useFormContext gets the form state from FormProvider
  // No need to pass props — the context handles it!
  const { register, formState: { errors } } = useFormContext<OnboardingData>();
  const { draft, setDraft } = useOnboardingDraft();

  // Auto-save to draft whenever form values change
  const handleFieldChange = () => {
    // In a real implementation, you'd watch form values
    // and auto-save to Zustand draft
  };

  return (
    <div className="space-y-4">
      <div>
        <label>Department</label>
        <select {...register("departmentId")}
          className="input-field" onChange={handleFieldChange}>
          <option value="">Select department...</option>
          {/* Options populated from useDepartments() hook */}
        </select>
        {/* 🔴 Error shows immediately due to mode: "onChange" */}
        {errors.departmentId && (
          <p className="text-sm text-red-500 mt-1">{errors.departmentId.message}</p>
        )}
      </div>

      <div>
        <label>Job Title</label>
        <input {...register("jobTitle")}
          className="input-field" placeholder="e.g., Senior Engineer" />
        {errors.jobTitle && (
          <p className="text-sm text-red-500 mt-1">{errors.jobTitle.message}</p>
        )}
      </div>

      <div>
        <label>Salary</label>
        <input type="number" {...register("salaryAmount", { valueAsNumber: true })}
          className="input-field" placeholder="135000" />
        {errors.salaryAmount && (
          <p className="text-sm text-red-500 mt-1">{errors.salaryAmount.message}</p>
        )}
      </div>
    </div>
  );
}
```

### 🧪 Try It Yourself

1. Open the onboarding wizard and fill out Step 1
2. Close the browser tab, reopen, navigate to /onboarding — draft is restored!
3. Submit with invalid data — see error messages appear as you type
4. Try submitting and quickly checking the Network tab — see the POST request
5. Add a `console.log` in the submit handler to see the form values

### ⚠️ Common Mistakes

- **Not wrapping in `FormProvider`** — each step must be inside `<FormProvider>` to share form state
- **Forgetting `valueAsNumber`** — without it, number inputs return strings. `register("salaryAmount", { valueAsNumber: true })` converts to number
- **Not calling `methods.trigger()` before submit** — validates all fields before sending the request
- **Losing form data on server error** — the error banner preserves form state so users can fix and retry

---

## 13. Tailwind CSS v4 — Utility-First Styling

### ❓ The MERN Way

In a typical React app, you style components with:

```css
/* Option 1: CSS file */
.employee-row {
  display: grid;
  grid-template-columns: 40px 250px 200px;
  padding: 12px 16px;
  border-bottom: 1px solid #e5e7eb;
}

/* Option 2: CSS-in-JS (styled-components) */
const Row = styled.div`
  display: grid;
  grid-template-columns: 40px 250px 200px;
  padding: 12px 16px;
  border-bottom: 1px solid #e5e7eb;
`;

/* Option 3: Bootstrap */
<div class="row border-bottom py-3">
```

**Problems:**
- Multiple files to manage
- Naming conventions (BEM, CSS modules)
- Dead CSS accumulation
- Inconsistent spacing/colors

### 🔍 Why Change?

Tailwind CSS uses **utility classes** directly in your JSX:

```tsx
// 🔴 MERN devs: Every class is a single CSS property
// No separate CSS files, no naming, no dead code!

<div className="grid items-center gap-3 px-4 h-14 border-b border-gray-100 hover:bg-gray-50">
```

### 🛠️ How Tailwind v4 Works

```
1. @import "tailwindcss" in globals.css — loads all utilities
         │
         ▼
2. @theme { ... } in globals.css — define design tokens
         │
         ▼
3. Use utility classes in className
         │
         ▼
4. Tailwind generates ONLY the CSS you use — nothing else!
```

### 📁 Key Files

| File | Purpose |
|---|---|
| `src/app/globals.css` | Tailwind import + design tokens + component classes |
| `src/lib/utils.ts` | `cn()` helper for conditional classes |
| `postcss.config.mjs` | PostCSS plugin configuration |
| All `.tsx` files | Utility classes in `className` |

### 💻 Code Walkthrough: globals.css

```css
/* src/app/globals.css */

/* 🔴 MERN devs: This ONE import gives you ALL Tailwind utilities */
@import "tailwindcss";

@theme {
  /* Brand colors — use like: bg-nexus-500, text-nexus-700 */
  --color-nexus-50: #eff6ff;
  --color-nexus-100: #dbeafe;
  --color-nexus-500: #3b82f6;
  --color-nexus-600: #2563eb;
  --color-nexus-700: #1d4ed8;
  --color-nexus-900: #1e3a5f;

  /* Status colors — use like: bg-status-active */
  --color-status-active: #16a34a;
  --color-status-onboarding: #ca8a04;
  --color-status-leave: #dc2626;
  --color-status-inactive: #6b7280;

  /* Custom spacing — use like: h-table-row, w-sidebar */
  --spacing-table-row: 48px;
  --spacing-sidebar: 240px;

  /* Custom shadows */
  --shadow-card: 0 1px 3px 0 rgb(0 0 0 / 0.08);

  /* Fonts */
  --font-sans: var(--font-geist-sans, system-ui, -apple-system, sans-serif);
  --font-mono: var(--font-geist-mono, ui-monospace, monospace);
}

/* 🔴 Reusable component classes (practical shortcut) */
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

### 💻 Translating CSS to Tailwind

```css
/* Old CSS */
.employee-row {
  display: grid;
  grid-template-columns: 40px 250px 200px;
  padding: 12px 16px;
  border-bottom: 1px solid #e5e7eb;
  background: white;
}
.employee-row:hover {
  background: #f9fafb;
}
```

```tsx
/* Tailwind — all in className! */
<div className="grid items-center gap-3 px-4 h-14
                border-b border-gray-100 bg-white
                hover:bg-gray-50"
     style={{ gridTemplateColumns: "40px 250px 200px" }}>
```

**Common Tailwind patterns used in this project:**

| CSS | Tailwind |
|---|---|
| `display: flex` | `flex` |
| `display: grid` | `grid` |
| `padding: 16px` | `p-4` |
| `padding: 12px 16px` | `px-4 py-3` |
| `margin-top: 8px` | `mt-2` |
| `gap: 12px` | `gap-3` |
| `color: #6b7280` | `text-gray-500` |
| `background: white` | `bg-white` |
| `border: 1px solid #e5e7eb` | `border border-gray-200` |
| `border-radius: 8px` | `rounded-lg` |
| `font-size: 14px` | `text-sm` |
| `font-weight: 600` | `font-semibold` |
| `hover: background #f9fafb` | `hover:bg-gray-50` |

### 💻 The cn() Utility

```typescript
// src/lib/utils.ts
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

// 🔴 MERN devs: This is like classnames() but smarter
// It merges Tailwind classes and resolves conflicts
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Usage:
<div className={cn(
  "px-4 py-2 text-sm",           // Base styles
  isActive && "bg-blue-500 text-white",  // Conditional
  className                       // From parent component
)} />
```

### 💻 Component Examples

**StatusBadge (color-coded pill, NO conditional CSS files):**

```tsx
export function StatusBadge({ status }: { status: EmpStatus }) {
  // 🔴 Just an object with Tailwind class strings!
  const statusStyles = {
    ACTIVE: "bg-green-50 text-green-700 ring-green-600/20",
    ONBOARDING: "bg-yellow-50 text-yellow-700 ring-yellow-600/20",
    LEAVE: "bg-red-50 text-red-700 ring-red-600/20",
    INACTIVE: "bg-gray-50 text-gray-600 ring-gray-500/20",
  };

  return (
    <span className={cn(
      "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset",
      statusStyles[status]
    )}>
      {status}
    </span>
  );
}
```

**Avatar (initials circle):**

```tsx
export function Avatar({ firstName, lastName, size = "md" }: AvatarProps) {
  const sizeClasses = {
    sm: "h-6 w-6 text-xs",
    md: "h-8 w-8 text-sm",
    lg: "h-12 w-12 text-lg",
  };

  return (
    <div className={cn(
      "rounded-full bg-nexus-100 flex items-center justify-center font-medium text-nexus-700 shrink-0",
      sizeClasses[size]
    )}>
      {firstName.charAt(0)}{lastName.charAt(0)}
    </div>
  );
}
```

### 🧪 Try It Yourself

1. Open `src/app/globals.css` and change `--color-nexus-500` to a different color — see it propagate everywhere
2. Try removing `@layer components` and using only utility classes in a component
3. Use DevTools to inspect an element — see all the utility classes applied
4. Try adding `dark:` variants: `dark:bg-gray-800 dark:text-white`

### ⚠️ Common Mistakes

- **Using inline `style={}` for everything** — Tailwind classes should be your default. Only use inline styles for runtime values (virtualizer positioning).
- **Not using `cn()` for conditional classes** — string concatenation breaks with conditional classes. Always use `cn()`.
- **Adding custom CSS files** — avoid adding `.css` files per component. Everything should be in `className`.
- **Using MUI or Bootstrap** — this project uses ONLY Tailwind. Don't mix frameworks.

---

## 14. Testing — From Unit to E2E

### ❓ The MERN Way

In a typical MERN project:
- **Backend**: Jest or Mocha for unit tests (maybe)
- **Frontend**: React Testing Library for component tests (maybe)
- **API**: Postman collection (manual)
- **E2E**: Selenium (rarely)

Most MERN projects have minimal test coverage.

### 🔍 Why Change?

This project follows the **test pyramid**:

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

| Layer | Tool | What It Tests | Speed |
|---|---|---|---|
| Unit | Vitest | Zod schemas, utility functions, Zustand stores | Milliseconds |
| Integration | Vitest + vi.mock | API route handlers (mocked DB + auth) | Seconds |
| E2E | Playwright | Full user flows (requires Clerk test mode) | Minutes |

### 📁 Key Files

| File | Type | What It Tests |
|---|---|---|
| `src/__tests__/schemas/onboarding.test.ts` | Unit | Onboarding form validation rules |
| `src/__tests__/schemas/employee.test.ts` | Unit | Employee query + update validation |
| `src/__tests__/api/employees.test.ts` | Integration | GET /api/employees handler |
| `e2e/onboarding.spec.ts` | E2E | Full onboarding flow (placeholder) |

### 💻 Code Walkthrough: Unit Test (Zod Schema)

```typescript
// src/__tests__/schemas/onboarding.test.ts
import { describe, it, expect } from "vitest";
import { onboardingSchema } from "@/shared/schemas/onboarding";

describe("onboardingSchema", () => {
  // 🔴 MERN devs: Each test checks ONE validation rule

  const valid = {
    firstName: "Marcus",
    lastName: "Chen",
    departmentId: "550e8400-e29b-41d4-a716-446655440000",
    jobTitle: "Senior Engineer",
    salaryAmount: 135000,
  };

  it("accepts valid data", () => {
    expect(onboardingSchema.safeParse(valid).success).toBe(true);
  });

  it("rejects salary below minimum ($40,000)", () => {
    const result = onboardingSchema.safeParse({ ...valid, salaryAmount: 30000 });
    expect(result.success).toBe(false);
  });

  it("rejects salary above maximum ($500,000)", () => {
    const result = onboardingSchema.safeParse({ ...valid, salaryAmount: 600000 });
    expect(result.success).toBe(false);
  });

  it("rejects short first name (< 2 characters)", () => {
    const result = onboardingSchema.safeParse({ ...valid, firstName: "A" });
    expect(result.success).toBe(false);
  });

  it("rejects invalid department ID (not a UUID)", () => {
    const result = onboardingSchema.safeParse({ ...valid, departmentId: "not-a-uuid" });
    expect(result.success).toBe(false);
  });

  it("rejects short job title (< 3 characters)", () => {
    const result = onboardingSchema.safeParse({ ...valid, jobTitle: "AB" });
    expect(result.success).toBe(false);
  });

  it("accepts optional fields (email, phone, location)", () => {
    const result = onboardingSchema.safeParse({
      ...valid,
      email: "marcus@nexus.internal",
      phoneNumber: "+15551234567",
      location: "San Francisco",
      managerId: "550e8400-e29b-41d4-a716-446655440001",
      startDate: new Date(),
    });
    expect(result.success).toBe(true);
  });

  it("rejects invalid email", () => {
    const result = onboardingSchema.safeParse({ ...valid, email: "not-an-email" });
    expect(result.success).toBe(false);
  });

  it("rejects missing required fields", () => {
    const result = onboardingSchema.safeParse({});
    expect(result.success).toBe(false);
  });
});
```

**Running the tests:**

```bash
npm test          # Run all tests once
npm run test:watch  # Run tests in watch mode (re-runs on changes)
```

### 💻 Code Walkthrough: Integration Test (API Route)

```typescript
// src/__tests__/api/employees.test.ts
import { describe, it, expect, vi } from "vitest";
import { GET } from "@/app/api/employees/route";
import { NextRequest } from "next/server";

// 🔴 MERN devs: We MOCK the external dependencies (Clerk, Prisma)
// This way we test ONLY our handler logic, not the database

vi.mock("@clerk/nextjs/server", () => ({
  auth: () =>
    Promise.resolve({
      userId: "user_hr1",
      sessionClaims: { role: "HR_MANAGER" },
    }),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    employeeProfile: {
      findMany: vi.fn().mockResolvedValue([]),
      count: vi.fn().mockResolvedValue(0),
    },
    $transaction: vi.fn().mockResolvedValue([[], 0]),
  },
}));

describe("GET /api/employees", () => {
  it("returns paginated data with meta", async () => {
    const req = new NextRequest(
      new URL("http://localhost:3000/api/employees?page=1&limit=50")
    );
    const res = await GET(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body).toHaveProperty("data");
    expect(body.meta).toHaveProperty("totalCount");
    expect(body.meta).toHaveProperty("page");
    expect(body.meta).toHaveProperty("totalPages");
  });

  it("returns 400 for invalid page (page=0)", async () => {
    const req = new NextRequest(
      new URL("http://localhost:3000/api/employees?page=0")
    );
    const res = await GET(req);
    expect(res.status).toBe(400);
  });
});
```

**Why mock Prisma instead of using a test database?**

```
❌ Using real database:
  - Need PostgreSQL running
  - Need test data seeded
  - Tests are slow (network + queries)
  - Tests can fail due to DB issues

✅ Mocking Prisma (vi.mock):
  - No database needed
  - Tests run in milliseconds
  - Tests are deterministic
  - We test OUR logic, not Prisma's
```

### 💻 Running Tests

```bash
# Run all unit + integration tests
npm test

# Run in watch mode (auto-rerun on changes)
npm run test:watch

# Run E2E tests (requires app running)
npm run test:e2e

# TypeScript type checking (not a test, but catches type errors)
npm run type-check
```

### 🧪 Try It Yourself

1. Run `npm test` — see all tests pass
2. Open `src/__tests__/schemas/onboarding.test.ts` and add a new test case
3. Change a validation rule in `onboardingSchema` and run tests again — see the failure
4. Open `src/__tests__/api/employees.test.ts` and trace how the mocks work
5. Try adding a console.log in the mocked Prisma to see when it's called

### ⚠️ Common Mistakes

- **Not mocking external dependencies** — tests that hit real databases or APIs are slow and unreliable
- **Testing implementation details** — test BEHAVIOR, not implementation. For Zod schemas, test valid/invalid inputs. For API routes, test the response.
- **Forgetting `await`** — API route handlers are async. Always `await GET(request)` in tests.
- **Not running `prisma generate`** — if schema changes, you need to regenerate before tests will work

---

## What's Next?

You've completed the Technical Learning Guide! You should now understand:

| Section | What You Learned |
|---|---|
| 1-2 | Project structure and request flow |
| 3 | Next.js App Router (file-based routing) |
| 4 | Clerk authentication (no passwords!) |
| 5 | Prisma ORM (PostgreSQL with TypeScript types) |
| 6 | BFF API routes (backend for frontend) |
| 7 | Zod validation (runtime type safety) |
| 8 | TanStack Query (server state management) |
| 9 | nuqs (URL-driven state) |
| 10 | Zustand (lightweight client state) |
| 11 | TanStack Table + Virtual (50K rows at 60fps) |
| 12 | React Hook Form + Multi-Step Wizard |
| 13 | Tailwind CSS v4 (utility-first styling) |
| 14 | Testing (unit → integration → E2E) |

**Next read:** See `006_Patterns_Explained.md` for the "why" behind each architectural decision.

---

*End of Document 1 — Technical Learning Guide*
</pre>
</pre>
