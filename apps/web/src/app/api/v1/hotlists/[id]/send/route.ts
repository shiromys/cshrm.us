import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db, hotlists, hotlistEntries, campaigns, emailLogs, employerContacts, usageCounters } from "@/lib/db";
import { eq, and, sql } from "drizzle-orm";
import { headers } from "next/headers";
import { renderHotlistTable } from "@/lib/hotlist-renderer";
import { buildUnsubscribeLink, buildOpenTrackingPixel, today } from "@/lib/utils";

function parseEmails(raw: string): string[] {
  return [...new Set(raw.split(",").map((e) => e.trim().toLowerCase()).filter(Boolean))];
}

function escapeHtml(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function buildHotlistEmail(opts: {
  hotlistName: string;
  tableHtml: string;
  introNote: string;
  senderName: string;
  senderCompany?: string | null;
  unsubLink?: string;
  trackingPixel?: string;
}): string {
  const { hotlistName, tableHtml, introNote, senderName, senderCompany, unsubLink = "", trackingPixel = "" } = opts;
  const senderLine = senderCompany ? `${escapeHtml(senderName)} · ${escapeHtml(senderCompany)}` : escapeHtml(senderName);

  const introHtml = introNote
    ? `<tr><td style="padding:0 24px 20px;">
         <div style="font-size:14px;line-height:1.7;color:#334155;white-space:pre-line;">${escapeHtml(introNote)}</div>
       </td></tr>`
    : "";

  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:32px 16px;">
  <tr><td align="center">
  <table width="680" cellpadding="0" cellspacing="0" style="max-width:680px;background:#ffffff;border-radius:10px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">

    <!-- Header -->
    <tr>
      <td style="background:linear-gradient(135deg,#065f46 0%,#059669 100%);padding:28px 24px;">
        <p style="margin:0;color:#a7f3d0;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:0.08em;">Available Candidates from</p>
        <p style="margin:4px 0 0;color:#ffffff;font-size:14px;font-weight:500;">${senderLine}</p>
        <h1 style="margin:12px 0 0;color:#ffffff;font-size:22px;font-weight:700;line-height:1.2;">${escapeHtml(hotlistName)}</h1>
      </td>
    </tr>

    <!-- Intro note -->
    ${introHtml}

    <!-- Table -->
    <tr>
      <td style="padding:${introNote ? "0" : "24px"} 24px 28px;">
        <div style="overflow-x:auto;">
          ${tableHtml}
        </div>
      </td>
    </tr>

    <!-- CTA -->
    <tr>
      <td style="padding:0 24px 28px;">
        <table width="100%" cellpadding="0" cellspacing="0" style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:16px 20px;">
          <tr>
            <td>
              <p style="margin:0;font-size:14px;color:#14532d;font-weight:600;">Interested in any of these candidates?</p>
              <p style="margin:6px 0 0;font-size:13px;color:#15803d;line-height:1.5;">Simply reply to this email and we will connect you with the right candidate. We look forward to hearing from you.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>

    <!-- Footer -->
    <tr>
      <td style="background:#f8fafc;border-top:1px solid #e2e8f0;padding:16px 24px;text-align:center;">
        <p style="margin:0;font-size:12px;color:#94a3b8;">Sent via <strong>CloudSourceHRM</strong> on behalf of ${senderLine}. · ${unsubLink}</p>
      </td>
    </tr>

  </table>
  </td></tr>
</table>
${trackingPixel}
</body>
</html>`;
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const userRecord = await db.query.users.findFirst({ where: (u, { eq }) => eq(u.id, session.user.id) });
    if (!userRecord) return NextResponse.json({ error: "User not found" }, { status: 404 });
    const isAdmin = userRecord.role === "admin";
    if (!isAdmin && userRecord.tier === "free") {
      return NextResponse.json({ error: "Standard subscription required to send hotlists" }, { status: 403 });
    }

    const { id } = await params;
    const body = await req.json().catch(() => ({}));
    const {
      includeMyContacts = true,
      manualEmails = "",
      subject: customSubject,
      introNote = "",
    } = body as {
      includeMyContacts?: boolean;
      manualEmails?: string;
      subject?: string;
      introNote?: string;
    };

    // Load hotlist + verify ownership
    const hotlist = await db.query.hotlists.findFirst({
      where: (h, { and, eq, isNull }) => and(eq(h.id, id), eq(h.userId, session.user.id), isNull(h.deletedAt)),
    });
    if (!hotlist) return NextResponse.json({ error: "Hotlist not found" }, { status: 404 });

    const entries = await db.select().from(hotlistEntries).where(eq(hotlistEntries.hotlistId, id));
    if (entries.length === 0) return NextResponse.json({ error: "Hotlist has no entries to send" }, { status: 400 });

    // Build recipient list
    const recipientMap = new Map<string, string>(); // email → name

    if (includeMyContacts) {
      const myContacts = await db
        .select({ email: employerContacts.email, name: employerContacts.name })
        .from(employerContacts)
        .where(and(
          eq(employerContacts.userId, session.user.id),
          eq(employerContacts.status, "active"),
          eq(employerContacts.unsubscribed, false),
        ));
      for (const c of myContacts) {
        if (c.email) recipientMap.set(c.email.toLowerCase(), c.name ?? c.email);
      }
    }

    for (const email of parseEmails(manualEmails)) {
      if (!recipientMap.has(email)) recipientMap.set(email, email);
    }

    if (recipientMap.size === 0) {
      return NextResponse.json({ error: "No recipients found. Add My Contacts or enter manual email addresses." }, { status: 400 });
    }

    // Build email content
    const tableHtml  = renderHotlistTable(entries, hotlist.visibleColumns);
    const subject    = customSubject?.trim() || hotlist.emailSubject || `Available Candidates: ${hotlist.name}`;
    const senderName = userRecord.name ?? session.user.email ?? "CloudSourceHRM User";

    // Check limits
    const DAILY_LIMIT = 10;
    const todayStr = today();
    const counter = await db.query.usageCounters.findFirst({
      where: (uc, { and, eq }) =>
        and(eq(uc.userId, session.user.id), eq(uc.counterType, "daily_campaigns"), eq(uc.resetDate, todayStr)),
    });
    if (counter && counter.count >= DAILY_LIMIT) {
      return NextResponse.json({ error: "Daily campaign limit reached" }, { status: 429 });
    }

    // Determine provider — MailerCloud primary, Resend automatic fallback
    const hasMailerCloud = !!(process.env.MAILERCLOUD_API_KEY);
    const hasResend      = !!(process.env.RESEND_API_KEY && !process.env.RESEND_API_KEY.startsWith("re_placeholder"));
    if (!hasMailerCloud && !hasResend) {
      return NextResponse.json({ error: "No bulk email provider configured. Set MAILERCLOUD_API_KEY." }, { status: 500 });
    }

    const fromAddress  = process.env.MAILERCLOUD_FROM_EMAIL ?? process.env.EMAIL_FROM_ADDRESS ?? "info@cloudsourcehrm.us";
    const fromName     = `${senderName} via CloudSourceHRM`;
    const replyToEmail = userRecord.replyToEmail ?? userRecord.email;

    // Create campaign record
    const plainText = entries.map((e) => `${e.displayName} | ${e.title ?? ""} | ${(e.skills ?? []).join(", ")}`).join("\n");
    const [campaign] = await db.insert(campaigns).values({
      userId:          session.user.id,
      name:            `Hotlist: ${hotlist.name}`,
      subject,
      bodyHtml:        buildHotlistEmail({ hotlistName: hotlist.name, tableHtml, introNote, senderName, senderCompany: userRecord.companyName }),
      bodyText:        plainText,
      status:          "sending",
      targetType:      "employer",
      hotlistId:       hotlist.id,
      totalRecipients: recipientMap.size,
    }).returning();

    // Usage counter
    await db.execute(sql`
      INSERT INTO usage_counters (id, user_id, counter_type, count, reset_date, updated_at)
      VALUES (gen_random_uuid(), ${session.user.id}, 'daily_campaigns', 1, ${todayStr}, now())
      ON CONFLICT (user_id, counter_type, reset_date)
      DO UPDATE SET count = usage_counters.count + 1, updated_at = now()
    `);

    // Create log records
    const logRecords: Array<{ logId: string; email: string; name: string }> = [];
    for (const [email, name] of recipientMap) {
      const [log] = await db.insert(emailLogs).values({
        campaignId:     campaign.id,
        userId:         session.user.id,
        recipientEmail: email,
        fromAddress,
        replyToAddress: replyToEmail,
        status:         "queued",
      }).returning();
      logRecords.push({ logId: log.id, email, name });
    }

    // Send
    let sentCount = 0;
    const now = new Date();

    // Build per-recipient message helper
    function buildHotlistMessages() {
      return logRecords.map((r) => {
        const html = buildHotlistEmail({
          hotlistName: hotlist.name,
          tableHtml,
          introNote,
          senderName,
          senderCompany: userRecord.companyName,
          unsubLink: `<a href="${buildUnsubscribeLink(r.logId, r.email)}" style="color:#94a3b8;font-size:11px;">Unsubscribe</a>`,
          trackingPixel: buildOpenTrackingPixel(r.logId, r.email),
        });
        return { to: r.email, toName: r.name, fromName, replyTo: replyToEmail, subject, html, text: plainText, emailLogId: r.logId };
      });
    }

    // ── MailerCloud (primary) ─────────────────────────────────────────────
    if (hasMailerCloud) {
      try {
        const { mailercloud } = await import("@/lib/email/mailercloud");
        await mailercloud.sendBulk(buildHotlistMessages());
        for (const r of logRecords) {
          await db.update(emailLogs).set({ status: "sent", sentAt: now, provider: "mailercloud" }).where(eq(emailLogs.id, r.logId));
        }
        sentCount = logRecords.length;
      } catch (err) {
        console.error("[hotlist/send] MailerCloud failed, trying Resend:", err);
      }
    }

    // ── Resend (automatic fallback) ────────────────────────────────────────
    if (sentCount === 0 && hasResend) {
      try {
        const { resend } = await import("@/lib/email/resend");
        await resend.sendBatch(buildHotlistMessages().map((m) => ({
          to: m.to, subject: m.subject, html: m.html, text: m.text, replyTo: m.replyTo,
        })));
        for (const r of logRecords) {
          await db.update(emailLogs).set({ status: "sent", sentAt: now, provider: "resend" }).where(eq(emailLogs.id, r.logId));
        }
        sentCount = logRecords.length;
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error("[hotlist/send] Resend also failed:", msg);
        for (const r of logRecords) {
          await db.update(emailLogs).set({ status: "failed", errorMessage: msg }).where(eq(emailLogs.id, r.logId));
        }
        await db.update(campaigns).set({ status: "draft", totalRecipients: 0 }).where(eq(campaigns.id, campaign.id));
        return NextResponse.json({ error: `Email sending failed: ${msg}` }, { status: 500 });
      }
    }

    await db.update(campaigns).set({ status: "sent", sentAt: now }).where(eq(campaigns.id, campaign.id));
    await db.update(hotlists).set({ status: "sent", sentAt: now, updatedAt: now }).where(eq(hotlists.id, id));

    return NextResponse.json({ success: true, campaignId: campaign.id, recipients: sentCount });

  } catch (err) {
    console.error("[hotlist/send] Unhandled error:", err);
    return NextResponse.json({ error: err instanceof Error ? err.message : "Unexpected error" }, { status: 500 });
  }
}
