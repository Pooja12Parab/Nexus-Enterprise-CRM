# Patterns & Decisions Explained

## Why We Built It This Way — Architectural Decisions for Freshers

---

| **Document ID** | NEXUS-PATTERNS-001 |
|---|---|
| **Version** | 1.0 |
| **Date** | 2026-06-28 |
| **Author** | Nexus Engineering Team |
| **Target Audience** | Developers learning enterprise architecture patterns |

---

## How to Use This Document

This document answers the question: **"Why did they build it this way?"**

Each section compares the MERN approach with the Nexus approach and explains the trade-offs. Read this after the Technical Learning Guide to understand the reasoning behind each decision.

---

## Table of Contents

1. [Why BFF Instead of a Separate Express Server?](#1-why-bff-instead-of-a-separate-express-server)
2. [Why Three State Managers Instead of Just Redux?](#2-why-three-state-managers-instead-of-just-redux)
3. [Why Clerk Instead of Building JWT Auth?](#3-why-clerk-instead-of-building-jwt-auth)
4. [Why Headless Components Instead of MUI DataGrid?](#4-why-headless-components-instead-of-mui-datagrid)
5. [Why Tailwind Instead of Bootstrap or CSS?](#5-why-tailwind-instead-of-bootstrap-or-css)
6. [Why Prisma Instead of Mongoose or Raw SQL?](#6-why-prisma-instead-of-mongoose-or-raw-sql)
7. [Why $transaction for Onboarding?](#7-why-transaction-for-onboarding)
8. [Why URL State Instead of useState?](#8-why-url-state-instead-of-usestate)
9. [Why Zod Instead of Just TypeScript Types?](#9-why-zod-instead-of-just-typescript-types)
10. [Why keepPreviousData Instead of Loading Spinner?](#10-why-keeppreviousdata-instead-of-loading-spinner)

---

## 1. Why BFF Instead of a Separate Express Server?

### ❌ The MERN Way

```javascript
// Frontend (React on port 3000)
fetch('http://localhost:5000/api/employees')

// Backend (Express on port 5000)
app.get('/api/employees', async (req, res) => {
  const employees = await Employee.find();
  res.json(employees);
});

// Problem: CORS error!
// Access to fetch at 'http://localhost:5000' from origin 'http://localhost:3000'
// has been blocked by CORS policy.
```

You'd add CORS middleware, configure it, and hope it works in production too.

### ✅ The Nexus Way

```typescript
// Frontend and backend are in the SAME project
// No CORS needed — same origin!
fetch('/api/employees')
```

### 🤔 Why This Decision?

**The Problem with Two Servers:**

| Issue | MERN (Two Servers) | Nexus (Next.js) |
|---|---|---|
| CORS | Must configure, varies by environment | None — same origin |
| Deployment | Deploy frontend to Vercel/Netlify + backend to AWS/Heroku | One deployment to Vercel |
| Environment vars | Need separate .env for frontend and backend | One .env for everything |
| Code sharing | Types/validation must be duplicated or published as npm package | `shared/` folder imports everywhere |
| CI/CD | Two pipelines, two build steps | One pipeline, one build |

### 🧠 Mental Model

> "Think of Next.js API routes as Express routes that live in the same folder as your React components. They share the same port, the same deployment, and the same types."

### ⚠️ When This Pattern Doesn't Work

- **Mobile apps**: If you need to share the API with a mobile app, BFF is not enough. You'd need a separate general-purpose API.
- **Microservices**: If different teams own frontend and backend, they should be separate repos.
- **Third-party access**: If external partners need API access, BFF can't serve them.

---

## 2. Why Three State Managers Instead of Just Redux?

### ❌ The MERN Way

In a typical MERN app, you'd reach for Redux:

```javascript
// store.js — lots of boilerplate
const initialState = { employees: [], loading: false };
const employeeReducer = (state, action) => {
  switch (action.type) {
    case 'FETCH_EMPLOYEES': return { ...state, loading: true };
    case 'SET_EMPLOYEES': return { ...state, employees: action.payload, loading: false };
  }
};
```

**Problems with Redux for everything:**
- Boilerplate for simple operations
- Server state (data from API) needs caching logic you have to build yourself
- URL state (filters, page) needs manual sync with the browser URL

### ✅ The Nexus Way

| State Type | Manager | Why This One? |
|---|---|---|
| **Server Data** (employees, departments) | TanStack Query | Auto-caching, refetching, retry, invalidation |
| **URL State** (filters, page, sort) | nuqs | Auto-syncs with URL, shareable links |
| **UI State** (sidebar, drafts, selection) | Zustand | Lightweight, no boilerplate |

### 🤔 Why Three?

**Each tool solves ONE problem well:**

```
❌ If we used Redux for everything:
   - We'd write reducers for API data
   - We'd write middleware for API calls
   - We'd manually sync URL params
   - We'd write selectors for everything
   → 1000+ lines of boilerplate

✅ With three tools:
   - TanStack Query: 30 lines for useEmployees()
   - nuqs: 20 lines for useDirectoryFilters()
   - Zustand: 15 lines for useSidebar()
   → 65 lines total
```

### 🧠 Mental Model

> "Think of it like three tools in a toolbox. You wouldn't use a hammer for screws. Don't use Redux for everything. Use the RIGHT tool for each job."

### 🔀 Decision Guide

```javascript
if (data comes from server) → use TanStack Query
if (state needs URL sharing) → use nuqs
if (state is ephemeral UI) → use Zustand
if (state needs localStorage) → use Zustand + persist
```

---

## 3. Why Clerk Instead of Building JWT Auth?

### ❌ The MERN Way

```javascript
// What you'd need to build yourself:
// 1. User model with hashed passwords
// 2. POST /api/auth/signup
// 3. POST /api/auth/login
// 4. JWT signing + verification
// 5. Auth middleware
// 6. Password reset flow
// 7. Email verification
// 8. Token refresh logic
// 9. Frontend auth context/hook
// 10. Login/signup UI pages
```

**And if the business asks for:**
- "Can we add Google login?" → Implement OAuth 2.0
- "Can we add MFA?" → Implement TOTP
- "Can we add SAML/SSO?" → Implement SAML protocol
- "Can we see who logged in?" → Build an admin dashboard

### ✅ The Nexus Way

```typescript
// All of the above... handled by Clerk

// You only need:
import { clerkMiddleware } from "@clerk/nextjs/server";

export default clerkMiddleware(async (auth, req) => {
  const { userId } = await auth();
  // That's it! Clerk handles everything else.
});
```

### 🤔 Why This Decision?

| Feature | Building It Yourself | Clerk |
|---|---|---|
| Sign-up/Sign-in UI | Build from scratch | Ready-made, customizable |
| Password security | bcrypt, salting, hashing | Managed by Clerk |
| JWT management | sign, verify, refresh, blacklist | Automatic |
| Email verification | SMTP setup, email templates | Built-in |
| Password reset | Token generation, email flow | Built-in |
| Social login (Google/GitHub) | OAuth 2.0 implementation | One click setup |
| MFA | TOTP implementation | One click setup |
| SAML/SSO | SAML protocol implementation | Enterprise plan |
| Admin dashboard | Build from scratch | Clerk Dashboard |
| Development time | Weeks to months | Hours |

### 🧠 Mental Model

> "Building auth yourself is like building your own bank vault. You CAN do it, but why would you? Let the experts handle security so you can focus on your application."

### ⚠️ Trade-offs

- **Cost**: Clerk is free for basic use, but enterprise features (SSO, MFA) are paid
- **Vendor lock-in**: Migrating away from Clerk requires rebuilding auth
- **Control**: You can't customize the sign-in flow as much as a custom solution
- **Data privacy**: User data lives on Clerk's servers (consider regulations like GDPR)

---

## 4. Why Headless Components Instead of MUI DataGrid?

### ❌ The MERN Way

```jsx
import { DataGrid } from '@mui/x-data-grid';

function EmployeeTable() {
  return (
    <DataGrid
      rows={employees}
      columns={columns}
      pageSize={50}
      checkboxSelection
      // Looks great... until you need to customize it
    />
  );
}
```

**Problems with MUI DataGrid:**
- **Customization limits**: Want a different row design? You're fighting the library
- **Bundle size**: MUI is 100KB+ just for the data grid
- **Styling conflicts**: MUI's CSS-in-JS can conflict with your styles
- **Version lock**: When MUI updates, your customizations might break

### ✅ The Nexus Way

```tsx
// TanStack Table gives you LOGIC, not HTML
const table = useReactTable({
  data, columns,
  getCoreRowModel: getCoreRowModel(),
  manualSorting: true,
});

// You write the HTML with Tailwind
return (
  <table className="w-full table-fixed">
    <thead className="sticky top-0">
      {table.getHeaderGroups().map(headerGroup => (
        <tr key={headerGroup.id}>
          {headerGroup.headers.map(header => (
            <th key={header.id} className="table-header">
              {flexRender(header.column.columnDef.header, header.getContext())}
            </th>
          ))}
        </tr>
      ))}
    </thead>
  </table>
);
```

### 🤔 Why This Decision?

| Aspect | MUI DataGrid | TanStack Table + Tailwind |
|---|---|---|
| Control | Limited to MUI's API | 100% — you write the HTML |
| Bundle size | ~100KB+ | ~15KB (tables are treeshakable) |
| Customization | Style overrides, sx props | Any Tailwind class |
| Learning curve | Learn MUI's API | Learn TanStack's hook API |
| Breaking changes | Major version upgrades break | Minimal API surface |

### 🧠 Mental Model

> "MUI DataGrid is like a furnished apartment. It looks great but you can't change the walls. TanStack Table is like buying land — you build exactly what you want."

### When to Use MUI Anyway

- **Rapid prototyping**: MUI gets you a table in 5 minutes
- **Internal tools**: If nobody cares about custom design
- **Standard layouts**: If your design matches MUI's defaults perfectly

---

## 5. Why Tailwind Instead of Bootstrap or CSS?

### ❌ The MERN Way

```css
/* Option 1: Separate CSS file */
.employee-card { background: white; border-radius: 8px; padding: 16px; }

/* Option 2: Bootstrap */
<div class="card p-4">

/* Option 3: CSS Modules */
import styles from './Card.module.css';
<div className={styles.card}>
```

**Problems:**
- **CSS**: Naming is hard (BEM, SMACSS), dead CSS accumulates
- **Bootstrap**: All sites look like Bootstrap
- **CSS Modules**: Many files, context switching

### ✅ The Nexus Way

```tsx
// All styles in className — one file, no naming, no dead code
<div className="bg-white rounded-lg p-4 shadow-card">
```

### 🤔 Why This Decision?

| Problem | Solution |
|---|---|
| "I need to name this class" | No names needed — just utility classes |
| "Is this CSS still used?" | Tailwind only generates what you use |
| "These colors don't match" | Design tokens in `@theme` enforce consistency |
| "I need responsive" | `sm:`, `md:`, `lg:` prefixes built-in |
| "I need dark mode" | `dark:` variants built-in |
| "How do I organize?" | Group utility classes by category in `className` |

### 🧠 Mental Model

> "Think of Tailwind classes as inline styles that are optimized, responsive, and consistent. Instead of `style={{ background: 'white', padding: '16px' }}`, you write `className="bg-white p-4"`. Same concept, but better."

### ⚠️ Common Criticism

**"But className looks ugly with 10+ classes!"**

```tsx
// Yes, it's verbose. But:
// 1. You never leave your component file
// 2. You never think about naming
// 3. You never write CSS selectors
// 4. You never worry about cascade specificity
// 5. The bundle is 100% used CSS, zero dead code
```

---

## 6. Why Prisma Instead of Mongoose or Raw SQL?

### ❌ The MERN Way

```javascript
// Mongoose — no type safety
const Employee = mongoose.model('Employee', {
  firstName: String,
  lastName: String,
  department: { type: ObjectId, ref: 'Department' },
});

// Query — no autocomplete on fields
const emp = await Employee.findById(id);
// emp.firstName — TypeScript doesn't know this exists!
```

### ✅ The Nexus Way

```prisma
model EmployeeProfile {
  firstName  String
  lastName   String
  department Department @relation(fields: [departmentId], references: [id])
  departmentId String
}
```

```typescript
// Generated TypeScript types — full autocomplete!
const emp = await prisma.employeeProfile.findUnique({
  where: { id: "123" },
  include: { department: true },
});
// emp.firstName → autocompletes, typechecks, cannot be null
// emp.department.name → autocompletes through the relation
```

### 🤔 Why This Decision?

| Feature | Mongoose (MongoDB) | Prisma (PostgreSQL) |
|---|---|---|
| Type safety | None (JavaScript) | Full (generated from schema) |
| Relations | Manual population, slow | Foreign keys, fast joins |
| Schema enforcement | None (anything valid JSON) | Strict (PostgreSQL constraints) |
| Migrations | Manual scripts | `prisma migrate` |
| Query building | Chain methods | Type-safe API |
| Performance | Denormalized (fast reads) | Normalized (ACID compliant) |

### 🧠 Mental Model

> "MongoDB is like a filing cabinet where you can throw anything in any drawer. PostgreSQL is like a spreadsheet with formulas — every column has a type, every row relates to others. Prisma is the smart assistant that knows your spreadsheet structure and won't let you make mistakes."

### When MongoDB Makes Sense

- **Rapid prototyping**: Schema-less means faster iterations
- **Unstructured data**: Documents with varying fields
- **High write throughput**: MongoDB can be faster for simple writes
- **Early stage startups**: Don't need migrations yet

---

## 7. Why $transaction for Onboarding?

### ❌ The MERN Way

```javascript
// Create employee
const employee = await Employee.create(data);

// Create salary record
const salary = await Salary.create({ employeeId: employee._id, amount });

// Create audit log
const log = await AuditLog.create({ userId, action: 'CREATED' });

// If salary creation fails, the employee exists without a salary!
// Data is INCONSISTENT
```

### ✅ The Nexus Way

```typescript
// All or nothing
const result = await prisma.$transaction(async (tx) => {
  const employee = await tx.employeeProfile.create({ data });
  await tx.salary.create({ data: { employeeId: employee.id, amount } });
  await tx.auditLog.create({ data: { userId, action: 'CREATED' } });
  return employee;
});
// If ANY of these fail, ALL are rolled back
// Data is CONSISTENT
```

### 🤔 Why This Decision?

**Real-world scenario:**

```
Scenario 1: $transaction is NOT used

1. Employee is created ✓
2. Power outage during salary creation ✗
3. Database state: Employee exists, NO salary, NO audit log
4. HR manager thinks onboarding failed → tries again
5. Now we have DUPLICATE employee records

Scenario 2: $transaction IS used

1. Employee is created ✓
2. Power outage during salary creation ✗
3. Database state: Nothing changed (rolled back)
4. HR manager tries again → clean state
5. All records created consistently
```

### 🧠 Mental Model

> "Think of $transaction like a bank transfer. If the money leaves your account but doesn't arrive at the destination, the bank reverses the transaction. Prisma does the same for database operations."

### 🛠️ When to Use $transaction

| Scenario | Use Transaction? |
|---|---|
| Creating employee + salary + audit log | ✅ Yes |
| Fetching paginated data + total count | ✅ Yes (consistency) |
| Reading a single record | ❌ No |
| Updating a single field | ❌ No |

---

## 8. Why URL State Instead of useState?

### ❌ The MERN Way

```javascript
function Directory() {
  const [dept, setDept] = useState('All');
  const [page, setPage] = useState(1);

  // Problem: Refresh the page → filters are gone!
  // Problem: Can't send a link to this view
  // Problem: Back button doesn't work
}
```

### ✅ The Nexus Way

```typescript
function Directory() {
  const [dept, setDept] = useQueryState('dept', parseAsString.withDefault('All'));
  const [page, setPage] = useQueryState('page', parseAsInteger.withDefault(1));

  // URL: /directory?dept=Engineering&page=3
  // Refresh → filters preserved
  // Copy URL → colleague sees same view
  // Back button → works automatically
}
```

### 🤔 Why This Decision?

**What the URL gives you for free:**

1. **Persistence**: Survives page refresh (no localStorage needed)
2. **Shareability**: Copy/paste URL = exact same view
3. **Browser history**: Back/Forward buttons work naturally
4. **Bookmarks**: Save a specific filtered view
5. **No extra storage**: URL is the state — nothing to sync

### 🧠 Mental Model

> "Think of the URL as global state that's automatically synced to the browser. Instead of storing filter state in React (which disappears on refresh), store it in the URL (which survives forever)."

### 🔀 When to Use Each

```
┌─────────────────────┬─────────────────────┐
│ Put in URL (nuqs)   │ Keep in Zustand      │
├─────────────────────┼─────────────────────┤
│ Department filter   │ Sidebar open/closed  │
│ Search text         │ Selected row IDs     │
│ Page number         │ Form drafts          │
│ Sort column/direction│ Notification toasts  │
│                     │                      │
│ Reason: Shareable!   │ Reason: Ephemeral!  │
└─────────────────────┴─────────────────────┘
```

---

## 9. Why Zod Instead of Just TypeScript Types?

### ❌ The MERN Way

```typescript
// TypeScript interface — exists only at compile time!
interface OnboardingData {
  firstName: string;
  age: number;
}

// What happens at runtime when API sends:
fetch('/api/onboard', {
  method: 'POST',
  body: JSON.stringify({ firstName: 123, age: 'old' })
  // TypeScript sees NO errors!
  // But firstName should be string, age should be number!
});
```

### ✅ The Nexus Way

```typescript
// Zod schema — validates at RUNTIME
const onboardingSchema = z.object({
  firstName: z.string().min(2),  // Rejects numbers, short strings
  age: z.number().min(18),       // Rejects strings, underage
});

// Client side: validates form input
const methods = useForm({ resolver: zodResolver(onboardingSchema) });

// Server side: validates API request
const parsed = onboardingSchema.safeParse(body);
if (!parsed.success) return 400;
// Guaranteed: parsed.data.firstName is a string, age is a number
```

### 🤔 Why This Decision?

| Feature | TypeScript Interfaces | Zod Schemas |
|---|---|---|
| **Exists at runtime** | ❌ No (compiled away) | ✅ Yes |
| **Validates input** | ❌ No (design-time only) | ✅ Yes |
| **Generates types** | ✅ Yes (manual) | ✅ Yes (automatic via `z.infer`) |
| **Custom error messages** | ❌ No | ✅ Yes |
| **Parses/coerces types** | ❌ No | ✅ Yes (`z.coerce.number()`) |

### 🧠 Mental Model

> "TypeScript tells your editor what the data SHOULD look like. Zod tells your code what the data ACTUALLY looks like. You need both — one for development, one for runtime."

### 🔴 Real Example

```typescript
// An API receives: { salaryAmount: "135000" }  ← string, not number!

// Without Zod:
const salary = body.salaryAmount; // TypeScript thinks it's a number
salary.toFixed(2); // Runtime ERROR! Strings don't have toFixed()

// With Zod:
// z.number().min(40000) — rejects strings!
// Or use z.coerce.number() to convert "135000" → 135000
const parsed = onboardingSchema.safeParse(body);
// parsed.data.salaryAmount is GUARANTEED to be a number
```

---

## 10. Why keepPreviousData Instead of Loading Spinner?

### ❌ The MERN Way

```javascript
function Directory() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);

  async function goToPage(page) {
    setLoading(true);  // ← Shows loading spinner
    const res = await fetch(`/api/employees?page=${page}`);
    const newData = await res.json();
    setData(newData);
    setLoading(false);  // ← Hides spinner, shows data
  }

  // User sees: [data] → [SPINNER] → [new data]
  // The old data DISAPPEARS while fetching!
}
```

### ✅ The Nexus Way

```typescript
const { data } = useEmployees({ page });
// User sees: [page 1 data] → [page 1 data still visible] → [page 2 data]
// The old data STAYS while fetching!
```

### 🤔 Why This Decision?

**The UX difference:**

```
❌ Without keepPreviousData:
  Page 1: Employee A, Employee B, Employee C
  Click Next → Loading spinner... (BLANK SCREEN)
  Page 2: Employee D, Employee E, Employee F
  → User experienced a FLASH + LOST CONTEXT

✅ With keepPreviousData:
  Page 1: Employee A, Employee B, Employee C
  Click Next → Still showing Employee A, B, C (in background)
  Page 2: Employee D, Employee E, Employee F
  → User experienced SMOOTH TRANSITION
```

### 🧠 Mental Model

> "Think of keepPreviousData as 'show the old photo while loading the new one.' The user can still read the old data instead of staring at a spinner."

### ⚠️ When NOT to Use

- **Real-time data**: Stock prices, live scores (stale data is misleading)
- **First load**: There's no previous data to show (just show the spinner)
- **Critical updates**: Showing stale data might cause incorrect decisions

---

## Summary: Decision Matrix

| Pattern | MERN Equivalent | Why We Changed | Key Benefit |
|---|---|---|---|
| BFF | Express API server | One deployment, no CORS, shared types | Developer velocity |
| 3 state managers | Redux | Right tool for each job | Less boilerplate |
| Clerk | JWT auth | Security is hard, don't build it | Time to market |
| Headless components | MUI DataGrid | 100% design control | Customizability |
| Tailwind CSS | Bootstrap/CSS | No naming, no dead code | Consistency |
| Prisma | Mongoose/raw SQL | Type safety, migrations | Data integrity |
| $transaction | Separate queries | Data consistency | Reliability |
| URL state | useState | Shareability, persistence | UX |
| Zod | TypeScript only | Runtime validation | Safety |
| keepPreviousData | Loading spinner | Smooth pagination | UX |

---

*End of Document*