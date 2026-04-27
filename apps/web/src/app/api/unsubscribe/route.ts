import { NextRequest, NextResponse } from "next/server";
import { verifyHmacToken } from "@/lib/utils";
import { db, contacts, employerContacts, emailLogs } from "@/lib/db";
import { eq } from "drizzle-orm";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id") ?? "";
  const email = searchParams.get("email") ?? "";
  const token = searchParams.get("token") ?? "";

  const secret = process.env.UNSUBSCRIBE_HMAC_SECRET ?? "";
  if (!verifyHmacToken(secret, `${id}:${email}`, token)) {
    return new NextResponse("Invalid unsubscribe link.", { status: 400 });
  }

  const now = new Date();

  // Mark email log as unsubscribed
  await db.update(emailLogs).set({ status: "unsubscribed" }).where(eq(emailLogs.id, id));

  // Unsubscribe the contact
  await db.update(contacts).set({ unsubscribed: true, unsubscribedAt: now }).where(eq(contacts.email, email));
  await db.update(employerContacts).set({ unsubscribed: true }).where(eq(employerContacts.email, email));

  return new NextResponse(
    `<html><body style="font-family:Arial;text-align:center;padding:60px;">
      <h2 style="color:#1B4F8A;">You've been unsubscribed</h2>
      <p>You will no longer receive emails from this sender.</p>
    </body></html>`,
    { headers: { "Content-Type": "text/html" } }
  );
}
