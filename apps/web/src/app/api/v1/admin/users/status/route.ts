import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db, users } from "@/lib/db";
import { eq } from "drizzle-orm";
import { headers } from "next/headers";

/**
 * POST /api/v1/admin/users/status
 * Body: { userId: string, status: "active" | "suspended" }
 *
 * Allows an admin to suspend or reactivate a user account.
 */
export async function POST(request: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (session.user.role !== "admin") {
    return NextResponse.json({ error: "Forbidden — admin only" }, { status: 403 });
  }

  const { userId, status } = await request.json();
  if (!userId || !["active", "suspended"].includes(status)) {
    return NextResponse.json({ error: "userId and status (active|suspended) are required" }, { status: 400 });
  }

  if (userId === session.user.id) {
    return NextResponse.json({ error: "You cannot change your own account status." }, { status: 400 });
  }

  const [updated] = await db
    .update(users)
    .set({ status })
    .where(eq(users.id, userId))
    .returning({ id: users.id, email: users.email, status: users.status });

  if (!updated) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  return NextResponse.json({ ok: true, user: updated });
}
