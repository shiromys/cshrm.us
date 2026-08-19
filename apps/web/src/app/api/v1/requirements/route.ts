import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db, campaigns, emailLogs, usageCounters } from "@/lib/db";
import { eq, sql } from "drizzle-orm";
import { headers } from "next/headers";
import { requirementSchema } from "@/lib/schemas";
import { generateRequirementEmail } from "@/lib/email/requirement-template";
import { buildUnsubscribeLink, buildOpenTrackingPixel, today } from "@/lib/utils";

/** Parse a comma-separated email string into a deduped, trimmed array. */
function parseEmails(raw: string): string[] {
  return [...new Set(raw.split(",").map((e) => e.trim()).filter(Boolean))];
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    const user = session?.user;
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const userRecord = await db.query.users.findFirst({ where: (u, { eq }) => eq(u.id, user.id) });
    if (!userRecord) return NextResponse.json({ error: "User not found" }, { status: 404 });
    const isAdmin = userRecord.role === "admin";
    if (!isAdmin && userRecord.tier === "free") {
      return NextResponse.json({ error: "Standard subscription required to send requirements" }, { status: 403 });
    }

    // Validate body
    const body = await request.json();
    const parsed = requirementSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }
    const data = parsed.data;

    // Check daily campaign limit
    const DAILY_LIMIT = 10;
    const todayStr = today();
    const counter = await db.query.usageCounters.findFirst({
      where: (uc, { and, eq }) =>
        and(eq(uc.userId, user.id), eq(uc.counterType, "daily_campaigns"), eq(uc.resetDate, todayStr)),
    });
    if (counter && counter.count >= DAILY_LIMIT) {
      return NextResponse.json({ error: "Daily campaign limit reached" }, { status: 429 });
    }

    // Build recipient list
    const toEmails   = parseEmails(data.recipientEmails);
    const ccEmailArr = data.ccEmails ? parseEmails(data.ccEmails) : [];
    if (toEmails.length === 0) {
      return NextResponse.json({ error: "At least one valid recipient email is required" }, { status: 400 });
    }

    // Generate email content from structured job data
    const { html, subject, text } = generateRequirementEmail(
      data,
      userRecord.name ?? user.email ?? "CloudSourceHRM User",
      userRecord.companyName,
    );

    // Determine email provider — AhaSend primary, MailerCloud automatic fallback
    const hasAhaSend     = !!(process.env.AHASEND_API_KEY && process.env.AHASEND_API_KEY !== "placeholder");
    const hasMailerCloud = !!(process.env.MAILERCLOUD_API_KEY);
    if (!hasAhaSend && !hasMailerCloud) {
      return NextResponse.json({ error: "No email provider configured. Set AHASEND_API_KEY or MAILERCLOUD_API_KEY." }, { status: 500 });
    }

    const fromAddress  = process.env.AHASEND_FROM_EMAIL ?? process.env.EMAIL_FROM_ADDRESS ?? "info@cloudsourcehrm.us";
    const fromName     = `${userRecord.name ?? "CloudSourceHRM"} via CloudSourceHRM`;
    const replyToEmail = userRecord.replyToEmail ?? userRecord.email;

    // ── AhaSend anti-phishing guard ───────────────────────────────────────────
    // Strip any To recipient whose email matches the Reply-To.
    // AhaSend flags/suspends accounts when Reply-To === To (phishing pattern).
    const replyToLower = replyToEmail.toLowerCase();
    const safeToEmails = toEmails.filter((e) => e.toLowerCase() !== replyToLower);
    if (safeToEmails.length < toEmails.length) {
      console.warn(`[requirements/send] Stripped ${toEmails.length - safeToEmails.length} recipient(s) matching Reply-To (${replyToEmail}) to comply with anti-phishing rules.`);
    }
    if (safeToEmails.length === 0) {
      return NextResponse.json({ error: "All recipient emails matched the sender's Reply-To address. Please use different recipient addresses." }, { status: 400 });
    }

    // Create campaign record (stores structured data for future reference)
    const [campaign] = await db.insert(campaigns).values({
      userId:                  user.id,
      name:                    data.jobTitle,
      subject,
      bodyHtml:                html,
      bodyText:                text,
      status:                  "sending",
      targetType:              "employer",
      totalRecipients:         safeToEmails.length,
      targetFilters: {
        isRequirement:   true,
        requirementMeta: data,
        recipientEmails: data.recipientEmails,
        ccEmails:        data.ccEmails ?? "",
      },
    }).returning();

    // Increment daily usage counter
    await db.execute(sql`
      INSERT INTO usage_counters (id, user_id, counter_type, count, reset_date, updated_at)
      VALUES (gen_random_uuid(), ${user.id}, 'daily_campaigns', 1, ${todayStr}, now())
      ON CONFLICT (user_id, counter_type, reset_date)
      DO UPDATE SET count = usage_counters.count + 1, updated_at = now()
    `);

    // Create email log records for each safe To recipient
    const logRecords: Array<{ logId: string; email: string }> = [];
    for (const email of safeToEmails) {
      const [log] = await db.insert(emailLogs).values({
        campaignId:    campaign.id,
        userId:        user.id,
        recipientEmail: email,
        fromAddress,
        replyToAddress: replyToEmail,
        status:        "queued",
      }).returning();
      logRecords.push({ logId: log.id, email });
    }

    // ── Send ─────────────────────────────────────────────────────────────────
    let sentCount = 0;
    const now = new Date();

    // Build final HTML per recipient (unsubscribe link + tracking pixel)
    function buildHtml(logId: string, recipientEmail: string): string {
      const unsubLink    = `<p style="font-size:11px;color:#9ca3af;text-align:center;margin-top:24px;"><a href="${buildUnsubscribeLink(logId, recipientEmail)}" style="color:#9ca3af;">Unsubscribe</a></p>`;
      const trackingPixel = buildOpenTrackingPixel(logId, recipientEmail);
      return html.replace("{{unsubscribe_link}}", `<a href="${buildUnsubscribeLink(logId, recipientEmail)}" style="color:#94a3b8;font-size:11px;">Unsubscribe</a>`) + trackingPixel;
    }

    // ── Helper: build per-recipient message payload ───────────────────────
    function buildMessages() {
      return logRecords.map((r) => ({
        to:         r.email,
        toName:     r.email,
        fromName,
        replyTo:    replyToEmail,
        subject,
        html:       buildHtml(r.logId, r.email),
        text,
        emailLogId: r.logId,
        ...(ccEmailArr.length ? { cc: ccEmailArr } : {}),
      }));
    }

    // ── AhaSend (primary) ─────────────────────────────────────────────────
    if (hasAhaSend) {
      try {
        const { ahasend } = await import("@/lib/email/ahasend");
        await ahasend.sendBulk(buildMessages());
        for (const r of logRecords) {
          await db.update(emailLogs).set({ status: "sent", sentAt: now, provider: "ahasend" }).where(eq(emailLogs.id, r.logId));
        }
        sentCount = logRecords.length;
      } catch (err) {
        console.error("[requirements/send] AhaSend failed, switching to MailerCloud:", err instanceof Error ? err.message : err);
      }
    }

    // ── MailerCloud (automatic fallback) ──────────────────────────────────
    if (sentCount === 0 && hasMailerCloud) {
      try {
        const { mailercloud } = await import("@/lib/email/mailercloud");
        await mailercloud.sendBulk(buildMessages());
        for (const r of logRecords) {
          await db.update(emailLogs).set({ status: "sent", sentAt: now, provider: "ahasend" /* closest enum */ }).where(eq(emailLogs.id, r.logId));
        }
        sentCount = logRecords.length;
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error("[requirements/send] MailerCloud also failed:", msg);
        for (const r of logRecords) {
          await db.update(emailLogs).set({ status: "failed", errorMessage: msg }).where(eq(emailLogs.id, r.logId));
        }
        await db.update(campaigns).set({ status: "draft", totalRecipients: 0 }).where(eq(campaigns.id, campaign.id));
        return NextResponse.json({ error: `Email sending failed: ${msg}` }, { status: 500 });
      }
    }

    // Mark campaign sent
    await db.update(campaigns).set({ status: "sent", sentAt: now }).where(eq(campaigns.id, campaign.id));

    return NextResponse.json({ success: true, campaignId: campaign.id, recipients: sentCount }, { status: 201 });

  } catch (err) {
    console.error("[requirements] Unhandled error:", err);
    return NextResponse.json({ error: err instanceof Error ? err.message : "Unexpected error" }, { status: 500 });
  }
}
