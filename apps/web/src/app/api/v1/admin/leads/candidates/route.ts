import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db, candidateLeads } from "@/lib/db";
import { desc } from "drizzle-orm";
import { headers } from "next/headers";

export async function GET(request: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user || (session.user as unknown as Record<string, string>).role !== "admin") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status");
  let list = await db.select().from(candidateLeads).orderBy(desc(candidateLeads.submittedAt));
  if (status) list = list.filter((l) => l.status === status);
  return NextResponse.json(list);
}
