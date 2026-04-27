import { NextRequest, NextResponse } from "next/server";
import { createHmac } from "crypto";
import { db, emailLogs, contacts, employerContacts } from "@/lib/db";
import { eq } from "drizzle-orm";

export async function POST(request: NextRequest) {
  const secret = process.env.AHASEND_WEBHOOK_SECRET ?? "";
  const rawBody = await request.text();
  const signature = request.headers.get("x-ahasend-signature") ?? "";

  const expected = createHmac("sha256", secret).update(rawBody).digest("hex");
  if (expected !== signature) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  const payload = JSON.parse(rawBody) as {
    event: string;
    message_id: string;
    recipient_email: string;
    reason?: string;
  };

  const { event, message_id, recipient_email, reason } = payload;
  const now = new Date();

  const log = await db.query.emailLogs.findFirst({
    where: eq(emailLogs.providerMessageId, message_id),
  });

  if (!log) return NextResponse.json({ received: true });

  switch (event) {
    case "delivered":
      await db.update(emailLogs).set({ status: "delivered", deliveredAt: now }).where(eq(emailLogs.id, log.id));
      break;
    case "bounced":
      await db.update(emailLogs).set({ status: "bounced", bouncedAt: now, errorMessage: reason }).where(eq(emailLogs.id, log.id));
      await markContactInactive(recipient_email, reason ?? "Bounced via AhaSend");
      break;
    case "complained":
      await db.update(emailLogs).set({ status: "complained" }).where(eq(emailLogs.id, log.id));
      await markContactInactive(recipient_email, "Spam complaint via AhaSend");
      break;
  }

  return NextResponse.json({ received: true });
}

async function markContactInactive(email: string, reason: string) {
  const now = new Date();
  await db.update(contacts).set({ status: "inactive", bounceReason: reason, bouncedAt: now }).where(eq(contacts.email, email));
  await db.update(employerContacts).set({ status: "inactive", bounceReason: reason, bouncedAt: now }).where(eq(employerContacts.email, email));
}
