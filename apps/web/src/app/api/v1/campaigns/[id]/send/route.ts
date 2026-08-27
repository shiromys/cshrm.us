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
    if (!userRecord) return NextResponse.json({ error: "User not found" }, { status: 404 });
    const isAdmin = userRecord.role === "admin";
    if (!isAdmin && userRecord.tier === "free") {
      return NextResponse.json({ error: "Standard subscription required to send campaigns" }, { status: 403 });
    }

    const replyToEmail = (userRecord.replyToEmail ?? userRecord.email).toLowerCase();

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

    // Strip any recipient whose email matches the Reply-To (anti-phishing best practice)
    const beforeGuard = recipients.length;
    recipients = recipients.filter((r) => r.email.toLowerCase() !== replyToEmail);
    if (recipients.length < beforeGuard) {
      console.warn(`[campaign/send] Stripped ${beforeGuard - recipients.length} recipient(s) whose email matched the Reply-To (${replyToEmail}).`);
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

    // Bulk sending uses MailerCloud only. Resend is reserved for transactional emails.
    const fromName    = `${userRecord.name} via CloudSourceHRM`;
    const fromAddress = process.env.MAILERCLOUD_FROM_EMAIL ?? process.env.EMAIL_FROM_ADDRESS ?? "info@cloudsourcehrm.us";

    if (!process.env.MAILERCLOUD_API_KEY) {
      await db.update(campaigns).set({ status: "draft", totalRecipients: 0 }).where(eq(campaigns.id, id));
      return NextResponse.json({ error: "Bulk email not configured. Set MAILERCLOUD_API_KEY." }, { status: 500 });
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

    // ── Personalisation helper ──────────────────────────────────────────────
    // Replaces tokens in subject, HTML body, and plain-text body per recipient.
    // Supported tokens:
    //   {{name}}       → recipient's full name      e.g. "James Carter"
    //   {{first_name}} → first word of their name   e.g. "James"
    //   {{email}}      → recipient's email address
    //   {{company}}    → recipient's company name (empty string if unknown)
    function personalise(template: string, r: { name: string; email: string; companyName?: string | null }): string {
      const firstName = r.name.split(" ")[0] ?? r.name;
      return template
        .replace(/\{\{name\}\}/gi,       r.name)
        .replace(/\{\{first_name\}\}/gi, firstName)
        .replace(/\{\{email\}\}/gi,      r.email)
        .replace(/\{\{company\}\}/gi,    r.companyName ?? "");
    }

    // Enrich logRecords with company info for personalisation
    const enriched = logRecords.map((r) => {
      const contact = recipients.find((c) => c.email === r.email);
      return { ...r, companyName: (contact as { companyName?: string | null } | undefined)?.companyName ?? null };
    });

    // Send emails — MailerCloud primary, Resend automatic fallback
    let sentCount = 0;
    const now = new Date();

    // Capture campaign fields as consts so TS control-flow keeps them non-nullable inside closures
    const campaignSubject  = campaign.subject;
    const campaignBodyHtml = campaign.bodyHtml;
    const campaignBodyText = campaign.bodyText ?? "";

    // ── Helper: build per-recipient payload ────────────────────────────────
    function buildMessages() {
      return enriched.map((r) => {
        const unsubLink     = `<p style="font-size:11px;color:#9ca3af;text-align:center;margin-top:24px;"><a href="${buildUnsubscribeLink(r.logId, r.email)}" style="color:#9ca3af;">Unsubscribe</a></p>`;
        const trackingPixel = buildOpenTrackingPixel(r.logId, r.email);
        return {
          to:         r.email,
          toName:     r.name,
          fromName,
          replyTo:    replyToEmail,
          subject:    personalise(campaignSubject, r),
          html:       personalise(campaignBodyHtml, r) + unsubLink + trackingPixel,
          text:       personalise(campaignBodyText, r),
          emailLogId: r.logId,
        };
      });
    }

    // ── MailerCloud (bulk sender) ─────────────────────────────────────────
    try {
      const { mailercloud } = await import("@/lib/email/mailercloud");
      await mailercloud.sendBulk(buildMessages());
      for (const r of enriched) {
        await db.update(emailLogs).set({ status: "sent", sentAt: now, provider: "mailercloud" }).where(eq(emailLogs.id, r.logId));
      }
      sentCount = enriched.length;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error("[campaign/send] MailerCloud failed:", msg);
      for (const r of logRecords) {
        await db.update(emailLogs).set({ status: "failed", errorMessage: msg }).where(eq(emailLogs.id, r.logId));
      }
      await db.update(campaigns).set({ status: "draft", totalRecipients: 0 }).where(eq(campaigns.id, id));
      return NextResponse.json({ error: `Email sending failed: ${msg}` }, { status: 500 });
    }

    // Mark campaign as sent
    await db.update(campaigns).set({ status: "sent", sentAt: now }).where(eq(campaigns.id, id));

    return NextResponse.json({ success: true, recipients: sentCount });

  } catch (err) {
    console.error("[campaign/send] Unhandled error:", err);
    try { await db.update(campaigns).set({ status: "draft", totalRecipients: 0 }).where(eq(campaigns.id, id)); } catch (_) {}
    return NextResponse.json({ error: err instanceof Error ? err.message : "An unexpected error occurred" }, { status: 500 });
  }
}
