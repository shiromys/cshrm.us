import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { hotlists } from "@/lib/db";
import { and, eq } from "drizzle-orm";
import { headers } from "next/headers";

async function getSession() {
  return auth.api.getSession({ headers: await headers() });
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const [hotlist] = await db
    .select()
    .from(hotlists)
    .where(and(eq(hotlists.id, id), eq(hotlists.userId, session.user.id)));

  if (!hotlist) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(hotlist);
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await req.json();
  const { id: _id, userId: _u, createdAt: _c, updatedAt: _up, ...updateData } = body;

  const [updated] = await db
    .update(hotlists)
    .set({ ...updateData, updatedAt: new Date() })
    .where(and(eq(hotlists.id, id), eq(hotlists.userId, session.user.id)))
    .returning();

  if (!updated) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(updated);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  await db
    .delete(hotlists)
    .where(and(eq(hotlists.id, id), eq(hotlists.userId, session.user.id)));

  return NextResponse.json({ success: true });
}
