import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { contacts } from "@/lib/db";
import { eq } from "drizzle-orm";
import { headers } from "next/headers";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role !== "admin") {
    return NextResponse.json({ error: "Forbidden — admin only" }, { status: 403 });
  }

  const { id } = await params;

  const [contact] = await db
    .update(contacts)
    .set({
      status: "active",
      bouncedAt: null,
      bounceReason: null,
      unsubscribed: false,
      unsubscribedAt: null,
      reactivatedBy: session.user.id,
      reactivatedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(contacts.id, id))
    .returning();

  if (!contact) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ success: true, contact });
}
