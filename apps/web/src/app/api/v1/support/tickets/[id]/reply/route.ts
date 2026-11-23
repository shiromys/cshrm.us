import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db, supportTickets, ticketReplies, users } from "@/lib/db";
import { eq } from "drizzle-orm";
import { headers } from "next/headers";
import { mailercloud } from "@/lib/email/mailercloud";

function isAdmin(session: Awaited<ReturnType<typeof auth.api.getSession>>) {
  return (session?.user as unknown as Record<string, string>)?.role === "admin";
}

// ── POST /api/v1/support/tickets/[id]/reply ───────────────────────────────────
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user || !isAdmin(session)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const body   = await request.json();
  const { message, markAs } = body as { message?: string; markAs?: string };

  if (!message?.trim()) {
    return NextResponse.json({ error: "message is required" }, { status: 400 });
  }

  const ticket = await db.query.supportTickets.findFirst({
    where: eq(supportTickets.id, id),
  });
  if (!ticket) return NextResponse.json({ error: "Ticket not found" }, { status: 404 });

  // 1. Store the reply
  const adminName = session.user.name ?? session.user.email ?? "Support Team";
  const [reply] = await db.insert(ticketReplies).values({
    ticketId:   id,
    authorId:   session.user.id,
    authorName: adminName,
    isStaff:    true,
    body:       message.trim(),
  }).returning();

  // 2. Update ticket status
  const newStatus = markAs ?? (ticket.status === "open" ? "in_progress" : ticket.status);
  const isResolved = newStatus === "resolved" || newStatus === "closed";
  await db.update(supportTickets).set({
    status:     newStatus as "open" | "in_progress" | "resolved" | "closed",
    resolvedAt: isResolved && !ticket.resolvedAt ? new Date() : ticket.resolvedAt,
    resolvedBy: isResolved && !ticket.resolvedBy ? session.user.id : ticket.resolvedBy,
    updatedAt:  new Date(),
  }).where(eq(supportTickets.id, id));

  // 3. Email the user
  const appUrl   = process.env.NEXT_PUBLIC_APP_URL ?? "https://www.cloudsourcehrm.us";
  const from     = process.env.MAILERCLOUD_FROM_EMAIL ?? process.env.EMAIL_FROM_ADDRESS ?? "info@cloudsourcehrm.us";
  // Reply-To routes user's email reply back through Resend inbound → webhook → ticket thread
  const replyTo  = process.env.SUPPORT_REPLY_ADDRESS ?? from;
  let emailedAt: Date | null = null;

  const html = `
    <div style="font-family:sans-serif;max-width:600px;margin:0 auto;color:#1e293b;">
      <div style="background:#1d4ed8;padding:20px 24px;border-radius:8px 8px 0 0;">
        <p style="color:white;margin:0;font-size:14px;font-weight:600;">CloudSourceHRM Support</p>
      </div>
      <div style="border:1px solid #e2e8f0;border-top:none;padding:24px;border-radius:0 0 8px 8px;">
        <p>Hi ${ticket.submitterName},</p>
        <p>We've replied to your support ticket <strong>#${id.slice(0, 8).toUpperCase()}</strong>: <em>${ticket.subject}</em></p>
        <div style="background:#f8fafc;border-left:3px solid #1d4ed8;padding:16px;margin:16px 0;border-radius:0 4px 4px 0;">
          ${message.trim().replace(/\n/g, "<br/>")}
        </div>
        <p style="color:#64748b;font-size:13px;">— ${adminName}, CloudSourceHRM Support</p>
        ${isResolved ? `<p style="font-size:12px;color:#94a3b8;">This ticket has been marked as <strong>${newStatus}</strong>. If you need further help, feel free to contact us again.</p>` : ""}
        <hr style="border:none;border-top:1px solid #e2e8f0;margin:20px 0;"/>
        <p style="font-size:11px;color:#94a3b8;text-align:center;">
          CloudSourceHRM · <a href="${appUrl}" style="color:#94a3b8;">${appUrl}</a>
        </p>
      </div>
    </div>
  `;

  try {
    await mailercloud.sendOne({
      to:       ticket.submitterEmail,
      toName:   ticket.submitterName,
      fromName: "CloudSourceHRM Support",
      replyTo:  replyTo,
      subject:  `Re: ${ticket.subject} [Ticket #${id.slice(0, 8).toUpperCase()}]`,
      html,
    });
    emailedAt = new Date();
    await db.update(ticketReplies).set({ emailedAt }).where(eq(ticketReplies.id, reply.id));
  } catch (e) {
    console.error("[support/reply] Email failed:", e);
    // Non-fatal — reply is stored even if email fails
  }

  void logActivity({
    userId:   session.user.id,
    event:    "ticket_replied",
    summary:  `Replied to support ticket #${id.slice(0, 8).toUpperCase()}: "${ticket.subject}"`,
    metadata: { ticketId: id, replyId: reply.id, newStatus: newStatus, emailed: !!emailedAt },
    request,
  });

  if (isResolved) {
    void logActivity({
      userId:   session.user.id,
      event:    "ticket_resolved",
      summary:  `Ticket #${id.slice(0, 8).toUpperCase()} marked as "${newStatus}": "${ticket.subject}"`,
      metadata: { ticketId: id, status: newStatus },
      request,
    });
  }

  return NextResponse.json({ ok: true, replyId: reply.id, emailed: !!emailedAt });
}
