/**
 * POST /api/webhooks/postmark-inbound
 *
 * Postmark inbound email webhook. Called when a user replies to a support
 * ticket notification email sent with Reply-To: reply@reply.cloudsourcehrm.us.
 *
 * Postmark receives the email via MX record on reply.cloudsourcehrm.us,
 * parses it fully (including body), and POSTs the payload here.
 *
 * Flow:
 *  1. Admin replies to ticket from panel → email sent to user via MailerCloud
 *  2. Email Reply-To is reply@reply.cloudsourcehrm.us
 *  3. User hits Reply → email goes to Postmark (MX record)
 *  4. Postmark POSTs parsed payload to this endpoint
 *  5. We extract ticket ID from subject, save reply to DB
 */
import { NextRequest, NextResponse } from "next/server";
import { db, supportTickets, ticketReplies } from "@/lib/db";
import { eq, sql } from "drizzle-orm";

// ── Postmark inbound payload (key fields) ────────────────────────────────────
interface PostmarkInboundPayload {
  From:               string;   // "Name <email>" or "email"
  FromName:           string;
  FromFull:           { Email: string; Name: string };
  To:                 string;
  Subject:            string;
  TextBody?:          string;
  HtmlBody?:          string;
  StrippedTextReply?: string;   // Postmark auto-strips quoted content ✓
  MessageID:          string;
  Date:               string;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Extract the 8-char ticket short ID from the subject line.
 *  Matches: [Ticket #5CF50513]  or  Re: Something [Ticket #5CF50513] */
function extractTicketShortId(subject: string): string | null {
  const m = subject.match(/\[Ticket\s+#([A-F0-9]{8})\]/i);
  return m ? m[1].toUpperCase() : null;
}

/** Strip quoted reply lines ("> ...") from plain text as a fallback. */
function stripQuotes(text: string): string {
  return text
    .split("\n")
    .filter((line) => !line.trimStart().startsWith(">"))
    .join("\n")
    .replace(/\nOn .+wrote:/s, "")   // "On [date] X wrote:" divider
    .trim();
}

// ── Webhook handler ───────────────────────────────────────────────────────────
export async function POST(request: NextRequest) {
  // Optional: verify a shared secret passed as ?secret=xxx in the webhook URL
  const secret = process.env.POSTMARK_INBOUND_SECRET;
  if (secret) {
    const urlSecret = request.nextUrl.searchParams.get("secret");
    if (urlSecret !== secret) {
      console.warn("[postmark-inbound] Invalid secret");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  let payload: PostmarkInboundPayload;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { FromFull, Subject, StrippedTextReply, TextBody, MessageID } = payload;

  console.log("[postmark-inbound] Received:", MessageID, "Subject:", Subject);

  if (!Subject) {
    return NextResponse.json({ ok: false, reason: "No subject" });
  }

  // 1. Extract ticket short ID from subject
  const shortId = extractTicketShortId(Subject);
  if (!shortId) {
    console.log("[postmark-inbound] No ticket ID in subject, ignoring:", Subject);
    return NextResponse.json({ ok: true, reason: "Not a ticket reply" });
  }

  // 2. Find ticket
  const ticket = await db.query.supportTickets.findFirst({
    where: sql`upper(substring(${supportTickets.id}::text, 1, 8)) = ${shortId}`,
  });

  if (!ticket) {
    console.warn("[postmark-inbound] Ticket not found:", shortId);
    return NextResponse.json({ ok: false, reason: "Ticket not found" });
  }

  // 3. Get reply body — prefer Postmark's pre-stripped version
  const rawBody = StrippedTextReply?.trim()
               || (TextBody ? stripQuotes(TextBody) : "")
               || "";

  if (!rawBody) {
    console.warn("[postmark-inbound] Empty reply body for ticket:", shortId);
    return NextResponse.json({ ok: false, reason: "Empty reply body" });
  }

  // 4. Save reply
  const senderName  = FromFull?.Name  || payload.From;
  const senderEmail = FromFull?.Email || payload.From;

  await db.insert(ticketReplies).values({
    ticketId:   ticket.id,
    authorId:   null,
    authorName: senderName || senderEmail,
    isStaff:    false,
    body:       rawBody.slice(0, 5000),
  });

  // 5. Reopen resolved/closed tickets
  if (ticket.status === "resolved" || ticket.status === "closed") {
    await db.update(supportTickets)
      .set({ status: "open", updatedAt: new Date() })
      .where(eq(supportTickets.id, ticket.id));
    console.log("[postmark-inbound] Ticket reopened:", shortId);
  } else {
    await db.update(supportTickets)
      .set({ updatedAt: new Date() })
      .where(eq(supportTickets.id, ticket.id));
  }

  console.log(`[postmark-inbound] Reply saved for ticket ${shortId} from ${senderEmail}`);
  return NextResponse.json({ ok: true, ticketId: ticket.id });
}
