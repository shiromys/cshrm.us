import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { headers } from "next/headers";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const adminRecord = await db.query.users.findFirst({ where: (u, { eq }) => eq(u.id, session.user.id) });
  if (adminRecord?.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id: targetId } = await params;

  const user = await db.query.users.findFirst({ where: (u, { eq }) => eq(u.id, targetId) });
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  return NextResponse.json({
    id:          user.id,
    name:        user.name,
    email:       user.email,
    tier:        user.tier,
    role:        user.role,
    companyName: user.companyName,
    createdAt:   user.createdAt,
  });
}
