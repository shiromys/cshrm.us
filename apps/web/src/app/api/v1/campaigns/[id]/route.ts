import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { campaigns } from "@/lib/db";
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
  const where =
    session.user.role === "admin"
      ? eq(campaigns.id, id)
      : and(eq(campaigns.id, id), eq(campaigns.userId, session.user.id));

  const [campaign] = await db.select().from(campaigns).where(where);
  if (!campaign) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(campaign);
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

  const [existing] = await db
    .select()
    .from(campaigns)
    .where(and(eq(campaigns.id, id), eq(campaigns.userId, session.user.id)));

  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (existing.status !== "draft") {
    return NextResponse.json({ error: "Only draft campaigns can be edited" }, { status: 400 });
  }

  const [updated] = await db
    .update(campaigns)
    .set({ ...updateData, updatedAt: new Date() })
    .where(eq(campaigns.id, id))
    .returning();

  return NextResponse.json(updated);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const [existing] = await db
    .select()
    .from(campaigns)
    .where(and(eq(campaigns.id, id), eq(campaigns.userId, session.user.id)));

  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (existing.status === "sending") {
    return NextResponse.json({ error: "Cannot delete a campaign that is currently sending" }, { status: 400 });
  }

  await db.delete(campaigns).where(eq(campaigns.id, id));
  return NextResponse.json({ success: true });
}
