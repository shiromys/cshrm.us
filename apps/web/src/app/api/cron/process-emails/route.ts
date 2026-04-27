import { NextRequest, NextResponse } from "next/server";
import { verifyCronSecret } from "@/lib/utils";
import { getBoss, QUEUE_NAMES, type CampaignEmailJob } from "@/lib/queue";
import { ahasend } from "@/lib/email/ahasend";
import { resend } from "@/lib/email/resend";
import { db, emailLogs, campaigns } from "@/lib/db";
import { eq, and, inArray, sql } from "drizzle-orm";

const BATCH_SIZE = 50;

async function markCampaignsIfComplete(campaignIds: string[]) {
  const unique = [...new Set(campaignIds)];
  for (const campaignId of unique) {
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
    }
  }
}

export async function GET(request: NextRequest) {
  if (!verifyCronSecret(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const boss = await getBoss();
  // pg-boss v10: fetch takes an options object
  const jobs = await boss.fetch<CampaignEmailJob>(QUEUE_NAMES.CAMPAIGN_EMAIL, { batchSize: BATCH_SIZE });

  if (!jobs || jobs.length === 0) {
    return NextResponse.json({ processed: 0 });
  }

  const messages = jobs.map((job) => {
    const data = job.data;
    const unsubLink = `<p style="font-size:11px;color:#9ca3af;text-align:center;margin-top:24px;">
      <a href="${data.unsubscribeToken}" style="color:#9ca3af;">Unsubscribe</a>
    </p>`;
    const trackingPixel = `<img src="${data.openTrackingToken}" width="1" height="1" alt="" />`;

    return {
      to: data.recipientEmail,
      toName: data.recipientName,
      fromName: data.fromName,
      replyTo: data.replyToEmail,
      subject: data.subject,
      html: data.bodyHtml + unsubLink + trackingPixel,
      text: data.bodyText,
      emailLogId: data.emailLogId,
      campaignId: data.campaignId,
    };
  });

  const ids = jobs.map((j) => j.id);
  let provider: "ahasend" | "resend" = "ahasend";

  try {
    await ahasend.sendBulk(messages);
  } catch (err) {
    console.error("AhaSend bulk failed, falling back to Resend:", err);
    provider = "resend";
    try {
      await resend.sendBatch(
        messages.map((m) => ({
          to: m.to,
          subject: m.subject,
          html: m.html,
          text: m.text,
          replyTo: m.replyTo,
        }))
      );
    } catch (resendErr) {
      console.error("Resend fallback also failed:", resendErr);
      // pg-boss v10: fail requires queue name as first arg
      await boss.fail(QUEUE_NAMES.CAMPAIGN_EMAIL, ids);
      return NextResponse.json({ error: "Both providers failed", processed: 0 }, { status: 500 });
    }
  }

  // pg-boss v10: complete requires queue name as first arg
  await boss.complete(QUEUE_NAMES.CAMPAIGN_EMAIL, ids);

  const now = new Date();
  for (const msg of messages) {
    await db
      .update(emailLogs)
      .set({ status: "sent", sentAt: now, provider })
      .where(eq(emailLogs.id, msg.emailLogId));
  }

  const campaignIds = messages.map((m) => m.campaignId);
  await markCampaignsIfComplete(campaignIds);

  return NextResponse.json({ processed: messages.length, provider });
}
