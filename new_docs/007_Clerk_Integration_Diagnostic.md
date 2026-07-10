abl# Clerk Integration Diagnostic & Verification Plan

## 1. Architecture Overview

### Authentication Flow (Request Lifecycle)

```
Browser Request
    ↓
middleware.ts (clerkMiddleware)
    ├─ Public route? → NextResponse.next()
    ├─ No userId?   → redirectToSignIn()
    └─ Has userId?  → Check sessionClaims.role vs PROTECTED_ROUTES map
        ├─ Allowed role? → NextResponse.next()
        └─ Forbidden?    → redirect("/403")
                            ↓
                   Route Handler / Page
                            ↓
                API Route: auth() from @clerk/nextjs/server
                Page:      ClerkProvider wraps root layout
```

### Component Inventory

| Component | File | Purpose | Status |
|-----------|------|---------|--------|
| ClerkProvider | `src/app/layout.tsx` | Wraps entire app with Clerk context | ✅ Correct |
| clerkMiddleware | `src/middleware.ts` | Route protection + RBAC | ✅ Correct |
| SignIn page | `src/app/sign-in/[[...sign-in]]/page.tsx` | Clerk-hosted sign-in UI | ✅ Correct |
| SignUp page | `src/app/sign-up/[[...sign-up]]/page.tsx` | Clerk-hosted sign-up UI | ✅ Correct |
| Webhook handler | `src/app/api/webhooks/clerk/route.ts` | Svix-verified user sync | ✅ Correct |
| API auth | `src/app/api/employees/route.ts` | Server-side `auth()` check | ✅ Correct |

### RBAC Matrix (Route-Level)

| Route | SUPER_ADMIN | HR_MANAGER | DEPT_HEAD | EMPLOYEE | Unauthenticated |
|-------|:-----------:|:----------:|:---------:|:--------:|:---------------:|
| `/` (landing) | ✅ | ✅ | ✅ | ✅ | ✅ |
| `/sign-in` | ✅ | ✅ | ✅ | ✅ | ✅ |
| `/sign-up` | ✅ | ✅ | ✅ | ✅ | ✅ |
| `/api/webhooks/*` | ✅ | ✅ | ✅ | ✅ | ✅ |
| `/dashboard` | ✅ | ✅ | ✅ | ✅ | ❌ → sign-in |
| `/directory` | ✅ | ✅ | ❌ | ❌ | ❌ → sign-in |
| `/onboarding` | ✅ | ✅ | ❌ | ❌ | ❌ → sign-in |
| `/org-chart` | ✅ | ✅ | ❌ | ❌ | ❌ → sign-in |
| `/settings` | ✅ | ❌ | ❌ | ❌ | ❌ → sign-in |
| `/my-profile` | ✅ | ✅ | ✅ | ✅ | ❌ → sign-in |

## 2. Local Development: OTP Email Problem & Solution

### Current Config (checked via `clerk config pull`)

```
verify_at_sign_up: false        ← Already disabled (Option B was tried)
verification_strategies: ["email_code"]  ← This is why OTP still appears on SIGN-IN
sign_in_strategies: []          ← Empty = using defaults (email code)
```

**Important:** Disabling "Verify at sign-up" (Option B) only skips OTP at **sign-up** time. But Clerk still uses `email_code` as the sign-in method — so OTP will still appear every time you **sign in**, regardless of that setting.

### The Actual Problem

On **sign-in** (not sign-up), Clerk always sends an email verification code because `verification_strategies` is set to `["email_code"]`. There is no dashboard toggle to disable this for sign-in — it's the authentication method itself.

### Solution: Clerk's Built-in Test Emails

Clerk has a built-in "test mode" specifically for local development:

1. **Use `+clerk_test` emails:** When signing up or signing in, use an email like `yourname+clerk_test@gmail.com` or `test+clerk_test@example.com`
2. **Clerk recognizes the `+clerk_test` suffix** and does NOT send a real email
3. **When the UI asks for the OTP, enter `424242`** — this is the universal test verification code that Clerk always accepts for test emails
4. **You're instantly authenticated** — no real email, no waiting

This works on **both sign-up AND sign-in**. The full OTP UI flow stays intact for testing.

### For Automated E2E Tests

`@clerk/testing`'s `clerk.signIn()` creates a **server-side token** — bypassing all OTP, email verification, passwords, everything. No email is sent. This is the official Clerk-recommended approach for Playwright/Cypress testing.

### Comparison

| Approach | OTP on Sign-In | OTP on Sign-Up | Email Sent | Good For |
|----------|:--------------:|:--------------:|:----------:|----------|
| `+clerk_test` + `424242` | Code `424242` | Code `424242` | ❌ No | Manual testing |
| Disable verify_at_sign_up | Code still appears | ✅ Skipped | Real email | Only sign-up (already applied) |
| `@clerk/testing` signIn() | ✅ Bypassed | ✅ Bypassed | ❌ No | Automated E2E tests |

## 3. Local Development: DB Sync Problem & Solution

### The Problem

In production, Clerk's flow is:
```
User signs up → Clerk fires user.created webhook → Your /api/webhooks/clerk handler runs → prisma.user.upsert() writes to DB
```

But locally, Clerk's servers **cannot reach `localhost:3000`**. So when you sign up locally:
- ✅ Clerk account is created (on Clerk's servers)
- ❌ Webhook never fires locally
- ❌ No `users` record is created in your local database

### Why This Matters

The `GET /api/employees` route does this (lines 56-72 of `src/app/api/employees/route.ts`):
```typescript
const userRecord = await prisma.user.findUnique({
  where: { email: userEmail },
  select: {
    profile: {
      select: { department: { select: { name: true } } }
    }
  }
});
```

Without the user in the DB, `userRecord` is `null` — even though your Clerk session is perfectly valid. Authenticated API calls return empty results.

### Solution: Simulate the Webhook Locally

After creating a test user in Clerk, run this command to simulate the `user.created` webhook and sync the user to your local DB:

```bash
# Get the Clerk user ID from Clerk Dashboard (Users → click user → copy ID)
# Get the webhook secret from .env

npx svix webhook send \
  --secret "$(grep CLERK_WEBHOOK_SECRET .env | cut -d= -f2)" \
  --event-type "user.created" \
  --payload "{\"data\":{\"id\":\"user_abc123\",\"email_addresses\":[{\"email_address\":\"test+clerk_test@gmail.com\"}]}}" \
  http://localhost:3000/api/webhooks/clerk
```

Expected response: `{"success":true,"event":"user.created"}`

Verify the sync:
```bash
npx prisma db execute --stdin <<SQL
SELECT id, email, role FROM users WHERE id = 'user_abc123';
SQL
```

## 4. Setting Up Test Users (Step by Step)

### Step 1: Create 4 Test Users in Clerk Dashboard

Go to [Clerk Dashboard](https://dashboard.clerk.com) → Users → Create User.

Create one user per role using `+clerk_test` emails:

| Role | Email | OTP Code | public_metadata |
|------|-------|:--------:|-----------------|
| SUPER_ADMIN | `admin+clerk_test@gmail.com` | `424242` | `{ "role": "SUPER_ADMIN" }` |
| HR_MANAGER | `hr+clerk_test@gmail.com` | `424242` | `{ "role": "HR_MANAGER" }` |
| DEPT_HEAD | `dept+clerk_test@gmail.com` | `424242` | `{ "role": "DEPT_HEAD" }` |
| EMPLOYEE | `emp+clerk_test@gmail.com` | `424242` | `{ "role": "EMPLOYEE" }` |

To set `public_metadata`:
1. Go to the user's profile in Clerk Dashboard
2. Click the **Metadata** tab
3. Under **Public**, add: `{ "role": "SUPER_ADMIN" }`
4. Click Save

### Step 2: Sync All 4 Users to Local DB

After creating each user in Clerk, note their Clerk User ID (e.g., `user_2xYZ...`), then run:

```bash
# For SUPER_ADMIN
npx svix webhook send \
  --secret "$(grep CLERK_WEBHOOK_SECRET .env | cut -d= -f2)" \
  --event-type "user.created" \
  --payload '{"data":{"id":"<clerk_user_id_1>","email_addresses":[{"email_address":"admin+clerk_test@gmail.com"}]}}' \
  http://localhost:3000/api/webhooks/clerk

# Repeat for HR_MANAGER, DEPT_HEAD, EMPLOYEE with their respective IDs and emails
```

Alternatively, create a `prisma/seed-test-users.ts` script that inserts them directly:

```typescript
import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
  const users = [
    { id: "user_SUPER_ADMIN_CLERK_ID", email: "admin+clerk_test@gmail.com", role: "SUPER_ADMIN" },
    { id: "user_HR_MANAGER_CLERK_ID", email: "hr+clerk_test@gmail.com", role: "HR_MANAGER" },
    { id: "user_DEPT_HEAD_CLERK_ID", email: "dept+clerk_test@gmail.com", role: "DEPT_HEAD" },
    { id: "user_EMPLOYEE_CLERK_ID", email: "emp+clerk_test@gmail.com", role: "EMPLOYEE" },
  ];

  for (const u of users) {
    await prisma.user.upsert({
      where: { id: u.id },
      create: u,
      update: { email: u.email, role: u.role },
    });
  }

  console.log("✅ Test users seeded");
}

main().catch(console.error).finally(() => prisma.$disconnect());
```

### Step 3: Verify Login Works

1. Start the dev server: `npm run dev`
2. Go to `http://localhost:3000/sign-in`
3. Enter `admin+clerk_test@gmail.com`
4. Enter OTP: `424242`
5. You should be redirected to `/dashboard`

## 5. Environment Configuration

### .env Variables

| Variable | Purpose | Status |
|----------|---------|:------:|
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Public key for Clerk frontend SDK | ✅ Set |
| `CLERK_SECRET_KEY` | Secret key for Clerk backend SDK | ✅ Set |
| `NEXT_PUBLIC_CLERK_SIGN_IN_URL` | Custom sign-in page path | ✅ `/sign-in` |
| `NEXT_PUBLIC_CLERK_SIGN_UP_URL` | Custom sign-up page path | ✅ `/sign-up` |
| `NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL` | Post-login redirect | ✅ `/dashboard` |
| `NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL` | Post-registration redirect | ✅ `/dashboard` |
| `CLERK_WEBHOOK_SECRET` | Svix signing secret for webhooks | ✅ Set |
| `DATABASE_URL` | PostgreSQL connection string | ✅ Set (Neon) |

### New E2E Variables to Add to `.env.example`

```env
# E2E Testing (Clerk test users)
E2E_CLERK_USER_EMAIL=admin+clerk_test@gmail.com
E2E_CLERK_USER_PASSWORD=
```

Note: `E2E_CLERK_USER_PASSWORD` may not be needed — `@clerk/testing`'s `clerk.signIn()` uses server-side tokens that bypass passwords. But include it for completeness.

## 6. Middleware Verification

Run these curl commands to verify middleware behavior (with dev server running):

```bash
# Public route — should return 200
curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/

# Protected route — should redirect (307) to /sign-in
curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/dashboard

# API route — should return 307 or 401
curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/api/employees

# Webhook route — should return 405 (only POST allowed)
curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/api/webhooks/clerk

# 403 page — should return 200
curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/403
```

## 7. Webhook Diagnostic

### Svix Verification Test

```bash
# Test with valid signature
npx svix webhook send \
  --secret "$(grep CLERK_WEBHOOK_SECRET .env | cut -d= -f2)" \
  --event-type "user.created" \
  --payload '{"data":{"id":"test_user_123","email_addresses":[{"email_address":"test@example.com"}]}}' \
  http://localhost:3000/api/webhooks/clerk
# Expected: {"success":true,"event":"user.created"}

# Test with invalid signature
curl -X POST http://localhost:3000/api/webhooks/clerk \
  -H "Content-Type: application/json" \
  -H "svix-id: test-id" \
  -H "svix-timestamp: $(date +%s)" \
  -H "svix-signature: invalid-signature" \
  -d '{"type":"user.created","data":{}}'
# Expected: 401, {"error":{"code":"INVALID_SIGNATURE"}}

# Test with missing headers
curl -X POST http://localhost:3000/api/webhooks/clerk \
  -H "Content-Type: application/json" \
  -d '{"type":"user.created","data":{}}'
# Expected: 400, {"error":{"code":"MISSING_SVIX_HEADERS"}}
```

## 8. Testing Coverage

### Current State

| Test | Authenticated? | RBAC? | Webhook? |
|------|:-------------:|:-----:|:--------:|
| `e2e/full-verification.spec.ts` | ❌ | ❌ | ❌ (invalid sig only) |
| `e2e/onboarding.spec.ts` | ❌ (placeholder) | ❌ | ❌ |

### Gaps

| Gap | Severity |
|-----|:--------:|
| No authenticated E2E tests | 🔴 Critical |
| No RBAC boundary tests per role | 🔴 Critical |
| No webhook sync E2E test | 🟠 High |
| `user.updated` webhook not handled | 🟡 Medium |
| DB `User.role` may be stale vs Clerk JWT | 🟡 Medium |

## 9. Manual Verification Checklist

Use this checklist when setting up or verifying the Clerk integration:

- [ ] Clerk Dashboard: dev instance selected, `pk_test_`/`sk_test_` keys confirmed
- [ ] Email verification: either disabled OR using `+clerk_test` emails with `424242`
- [ ] 4 test users created with `public_metadata.role` set (SUPER_ADMIN, HR_MANAGER, DEPT_HEAD, EMPLOYEE)
- [ ] All 4 users synced to local DB (via Svix CLI or seed script)
- [ ] `npm run dev` starts without errors
- [ ] Sign-in with `admin+clerk_test@gmail.com` + `424242` works
- [ ] Dashboard loads after sign-in
- [ ] SUPER_ADMIN can access `/settings`
- [ ] HR_MANAGER is redirected from `/settings` to `/403`
- [ ] DEPT_HEAD is redirected from `/directory` to `/403`
- [ ] EMPLOYEE is redirected from `/directory` to `/403`
- [ ] Webhook endpoint responds correctly to Svix-signed payloads
- [ ] Webhook user.created creates a user record in local DB
- [ ] Unit tests pass: `npm test`
- [ ] E2E tests pass: `npm run test:e2e`

---

*Clerk SDK: @clerk/nextjs ^7.5.9 | Svix: ^1.96.1 | Next.js: 16.2.9*