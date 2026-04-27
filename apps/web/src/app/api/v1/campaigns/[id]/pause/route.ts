import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { campaigns } from "@/lib/db";
import { and, eq } from "drizzle-orm";
import { headers } from "next/headers";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  const [campaign] = await db
    .select()
    .from(campaigns)
    .where(and(eq(campaigns.id, id), eq(campaigns.userId, session.user.id)));

  if (!campaign) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (campaign.status !== "sending" && campaign.status !== "scheduled") {
    return NextResponse.json(
      { error: "Only scheduled or sending campaigns can be paused" },
      { status: 400 }
    );
  }

  const [updated] = await db
    .update(campaigns)
    .set({ status: "paused", updatedAt: new Date() })
    .where(eq(campaigns.id, id))
    .returning();

  return NextResponse.json(updated);
}
