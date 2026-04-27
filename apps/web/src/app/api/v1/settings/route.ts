import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db, users } from "@/lib/db";
import { eq } from "drizzle-orm";
import { headers } from "next/headers";

export async function PATCH(request: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await request.json();
  const update: Record<string, string> = {};
  if (body.replyToEmail) update.replyToEmail = body.replyToEmail;
  if (body.companyName) update.companyName = body.companyName;
  if (body.name) update.name = body.name;
  await db.update(users).set({ ...update, updatedAt: new Date() }).where(eq(users.id, session.user.id));
  return NextResponse.json({ success: true });
}
