import { NextRequest, NextResponse } from "next/server";
import { Webhook } from "svix";
import { db, emailLogs, contacts, employerContacts } from "@/lib/db";
import { eq } from "drizzle-orm";

export async function POST(request: NextRequest) {
  const secret = process.env.RESEND_WEBHOOK_SECRET ?? "";
  const wh = new Webhook(secret);

  const rawBody = await request.text();
  const headers = {
    "svix-id": request.headers.get("svix-id") ?? "",
    "svix-timestamp": request.headers.get("svix-timestamp") ?? "",
    "svix-signature": request.headers.get("svix-signature") ?? "",
  };

  let payload: { type: string; data: { email_id: string; to: string[] } };
  try {
    payload = wh.verify(rawBody, headers) as typeof payload;
  } catch {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  const { type, data } = payload;
  const messageId = data.email_id;
  const recipientEmail = data.to?.[0];
  const now = new Date();

  const log = await db.query.emailLogs.findFirst({
    where: eq(emailLogs.providerMessageId, messageId),
  });

  if (!log) return NextResponse.json({ received: true });

  switch (type) {
    case "email.delivered":
      await db.update(emailLogs).set({ status: "delivered", deliveredAt: now }).where(eq(emailLogs.id, log.id));
      break;
    case "email.opened":
      await db.update(emailLogs).set({ status: "opened", openedAt: now }).where(eq(emailLogs.id, log.id));
      break;
    case "email.bounced":
      await db.update(emailLogs).set({ status: "bounced", bouncedAt: now }).where(eq(emailLogs.id, log.id));
      if (recipientEmail) await markContactInactive(recipientEmail, "Bounced via Resend", log.userId);
      break;
    case "email.complained":
      await db.update(emailLogs).set({ status: "complained" }).where(eq(emailLogs.id, log.id));
      if (recipientEmail) await markContactInactive(recipientEmail, "Spam complaint via Resend", log.userId);
      break;
  }

  return NextResponse.json({ received: true });
}

async function markContactInactive(email: string, reason: string, userId: string) {
  const now = new Date();
  // Platform contacts
  await db.update(contacts)
    .set({ status: "inactive", bounceReason: reason, bouncedAt: now })
    .where(eq(contacts.email, email));
  // Employer contacts for this user
  await db.update(employerContacts)
    .set({ status: "inactive", bounceReason: reason, bouncedAt: now })
    .where(eq(employerContacts.email, email));
}
