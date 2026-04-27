import { NextRequest, NextResponse } from "next/server";
import { verifyCronSecret, today } from "@/lib/utils";
import { db, usageCounters } from "@/lib/db";
import { lt } from "drizzle-orm";

export async function GET(request: NextRequest) {
  if (!verifyCronSecret(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const todayStr = today();

  // Delete counters from previous days (they're no longer needed)
  const result = await db
    .delete(usageCounters)
    .where(lt(usageCounters.resetDate, todayStr));

  return NextResponse.json({ success: true, message: "Usage counters reset" });
}
