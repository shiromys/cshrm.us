import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db, csvImportBatches } from "@/lib/db";
import { desc, eq } from "drizzle-orm";
import { headers } from "next/headers";

export async function GET(request: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user || (session.user as unknown as Record<string, string>).role !== "admin") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status");
  let list = await db.select().from(csvImportBatches).orderBy(desc(csvImportBatches.submittedAt));
  if (status) list = list.filter((b) => b.status === status);
  return NextResponse.json(list);
}
