import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db, hotlists, hotlistEntries } from "@/lib/db";
import { eq, and, isNull } from "drizzle-orm";
import { renderHotlistTable } from "@/lib/hotlist-renderer";
import { headers } from "next/headers";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const hotlist = await db.query.hotlists.findFirst({
    where: (h, { and, eq, isNull }) => and(eq(h.id, id), eq(h.userId, session.user.id), isNull(h.deletedAt)),
  });
  if (!hotlist) return NextResponse.json({ error: "Hotlist not found" }, { status: 404 });

  const entries = await db.select().from(hotlistEntries).where(eq(hotlistEntries.hotlistId, id));
  const html = renderHotlistTable(entries, hotlist.visibleColumns);

  return new NextResponse(html, { headers: { "Content-Type": "text/html" } });
}
