# Deployment Plan: Nexus Enterprise CRM

> **Goal:** Ship the `main` branch of `Pooja12Parab/Nexus-Enterprise-CRM` to a production environment, end-to-end functional, with Clerk auth and a managed Postgres database.

---

## Table of Contents

1. [Prerequisites](#1-prerequisites)
2. [Architecture Decision](#2-architecture-decision)
3. [Phase 0 — Repo & Branch Hygiene](#phase-0--repo--branch-hygiene)
4. [Phase 1 — Provision External Services](#phase-1--provision-external-services)
5. [Phase 2 — Local Pre-flight](#phase-2--local-pre-flight)
6. [Phase 3 — Deploy to Vercel](#phase-3--deploy-to-vercel)
7. [Phase 4 — Post-Deploy Wiring](#phase-4--post-deploy-wiring)
8. [Phase 5 — Smoke Test & Verification](#phase-5--smoke-test--verification)
9. [Phase 6 — Cutover & Rollback](#phase-6--cutover--rollback)
10. [Phase 7 — Observability & Handoff](#phase-7--observability--handoff)
11. [Cost Estimate](#cost-estimate)
12. [Timeline](#timeline)
13. [Risks & Mitigations](#risks--mitigations)
14. [Post-Launch Backlog](#post-launch-backlog)

---

## 1. Prerequisites

### Accounts & access
- [ ] **GitHub**: `Pooja12Parab` owner of `Nexus-Enterprise-CRM` (already done)
- [ ] **Vercel** account (free tier OK for staging; **Pro $20/mo** for production)
- [ ] **Clerk** account: dev instance is already configured at `diverse-yak-31.clerk.accounts.dev`. Create a **production Clerk instance** for the live deployment.
- [ ] **Neon** (recommended) or **Supabase** or **Railway** for managed Postgres (free tier OK for staging; ~$20/mo for production)
- [ ] **Domain** (optional; Vercel provides `*.vercel.app` for free)

### Local toolchain
- Node.js 20+ (project uses Next 16.2.9)
- npm 10+
- Git
- `psql` (optional, for DB inspection)

### Access to the current `.env`
The repo's `.env` contains real Clerk **test-mode** keys and a real **Neon dev** database. These are safe to keep in dev but must NOT be used in production.

---

## 2. Architecture Decision

**Recommendation: Vercel + Neon + Clerk (production instances)**

```
┌────────────┐    HTTPS     ┌─────────────────────┐
│   Browser  │ ───────────► │  Vercel (Next.js)   │
└────────────┘              │  - App Router       │
                            │  - Edge middleware  │
                            │  - Server actions   │
                            └──────┬──────────────┘
                                   │
                ┌──────────────────┼──────────────────┐
                │                  │                  │
                ▼                  ▼                  ▼
        ┌──────────────┐   ┌──────────────┐   ┌──────────────┐
        │ Clerk (prod) │   │ Neon Postgres│   │ svix webhook │
        │  (auth)      │   │  (Prisma)    │   │  (Clerk→DB)  │
        └──────────────┘   └──────────────┘   └──────────────┘
```

### Why Vercel
- **Zero-config Next.js**: no Dockerfile, no build pipeline
- **Edge runtime** for `middleware.ts` (your `clerkMiddleware` runs at the edge)
- **Preview deploys on every PR** (perfect for staging E2E)
- **Free TLS + CDN** via Cloudflare in front
- **Scales to zero** on free tier; **scales automatically** on Pro

### Why Neon over Supabase/Railway
- **Serverless Postgres**: scales to zero (saves $)
- **Branching**: each Vercel preview can get its own DB branch (great for E2E)
- **Connection pooling** built in
- **Prisma adapter** (`@prisma/adapter-pg`) already in your project

### Why Clerk (production instance)
- You already have dev configured; Clerk's prod instance is a one-click promotion
- Free up to 10k MAU
- Hosted sign-in components (`<SignIn />`, `<SignUp />`) already used

---

## Phase 0 — Repo & Branch Hygiene

> **Why first:** ensures we deploy a clean, known-good commit and have a way to roll back.

### Steps
- [ ] Confirm `main` is at `07efb43` (latest) on GitHub
- [ ] Tag the release: `git tag -a v1.0.0 -m "Initial public release"` and `git push origin v1.0.0`
- [ ] Create a `release/v1.0.0` branch as a safety net (optional but recommended)
- [ ] **Lock the `main` branch** in GitHub Settings → Branches → Require pull request reviews before merging (prevents accidental force-pushes after deploy)

### Verification
- [ ] `git ls-remote --tags origin` shows `v1.0.0`

---

## Phase 1 — Provision External Services

> **Why first:** these have manual setup steps and lead times. Kick off in parallel.

### 1A. Provision Neon Postgres

1. Sign in at <https://neon.tech> with GitHub
2. Create project: `nexus-enterprise-crm-prod` (region: closest to your users; AWS US-East-1 is default)
3. **Enable connection pooling** in project settings (required for serverless)
4. Copy **two** connection strings:
   - **Direct** (for `prisma db push` and `prisma db seed` from your local machine)
   - **Pooled** (for the Vercel app at runtime)
5. Save both in a password manager — you'll need them in Phase 3

### 1B. Provision Clerk Production Instance

1. Sign in at <https://dashboard.clerk.com>
2. Click **Create Application** → name `Nexus Enterprise CRM (Production)`
3. **Copy** the three production keys:
   - `pk_live_…` → `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
   - `sk_live_…` → `CLERK_SECRET_KEY`
   - `whsec_…` → `CLERK_WEBHOOK_SECRET` (from Webhooks → Add Endpoint)
4. In **Webhooks** → Add Endpoint:
   - URL: `https://<your-vercel-domain>.vercel.app/api/webhooks/clerk`
   - Events: `user.created`, `user.updated`, `user.deleted`
5. Configure sign-in methods:
   - Enable **Email + Password** (currently configured in dev)
   - Enable **Email verification code** (so tests can use `424242` in prod E2E)
   - Set Session token lifetime: 7 days
6. **Disable** dev-only settings:
   - Turn OFF "Development instance" warning
   - Configure your real production email sender (Clerk → Emails)

### 1C. Create Vercel Account & Link GitHub

1. Sign up at <https://vercel.com> with GitHub
2. Install the Vercel GitHub app and grant it access to `Pooja12Parab/Nexus-Enterprise-CRM`

### Verification
- [ ] Neon dashboard shows `nexus-enterprise-crm-prod` with a green status
- [ ] Clerk dashboard shows a Production instance with all 3 keys noted
- [ ] Vercel dashboard lists the GitHub repo

---

## Phase 2 — Local Pre-flight

> **Why:** catch issues before they hit production. Replicates the Vercel build locally.

### Steps

```bash
# 1. Use a FRESH terminal with the production .env (NOT the dev one)
cp .env.example .env.production.local
# Fill in: DATABASE_URL (Neon pooled), CLERK_*, NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY, CLERK_WEBHOOK_SECRET

# 2. Install deps
npm ci

# 3. Generate Prisma client against the NEW DB
DATABASE_URL="<neon-direct-url>" npm run db:generate

# 4. Push schema to production DB
DATABASE_URL="<neon-direct-url>" npm run db:push

# 5. Seed (optional — only if you want demo data)
DATABASE_URL="<neon-direct-url>" npm run db:seed

# 6. Run a production build (catches type errors, edge runtime issues)
npm run build

# 7. Boot the production server locally
npm start
# → http://localhost:3000 should work exactly like Vercel will
```

### Smoke test locally
- [ ] Visit `/` → landing page loads
- [ ] Visit `/sign-in` → Clerk component renders
- [ ] Visit `/directory` → redirects to sign-in (middleware works)
- [ ] Run the E2E suite: `E2E_BYPASS_AUTH=1 npm run test:e2e` (if bypass added) or accept the 12 skipped

### Fix any issues
- **Turbopack vs Webpack**: if `next dev` works but `next build` fails, check for files using `node:fs`, `node:crypto`, or `node:path` without `'use server'` boundaries
- **Edge runtime**: `middleware.ts` must use only edge-safe code; move any `prisma` calls out of middleware (your `proxy.ts` already does this correctly)

### Verification
- [ ] `npm run build` exits 0
- [ ] `npm start` serves all routes locally
- [ ] No new lint or type errors

---

## Phase 3 — Deploy to Vercel

> **The actual deploy. ~5 minutes from start to live URL.**

### Steps

1. **Vercel Dashboard** → **Add New Project** → Import `Pooja12Parab/Nexus-Enterprise-CRM`
2. **Configure**:
   - Framework Preset: **Next.js** (auto-detected)
   - Build Command: `npm run build` (default)
   - Output Directory: `.next` (default)
   - Install Command: `npm ci` (faster than `npm install`)
   - Root Directory: `./` (default)
3. **Environment Variables** — add ALL of these (mark sensitive ones as "Sensitive"):

   | Name | Value | Sensitive? |
   |---|---|---|
   | `DATABASE_URL` | Neon **pooled** connection string | ✅ |
   | `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | `pk_live_…` | |
   | `CLERK_SECRET_KEY` | `sk_live_…` | ✅ |
   | `NEXT_PUBLIC_CLERK_SIGN_IN_URL` | `/sign-in` | |
   | `NEXT_PUBLIC_CLERK_SIGN_UP_URL` | `/sign-up` | |
   | `NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL` | `/dashboard` | |
   | `NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL` | `/dashboard` | |
   | `CLERK_WEBHOOK_SECRET` | `whsec_…` | ✅ |
   | `NEXT_PUBLIC_APP_URL` | `https://<your-domain>.vercel.app` | |
   | `NEXT_PUBLIC_CLERK_SIGN_IN_FALLBACK_REDIRECT_URL` | `/` | |
   | `NEXT_PUBLIC_CLERK_SIGN_UP_FALLBACK_REDIRECT_URL` | `/` | |

4. **Click Deploy**. First build takes ~3–5 minutes (Prisma client generation + Next.js build).
5. **Wait for the green checkmark.** Note the URL: `https://nexus-enterprise-crm-<hash>.vercel.app`

### Build settings to add (Vercel Dashboard → Settings → General)
- Node.js Version: **20.x** (matches your local)
- Region: **iad1** (US East) or your nearest region

### Optional but recommended
- **Custom domain**: Settings → Domains → Add `crm.yourcompany.com` (follow DNS instructions; auto-TLS via Let's Encrypt)

### Verification
- [ ] Build succeeded (green check in Vercel dashboard)
- [ ] Visiting the URL shows the landing page
- [ ] No 500 errors in the Vercel runtime logs

---

## Phase 4 — Post-Deploy Wiring

> **The glue between Clerk, your DB, and the live URL.**

### 4A. Wire the Clerk Webhook (CRITICAL)

Without this, **new users signing up in production will NOT be created in your Postgres database** — your app will be broken.

1. Clerk Dashboard → **Webhooks** → Edit the endpoint you created in Phase 1B
2. Update the URL to your **production** domain: `https://<your-domain>/api/webhooks/clerk`
3. Save
4. Test: Clerk Dashboard → Webhooks → **Send test event** → `user.created`
5. Check Vercel logs: Settings → Logs → filter for `/api/webhooks/clerk` → should show 200

### 4B. Run the DB schema migration

The Vercel app starts with an empty Postgres. Push the schema:

```bash
# From your local machine, using the Neon DIRECT (non-pooled) URL
DATABASE_URL="<neon-direct-url>" npm run db:push
DATABASE_URL="<neon-direct-url>" npm run db:seed  # optional: 515 employees + 12 departments
```

### 4C. Smoke test the deployed app

1. Visit `https://<your-domain>/sign-up` and create a real account
2. Verify you're redirected to `/dashboard`
3. Check the Vercel logs for any errors
4. Check Neon: `SELECT id, email, role FROM "users";` — your new user should be there (proves the webhook is wired correctly)

### Verification
- [ ] Webhook test event returns 200 in Vercel logs
- [ ] New sign-up creates a `User` row in Neon
- [ ] Dashboard page renders for the signed-in user

---

## Phase 5 — Smoke Test & Verification

> **End-to-end check of every critical path.**

### Automated checks

```bash
# 1. Health check
curl -I https://<your-domain>/

# 2. API webhook guard (should be 400 without Svix headers)
curl -X POST https://<your-domain>/api/webhooks/clerk -H "Content-Type: application/json" -d '{}'
# Expected: 400 with code "MISSING_SVIX_HEADERS"

# 3. Middleware protection (should redirect to sign-in)
curl -I https://<your-domain>/dashboard
# Expected: 307 redirect to /sign-in

# 4. Run Playwright E2E against production
BASE_URL=https://<your-domain> npm run test:e2e
```

### Manual checks (10 minutes)

| # | Step | Expected |
|---|---|---|
| 1 | Visit landing page | Hero + 4 feature cards render |
| 2 | Click "Sign In" | Clerk form appears |
| 3 | Sign up with a new email | Receive email verification, complete it |
| 4 | Land on /dashboard | KPI cards render |
| 5 | Visit /directory | Table loads with seed data |
| 6 | Click Employee column header | URL updates with sortDir; rows re-sort |
| 7 | Type in search box | URL updates; rows filter |
| 8 | Visit /onboarding | 4-step wizard renders |
| 9 | Sign out | Redirected to landing page |

### Verification
- [ ] All 9 manual checks pass
- [ ] E2E suite: 17 pass, 12 skipped (expected until bypass added)

---

## Phase 6 — Cutover & Rollback

### Cutover (if replacing an existing system)
1. **DNS cutover**: update your domain's CNAME to point at Vercel
2. **Monitor** Vercel logs and Neon metrics for 30 minutes
3. **Announce** to users

### Rollback (if something goes wrong)

Vercel makes this trivial:

1. **Vercel Dashboard** → Deployments → find the last known-good deployment
2. Click the three dots → **Promote to Production**
3. Takes ~30 seconds. The bad deploy is now "Inactive" but kept for forensics.

For catastrophic issues:
1. **Revert via git**: `git revert <bad-commit-sha> && git push origin main` — Vercel auto-deploys the revert
2. **Roll back DB** (if a bad migration ran): Neon has **Time Travel** — restore to a point before the bad change

### What NOT to do
- **Don't run `prisma migrate reset` in production** — drops all data
- **Don't change `DATABASE_URL` in Vercel** without a maintenance window — all in-flight requests will fail

---

## Phase 7 — Observability & Handoff

> **Make sure you can see what's happening and respond to issues.**

### 7A. Monitoring (free tier)

- **Vercel Analytics** (free, opt-in): Settings → Analytics → Enable
- **Vercel Speed Insights** (free): shows Core Web Vitals
- **Clerk Dashboard** → User activity: sign-ups, sign-ins, errors
- **Neon Dashboard** → Metrics: query count, connection count, storage

### 7B. Error tracking (recommended, optional)

Add Sentry (free tier 5K events/month):

```bash
npm install @sentry/nextjs
npx @sentry/wizard@latest -i nextjs
# Add SENTRY_DSN to Vercel env vars
```

### 7C. Uptime monitoring (recommended)

- **UptimeRobot** (free, 50 monitors): ping `https://<domain>/` every 5 min, alert via email/Slack
- Or **Better Stack**, **Cronitor**, or Vercel's own observability (Pro tier)

### 7D. Backup

- **Neon**: automatic daily backups on paid plans; on free tier, branches serve as backups (create a branch before risky migrations)
- **Code**: GitHub is the source of truth — never lose it

### 7E. Documentation handoff

Add to your team's wiki:
- How to deploy (link to this plan)
- Who owns the Vercel, Clerk, Neon accounts
- On-call rotation
- Where the production URL is (and how to add it to the README)

---

## Cost Estimate

### Free tier (suitable for ~100 users)
| Service | Tier | Cost |
|---|---|---|
| Vercel | Hobby | $0 |
| Neon | Free | $0 (0.5 GB storage, 191 compute hours) |
| Clerk | Free | $0 (10K MAU) |
| Domain | (optional) | $10–15/yr |
| **Total** | | **$0–15/yr** |

### Production (suitable for 1K–10K users)
| Service | Tier | Cost |
|---|---|---|
| Vercel | Pro | $20/mo |
| Neon | Launch | $19/mo (2 GB, always-on) |
| Clerk | Free (under 10K MAU) | $0 |
| **Total** | | **~$40/mo** |

### Enterprise (10K+ users)
- Vercel Enterprise: custom (~$500+/mo)
- Neon Scale: ~$70+/mo
- Clerk Pro: $25/mo + $0.02 per MAU over 10K

---

## Timeline

| Phase | Duration | Can be parallel? |
|---|---|---|
| 0 — Repo hygiene | 10 min | |
| 1 — Provision services | 30 min | ✅ All three in parallel |
| 2 — Local pre-flight | 30 min | |
| 3 — Vercel deploy | 10 min (mostly wait) | |
| 4 — Post-deploy wiring | 15 min | |
| 5 — Smoke test | 15 min | |
| 6 — Cutover | 5 min (instant) | |
| 7 — Observability | 20 min | |
| **Total** | **~2 hours** | |

---

## Risks & Mitigations

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Clerk webhook URL typo | Medium | High — new users don't sync | Test webhook in Phase 4A; verify with test event |
| `DATABASE_URL` set to direct instead of pooled | High | High — serverless timeouts | Use the **pooled** URL in Vercel; use direct only for `db:push` from local |
| `prisma generate` skipped during build | Low | Build fails | Vercel auto-runs `npm run build` which calls `prisma generate`; add `"postinstall": "prisma generate"` to `package.json` as a belt-and-suspenders measure |
| Cold-start latency on Neon free tier | Medium | Medium — first request slow after idle | Neon free tier suspends; first request can take 1–2s. Upgrade to Launch ($19/mo) for always-on |
| Clerk monthly email limit hit | Low | High — verification emails stop | Clerk free = 100 emails/mo; Pro = 10K/mo. Monitor usage in dashboard |
| Secrets leaked via Vercel build logs | Low | Critical | Mark all `*_SECRET`, `*_KEY` as "Sensitive" in Vercel; Vercel redacts them from logs |
| Old Vercel deploys accumulating | Low | Low | Free tier = 100 deploys/day limit. Pro = unlimited. Use `vercel --prod` to skip previews on hotfixes |
| Custom domain DNS not propagated | Medium | Medium — users can't reach | Plan for 24–48h DNS TTL; keep Vercel preview URL as fallback |

---

## Post-Launch Backlog

Items **not** in scope for v1.0.0 but worth tracking:

- [ ] **Migrate `middleware.ts` → `proxy.ts`**: Next.js 16 deprecated `middleware` in favor of `proxy` (your build log shows the warning)
- [ ] **Add `E2E_BYPASS_AUTH` shim**: unblock the 12 currently-skipped E2E tests
- [ ] **Add real screenshots for authed pages**: complete the README gallery
- [ ] **Switch from `prisma db push` to `prisma migrate`**: version-controlled migrations, safer for team
- [ ] **Add Sentry** for production error tracking
- [ ] **CI/CD**: GitHub Actions runs `npm run lint && npm run type-check && npm run build && npm test` on every PR
- [ ] **Add `engines` field to `package.json`**: pin Node.js 20.x to prevent version drift
- [ ] **Production seed script**: only seed a couple of demo users, not 515
- [ ] **GDPR/data export**: add a "Download my data" feature for compliance
- [ ] **Rate limiting**: protect `/api/*` routes from abuse (Vercel has built-in for Pro)

---

## Quick-Reference: Commands You'll Re-Run

```bash
# Deploy a new commit to production
git push origin main
# Vercel auto-builds + deploys

# Run a DB migration
DATABASE_URL="<neon-direct-url>" npx prisma db push

# Seed the DB
DATABASE_URL="<neon-direct-url>" npm run db:seed

# Tail production logs (requires Vercel CLI)
vercel logs --prod

# Rollback to a previous deploy
# (use the Vercel dashboard — no CLI needed)
```

---

**Last updated:** 2026-08-17
**Owner:** Pooja Parab (@Pooja12Parab)
**Status:** Ready to execute
