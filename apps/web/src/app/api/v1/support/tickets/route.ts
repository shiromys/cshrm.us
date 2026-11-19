import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db, supportTickets, ticketReplies, users } from "@/lib/db";
import { desc, eq, or, ilike, and } from "drizzle-orm";
import { headers } from "next/headers";

function isAdmin(session: Awaited<ReturnType<typeof auth.api.getSession>>) {
  return (session?.user as unknown as Record<string, string>)?.role === "admin";
}

// ── GET /api/v1/support/tickets ───────────────────────────────────────────────
// Admin only — list all tickets with reply counts
export async function GET(request: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user || !isAdmin(session)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const status  = url.searchParams.get("status");   // filter by status
  const search  = url.searchParams.get("search");   // search submitter name/email/subject

  const rows = await db.query.supportTickets.findMany({
    where: and(
      status ? eq(supportTickets.status, status as "open" | "in_progress" | "resolved" | "closed") : undefined,
      search ? or(
        ilike(supportTickets.submitterName,  `%${search}%`),
        ilike(supportTickets.submitterEmail, `%${search}%`),
        ilike(supportTickets.subject,        `%${search}%`),
      ) : undefined,
    ),
    orderBy: [desc(supportTickets.updatedAt)],
    with: {
      replies: { columns: { id: true, createdAt: true, isStaff: true } },
      assignedUser: { columns: { id: true, name: true } },
    },
  });

  return NextResponse.json({ tickets: rows });
}

// ── POST /api/v1/support/tickets ──────────────────────────────────────────────
// Public (or authenticated) — create a new ticket
// Called by: contact page form, in-app support button
export async function POST(request: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() }).catch(() => null);
  const body    = await request.json();

  const { name, email, subject, message, source = "contact_form" } = body as {
    name?: string; email?: string; subject?: string; message?: string; source?: string;
  };

  if (!name?.trim() || !email?.trim() || !subject?.trim() || !message?.trim()) {
    return NextResponse.json({ error: "name, email, subject, and message are required" }, { status: 400 });
  }

  const userId = session?.user?.id ?? null;

  const [ticket] = await db.insert(supportTickets).values({
    userId,
    source: (source === "in_app" ? "in_app" : "contact_form") as "in_app" | "contact_form",
    submitterName:  name.trim(),
    submitterEmail: email.trim().toLowerCase(),
    subject:        subject.trim(),
    body:           message.trim(),
  }).returning();

  return NextResponse.json({ ok: true, ticketId: ticket.id }, { status: 201 });
}
