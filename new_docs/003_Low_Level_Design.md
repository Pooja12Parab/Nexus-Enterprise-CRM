# Low-Level Design (LLD)

## Nexus Enterprise CRM

---

| **Document ID** | NEXUS-LLD-001 |
|---|---|
| **Version** | 2.0 |
| **Date** | 2026-06-28 |
| **Author** | Nexus Engineering Team |
| **Status** | Draft |

---

## Table of Contents

1. [Database Schema](#1-database-schema)
2. [API Route Handlers](#2-api-route-handlers)
3. [Shared Validation Logic](#3-shared-validation-logic)
4. [Client-Side Implementation](#4-client-side-implementation)
5. [UI Component Specifications](#5-ui-component-specifications)
6. [Middleware Configuration](#6-middleware-configuration)
7. [Error Handling Strategy](#7-error-handling-strategy)
8. [Testing Strategy](#8-testing-strategy)

---

## 1. Database Schema

### 1.1 Prisma Schema (v7)

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
}

model User {
  id        String    @id // Clerk user ID
  email     String    @unique
  role      UserRole  @default(EMPLOYEE)
  profile   EmployeeProfile?
  auditLogs AuditLog[]
  createdAt DateTime  @default(now()) @map("created_at")
  updatedAt DateTime  @updatedAt @map("updated_at")

  @@map("users")
}

enum UserRole { SUPER_ADMIN  HR_MANAGER  DEPT_HEAD  EMPLOYEE }

model EmployeeProfile {
  id               String            @id @default(uuid())
  employeeId       String            @unique // "EMP-001"
  user             User?             @relation(fields: [userId], references: [id])
  userId           String?           @unique
  firstName        String
  lastName         String
  jobTitle         String?
  location         String?
  department       Department        @relation(fields: [departmentId], references: [id])
  departmentId     String
  status           EmpStatus         @default(ONBOARDING)
  salaries         Salary[]
  managerId        String?
  manager          EmployeeProfile?  @relation("ManagerSubordinates", fields: [managerId], references: [id])
  subordinates     EmployeeProfile[] @relation("ManagerSubordinates")
  hireDate         DateTime?
  phoneNumber      String?
  emergencyContact String?
  taxInfo          Json?
  createdAt        DateTime          @default(now()) @map("created_at")
  updatedAt        DateTime          @updatedAt @map("updated_at")

  @@map("employee_profiles")
}

model Department {
  id        String            @id @default(uuid())
  name      String            @unique
  employees EmployeeProfile[]
  createdAt DateTime          @default(now()) @map("created_at")
  updatedAt DateTime          @updatedAt @map("updated_at")

  @@map("departments")
}

model Salary {
  id            String          @id @default(uuid())
  employee      EmployeeProfile @relation(fields: [employeeId], references: [id], onDelete: Cascade)
  employeeId    String
  amount        Decimal         @db.Decimal(10, 2)
  effectiveDate DateTime
  notes         String?
  createdAt     DateTime        @default(now()) @map("created_at")

  @@map("salaries")
}

model AuditLog {
  id        String   @id @default(uuid())
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  userId    String
  action    String   // "EMPLOYEE_CREATED", "SALARY_UPDATED"
  targetId  String?
  metadata  Json?
  timestamp DateTime @default(now())

  @@map("audit_logs")
}

enum EmpStatus { ACTIVE  INACTIVE  ONBOARDING  LEAVE }
```

> **Changes from v1**: `Department` no longer has `headId`/`head` fields. `Salary` and `AuditLog` now have `onDelete: Cascade`. `EmployeeProfile.userId` and `EmployeeProfile.user` are optional (nullable). `EmployeeProfile` includes `phoneNumber` and `location` fields.

### 1.2 ER Diagram (Textual)

```
┌──────────┐   ?:1  ┌────────────────────┐   M:1   ┌──────────────┐
│   User   │────────│  EmployeeProfile   │─────────│  Department  │
│ (Clerk)  │        │                    │         │  name        │
│ email    │        │ empId, name, title │         └──────────────┘
│ role     │        │ status, location   │
└────┬─────┘        │ phone, hireDate    │
     │              └────────┬───────────┘
     │ 1:M                    │ 1:M (onDelete: Cascade)
     ▼                        ▼
┌──────────┐          ┌──────────────┐
│ AuditLog │          │   Salary     │
│ action   │          │ amount, date │
│ targetId │          └──────────────┘
│ onDelete:Cascade
└──────────┘
```

---

## 2. API Route Handlers

### 2.1 Prisma Client Initialization (`lib/prisma.ts`)

Uses `@prisma/adapter-pg` for connection pooling with Prisma v7.

```typescript
// lib/prisma.ts
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    adapter: new PrismaPg(process.env.DATABASE_URL!),
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
```

### 2.2 GET /api/employees (Paginated + Filtered)

```typescript
// app/api/employees/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { handleApiError, unauthorizedResponse, forbiddenResponse } from "@/lib/api-utils";
import { employeeQuerySchema } from "@/shared/schemas/employee";
import { auth } from "@clerk/nextjs/server";

export async function GET(request: NextRequest) {
  try {
    const { userId, sessionClaims } = await auth();

    if (!userId) return unauthorizedResponse();

    const role = sessionClaims?.role as string | undefined;
    if (role !== "HR_MANAGER" && role !== "SUPER_ADMIN" && role !== "DEPT_HEAD") {
      return forbiddenResponse();
    }

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
        { error: { code: "VALIDATION_ERROR", message: "Invalid query parameters", details: parsed.error.flatten().fieldErrors } },
        { status: 400 }
      );
    }

    const { page, dept, status, search, sortBy, sortDir, limit } = parsed.data;
    const skip = (page - 1) * limit;

    // Build dynamic where clause
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

    const [employees, totalCount] = await prisma.$transaction([
      prisma.employeeProfile.findMany({
        where: whereClause,
        include: {
          department: { select: { id: true, name: true } },
          user: { select: { email: true } },
        },
        skip,
        take: limit,
        orderBy: { [sortBy]: sortDir },
      }),
      prisma.employeeProfile.count({ where: whereClause }),
    ]);

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
    return handleApiError(error);
  }
}
```

### 2.3 GET /api/departments

Returns departments with employee count for dynamic filter dropdown.

```typescript
// app/api/departments/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { handleApiError } from "@/lib/api-utils";
import type { DepartmentOption } from "@/shared/types";

export async function GET() {
  try {
    const departments = await prisma.department.findMany({
      include: {
        _count: { select: { employees: true } },
      },
      orderBy: { name: "asc" },
    });

    const result: DepartmentOption[] = departments.map((d) => ({
      id: d.id,
      name: d.name,
      employeeCount: d._count.employees,
    }));

    return NextResponse.json(result);
  } catch (error) {
    return handleApiError(error);
  }
}
```

### 2.4 POST /api/onboard

```typescript
// app/api/onboard/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { handleApiError, unauthorizedResponse, forbiddenResponse } from "@/lib/api-utils";
import { onboardingSchema } from "@/shared/schemas/onboarding";
import { auth } from "@clerk/nextjs/server";

export async function POST(request: Request) {
  try {
    const { userId, sessionClaims } = await auth();

    if (!userId) return unauthorizedResponse();

    const role = sessionClaims?.role as string | undefined;
    if (role !== "HR_MANAGER" && role !== "SUPER_ADMIN") {
      return forbiddenResponse();
    }

    const body = await request.json();
    const parsed = onboardingSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: { code: "VALIDATION_ERROR", message: "Validation failed", details: parsed.error.flatten().fieldErrors } },
        { status: 400 }
      );
    }

    const result = await prisma.$transaction(async (tx) => {
      // Generate sequential employee ID from last record
      const lastEmployee = await tx.employeeProfile.findFirst({
        orderBy: { employeeId: "desc" },
        select: { employeeId: true },
      });
      const lastNumber = lastEmployee ? parseInt(lastEmployee.employeeId.replace("EMP-", "")) : 0;
      const employeeId = `EMP-${String(lastNumber + 1).padStart(3, "0")}`;

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

      // Create audit log
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

---

## 3. Shared Validation Logic

### 3.1 Onboarding Schema (`shared/schemas/onboarding.ts`)

Used identically on client (React Hook Form) and server (API route). Schema includes additional fields not in original spec.

```typescript
import { z } from "zod";

export const onboardingSchema = z.object({
  firstName: z.string().min(2, "First name must be at least 2 characters").max(50),
  lastName: z.string().min(2, "Last name must be at least 2 characters").max(50),
  departmentId: z.string().uuid("Invalid department ID"),
  jobTitle: z.string().min(3, "Job title must be at least 3 characters"),
  salaryAmount: z.number().min(40000, "Minimum salary is $40,000").max(500000, "Maximum salary is $500,000"),
  managerId: z.string().uuid().optional(),
  startDate: z.date().optional(),
  email: z.string().email("Invalid email address").optional(),
  phoneNumber: z.string().min(10, "Phone number too short").max(15).optional(),
  location: z.string().min(2).optional(),
});
export type OnboardingData = z.infer<typeof onboardingSchema>;
```

### 3.2 Employee Query Schema (`shared/schemas/employee.ts`)

```typescript
import { z } from "zod";

export const employeeQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  dept: z.string().optional(),
  status: z.string().optional(),     // validated at API handler, not enum (accepts any string)
  search: z.string().min(1).optional(),
  sortBy: z.enum(["firstName", "lastName", "jobTitle", "status", "createdAt", "employeeId"]).default("lastName"),
  sortDir: z.enum(["asc", "desc"]).default("asc"),
  limit: z.coerce.number().int().min(1).max(100).default(50),
});
export type EmployeeQuery = z.infer<typeof employeeQuerySchema>;

export const employeeUpdateSchema = z.object({
  jobTitle: z.string().min(3).optional(),
  status: z.enum(["ACTIVE", "INACTIVE", "ONBOARDING", "LEAVE"]).optional(),
  departmentId: z.string().uuid().optional(),
  location: z.string().optional(),
  phoneNumber: z.string().optional(),
});
export type EmployeeUpdate = z.infer<typeof employeeUpdateSchema>;
```

> **Note**: Client submits → API calls `safeParse(body)`. Fail → 400 before DB, guaranteeing integrity. The `employeeUpdateSchema` is used for PATCH updates to individual employee records.

---

## 4. Client-Side Implementation

### 4.1 Shared Types (`shared/types/index.ts`)

```typescript
import type { UserRole, EmpStatus } from "@prisma/client";

export interface EmployeeRow {
  id: string;
  employeeId: string;
  firstName: string;
  lastName: string;
  jobTitle: string | null;
  department: { id: string; name: string };
  status: EmpStatus;
  user: { email: string };
  location: string | null;
  hireDate: Date | null;
  phoneNumber: string | null;
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: {
    totalCount: number;
    page: number;
    totalPages: number;
    limit: number;
  };
}

export interface DepartmentOption {
  id: string;
  name: string;
  employeeCount: number;
}

export type { UserRole, EmpStatus };
```

### 4.2 URL State with nuqs

```typescript
// hooks/use-directory-filters.ts
import { useQueryState, parseAsString, parseAsInteger, parseAsStringEnum } from "nuqs";

export function useDirectoryFilters() {
  const [dept, setDept] = useQueryState("dept", parseAsString.withDefault("All"));
  const [status, setStatus] = useQueryState("status", parseAsString.withDefault("All"));
  const [search, setSearch] = useQueryState("search", parseAsString.withDefault(""));
  const [page, setPage] = useQueryState("page", parseAsInteger.withDefault(1));
  const [sortBy, setSortBy] = useQueryState(
    "sortBy",
    parseAsStringEnum(["firstName", "lastName", "jobTitle", "status", "createdAt", "employeeId"]).withDefault("lastName")
  );
  const [sortDir, setSortDir] = useQueryState(
    "sortDir",
    parseAsStringEnum(["asc", "desc"]).withDefault("asc")
  );

  const clearFilters = () => {
    setDept("All"); setStatus("All"); setSearch(""); setPage(1);
  };

  const hasActiveFilters = dept !== "All" || status !== "All" || search !== "";

  return {
    filters: { dept, status, search, page, sortBy, sortDir },
    setters: { setDept, setStatus, setSearch, setPage, setSortBy, setSortDir },
    clearFilters,
    hasActiveFilters,
  };
}
```

> **Note**: Uses `parseAsStringEnum` for `sortBy` and `sortDir` for type-safe parsing. Includes `hasActiveFilters` derived property.

### 4.3 React Query Hooks

```typescript
// hooks/use-employees.ts
import { useQuery, keepPreviousData } from "@tanstack/react-query";
import type { EmployeeQuery } from "@/shared/schemas/employee";
import type { PaginatedResponse, EmployeeRow } from "@/shared/types";

async function fetchEmployees(params: EmployeeQuery): Promise<PaginatedResponse<EmployeeRow>> {
  const sp = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== "All" && v !== "") {
      sp.set(k, String(v));
    }
  });
  const res = await fetch(`/api/employees?${sp.toString()}`);
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body?.error?.message || "Failed to fetch employees");
  }
  return res.json();
}

export function useEmployees(params: Partial<EmployeeQuery>) {
  const fullParams: EmployeeQuery = {
    ...params,
    page: params.page ?? 1,
    sortBy: params.sortBy ?? "lastName",
    sortDir: params.sortDir ?? "asc",
    limit: params.limit ?? 50,
  } as EmployeeQuery;

  return useQuery({
    queryKey: ["employees", fullParams],
    queryFn: () => fetchEmployees(fullParams),
    staleTime: 30_000,
    gcTime: 5 * 60_000,
    placeholderData: keepPreviousData,  // smooth pagination
  });
}
```

```typescript
// hooks/use-departments.ts
import { useQuery } from "@tanstack/react-query";
import type { DepartmentOption } from "@/shared/types";

async function fetchDepartments(): Promise<DepartmentOption[]> {
  const res = await fetch("/api/departments");
  if (!res.ok) throw new Error("Failed to fetch departments");
  return res.json();
}

export function useDepartments() {
  return useQuery({
    queryKey: ["departments"],
    queryFn: fetchDepartments,
    staleTime: 5 * 60_000,
    gcTime: 30 * 60_000,
  });
}
```

### 4.4 Zustand Stores

**Draft Persistence** (`stores/onboarding-draft.ts`):

```typescript
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { OnboardingData } from "@/shared/schemas/onboarding";

interface DraftState {
  draft: Partial<OnboardingData> | null;
  currentStep: number;
  setDraft: (draft: Partial<OnboardingData>) => void;
  setStep: (step: number) => void;
  clearDraft: () => void;
}

export const useOnboardingDraft = create<DraftState>()(
  persist(
    (set) => ({
      draft: null, currentStep: 0,
      setDraft: (draft) => set({ draft }),
      setStep: (currentStep) => set({ currentStep }),
      clearDraft: () => set({ draft: null, currentStep: 0 }),
    }),
    {
      name: "nexus-onboarding-draft",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ draft: state.draft, currentStep: state.currentStep }),
    }
  )
);
```

**Row Selection** (`stores/selection.ts`):

```typescript
import { create } from "zustand";

interface SelectionState {
  selectedIds: Set<string>;
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
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return { selectedIds: next };
    }),
  selectAll: (ids) => set({ selectedIds: new Set(ids) }),
  clearSelection: () => set({ selectedIds: new Set() }),
  isSelected: (id) => get().selectedIds.has(id),
}));
```

**Sidebar Toggle** (`stores/sidebar.ts`):

```typescript
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
  toggle: () => set((s) => ({ isOpen: !s.isOpen, isCollapsed: !s.isCollapsed })),
  collapse: () => set({ isOpen: false, isCollapsed: true }),
  expand: () => set({ isOpen: true, isCollapsed: false }),
}));
```

### 4.5 Provider Architecture (`lib/providers.tsx`)

```typescript
"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState, type ReactNode } from "react";
import { NuqsAdapter } from "nuqs/adapters/next/app";

export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30_000,
            gcTime: 5 * 60_000,
            retry: 1,
            refetchOnWindowFocus: false,
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

> **Note**: The `<NuqsAdapter>` from `nuqs/adapters/next/app` is required for nuqs to work with Next.js App Router.

### 4.6 Onboarding Page Flow

The onboarding page (`app/(dashboard)/onboarding/page.tsx`) uses React Hook Form's `FormProvider` to share form state across wizard steps:

```typescript
// Key flow:
const methods = useForm<OnboardingData>({
  resolver: zodResolver(onboardingSchema),
  defaultValues: draft ?? { /* defaults */ },
  mode: "onChange",
});

// Submit handler:
const handleSubmit = async () => {
  const isValid = await methods.trigger();
  if (!isValid) return;

  const res = await fetch("/api/onboard", { method: "POST", body: JSON.stringify(methods.getValues()) });

  if (!res.ok) {
    const body = await res.json();
    setServerError(body?.error?.message || "Failed to onboard employee");
    return;
  }

  clearDraft();
  queryClient.invalidateQueries({ queryKey: ["employees"] });
  router.push("/directory");
};
```

---

## 5. UI Component Specifications

### 5.1 Employee Data Grid (TanStack Table + Virtual — Tailwind CSS)

Located at `components/directory/EmployeeDataGrid.tsx`. **All styling uses Tailwind CSS utility classes.** No inline `style={}` objects except for virtualization positioning.

Key characteristics:

- Uses `manualSorting: true` — sort state is synced to URL via nuqs
- Column definitions include: select checkbox, employee name (with Avatar), job title, department, status (StatusBadge), email, location, hire date
- Uses `lucide-react` icons for sort indicators (ArrowUpDown, ArrowUp, ArrowDown)
- Pagination footer integrated directly with Tailwind utility classes
- Rows rendered with CSS grid layout (`grid-cols-[40px_250px_200px_160px_130px_220px_130px_130px]`) instead of `<tr>` elements
- Loading skeleton with `animate-pulse` during data fetch
- Selection state managed by Zustand `useSelection` store
- Virtualized rows use absolute positioning for virtual scroll offset — the only place inline styles are used (`style={{ position: "absolute", top: 0, transform: \`translateY(${virtualRow.start}px)\` }}`)

**Column Definitions (Tailwind classes for all styling):**

```typescript
const columns: ColumnDef<EmployeeRowType>[] = [
  {
    id: "select", size: 40,
    header: () => (
      <input type="checkbox"
        className="h-4 w-4 rounded border-gray-300 text-nexus-500 cursor-pointer"
        checked={data.length > 0 && selectedIds.size === data.length}
        onChange={(e) => e.target.checked ? selectAll(data.map((r) => r.id)) : clearSelection()} />
    ),
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
      <span className="text-sm text-gray-700">{getValue<string>() || "—"}</span>
    ),
  },
  {
    id: "department", header: "Department", size: 160,
    accessorFn: (row) => row.department.name,
    cell: ({ getValue }) => (
      <span className="text-sm text-gray-600">{getValue<string>()}</span>
    ),
  },
  {
    accessorKey: "status", header: "Status", size: 130,
    cell: ({ getValue }) => <StatusBadge status={getValue() as EmpStatus} />,
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

export function EmployeeDataGrid({ data, isLoading }: EmployeeDataGridProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const { selectedIds, toggleId, selectAll, clearSelection } = useSelection();
  const { filters, setters } = useDirectoryFilters();

  const table = useReactTable({
    data, columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    enableRowSelection: true,
    manualSorting: true,
    state: { sorting: [{ id: filters.sortBy, desc: filters.sortDir === "desc" }] },
    onSortingChange: (updater) => {
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

  const { rows } = table.getRowModel();
  const rowVirtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => containerRef.current,
    estimateSize: () => 56,
    overscan: 10,
  });

  // Sort icon helper using lucide-react, all Tailwind styled
  const SortIcon = useCallback((columnId: string) => {
    if (filters.sortBy !== columnId)
      return <ArrowUpDown className="h-3 w-3 text-gray-400" />;
    return filters.sortDir === "asc"
      ? <ArrowUp className="h-3 w-3 text-nexus-500" />
      : <ArrowDown className="h-3 w-3 text-nexus-500" />;
  }, [filters.sortBy, filters.sortDir]);

  // Loading skeleton — all Tailwind classes, no inline styles
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

  // Table rendering — Tailwind for layout/styling, inline styles ONLY for virtualizer positioning
  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-card overflow-hidden">
      <div ref={containerRef} className="h-[600px] overflow-auto" style={{ contain: "strict" }}>
        <table className="w-full table-fixed">
          <thead className="sticky top-0 z-10">
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  const canSort = header.column.getCanSort();
                  return (
                    <th key={header.id} style={{ width: header.getSize() }}
                      className="table-header text-left cursor-pointer select-none"
                      onClick={canSort ? header.column.getToggleSortingHandler() : undefined}>
                      <div className="flex items-center gap-1">
                        {flexRender(header.column.columnDef.header, header.getContext())}
                        {canSort && SortIcon(header.column.id)}
                      </div>
                    </th>
                  );
                })}
              </tr>
            ))}
          </thead>
          <tbody>
            <tr style={{ height: `${rowVirtualizer.getTotalSize()}px` }}>
              <td colSpan={columns.length} className="p-0">
                <div style={{ position: "relative" }}>
                  {rowVirtualizer.getVirtualItems().map((virtualRow) => {
                    const row = rows[virtualRow.index];
                    return (
                      <div key={row.id}
                        style={{ position: "absolute", top: 0, left: 0, width: "100%", transform: `translateY(${virtualRow.start}px)` }}>
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
      {/* Pagination footer — entirely Tailwind styled */}
      <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 bg-gray-50">
        <span className="text-sm text-gray-600">
          {selectedIds.size > 0
            ? `${selectedIds.size} selected`
            : `Page ${filters.page}`}
        </span>
        <div className="flex items-center gap-2">
          <button className="btn-secondary text-xs py-1.5 disabled:opacity-50"
            disabled={filters.page <= 1}
            onClick={() => setters.setPage(Math.max(1, filters.page - 1))}>
            Previous
          </button>
          <button className="btn-secondary text-xs py-1.5"
            onClick={() => setters.setPage(filters.page + 1)}>
            Next
          </button>
        </div>
      </div>
    </div>
  );
}
```

> **Styling note**: All visual styling uses Tailwind CSS utility classes via `className`. Inline `style={}` is used **only** for runtime-driven values: virtualizer `translateY()` positioning, column widths from TanStack header sizing, and `contain: "strict"` for scroll performance. Static styles like colors, spacing, borders, and shadows always use Tailwind classes.
</pre>

### 5.2 Filter Bar

Located at `components/directory/FilterBar.tsx`. Key characteristics:

- Fetches department list dynamically via `useDepartments()` hook
- Renders as a responsive flex layout with Search icon + clearable input
- Active filters displayed as `FilterChip` components below the filter row
- Uses `lucide-react` icons (Search, X, Filter)
- "Clear filters" button shown only when filters are active

```typescript
export function FilterBar() {
  const { filters, setters, clearFilters, hasActiveFilters } = useDirectoryFilters();
  const { data: departments } = useDepartments();

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-3">
        {/* Search with icon */}
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input type="text" placeholder="Search by name, ID, or title..." className="input-field pl-10 pr-8" />
          {filters.search && <button onClick={() => setters.setSearch("")}>...</button>}
        </div>

        {/* Dynamic Department dropdown */}
        <select className="input-field w-48" value={filters.dept} onChange={...}>
          <option value="All">All Departments</option>
          {departments?.map((d) => (
            <option key={d.id} value={d.name}>{d.name} ({d.employeeCount})</option>
          ))}
        </select>

        {/* Status dropdown */}
        <select className="input-field w-44" value={filters.status} onChange={...}>
          <option value="All">All Statuses</option>
          <option value="ACTIVE">Active</option>
          <option value="ONBOARDING">Onboarding</option>
          <option value="LEAVE">On Leave</option>
          <option value="INACTIVE">Inactive</option>
        </select>

        {hasActiveFilters && <button onClick={clearFilters}>Clear filters</button>}
      </div>

      {/* Active filter chips */}
      {hasActiveFilters && (
        <div className="flex flex-wrap items-center gap-2">
          {filters.dept !== "All" && <FilterChip label="Department" value={filters.dept} onRemove={...} />}
          {filters.status !== "All" && <FilterChip label="Status" value={filters.status} onRemove={...} />}
          {filters.search && <FilterChip label="Search" value={filters.search} onRemove={...} />}
        </div>
      )}
    </div>
  );
}
```

### 5.3 Key UI Component Signatures

| Component | File | Key Features |
|---|---|---|
| `FilterChip` | `directory/FilterChip.tsx` | Removable pill with X button, `label:value` display |
| `StatusBadge` | `ui/StatusBadge.tsx` | Color-coded ring badge: green=ACTIVE, yellow=ONBOARDING, red=LEAVE, gray=INACTIVE |
| `Avatar` | `ui/Avatar.tsx` | Initials circle, sizes sm/md/lg, nexus color scheme |
| `ErrorBoundary` | `ui/ErrorBoundary.tsx` | Class-based React error boundary with retry support |
| `ErrorCard` | `ui/ErrorCard.tsx` | AlertCircle icon + message + Try Again button |
| `EmptyState` | `ui/EmptyState.tsx` | Centered icon + title + description + optional action |
| `Card` | `ui/Card.tsx` | White rounded card with border + shadow, CardHeader/CardContent sub-components |
| `LoadingSpinner` | `ui/LoadingSpinner.tsx` | Animated Loader2 icon (lucide), optional label |
| `SearchInput` | `directory/SearchInput.tsx` | Debounced input with Search icon + clear button |
| `Sidebar` | `layout/Sidebar.tsx` | Fixed left sidebar, nav items with lucide icons, collapse/expand via Zustand |
| `AppHeader` | `layout/AppHeader.tsx` | Global search + notification bell + Clerk UserButton |

---

## 6. Middleware Configuration

Uses `clerkMiddleware` (Clerk v7 API) with `createRouteMatcher` for public route detection and role-based access control.

```typescript
// middleware.ts
import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

const isPublicRoute = createRouteMatcher(["/", "/sign-in(.*)", "/sign-up(.*)", "/api/webhooks(.*)"]);

const PROTECTED_ROUTES: Record<string, string[]> = {
  "/directory": ["HR_MANAGER", "SUPER_ADMIN"],
  "/onboarding": ["HR_MANAGER", "SUPER_ADMIN"],
  "/settings": ["SUPER_ADMIN"],
  "/org-chart": ["HR_MANAGER", "SUPER_ADMIN"],
  "/dashboard": ["HR_MANAGER", "SUPER_ADMIN", "DEPT_HEAD", "EMPLOYEE"],
  "/my-profile": ["HR_MANAGER", "SUPER_ADMIN", "DEPT_HEAD", "EMPLOYEE"],
};

function getRoutePrefix(pathname: string): string | undefined {
  return Object.keys(PROTECTED_ROUTES).find((route) => pathname.startsWith(route));
}

export default clerkMiddleware(async (auth, req) => {
  if (isPublicRoute(req)) {
    return NextResponse.next();
  }

  const { userId, sessionClaims, redirectToSignIn } = await auth();

  if (!userId) {
    const signInUrl = new URL("/sign-in", req.url);
    signInUrl.searchParams.set("redirect_url", req.url);
    return redirectToSignIn({ returnBackUrl: req.url });
  }

  const routePrefix = getRoutePrefix(req.nextUrl.pathname);
  if (routePrefix) {
    const allowedRoles = PROTECTED_ROUTES[routePrefix];
    const userRole = sessionClaims?.role as string | undefined;
    if (!userRole || !allowedRoles.includes(userRole)) {
      return NextResponse.redirect(new URL("/403", req.url));
    }
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
```

> **Note on Clerk v7 API changes**:
> - `authMiddleware` (deprecated) → `clerkMiddleware`
> - `publicRoutes: [...]` (removed) → `createRouteMatcher([...])`
> - `afterAuth(callback)` (removed) → callback is the second arg to `clerkMiddleware`
> - `auth()` is now async: `await auth()`

---

## 7. Error Handling Strategy

### 7.1 API Utilities (`lib/api-utils.ts`)

All API errors follow a consistent format:

```typescript
interface ApiErrorResponse {
  error: {
    code: string;     // "VALIDATION_ERROR", "UNAUTHORIZED", "FORBIDDEN", "INTERNAL_ERROR"
    message: string;
    details?: unknown; // Zod field-level errors
  };
}
```

```typescript
// lib/api-utils.ts
import { NextResponse } from "next/server";
import { ZodError } from "zod";

export interface ApiErrorResponse {
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}

export function handleApiError(error: unknown): NextResponse<ApiErrorResponse> {
  if (error instanceof ZodError) {
    return NextResponse.json(
      { error: { code: "VALIDATION_ERROR", message: "Validation failed", details: error.flatten().fieldErrors } },
      { status: 400 }
    );
  }

  if (error instanceof Error && error.message === "UNAUTHORIZED") {
    return NextResponse.json(
      { error: { code: "UNAUTHORIZED", message: "Insufficient permissions" } },
      { status: 403 }
    );
  }

  console.error("[API Error]", error);

  return NextResponse.json(
    { error: { code: "INTERNAL_ERROR", message: "An unexpected error occurred" } },
    { status: 500 }
  );
}

export function unauthorizedResponse(): NextResponse<ApiErrorResponse> {
  return NextResponse.json(
    { error: { code: "UNAUTHORIZED", message: "You must be signed in to access this resource" } },
    { status: 401 }
  );
}

export function forbiddenResponse(): NextResponse<ApiErrorResponse> {
  return NextResponse.json(
    { error: { code: "FORBIDDEN", message: "You do not have permission to access this resource" } },
    { status: 403 }
  );
}
```

### 7.2 Utility Functions (`lib/utils.ts`)

```typescript
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function getInitials(firstName: string, lastName: string): string {
  return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency", currency: "USD", maximumFractionDigits: 0,
  }).format(amount);
}

export function formatDate(date: Date | string): string {
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric", month: "short", day: "numeric",
  }).format(new Date(date));
}
```

---

## 8. Testing Strategy

| Category | Tool | Version | What to Test |
|---|---|---|---|
| **Unit** | Vitest | 3.1.1 | Zod schemas, utility functions, Zustand stores |
| **Integration** | Vitest + vi.mock | — | API route handlers with mocked Prisma + Clerk |
| **E2E** | Playwright | 1.54.2 | Full onboarding wizard → directory verification |
| **Component** | Testing Library (planned) | 16.3.0 | FilterBar + DataGrid rendering & interaction |

### 8.1 Zod Schema Test

```typescript
// __tests__/schemas/onboarding.test.ts
import { describe, it, expect } from "vitest";
import { onboardingSchema } from "@/shared/schemas/onboarding";

describe("onboardingSchema", () => {
  const valid = {
    firstName: "Marcus", lastName: "Chen",
    departmentId: "550e8400-e29b-41d4-a716-446655440000",
    jobTitle: "Senior Engineer", salaryAmount: 135000,
  };

  it("accepts valid data", () => {
    expect(onboardingSchema.safeParse(valid).success).toBe(true);
  });
  it("rejects salary below minimum", () => {
    expect(onboardingSchema.safeParse({ ...valid, salaryAmount: 30000 }).success).toBe(false);
  });
  it("rejects salary above maximum", () => {
    expect(onboardingSchema.safeParse({ ...valid, salaryAmount: 600000 }).success).toBe(false);
  });
  it("rejects short first name", () => {
    expect(onboardingSchema.safeParse({ ...valid, firstName: "A" }).success).toBe(false);
  });
  it("rejects short last name", () => {
    expect(onboardingSchema.safeParse({ ...valid, lastName: "B" }).success).toBe(false);
  });
  it("rejects invalid department ID", () => {
    expect(onboardingSchema.safeParse({ ...valid, departmentId: "not-a-uuid" }).success).toBe(false);
  });
  it("rejects short job title", () => {
    expect(onboardingSchema.safeParse({ ...valid, jobTitle: "AB" }).success).toBe(false);
  });
  it("accepts optional fields (email, phone, location, managerId, startDate)", () => {
    const result = onboardingSchema.safeParse({ ...valid, managerId: "550e8400-...", startDate: new Date(), email: "marcus@nexus.internal", phoneNumber: "+15551234567", location: "SF" });
    expect(result.success).toBe(true);
  });
  it("rejects invalid email", () => {
    expect(onboardingSchema.safeParse({ ...valid, email: "not-an-email" }).success).toBe(false);
  });
  it("rejects missing required fields", () => {
    expect(onboardingSchema.safeParse({}).success).toBe(false);
  });
});
```

### 8.2 Employee Query Schema Test

```typescript
// __tests__/schemas/employee.test.ts
import { describe, it, expect } from "vitest";
import { employeeQuerySchema, employeeUpdateSchema } from "@/shared/schemas/employee";

describe("employeeQuerySchema", () => {
  it("accepts empty params with defaults", () => {
    const result = employeeQuerySchema.safeParse({});
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.page).toBe(1);
      expect(result.data.sortBy).toBe("lastName");
      expect(result.data.limit).toBe(50);
    }
  });
  it("coerces page number from string", () => {
    const result = employeeQuerySchema.safeParse({ page: "5" });
    if (result.success) expect(result.data.page).toBe(5);
  });
  it("rejects page below 1", () => {
    expect(employeeQuerySchema.safeParse({ page: "0" }).success).toBe(false);
  });
  it("rejects invalid sort direction", () => {
    expect(employeeQuerySchema.safeParse({ sortDir: "up" }).success).toBe(false);
  });
  it("rejects limit over 100", () => {
    expect(employeeQuerySchema.safeParse({ limit: "200" }).success).toBe(false);
  });
});

describe("employeeUpdateSchema", () => {
  it("accepts partial updates", () => {
    expect(employeeUpdateSchema.safeParse({ jobTitle: "Staff Engineer" }).success).toBe(true);
  });
  it("rejects invalid status", () => {
    expect(employeeUpdateSchema.safeParse({ status: "FIRED" }).success).toBe(false);
  });
});
```

### 8.3 API Integration Test (using vi.mock, no MSW)

```typescript
// __tests__/api/employees.test.ts
import { describe, it, expect, vi } from "vitest";
import { GET } from "@/app/api/employees/route";
import { NextRequest } from "next/server";

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

describe("GET /api/employees", () => {
  it("returns paginated data with meta", async () => {
    const req = new NextRequest(new URL("http://localhost:3000/api/employees?page=1&limit=50"));
    const res = await GET(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toHaveProperty("data");
    expect(body.meta).toHaveProperty("totalCount");
  });

  it("returns 400 for invalid page", async () => {
    const req = new NextRequest(new URL("http://localhost:3000/api/employees?page=0"));
    const res = await GET(req);
    expect(res.status).toBe(400);
  });
});
```

> **Note on testing approach**: The project uses `vi.mock()` directly on Prisma and Clerk modules rather than MSW. This is a simpler approach that avoids the MSW dependency while still providing proper integration test isolation.

---

*End of Document*