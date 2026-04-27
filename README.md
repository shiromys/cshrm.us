# CloudSourceHRM — Developer Guide

**Version:** 1.3 | **Stack:** Next.js 15 · Drizzle ORM · Neon PostgreSQL · Better Auth · AhaSend · Resend · Stripe · pg-boss

---

## Table of Contents

1. [Prerequisites](#1-prerequisites)
2. [Project Structure](#2-project-structure)
3. [Local Development Setup](#3-local-development-setup)
4. [Running the App Locally](#4-running-the-app-locally)
5. [Testing Key Flows](#5-testing-key-flows)
6. [Pushing to GitHub](#6-pushing-to-github)
7. [Deploying to Vercel](#7-deploying-to-vercel)
8. [Post-Deployment Checklist](#8-post-deployment-checklist)
9. [Environment Variables Reference](#9-environment-variables-reference)

---

## 1. Prerequisites

Install these tools on your machine before starting:

| Tool | Version | Install |
|------|---------|---------|
| Node.js | ≥ 20.x | https://nodejs.org |
| pnpm | ≥ 9.x | `npm install -g pnpm` |
| Docker Desktop | Latest | https://docker.com |
| Git | Latest | https://git-scm.com |

---

## 2. Project Structure

```
cloudsourcehrm/
├── apps/
│   └── web/                    ← Next.js 15 app (frontend + API)
│       ├── src/
│       │   ├── app/
│       │   │   ├── (auth)/     ← Login, register, forgot-password pages
│       │   │   ├── (app)/      ← Protected member portal (dashboard, contacts, etc.)
│       │   │   ├── (public)/   ← Public landing pages (no auth)
│       │   │   └── api/        ← All API route handlers
│       │   ├── lib/            ← Core libraries (auth, db, email, queue, stripe)
│       │   └── components/     ← UI components
│       ├── vercel.json         ← Cron job configuration
│       └── package.json
├── packages/
│   └── db/                     ← Drizzle ORM schema + migrations
│       ├── src/schema/         ← All database table definitions
│       └── drizzle.config.ts
├── docker-compose.yml          ← Local PostgreSQL
├── turbo.json
├── pnpm-workspace.yaml
└── .env.example
```

---

## 3. Local Development Setup

### Step 1 — Clone the repository

```bash
git clone https://github.com/YOUR_ORG/cloudsourcehrm.git
cd cloudsourcehrm
```

### Step 2 — Install dependencies

```bash
pnpm install
```

This installs all dependencies across both `apps/web` and `packages/db`.

### Step 3 — Create environment file

```bash
cp .env.example apps/web/.env.local
```

Edit `apps/web/.env.local`. For local development, you only need these to start:

```bash
# Local PostgreSQL (matches docker-compose)
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/cloudsourcehrm"
POSTGRES_URL="postgresql://postgres:postgres@localhost:5432/cloudsourcehrm"
POSTGRES_URL_UNPOOLED="postgresql://postgres:postgres@localhost:5432/cloudsourcehrm"

# Better Auth — generate with: openssl rand -hex 32
BETTER_AUTH_SECRET="your-local-secret-here"
BETTER_AUTH_URL="http://localhost:3000"

# App URL
NEXT_PUBLIC_APP_URL="http://localhost:3000"

# Cron security (any string works locally)
CRON_SECRET="local-dev-cron-secret"

# HMAC secrets (generate with: openssl rand -hex 32)
UNSUBSCRIBE_HMAC_SECRET="local-unsub-secret"
OPEN_TRACKING_HMAC_SECRET="local-tracking-secret"

# Email — use Resend test mode locally
RESEND_API_KEY="re_your_test_key"
EMAIL_FROM_ADDRESS="noreply@mail.cloudsourcehrm.us"

# AhaSend — can be left blank for dev (emails will still work via Resend fallback)
AHASEND_API_KEY=""
AHASEND_API_URL="https://api.ahasend.com"
AHASEND_WEBHOOK_SECRET="local-ahasend-secret"

# Stripe test keys
STRIPE_SECRET_KEY="sk_test_your_test_key"
STRIPE_WEBHOOK_SECRET="whsec_your_test_secret"
STRIPE_PRICE_ID_STANDARD="price_test_standard"
STRIPE_PRICE_ID_CHRMNEXUS="price_test_chrmnexus"
STRIPE_PRICE_ID_CREDITS="price_test_credits"

# CHRMNEXUS (stub is used if API is unreachable)
CHRMNEXUS_API_URL="https://www.cloudsourcehrm.com/api"
```

### Step 4 — Start local PostgreSQL

```bash
docker-compose up -d
```

This starts a PostgreSQL 16 instance at `localhost:5432`.

Verify it's running:
```bash
docker ps
# You should see: cloudsourcehrm-postgres-1
```

### Step 5 — Run database migrations

```bash
cd packages/db
pnpm db:migrate
```

This creates all tables (users, contacts, campaigns, hotlists, etc.) in your local database.

To visually browse your local database:
```bash
pnpm db:studio
# Opens Drizzle Studio at https://local.drizzle.studio
```

### Step 6 — (Optional) Create an admin account manually

After running migrations, create your first admin account directly in the database:

```bash
# Connect to local postgres
docker exec -it $(docker ps -q -f name=postgres) psql -U postgres -d cloudsourcehrm

# Inside psql, first register a normal account through the app at http://localhost:3000/register
# Then promote it to admin:
UPDATE users SET role = 'admin', tier = 'standard' WHERE email = 'admin@youremail.com';
\q
```

---

## 4. Running the App Locally

From the project root:

```bash
pnpm dev
```

Turbo runs the dev server. The app starts at:

| URL | Purpose |
|-----|---------|
| http://localhost:3000 | Redirects to /dashboard |
| http://localhost:3000/login | Sign in |
| http://localhost:3000/register | Create account |
| http://localhost:3000/employers | Public employer landing page |
| http://localhost:3000/candidates | Public candidate landing page |
| http://localhost:3000/dashboard | Member portal (requires auth) |
| http://localhost:3000/admin | Admin panel (requires admin role) |

### Testing Stripe webhooks locally

Install the Stripe CLI: https://stripe.com/docs/stripe-cli

```bash
stripe login
stripe listen --forward-to http://localhost:3000/api/webhooks/stripe
```

Copy the webhook signing secret it shows and put it in your `.env.local` as `STRIPE_WEBHOOK_SECRET`.

### Testing Resend webhooks locally

Use ngrok to expose your local server:
```bash
npx ngrok http 3000
# Copy the https URL (e.g. https://abc123.ngrok.io)
```

Add this URL as a webhook endpoint in your Resend dashboard:
```
https://abc123.ngrok.io/api/webhooks/resend
```

---

## 5. Testing Key Flows

### Flow 1 — Register and upgrade

1. Go to http://localhost:3000/register
2. Create an account
3. Check your email for the verification link (Resend test mode)
4. Log in at http://localhost:3000/login
5. Go to Settings → Upgrade to Standard

### Flow 2 — Add contacts (employer landing page)

1. Visit http://localhost:3000/employers (public, no auth)
2. Fill in the form and submit
3. Log in as admin → Admin Panel → Leads Management → Approve & Migrate

### Flow 3 — Create and send a campaign

1. Log in as a Standard user
2. Go to Contacts — verify you have contacts (add some as admin if needed)
3. Go to Campaigns → New Campaign
4. Fill in name, subject, body, target audience
5. Click "Save as Draft" then "Send" from the campaigns list
6. Go to Campaigns → view the campaign — status should change to "sending"
7. The cron job processes emails. Locally you can trigger it manually:

```bash
# Trigger email processing manually (simulate Vercel Cron)
curl -H "Authorization: Bearer local-dev-cron-secret" http://localhost:3000/api/cron/process-emails
```

### Flow 4 — Create a hotlist

1. Go to Hotlists → New Hotlist
2. Enter a name and select visible columns
3. Click "Manage" to open the hotlist detail page
4. Use Excel Upload, Manual Entry, or Copy-Paste to add candidates
5. Click Preview to see the rendered HTML table
6. Click Send to dispatch the hotlist email

### Flow 5 — CSV import (employer contacts)

1. Log in as Standard user
2. Go to My Contacts → Import CSV
3. Upload a CSV with columns: email, name, company_name, city, state
4. Log in as admin → Admin Panel → CSV Batches → Approve
5. Return to My Contacts — your contacts now appear

---

## 6. Pushing to GitHub

### Initial push

```bash
# From the project root
git init
git add .
git commit -m "Initial commit — CloudSourceHRM v1.3"

# Create a GitHub repository first at github.com, then:
git remote add origin https://github.com/YOUR_ORG/cloudsourcehrm.git
git branch -M main
git push -u origin main
```

### Daily workflow

```bash
git add .
git commit -m "Your commit message"
git push
```

---

## 7. Deploying to Vercel

### Step 1 — Provision external services

Before deploying, you need accounts and API keys for:

| Service | Sign up | What you need |
|---------|---------|---------------|
| Vercel | vercel.com | Pro plan (required for Cron Jobs) |
| Resend | resend.com | API key + verify mail.cloudsourcehrm.us domain |
| AhaSend | ahasend.com | API key + verify mail.cloudsourcehrm.us domain |
| Stripe | stripe.com | Live secret key + 3 product price IDs |
| Cloudflare | cloudflare.com | Add cloudsourcehrm.us domain |

### Step 2 — Create Vercel project

1. Go to vercel.com → **Add New** → **Project**
2. Import your GitHub repository
3. **Root Directory**: `apps/web`
4. **Build Command**: `pnpm vercel-build`
5. **Output Directory**: `.next`
6. **Do NOT deploy yet** — add Postgres first

### Step 3 — Add Vercel Postgres (Neon)

1. Vercel dashboard → your project → **Storage** tab
2. **Create Database** → **Postgres** (powered by Neon)
3. Choose region closest to your users (e.g., `us-east-1`)
4. Vercel auto-injects: `POSTGRES_URL`, `POSTGRES_URL_UNPOOLED`

### Step 4 — Set all environment variables

Go to Vercel dashboard → Settings → Environment Variables and add:

```
BETTER_AUTH_SECRET          → openssl rand -hex 32
BETTER_AUTH_URL             → https://member.cloudsourcehrm.us
RESEND_API_KEY              → from Resend dashboard
RESEND_WEBHOOK_SECRET       → from Resend dashboard (Svix signing secret)
EMAIL_FROM_ADDRESS          → noreply@mail.cloudsourcehrm.us
EMAIL_FROM_DOMAIN           → mail.cloudsourcehrm.us
AHASEND_API_KEY             → from AhaSend dashboard
AHASEND_API_URL             → https://api.ahasend.com
AHASEND_WEBHOOK_SECRET      → from AhaSend webhook config
STRIPE_SECRET_KEY           → sk_live_xxx
STRIPE_WEBHOOK_SECRET       → whsec_xxx
STRIPE_PRICE_ID_STANDARD    → price_xxx (Standard $95/month)
STRIPE_PRICE_ID_CHRMNEXUS   → price_xxx (CHRMNEXUS add-on)
STRIPE_PRICE_ID_CREDITS     → price_xxx (Overage credits)
UNSUBSCRIBE_HMAC_SECRET     → openssl rand -hex 32
OPEN_TRACKING_HMAC_SECRET   → openssl rand -hex 32
CRON_SECRET                 → openssl rand -hex 32
CHRMNEXUS_API_URL           → https://www.cloudsourcehrm.com/api
NEXT_PUBLIC_APP_URL         → https://member.cloudsourcehrm.us
```

### Step 5 — Configure custom domain

1. Vercel dashboard → Settings → Domains → **Add** `member.cloudsourcehrm.us`
2. In Cloudflare DNS: Add CNAME record:
   - Name: `member`
   - Target: `cname.vercel-dns.com`
   - Proxy: Proxied (orange cloud)

### Step 6 — Verify Resend sending domain

1. Resend dashboard → Domains → **Add Domain** → `mail.cloudsourcehrm.us`
2. Add the DNS records Resend gives you to Cloudflare
3. Click "Verify" in Resend dashboard

### Step 7 — Verify AhaSend sending domain

1. AhaSend dashboard → Sending Domains → **Add Domain** → `mail.cloudsourcehrm.us`
2. Add AhaSend's DKIM CNAME records to Cloudflare (different selector from Resend — both can coexist)
3. Verify in AhaSend dashboard

### Step 8 — Configure Stripe webhooks

1. Stripe dashboard → Developers → Webhooks → **Add Endpoint**
2. URL: `https://member.cloudsourcehrm.us/api/webhooks/stripe`
3. Events: `customer.subscription.created`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.payment_succeeded`
4. Copy the signing secret → paste as `STRIPE_WEBHOOK_SECRET` in Vercel

### Step 9 — Configure email provider webhooks

**Resend:**
- Dashboard → Webhooks → Add: `https://member.cloudsourcehrm.us/api/webhooks/resend`
- Events: `email.delivered`, `email.bounced`, `email.complained`, `email.opened`

**AhaSend:**
- Dashboard → Webhooks → Configure: `https://member.cloudsourcehrm.us/api/webhooks/ahasend`
- Events: delivered, bounced, complained
- Copy HMAC secret → `AHASEND_WEBHOOK_SECRET` in Vercel

### Step 10 — Deploy

```bash
git push origin main
```

Vercel auto-deploys on every push to `main`. The `vercel-build` script runs migrations automatically before building.

Monitor the build at: Vercel dashboard → Deployments

### Step 11 — Create first admin user

1. Register at `https://member.cloudsourcehrm.us/register`
2. Connect to Neon dashboard → SQL Editor:

```sql
UPDATE users
SET role = 'admin', tier = 'standard'
WHERE email = 'your@email.com';
```

### Step 12 — Verify Cron Jobs

Go to Vercel dashboard → your project → **Cron Jobs** tab.
You should see two crons:
- `/api/cron/process-emails` — every minute
- `/api/cron/reset-usage-counters` — daily at midnight

> **Note**: Cron Jobs require the **Vercel Pro plan** (minimum $20/month).

---

## 8. Post-Deployment Checklist

- [ ] App loads at https://member.cloudsourcehrm.us
- [ ] Registration and email verification works (Resend)
- [ ] Password reset works (Resend)
- [ ] Stripe checkout session creates (Standard subscription)
- [ ] Webhook: Stripe subscription → user.tier = 'standard'
- [ ] Campaign: draft → send → pg-boss jobs created
- [ ] Cron: emails dispatched via AhaSend
- [ ] Bounce webhook: contact.status = 'inactive'
- [ ] Unsubscribe link works
- [ ] Open tracking pixel records opens (admin-only)
- [ ] Employer landing page → employer_leads table
- [ ] Candidate landing page → candidate_leads table
- [ ] Admin: approve lead → migrate to contacts
- [ ] CSV upload → csv_import_batches → admin approve → employer_contacts
- [ ] Hotlist: Excel upload → preview → send
- [ ] CHRMNEXUS job board loads (stub OK if API not live)

---

## 9. Environment Variables Reference

| Variable | Source | Notes |
|----------|--------|-------|
| `POSTGRES_URL` | Vercel (auto) | Pooled connection |
| `POSTGRES_URL_UNPOOLED` | Vercel (auto) | For migrations |
| `BETTER_AUTH_SECRET` | Generate | `openssl rand -hex 32` |
| `BETTER_AUTH_URL` | Fixed | `https://member.cloudsourcehrm.us` |
| `RESEND_API_KEY` | Resend | Dashboard → API Keys |
| `RESEND_WEBHOOK_SECRET` | Resend | Webhooks → Svix signing secret |
| `EMAIL_FROM_ADDRESS` | Fixed | `noreply@mail.cloudsourcehrm.us` |
| `AHASEND_API_KEY` | AhaSend | Dashboard → API Keys |
| `AHASEND_WEBHOOK_SECRET` | AhaSend | Webhook HMAC secret |
| `STRIPE_SECRET_KEY` | Stripe | Developers → API Keys (live) |
| `STRIPE_WEBHOOK_SECRET` | Stripe | Webhook signing secret |
| `STRIPE_PRICE_ID_STANDARD` | Stripe | $95/month product price |
| `STRIPE_PRICE_ID_CHRMNEXUS` | Stripe | CHRMNEXUS add-on price |
| `STRIPE_PRICE_ID_CREDITS` | Stripe | Overage credit pack price |
| `UNSUBSCRIBE_HMAC_SECRET` | Generate | Signs unsubscribe link tokens |
| `OPEN_TRACKING_HMAC_SECRET` | Generate | Signs open tracking tokens |
| `CRON_SECRET` | Generate | Secures cron endpoints |
| `CHRMNEXUS_API_URL` | Fixed | `https://www.cloudsourcehrm.com/api` |
| `NEXT_PUBLIC_APP_URL` | Fixed | `https://member.cloudsourcehrm.us` |

---

## Common Issues

**Q: `pnpm install` fails with workspace errors**
A: Make sure you're running `pnpm install` from the **root** of the repo, not inside `apps/web`.

**Q: Database connection refused**
A: Make sure Docker Desktop is running and `docker-compose up -d` was executed.

**Q: Migrations fail with "relation already exists"**
A: The database was already migrated. Run `pnpm db:generate` to generate a new migration if you changed the schema.

**Q: pg-boss tables not created**
A: pg-boss auto-creates its tables on first `getBoss()` call (when the first email job is enqueued). Run a campaign send to trigger this.

**Q: Cron jobs not running on Vercel**
A: Cron jobs require **Vercel Pro**. Check Vercel dashboard → Project → Cron Jobs. Also verify `CRON_SECRET` matches in both `vercel.json` and environment variables.

**Q: Emails not being sent**
A: Check that `AHASEND_API_KEY` and `RESEND_API_KEY` are set. The cron job at `/api/cron/process-emails` must be running. Check Vercel logs for errors.

---

*CloudSourceHRM v1.3 — SHIRO Technologies — Confidential*
