import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db, activityLogs } from "@/lib/db";
import { eq, desc } from "drizzle-orm";
import { headers } from "next/headers";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userRecord = await db.query.users.findFirst({ where: (u, { eq }) => eq(u.id, session.user.id) });
  if (userRecord?.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id: targetUserId } = await params;

  const url = new URL(request.url);
  const limit  = Math.min(parseInt(url.searchParams.get("limit")  ?? "100"), 500);
  const offset = parseInt(url.searchParams.get("offset") ?? "0");

  const logs = await db
    .select()
    .from(activityLogs)
    .where(eq(activityLogs.userId, targetUserId))
    .orderBy(desc(activityLogs.createdAt))
    .limit(limit)
    .offset(offset);

  return NextResponse.json({ logs, limit, offset });
}
