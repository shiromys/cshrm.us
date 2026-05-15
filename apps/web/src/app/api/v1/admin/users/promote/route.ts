import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db, users } from "@/lib/db";
import { eq } from "drizzle-orm";
import { headers } from "next/headers";

/**
 * POST /api/v1/admin/users/promote
 * Body: { userId: string, role: "admin" | "user" }
 *
 * Allows an existing admin to promote or demote another user.
 */
export async function POST(request: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (session.user.role !== "admin") {
    return NextResponse.json({ error: "Forbidden — admin only" }, { status: 403 });
  }

  const { userId, role } = await request.json();
  if (!userId || !["admin", "user"].includes(role)) {
    return NextResponse.json({ error: "userId and role (admin|user) are required" }, { status: 400 });
  }

  // Prevent demoting yourself
  if (userId === session.user.id && role !== "admin") {
    return NextResponse.json({ error: "You cannot remove your own admin role." }, { status: 400 });
  }

  const [updated] = await db
    .update(users)
    .set({ role })
    .where(eq(users.id, userId))
    .returning({ id: users.id, email: users.email, role: users.role });

  if (!updated) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  return NextResponse.json({ ok: true, user: updated });
}
