import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db, hotlists, hotlistEntries } from "@/lib/db";
import { eq, and, isNull } from "drizzle-orm";
import { hotlistEntrySchema } from "@/lib/schemas";
import { normaliseName } from "@/lib/utils";
import { headers } from "next/headers";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const entries = await db.select().from(hotlistEntries).where(eq(hotlistEntries.hotlistId, id));
  return NextResponse.json(entries);
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Verify hotlist ownership
  const hotlist = await db.query.hotlists.findFirst({
    where: (h, { and, eq, isNull }) => and(eq(h.id, id), eq(h.userId, session.user.id), isNull(h.deletedAt)),
  });
  if (!hotlist) return NextResponse.json({ error: "Hotlist not found" }, { status: 404 });

  const body = await request.json();
  const parsed = hotlistEntrySchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const displayName = normaliseName(parsed.data.rawName);

  const [entry] = await db.insert(hotlistEntries).values({
    hotlistId: id,
    userId: session.user.id,
    ...parsed.data,
    displayName,
    source: "form_entry",
  }).returning();

  // Update entry count
  await db.execute(
    `UPDATE hotlists SET total_entries = (SELECT COUNT(*) FROM hotlist_entries WHERE hotlist_id = '${id}') WHERE id = '${id}'`
  );

  return NextResponse.json(entry, { status: 201 });
}
