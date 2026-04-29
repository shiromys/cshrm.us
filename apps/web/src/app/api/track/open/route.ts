import { NextRequest, NextResponse } from "next/server";
import { verifyHmacToken } from "@/lib/utils";
import { db, emailLogs, campaigns } from "@/lib/db";
import { eq, sql } from "drizzle-orm";

// 1x1 transparent GIF
const PIXEL = Buffer.from(
  "R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7",
  "base64"
);

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id") ?? "";
  const email = searchParams.get("email") ?? "";
  const token = searchParams.get("token") ?? "";

  const secret = process.env.OPEN_TRACKING_HMAC_SECRET ?? "";
  if (verifyHmacToken(secret, `${id}:${email}`, token)) {
    // Only record the first open (don't double-count re-opens)
    const log = await db.query.emailLogs.findFirst({ where: eq(emailLogs.id, id) });
    if (log && log.status !== "opened") {
      await db
        .update(emailLogs)
        .set({ status: "opened", openedAt: new Date() })
        .where(eq(emailLogs.id, id));
      // Increment the campaign's opened counter
      await db
        .update(campaigns)
        .set({ openedCount: sql`${campaigns.openedCount} + 1` })
        .where(eq(campaigns.id, log.campaignId));
    }
  }

  return new NextResponse(PIXEL, {
    headers: {
      "Content-Type": "image/gif",
      "Cache-Control": "no-cache, no-store, must-revalidate",
    },
  });
}
