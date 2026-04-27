# CloudSourceHRM — Railway Deployment Guide

## Step 1 — Add a PostgreSQL Database in Railway

Before deploying the app, provision your database:

1. In your Railway project → **New** → **Database** → **PostgreSQL**
2. Wait ~30 seconds for it to provision
3. Click the Postgres service → **Variables** tab — you'll see two connection strings:
   - `DATABASE_URL` — internal URL (used by your app service inside Railway, fastest)
   - `DATABASE_PUBLIC_URL` — external URL (used from your laptop for local dev and schema pushes)

**Push the schema** (run this once from your terminal to create all tables):

```cmd
set "POSTGRES_URL_UNPOOLED=<paste DATABASE_PUBLIC_URL here>"
cd packages\db
npx drizzle-kit push
```

**Update your local `.env.local`** to replace both Neon URLs:
```
POSTGRES_URL=<DATABASE_PUBLIC_URL>
POSTGRES_URL_UNPOOLED=<DATABASE_PUBLIC_URL>
```

Neon is no longer needed after this.

---

## Step 2 — Push to GitHub

From your project root:

```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/YOUR_USERNAME/cloudsourcehrm.git
git branch -M main
git push -u origin main
```

---

## Step 3 — Create the App Service in Railway

1. Railway project → **New Service** → **GitHub Repo**
2. Select `cloudsourcehrm`
3. Railway detects the Dockerfile automatically — leave build settings as-is
4. Go to **Variables** tab and add all env vars (Step 4) before the first deploy

---

## Step 4 — Environment Variables

Add these in Railway → App Service → Variables.
For the database, use the **internal** `DATABASE_URL` (not the public one).

| Variable | Value |
|---|---|
| `POSTGRES_URL` | Railway Postgres internal `DATABASE_URL` |
| `POSTGRES_URL_UNPOOLED` | Railway Postgres internal `DATABASE_URL` (same value) |
| `BETTER_AUTH_SECRET` | Copy from your `.env.local` |
| `BETTER_AUTH_URL` | `https://your-app.up.railway.app` (update after Step 5) |
| `NEXT_PUBLIC_APP_URL` | `https://your-app.up.railway.app` (update after Step 5) |
| `RESEND_API_KEY` | Your Resend API key |
| `RESEND_FROM_EMAIL` | `noreply@cloudsourcehrm.us` |
| `RESEND_WEBHOOK_SECRET` | Your Resend webhook secret |
| `EMAIL_FROM_ADDRESS` | `noreply@cloudsourcehrm.us` |
| `STRIPE_SECRET_KEY` | `sk_live_...` for production |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | `pk_live_...` for production |
| `STRIPE_WEBHOOK_SECRET` | From Stripe webhook (set up in Step 6) |
| `STRIPE_PRICE_ID_STANDARD` | `price_1TPLM3DVibZLiJqh6PT94tFB` |
| `STRIPE_PRICE_ID_CHRMNEXUS` | `price_1TPLM4DVibZLiJqh11eP4pvo` |
| `CHRMNEXUS_API_URL` | `https://www.cloudsourcehrm.com/api` |
| `CHRMNEXUS_API_KEY` | Your CHRMNEXUS API key |
| `HMAC_SECRET` | Copy from your `.env.local` |
| `CRON_SECRET` | Copy from your `.env.local` |

> **AhaSend is optional.** If you don't have an AhaSend account, skip those variables — the app uses Resend automatically. Only add `AHASEND_API_KEY` and `AHASEND_FROM_EMAIL` if you decide to use AhaSend later.

---

## Step 5 — Generate a Domain

1. Railway → App Service → **Settings** → **Networking** → **Generate Domain**
2. You'll get a URL like `cloudsourcehrm-production.up.railway.app`
3. Go back to **Variables** and update:
   - `BETTER_AUTH_URL` → your Railway URL
   - `NEXT_PUBLIC_APP_URL` → your Railway URL
4. Railway will redeploy automatically

Or add a custom domain (e.g. `app.cloudsourcehrm.us`):
- Add it under **Custom Domain**
- Point a CNAME record at Railway per their instructions
- Update the two variables above to your custom domain

---

## Step 6 — Set Up Stripe Webhook

1. https://dashboard.stripe.com/webhooks → **Add endpoint**
2. URL: `https://your-app.up.railway.app/api/webhooks/stripe`
3. Select events:
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_failed`
4. Copy the **Signing secret** → add as `STRIPE_WEBHOOK_SECRET` in Railway

---

## How It Works on Railway

Railway runs a **persistent Node.js server** (not serverless), so:

- The background email worker (`instrumentation.ts`) starts on boot and processes campaign emails every 5 seconds — no external cron service needed
- Database queries are near-instant since Postgres runs in the same Railway network
- Real-time logs visible in Railway dashboard → Service → **Logs**

---

## Switching to Live Stripe Keys

When ready for real payments:
1. Get live keys from Stripe dashboard (switch to Live mode)
2. Update `STRIPE_SECRET_KEY` and `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` in Railway
3. Create a new Stripe webhook endpoint in Live mode, update `STRIPE_WEBHOOK_SECRET`
4. Railway redeploys automatically on variable change
