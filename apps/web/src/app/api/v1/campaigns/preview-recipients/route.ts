import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db, contacts, employerContacts, hotlistEntries } from "@/lib/db";
import { eq, and, isNull, count } from "drizzle-orm";
import { headers } from "next/headers";

/**
 * GET /api/v1/campaigns/preview-recipients
 * Returns a recipient count preview given targeting params.
 *
 * Query params:
 *   targetType   = "employer" | "candidate" | "hotlist"
 *   hotlistId    = uuid  (required when targetType=hotlist)
 *   includeEC    = "true" | "false"  (include My Contacts when targetType=employer)
 */
export async function GET(request: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const sp = request.nextUrl.searchParams;
  const targetType = sp.get("targetType") ?? "employer";
  const hotlistId  = sp.get("hotlistId");
  const includeEC  = sp.get("includeEC") !== "false";

  let platform = 0;
  let myContacts = 0;

  if (targetType === "hotlist") {
    if (hotlistId) {
      const [row] = await db.select({ count: count() }).from(hotlistEntries)
        .where(and(eq(hotlistEntries.hotlistId, hotlistId)));
      platform = row?.count ?? 0;
    }
  } else if (targetType === "employer" || targetType === "candidate") {
    const [row] = await db.select({ count: count() }).from(contacts)
      .where(and(
        eq(contacts.contactType, targetType as "employer" | "candidate"),
        eq(contacts.status, "active"),
        eq(contacts.unsubscribed, false),
        isNull(contacts.deletedAt),
      ));
    platform = row?.count ?? 0;

    if (targetType === "employer" && includeEC) {
      const [ecRow] = await db.select({ count: count() }).from(employerContacts)
        .where(and(
          eq(employerContacts.userId, session.user.id),
          eq(employerContacts.status, "active"),
          eq(employerContacts.unsubscribed, false),
        ));
      myContacts = ecRow?.count ?? 0;
    }
  }

  return NextResponse.json({ platform, myContacts, total: platform + myContacts });
}
