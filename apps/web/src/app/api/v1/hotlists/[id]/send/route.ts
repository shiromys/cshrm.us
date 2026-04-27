import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { hotlists, hotlistEntries, campaigns } from "@/lib/db";
import { and, eq } from "drizzle-orm";
import { headers } from "next/headers";
import { renderHotlistTable } from "@/lib/hotlist-renderer";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (session.user.tier === "free") {
    return NextResponse.json(
      { error: "Standard subscription required to send hotlists" },
      { status: 403 }
    );
  }

  const { id } = await params;
  const body = await req.json().catch(() => ({}));

  // Load hotlist + entries
  const [hotlist] = await db
    .select()
    .from(hotlists)
    .where(and(eq(hotlists.id, id), eq(hotlists.userId, session.user.id)));

  if (!hotlist) return NextResponse.json({ error: "Hotlist not found" }, { status: 404 });

  const entries = await db
    .select()
    .from(hotlistEntries)
    .where(eq(hotlistEntries.hotlistId, id));

  if (entries.length === 0) {
    return NextResponse.json({ error: "Hotlist has no entries" }, { status: 400 });
  }

  // Render HTML table
  const bodyHtml = renderHotlistTable(entries, hotlist.visibleColumns);
  const bodyText = entries.map((e) => `${e.displayName} | ${e.title ?? ""} | ${(e.skills ?? []).join(", ")}`).join("\n");
  const subject = hotlist.emailSubject ?? `Candidate Hotlist: ${hotlist.name}`;

  // Create campaign record (status=draft, user can trigger send from campaigns)
  const [campaign] = await db
    .insert(campaigns)
    .values({
      userId: session.user.id,
      name: `Hotlist: ${hotlist.name}`,
      subject,
      bodyHtml,
      bodyText,
      targetType: "employer",
      status: "draft",
      hotlistId: hotlist.id,
      includeEmployerContacts: true,
    })
    .returning();

  // Mark hotlist as sent
  await db
    .update(hotlists)
    .set({ status: "sent", sentAt: new Date(), updatedAt: new Date() })
    .where(eq(hotlists.id, id));

  return NextResponse.json({
    success: true,
    campaignId: campaign.id,
    message:
      "Campaign created from hotlist. Go to Campaigns to send it.",
  });
}
