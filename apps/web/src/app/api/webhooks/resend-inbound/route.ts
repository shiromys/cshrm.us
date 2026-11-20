/**
 * POST /api/webhooks/resend-inbound
 *
 * Resend inbound email webhook. Called when a user replies to a support ticket
 * notification email sent to reply@reply.cloudsourcehrm.us.
 *
 * Flow:
 *  1. Resend receives the inbound email at reply.cloudsourcehrm.us
 *  2. Resend POSTs the parsed email payload to this endpoint
 *  3. We extract the ticket ID from the subject line ([Ticket #XXXXXXXX])
 *  4. We find that ticket in the DB and append the user's reply
 *  5. If the ticket was resolved/closed, we reopen it to signal new activity
 */
import { NextRequest, NextResponse } from "next/server";
import { db, supportTickets, ticketReplies } from "@/lib/db";
import { eq, sql } from "drizzle-orm";
import { createHmac } from "crypto";

// ── Resend inbound payload shape ─────────────────────────────────────────────
// Resend wraps all email fields under `data` for webhook events
interface ResendInboundPayload {
  type: string;             // "email.received"
  data: {
    from:     string;       // e.g. "John Doe <john@example.com>" or "john@example.com"
    to:       string | string[];
    subject:  string;
    text?:    string;
    html?:    string;
    headers?: Record<string, string>;
  };
}

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Extract the 8-char ticket short ID from the subject line.
 *  Matches: [Ticket #5CF50513]  or  Re: Something [Ticket #5CF50513] */
function extractTicketShortId(subject: string): string | null {
  const m = subject.match(/\[Ticket\s+#([A-F0-9]{8})\]/i);
  return m ? m[1].toUpperCase() : null;
}

/** Parse "Display Name <email@domain.com>" → { name, email } */
function parseFromHeader(from: string): { name: string; email: string } {
  const match = from.match(/^(.+?)\s*<(.+?)>\s*$/);
  if (match) return { name: match[1].trim(), email: match[2].trim() };
  return { name: from.trim(), email: from.trim() };
}

/** Strip the quoted original message from a plain-text reply body.
 *  Most email clients add "On [date] X wrote:" before the quote block. */
function stripQuotedReply(text: string): string {
  // Remove everything from the standard "On ... wrote:" divider onwards
  const divider = text.search(/\nOn .+wrote:/);
  const cleaned = divider > 0 ? text.slice(0, divider) : text;
  // Also strip lines starting with > (inline quotes)
  return cleaned
    .split("\n")
    .filter((line) => !line.trimStart().startsWith(">"))
    .join("\n")
    .trim();
}

// ── Webhook handler ───────────────────────────────────────────────────────────
export async function POST(request: NextRequest) {
  const rawBody = await request.text();

  // Verify Resend webhook signature (svix HMAC-SHA256)
  // Svix signs: `${svix-id}.${svix-timestamp}.${rawBody}`
  const secret = process.env.RESEND_INBOUND_SECRET;
  if (secret) {
    const msgId    = request.headers.get("svix-id") ?? "";
    const timestamp = request.headers.get("svix-timestamp") ?? "";
    const signature = request.headers.get("svix-signature") ?? "";
    const toSign    = `${msgId}.${timestamp}.${rawBody}`;
    const expected  = createHmac("sha256", secret).update(toSign).digest("base64");
    // svix-signature header format: "v1,<base64>" — may have multiple space-separated
    const valid = signature.split(" ").some((s) => s.replace(/^v\d+,/, "") === expected);
    if (!valid) {
      console.warn("[resend-inbound] Signature mismatch — possible spoofed request");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  let payload: ResendInboundPayload;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  // Resend wraps email fields under `data`
  const emailData = payload.data;
  if (!emailData) {
    console.warn("[resend-inbound] No data field in payload, type:", payload.type);
    return NextResponse.json({ ok: false, reason: "Missing data field" });
  }

  const { from, subject, text } = emailData;

  if (!subject) {
    return NextResponse.json({ ok: false, reason: "No subject" });
  }

  // 1. Find ticket ID in subject
  const shortId = extractTicketShortId(subject);
  if (!shortId) {
    // Not a ticket reply — ignore silently (could be unrelated email)
    console.log("[resend-inbound] No ticket ID in subject, ignoring:", subject);
    return NextResponse.json({ ok: true, reason: "Not a ticket reply" });
  }

  // 2. Look up the ticket by short ID (first 8 chars of UUID, uppercased)
  const ticket = await db.query.supportTickets.findFirst({
    where: sql`upper(substring(${supportTickets.id}::text, 1, 8)) = ${shortId}`,
  });

  if (!ticket) {
    console.warn("[resend-inbound] Ticket not found for short ID:", shortId);
    return NextResponse.json({ ok: false, reason: "Ticket not found" });
  }

  // 3. Parse the reply body — strip quoted content
  const replyText = text ?? "";
  const body      = stripQuotedReply(replyText) || replyText.slice(0, 2000).trim();

  if (!body) {
    return NextResponse.json({ ok: false, reason: "Empty reply body" });
  }

  // 4. Parse sender details
  const { name: senderName, email: senderEmail } = parseFromHeader(from);

  // 5. Save as a new reply on the ticket
  await db.insert(ticketReplies).values({
    ticketId:   ticket.id,
    authorId:   null,         // null = external user (not a staff member)
    authorName: senderName || senderEmail,
    isStaff:    false,
    body,
    // emailedAt not set — this came FROM the user, not sent TO them
  });

  // 6. If the ticket was resolved/closed, reopen it — user has more to say
  if (ticket.status === "resolved" || ticket.status === "closed") {
    await db.update(supportTickets)
      .set({ status: "open", updatedAt: new Date() })
      .where(eq(supportTickets.id, ticket.id));
  } else {
    await db.update(supportTickets)
      .set({ updatedAt: new Date() })
      .where(eq(supportTickets.id, ticket.id));
  }

  console.log(`[resend-inbound] Reply added to ticket ${shortId} from ${senderEmail}`);
  return NextResponse.json({ ok: true, ticketId: ticket.id });
}
