import { getBoss, QUEUE_NAMES, type CampaignEmailJob } from "@/lib/queue";
import { db, emailLogs, campaigns } from "@/lib/db";
import { eq, and, sql } from "drizzle-orm";

const BATCH_SIZE = 10;
const POLL_INTERVAL_MS = 5000; // poll every 5 seconds

async function sendEmail(job: CampaignEmailJob): Promise<{ provider: string }> {
  const hasAhaSend = process.env.AHASEND_API_KEY && process.env.AHASEND_API_KEY !== "placeholder";
  const hasResend = process.env.RESEND_API_KEY && !process.env.RESEND_API_KEY.startsWith("re_placeholder");

  if (hasAhaSend) {
    const { ahasend } = await import("@/lib/email/ahasend");
    await ahasend.sendSingle({
      to: job.recipientEmail,
      toName: job.recipientName,
      fromName: job.fromName,
      replyTo: job.replyToEmail,
      subject: job.subject,
      html: job.bodyHtml,
      text: job.bodyText,
    });
    return { provider: "ahasend" };
  }

  if (hasResend) {
    const { resendClient } = await import("@/lib/email/resend");
    await resendClient.emails.send({
      from: `${job.fromName} <${process.env.EMAIL_FROM_ADDRESS ?? "noreply@mail.cloudsourcehrm.us"}>`,
      to: job.recipientEmail,
      subject: job.subject,
      html: job.bodyHtml,
      text: job.bodyText,
      reply_to: job.replyToEmail,
    });
    return { provider: "resend" };
  }

  throw new Error("No email provider configured (set AHASEND_API_KEY or RESEND_API_KEY)");
}

async function markCampaignIfComplete(campaignId: string) {
  const pending = await db
    .select({ count: sql<number>`count(*)` })
    .from(emailLogs)
    .where(and(
      eq(emailLogs.campaignId, campaignId),
      eq(emailLogs.status, "queued")
    ));

  const pendingCount = Number(pending[0]?.count ?? 0);
  if (pendingCount === 0) {
    await db.update(campaigns)
      .set({ status: "sent", sentAt: new Date() })
      .where(eq(campaigns.id, campaignId));
    console.log(`[worker] Campaign ${campaignId} marked as sent`);
  }
}

async function processBatch() {
  const boss = await getBoss();
  // pg-boss v10: fetch takes an options object, not a number
  const jobs = await boss.fetch<CampaignEmailJob>(QUEUE_NAMES.CAMPAIGN_EMAIL, { batchSize: BATCH_SIZE });

  if (!jobs || jobs.length === 0) return;

  console.log(`[worker] Processing ${jobs.length} email job(s)`);

  const completedIds: string[] = [];
  const failedIds: string[] = [];

  for (const job of jobs) {
    const data = job.data;
    try {
      const { provider } = await sendEmail(data);
      console.log(`[worker] Sent to ${data.recipientEmail} via ${provider}`);
      await db.update(emailLogs)
        .set({ status: "sent", sentAt: new Date(), provider: provider as "ahasend" | "resend" })
        .where(eq(emailLogs.id, data.emailLogId));
      completedIds.push(job.id);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`[worker] Failed to send to ${data.recipientEmail}:`, msg);
      await db.update(emailLogs)
        .set({ status: "failed", errorMessage: msg })
        .where(eq(emailLogs.id, data.emailLogId));
      failedIds.push(job.id);
    }

    await markCampaignIfComplete(data.campaignId);
  }

  // pg-boss v10: complete/fail require queue name as first arg
  if (completedIds.length > 0) await boss.complete(QUEUE_NAMES.CAMPAIGN_EMAIL, completedIds);
  if (failedIds.length > 0) await boss.fail(QUEUE_NAMES.CAMPAIGN_EMAIL, failedIds);
}

export async function startWorker() {
  try {
    await getBoss(); // ensure pg-boss is initialised
    console.log("[worker] Queue worker started ✓ — polling every 5s");

    // Poll immediately on startup, then on interval
    await processBatch().catch((e) => console.error("[worker] Poll error:", e));

    setInterval(() => {
      processBatch().catch((e) => console.error("[worker] Poll error:", e));
    }, POLL_INTERVAL_MS);

  } catch (err) {
    console.error("[worker] Failed to start worker:", err);
  }
}
