import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db, hotlists, hotlistEntries } from "@/lib/db";
import { eq, and, isNull } from "drizzle-orm";
import { hotlistEntrySchema } from "@/lib/schemas";
import { normaliseName } from "@/lib/utils";
import { headers } from "next/headers";

async function verifyOwnership(hotlistId: string, userId: string) {
  return db.query.hotlists.findFirst({
    where: (h, { and, eq, isNull }) =>
      and(eq(h.id, hotlistId), eq(h.userId, userId), isNull(h.deletedAt)),
  });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; entryId: string }> }
) {
  const { id, entryId } = await params;
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const hotlist = await verifyOwnership(id, session.user.id);
  if (!hotlist) return NextResponse.json({ error: "Hotlist not found" }, { status: 404 });

  const body = await request.json();
  // Partial parse — only validate fields that are present
  const parsed = hotlistEntrySchema.partial().safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const updates: Record<string, unknown> = { ...parsed.data };
  if (parsed.data.rawName) {
    updates.displayName = normaliseName(parsed.data.rawName);
  }

  const [updated] = await db
    .update(hotlistEntries)
    .set(updates)
    .where(and(eq(hotlistEntries.id, entryId), eq(hotlistEntries.hotlistId, id)))
    .returning();

  if (!updated) return NextResponse.json({ error: "Entry not found" }, { status: 404 });
  return NextResponse.json(updated);
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; entryId: string }> }
) {
  const { id, entryId } = await params;
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const hotlist = await verifyOwnership(id, session.user.id);
  if (!hotlist) return NextResponse.json({ error: "Hotlist not found" }, { status: 404 });

  await db
    .delete(hotlistEntries)
    .where(and(eq(hotlistEntries.id, entryId), eq(hotlistEntries.hotlistId, id)));

  // Update entry count
  await db.execute(
    `UPDATE hotlists SET total_entries = (SELECT COUNT(*) FROM hotlist_entries WHERE hotlist_id = '${id}') WHERE id = '${id}'`
  );

  return NextResponse.json({ success: true });
}
