import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db, supportTickets, ticketReplies } from "@/lib/db";
import { eq } from "drizzle-orm";
import { headers } from "next/headers";

function isAdmin(session: Awaited<ReturnType<typeof auth.api.getSession>>) {
  return (session?.user as unknown as Record<string, string>)?.role === "admin";
}

// ── GET /api/v1/support/tickets/[id] ─────────────────────────────────────────
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user || !isAdmin(session)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const ticket = await db.query.supportTickets.findFirst({
    where: eq(supportTickets.id, id),
    with: {
      replies: { orderBy: (r, { asc }) => [asc(r.createdAt)] },
    },
  });

  if (!ticket) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(ticket);
}

// ── PATCH /api/v1/support/tickets/[id] ───────────────────────────────────────
// Update status, priority, assignedTo, or internalNote
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user || !isAdmin(session)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id }  = await params;
  const body    = await request.json();
  const allowed = ["status", "priority", "assignedTo", "internalNote"] as const;
  const update: Record<string, unknown> = { updatedAt: new Date() };

  for (const key of allowed) {
    if (key in body) update[key] = body[key];
  }

  if (update.status === "resolved" || update.status === "closed") {
    update.resolvedAt = new Date();
    update.resolvedBy = session.user.id;
  }

  const [updated] = await db.update(supportTickets)
    .set(update)
    .where(eq(supportTickets.id, id))
    .returning();

  if (!updated) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(updated);
}
