# CloudSourceHRM — Deployment Guide

## Overview

This is a **pnpm monorepo** with Turborepo. The deployable app lives at `apps/web`.
Database: **Neon (PostgreSQL)** · Queue: **pg-boss** · Auth: **Better Auth** · Payments: **Stripe**

---

## Step 1 — Push to GitHub

Run these commands from your project root (where `package.json` is):

```bash
git init
git add .
git commit -m "Initial commit"
```

Then on GitHub:
1. Go to https://github.com/new and create a new **private** repository named `cloudsourcehrm`
2. Do **not** initialize with README (keep it empty)
3. Copy the remote URL, then run:

```bash
git remote add origin https://github.com/YOUR_USERNAME/cloudsourcehrm.git
git branch -M main
git push -u origin main
```

---

## Step 2 — Deploy to Vercel

1. Go to https://vercel.com/new
2. Click **"Import Git Repository"** → select your `cloudsourcehrm` repo
3. Vercel will detect the monorepo. Configure it as follows:

| Setting | Value |
|---|---|
| **Framework Preset** | Next.js |
| **Root Directory** | `apps/web` |
| **Build Command** | `cd ../.. && pnpm build --filter=web` |
| **Output Directory** | `.next` (leave as default) |
| **Install Command** | `cd ../.. && pnpm install --frozen-lockfile` |

4. Click **"Environment Variables"** and add all variables from the table below
5. Click **Deploy**

---

## Step 3 — Environment Variables (Vercel)

Add each of these in Vercel → Project → Settings → Environment Variables.
Set scope to **Production, Preview, Development** unless noted.

| Variable | Value | Notes |
|---|---|---|
| `POSTGRES_URL` | Your Neon pooled URL | From Neon dashboard |
| `POSTGRES_URL_UNPOOLED` | Your Neon direct URL | From Neon dashboard |
| `BETTER_AUTH_SECRET` | 32-byte hex string | `openssl rand -hex 32` |
| `BETTER_AUTH_URL` | `https://yourdomain.vercel.app` | Your Vercel URL |
| `NEXT_PUBLIC_APP_URL` | `https://yourdomain.vercel.app` | Same as above |
| `RESEND_API_KEY` | `re_...` | From resend.com |
| `RESEND_FROM_EMAIL` | `noreply@yourdomain.com` | Must be a verified domain |
| `RESEND_WEBHOOK_SECRET` | From Resend webhook settings | Optional for open tracking |
| `AHASEND_API_KEY` | From AhaSend dashboard | For bulk campaigns |
| `AHASEND_FROM_EMAIL` | `campaigns@yourdomain.com` | AhaSend verified sender |
| `AHASEND_WEBHOOK_SECRET` | From AhaSend settings | For delivery webhooks |
| `EMAIL_FROM_ADDRESS` | `noreply@yourdomain.com` | Default from address |
| `STRIPE_SECRET_KEY` | `sk_live_...` | Switch to live key for production |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | `pk_live_...` | Switch to live key |
| `STRIPE_WEBHOOK_SECRET` | `whsec_...` | From Stripe webhook endpoint |
| `STRIPE_PRICE_ID_STANDARD` | `price_1TPLM3...` | Your Standard plan price ID |
| `STRIPE_PRICE_ID_CHRMNEXUS` | `price_1TPLM4...` | Your CHRMNEXUS price ID |
| `STRIPE_PRICE_ID_CREDITS` | `price_...` | Credits price ID (if used) |
| `CHRMNEXUS_API_URL` | `https://www.cloudsourcehrm.com/api` | |
| `CHRMNEXUS_API_KEY` | Your CHRMNEXUS API key | |
| `HMAC_SECRET` | 32-byte hex string | `openssl rand -hex 32` |
| `CRON_SECRET` | 32-byte hex string | `openssl rand -hex 32` — used to secure cron routes |

---

## Step 4 — Run Database Migrations

After deploying (or before, with your local Neon connection), push the schema:

```powershell
# From apps/web directory
$env:POSTGRES_URL_UNPOOLED = "your-neon-direct-url-here"
npx drizzle-kit push
```

Or if you haven't changed the schema since local dev, skip this — your Neon DB already has the tables.

---

## Step 5 — Set Up Stripe Webhook (Production)

1. Go to https://dashboard.stripe.com/webhooks
2. Click **"Add endpoint"**
3. Set endpoint URL to: `https://yourdomain.vercel.app/api/webhooks/stripe`
4. Select events to listen for:
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_failed`
5. After creating, copy the **Signing secret** (`whsec_...`)
6. Add it to Vercel env vars as `STRIPE_WEBHOOK_SECRET`
7. Redeploy (or the env var change triggers a redeploy automatically)

---

## Step 6 — Add Custom Domain (Optional)

1. Vercel → Project → Settings → Domains
2. Add your domain (e.g., `app.cloudsourcehrm.com`)
3. Follow the DNS instructions (add CNAME or A record at your registrar)
4. Once DNS propagates, update these env vars to use your custom domain:
   - `BETTER_AUTH_URL`
   - `NEXT_PUBLIC_APP_URL`

---

## How the App Works in Production

**Email processing** is handled by Vercel Cron jobs (defined in `apps/web/vercel.json`):
- Every minute: `/api/cron/process-emails` — picks up queued campaign emails and sends in batches of 50
- Daily at midnight: `/api/cron/reset-usage-counters` — resets daily send limits

These cron routes are **automatically protected** by `CRON_SECRET` — Vercel sends it in `Authorization: Bearer <secret>` headers.

**Payments** use direct Stripe session verification (no webhook dependency for initial upgrades). Webhooks handle subscription lifecycle events (cancellations, renewals, failures).

---

## Switching to Live Stripe Keys

When you're ready for real payments:
1. In Stripe dashboard, switch from **Test mode** to **Live mode**
2. Copy your live `sk_live_...` and `pk_live_...` keys
3. Create new products/prices in live mode (or copy price IDs from test)
4. Update Vercel env vars: `STRIPE_SECRET_KEY`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`, price IDs
5. Set up a new live webhook endpoint (Step 5 above, but in live mode)
6. Redeploy

---

## Troubleshooting

**Build fails — "Cannot find module @cloudsourcehrm/db"**
→ Make sure Root Directory is `apps/web` and Build Command includes `cd ../..` to install workspace packages.

**Cron jobs not running**
→ Vercel Cron requires a Pro plan. Check Vercel → Project → Settings → Crons to verify they're registered.
→ Make sure `CRON_SECRET` in Vercel matches the value in your env.

**Stripe redirects to wrong URL after payment**
→ Check `NEXT_PUBLIC_APP_URL` — it must match your actual deployment URL exactly (no trailing slash).

**Users can't register**
→ Verify `BETTER_AUTH_SECRET` is set and `BETTER_AUTH_URL` matches your deployment URL.
→ Email verification is enabled in production — make sure `RESEND_API_KEY` is set and the from domain is verified in Resend.
