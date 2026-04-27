import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db, employerLeads } from "@/lib/db";
import { eq } from "drizzle-orm";
import { headers } from "next/headers";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user || (session.user as Record<string, string>).role !== "admin") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { reason } = await request.json();
  await db.update(employerLeads).set({ status: "rejected", rejectionReason: reason, reviewedBy: session.user.id, reviewedAt: new Date() }).where(eq(employerLeads.id, id));
  return NextResponse.json({ success: true });
}
