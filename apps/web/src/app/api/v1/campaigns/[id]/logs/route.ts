import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { emailLogs, campaigns } from "@/lib/db";
import { eq, desc, count as sqlCount } from "drizzle-orm";
import { headers } from "next/headers";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const { searchParams } = new URL(req.url);
  const page = parseInt(searchParams.get("page") ?? "1");
  const limit = Math.min(parseInt(searchParams.get("limit") ?? "50"), 200);
  const offset = (page - 1) * limit;

  // Verify the user owns this campaign (admin sees all)
  const [campaign] = await db
    .select({ id: campaigns.id, userId: campaigns.userId })
    .from(campaigns)
    .where(eq(campaigns.id, id));

  if (!campaign) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (session.user.role !== "admin" && campaign.userId !== session.user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const logs = await db
    .select()
    .from(emailLogs)
    .where(eq(emailLogs.campaignId, id))
    .orderBy(desc(emailLogs.createdAt))
    .limit(limit)
    .offset(offset);

  const [{ total }] = await db
    .select({ total: sqlCount() })
    .from(emailLogs)
    .where(eq(emailLogs.campaignId, id));

  return NextResponse.json({ logs, total: Number(total), page, limit });
}
