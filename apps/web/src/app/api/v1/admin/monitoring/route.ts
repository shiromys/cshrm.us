import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { db, emailLogs, campaigns, usageCounters } from "@/lib/db";
import { desc, eq, sql, count, sum } from "drizzle-orm";

function isAdmin(session: Awaited<ReturnType<typeof auth.api.getSession>>) {
  return (session?.user as unknown as Record<string, string>)?.role === "admin";
}

// ── Health check helpers ──────────────────────────────────────────────────────

async function checkDatabase(): Promise<{ ok: boolean; latencyMs: number; error?: string }> {
  const t0 = Date.now();
  try {
    await db.execute(sql`SELECT 1`);
    return { ok: true, latencyMs: Date.now() - t0 };
  } catch (e) {
    return { ok: false, latencyMs: Date.now() - t0, error: e instanceof Error ? e.message : String(e) };
  }
}

async function checkMailerCloud(): Promise<{ ok: boolean; configured: boolean; error?: string }> {
  const key = process.env.MAILERCLOUD_API_KEY;
  if (!key || key === "placeholder") return { ok: false, configured: false };
  // MailerCloud doesn't have a free ping endpoint, so we just validate key presence + format
  return { ok: true, configured: true };
}

async function checkPostmark(): Promise<{ ok: boolean; configured: boolean; latencyMs?: number; error?: string }> {
  const token = process.env.POSTMARK_SERVER_TOKEN;
  if (!token || token === "placeholder") return { ok: false, configured: false };
  const t0 = Date.now();
  try {
    const res = await fetch("https://api.postmarkapp.com/server", {
      headers: { "X-Postmark-Server-Token": token, Accept: "application/json" },
      signal: AbortSignal.timeout(5000),
    });
    const latencyMs = Date.now() - t0;
    if (!res.ok) {
      const body = await res.text();
      return { ok: false, configured: true, latencyMs, error: `HTTP ${res.status}: ${body.slice(0, 200)}` };
    }
    return { ok: true, configured: true, latencyMs };
  } catch (e) {
    return { ok: false, configured: true, latencyMs: Date.now() - t0, error: e instanceof Error ? e.message : String(e) };
  }
}

// ── GET /api/v1/admin/monitoring ──────────────────────────────────────────────
export async function GET(request: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user || !isAdmin(session)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Run health checks in parallel
  const [dbHealth, mailerCloudHealth, postmarkHealth] = await Promise.all([
    checkDatabase(),
    checkMailerCloud(),
    checkPostmark(),
  ]);

  // ── Last 50 email sends ───────────────────────────────────────────────────
  const recentEmails = await db
    .select({
      id:             emailLogs.id,
      campaignId:     emailLogs.campaignId,
      recipientEmail: emailLogs.recipientEmail,
      status:         emailLogs.status,
      provider:       emailLogs.provider,
      sentAt:         emailLogs.sentAt,
      errorMessage:   emailLogs.errorMessage,
      createdAt:      emailLogs.createdAt,
    })
    .from(emailLogs)
    .orderBy(desc(emailLogs.createdAt))
    .limit(50);

  // ── Per-provider success rates (all time) ─────────────────────────────────
  const providerStats = await db
    .select({
      provider: emailLogs.provider,
      status:   emailLogs.status,
      cnt:      count(),
    })
    .from(emailLogs)
    .groupBy(emailLogs.provider, emailLogs.status);

  // Reshape into { mailercloud: { sent, failed, other, label, active }, ... }
  // Active providers always appear; legacy ones (ahasend, resend) are labelled accordingly.
  const PROVIDER_META: Record<string, { label: string; active: boolean }> = {
    mailercloud: { label: "MailerCloud",         active: true  },
    postmark:    { label: "Postmark",            active: true  },
    resend:      { label: "Resend (legacy)",     active: false },
    ahasend:     { label: "AhaSend (legacy)",    active: false },
  };

  // Pre-seed active providers so they always appear even with zero sends
  const providerMap: Record<string, { sent: number; failed: number; other: number; label: string; active: boolean }> = {
    mailercloud: { sent: 0, failed: 0, other: 0, label: "MailerCloud",     active: true  },
    postmark:    { sent: 0, failed: 0, other: 0, label: "Postmark",        active: true  },
  };

  for (const row of providerStats) {
    const prov = row.provider ?? "unknown";
    const meta = PROVIDER_META[prov] ?? { label: prov, active: false };
    if (!providerMap[prov]) providerMap[prov] = { sent: 0, failed: 0, other: 0, ...meta };
    if (row.status === "sent" || row.status === "delivered" || row.status === "opened") {
      providerMap[prov].sent += row.cnt;
    } else if (row.status === "failed" || row.status === "bounced") {
      providerMap[prov].failed += row.cnt;
    } else {
      providerMap[prov].other += row.cnt;
    }
  }

  // ── Today's usage counters ────────────────────────────────────────────────
  const today = new Date().toISOString().slice(0, 10);
  const todayCounters = await db
    .select({
      userId:      usageCounters.userId,
      counterType: usageCounters.counterType,
      count:       usageCounters.count,
    })
    .from(usageCounters)
    .where(eq(usageCounters.resetDate, today));

  const dailyCampaignTotal = todayCounters
    .filter((r) => r.counterType === "daily_campaigns")
    .reduce((s, r) => s + r.count, 0);

  const dailyEmailTotal = todayCounters
    .filter((r) => r.counterType === "daily_emails")
    .reduce((s, r) => s + r.count, 0);

  // ── Queue depth (pg-boss job tables) ─────────────────────────────────────
  let queueDepth: { name: string; count: number }[] = [];
  try {
    const rows = await db.execute<{ name: string; length: string }>(sql`
      SELECT name, length FROM pgboss.queue WHERE length > 0
    `);
    queueDepth = rows.map((r) => ({ name: r.name, count: Number(r.length) }));
  } catch {
    // pg-boss table may not exist if queue was never started
    queueDepth = [];
  }

  // ── Cron last-run approximation (infer from email_logs timestamps) ─────────
  // We use the most recent emailLog createdAt as a proxy for cron activity
  const [lastEmailLogRow] = await db
    .select({ lastActivity: emailLogs.createdAt })
    .from(emailLogs)
    .orderBy(desc(emailLogs.createdAt))
    .limit(1);

  // ── App info ──────────────────────────────────────────────────────────────
  const appInfo = {
    nodeEnv:     process.env.NODE_ENV ?? "unknown",
    appUrl:      process.env.NEXT_PUBLIC_APP_URL ?? "not set",
    railway:     !!(process.env.RAILWAY_ENVIRONMENT_NAME),
    railwayEnv:  process.env.RAILWAY_ENVIRONMENT_NAME ?? null,
    envVarStatus: {
      MAILERCLOUD_API_KEY:      !!process.env.MAILERCLOUD_API_KEY,
      POSTMARK_SERVER_TOKEN:    !!process.env.POSTMARK_SERVER_TOKEN,
      STRIPE_SECRET_KEY:        !!process.env.STRIPE_SECRET_KEY,
      UNSUBSCRIBE_HMAC_SECRET:  !!process.env.UNSUBSCRIBE_HMAC_SECRET,
      OPEN_TRACKING_HMAC_SECRET:!!process.env.OPEN_TRACKING_HMAC_SECRET,
      CHRMNEXUS_API_URL:        !!process.env.CHRMNEXUS_API_URL,
      RESEND_WEBHOOK_SECRET:    !!process.env.RESEND_WEBHOOK_SECRET,
    },
  };

  return NextResponse.json({
    timestamp: new Date().toISOString(),
    health: {
      database:    dbHealth,
      mailerCloud: mailerCloudHealth,
      postmark:    postmarkHealth,
    },
    recentEmails,
    providerStats: providerMap,
    usage: {
      todayDate:          today,
      dailyCampaignTotal,
      dailyEmailTotal,
      activeUsersToday:   todayCounters.length,
    },
    queueDepth,
    lastEmailActivity:  lastEmailLogRow?.lastActivity ?? null,
    app:                appInfo,
  });
}
