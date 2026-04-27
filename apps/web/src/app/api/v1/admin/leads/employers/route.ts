import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db, employerLeads } from "@/lib/db";
import { eq, desc } from "drizzle-orm";
import { headers } from "next/headers";

async function requireAdmin(request: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) return null;
  if ((session.user as Record<string, string>).role !== "admin") return null;
  return session.user;
}

export async function GET(request: NextRequest) {
  const admin = await requireAdmin(request);
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status");

  let list = await db.select().from(employerLeads).orderBy(desc(employerLeads.submittedAt));
  if (status) list = list.filter((l) => l.status === status);

  return NextResponse.json(list);
}
