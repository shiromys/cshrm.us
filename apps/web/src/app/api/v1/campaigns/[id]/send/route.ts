import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db, campaigns, contacts, employerContacts, emailLogs, usageCounters, hotlistEntries } from "@/lib/db";
import { eq, and, isNull, sql } from "drizzle-orm";
import { buildUnsubscribeLink, buildOpenTrackingPixel, today } from "@/lib/utils";
import { headers } from "next/headers";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    const session = await auth.api.getSession({ headers: await headers() });
    const user = session?.user;
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const userRecord = await db.query.users.findFirst({ where: (u, { eq }) => eq(u.id, user.id) });
    if (!userRecord || userRecord.tier === "free") {
      return NextResponse.json({ error: "Standard subscription required to send campaigns" }, { status: 403 });
    }

    const campaign = await db.query.campaigns.findFirst({
      where: (c, { and, eq, isNull }) => and(eq(c.id, id), eq(c.userId, user.id), isNull(c.deletedAt)),
    });
    if (!campaign) return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
    if (campaign.status !== "draft") return NextResponse.json({ error: "Campaign is not in draft status" }, { status: 400 });

    // Check daily limit
    const DAILY_LIMIT = 10;
    const todayStr = today();
    const counter = await db.query.usageCounters.findFirst({
      where: (uc, { and, eq }) => and(eq(uc.userId, user.id), eq(uc.counterType, "daily_campaigns"), eq(uc.resetDate, todayStr)),
    });
    if (counter && counter.count >= DAILY_LIMIT) {
      return NextResponse.json({ error: "Daily campaign limit reached" }, { status: 429 });
    }

    // Build recipient list
    let recipients: Array<{ email: string; name: string; id: string; source: "platform" | "employer" }> = [];

    if (campaign.targetType === "hotlist") {
      if (!campaign.hotlistId) {
        return NextResponse.json({ error: "This campaign targets a hotlist but no hotlist was selected. Edit the campaign and choose a hotlist." }, { status: 400 });
      }
      const entries = await db.select().from(hotlistEntries).where(eq(hotlistEntries.hotlistId, campaign.hotlistId));
      recipients = entries
        .filter((e) => e.contactEmail)
        .map((e) => ({ email: e.contactEmail!, name: e.displayName, id: e.id, source: "platform" as const }));
    } else if (campaign.targetType === "employer" || campaign.targetType === "candidate") {
      const platformQ = db.select({ email: contacts.email, name: contacts.name, id: contacts.id })
        .from(contacts)
        .where(and(
          eq(contacts.contactType, campaign.targetType as "employer" | "candidate"),
          eq(contacts.status, "active"),
          eq(contacts.unsubscribed, false),
          isNull(contacts.deletedAt)
        ));
      const platformContacts = (await platformQ).map((c) => ({ ...c, source: "platform" as const }));

      let employerContactsList: { email: string; name: string; id: string; source: "employer" }[] = [];
      if (campaign.includeEmployerContacts && campaign.targetType === "employer") {
        const ecQ = await db.select({ email: employerContacts.email, name: employerContacts.name, id: employerContacts.id })
          .from(employerContacts)
          .where(and(eq(employerContacts.userId, user.id), eq(employerContacts.status, "active"), eq(employerContacts.unsubscribed, false)));
        employerContactsList = ecQ.map((c) => ({ ...c, source: "employer" as const }));
      }

      const seen = new Set<string>();
      for (const c of [...platformContacts, ...employerContactsList]) {
        if (!seen.has(c.email)) { seen.add(c.email); recipients.push(c); }
      }
    }

    if (recipients.length === 0) {
      const hint = campaign.targetType === "employer"
        ? "No active recipients found. Upload contacts to My Contacts (make sure 'Include My Contacts' is checked) or ask your admin to add Platform Contacts."
        : campaign.targetType === "candidate"
        ? "No active candidate contacts found in the platform database."
        : "The selected hotlist has no entries with email addresses.";
      return NextResponse.json({ error: hint }, { status: 400 });
    }

    // Mark campaign as sending
    await db.update(campaigns)
      .set({ status: "sending", totalRecipients: recipients.length })
      .where(eq(campaigns.id, id));

    // Increment usage counter
    await db.execute(sql`
      INSERT INTO usage_counters (id, user_id, counter_type, count, reset_date, updated_at)
      VALUES (gen_random_uuid(), ${user.id}, 'daily_campaigns', 1, ${todayStr}, now())
      ON CONFLICT (user_id, counter_type, reset_date)
      DO UPDATE SET count = usage_counters.count + 1, updated_at = now()
    `);

    const fromName = `${userRecord.name} via CloudSourceHRM`;
    const replyToEmail = userRecord.replyToEmail ?? userRecord.email;
    const fromAddress = process.env.EMAIL_FROM_ADDRESS ?? "noreply@mail.cloudsourcehrm.us";

    // Determine email provider
    const hasAhaSend = !!(process.env.AHASEND_API_KEY && process.env.AHASEND_API_KEY !== "placeholder");
    const hasResend = !!(process.env.RESEND_API_KEY && !process.env.RESEND_API_KEY.startsWith("re_placeholder"));

    if (!hasAhaSend && !hasResend) {
      await db.update(campaigns).set({ status: "draft", totalRecipients: 0 }).where(eq(campaigns.id, id));
      return NextResponse.json({ error: "No email provider configured. Set AHASEND_API_KEY or RESEND_API_KEY." }, { status: 500 });
    }

    // Create email log records
    const logRecords: Array<{ logId: string; email: string; name: string }> = [];
    for (const r of recipients) {
      const [log] = await db.insert(emailLogs).values({
        campaignId: id,
        contactId: r.source === "platform" ? r.id : undefined,
        employerContactId: r.source === "employer" ? r.id : undefined,
        userId: user.id,
        recipientEmail: r.email,
        fromAddress,
        replyToAddress: replyToEmail,
        status: "queued",
      }).returning();
      logRecords.push({ logId: log.id, email: r.email, name: r.name });
    }

    // Send emails directly — no queue needed
    let sentCount = 0;
    let provider: "ahasend" | "resend" = hasAhaSend ? "ahasend" : "resend";
    const now = new Date();

    if (hasAhaSend) {
      try {
        const { ahasend } = await import("@/lib/email/ahasend");
        const messages = logRecords.map((r) => {
          const unsubLink = `<p style="font-size:11px;color:#9ca3af;text-align:center;margin-top:24px;"><a href="${buildUnsubscribeLink(r.logId, r.email)}" style="color:#9ca3af;">Unsubscribe</a></p>`;
          const trackingPixel = buildOpenTrackingPixel(r.logId, r.email);
          return {
            to: r.email, toName: r.name, fromName, replyTo: replyToEmail,
            subject: campaign.subject,
            html: campaign.bodyHtml + unsubLink + trackingPixel,
            text: campaign.bodyText,
            emailLogId: r.logId,
          };
        });
        await ahasend.sendBulk(messages);
        // Mark all as sent
        for (const r of logRecords) {
          await db.update(emailLogs).set({ status: "sent", sentAt: now, provider: "ahasend" }).where(eq(emailLogs.id, r.logId));
        }
        sentCount = logRecords.length;
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error("[campaign/send] AhaSend failed, trying Resend:", msg);
        provider = "resend";
      }
    }

    if (sentCount === 0 && hasResend) {
      try {
        const { resend } = await import("@/lib/email/resend");
        await resend.sendBatch(logRecords.map((r) => {
          const unsubLink = `<p style="font-size:11px;color:#9ca3af;text-align:center;margin-top:24px;"><a href="${buildUnsubscribeLink(r.logId, r.email)}" style="color:#9ca3af;">Unsubscribe</a></p>`;
          const trackingPixel = buildOpenTrackingPixel(r.logId, r.email);
          return {
            to: r.email, subject: campaign.subject,
            html: campaign.bodyHtml + unsubLink + trackingPixel,
            text: campaign.bodyText, replyTo: replyToEmail,
          };
        }));
        for (const r of logRecords) {
          await db.update(emailLogs).set({ status: "sent", sentAt: now, provider: "resend" }).where(eq(emailLogs.id, r.logId));
        }
        sentCount = logRecords.length;
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error("[campaign/send] Resend also failed:", msg);
        // Mark all as failed
        for (const r of logRecords) {
          await db.update(emailLogs).set({ status: "failed", errorMessage: msg }).where(eq(emailLogs.id, r.logId));
        }
        await db.update(campaigns).set({ status: "draft", totalRecipients: 0 }).where(eq(campaigns.id, id));
        return NextResponse.json({ error: `Email sending failed: ${msg}` }, { status: 500 });
      }
    }

    // Mark campaign as sent
    await db.update(campaigns).set({ status: "sent", sentAt: now }).where(eq(campaigns.id, id));

    return NextResponse.json({ success: true, recipients: sentCount, provider });

  } catch (err) {
    console.error("[campaign/send] Unhandled error:", err);
    try { await db.update(campaigns).set({ status: "draft", totalRecipients: 0 }).where(eq(campaigns.id, id)); } catch (_) {}
    return NextResponse.json({ error: err instanceof Error ? err.message : "An unexpected error occurred" }, { status: 500 });
  }
}
