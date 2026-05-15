import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db, users } from "@/lib/db";
import { eq, count as sqlCount } from "drizzle-orm";
import { headers } from "next/headers";

/**
 * POST /api/v1/admin/setup
 *
 * One-time bootstrap: promotes the calling authenticated user to "admin".
 * Locks itself permanently once any admin exists in the database.
 * Safe to leave deployed — a second call is a no-op 403.
 */
export async function POST() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) {
    return NextResponse.json({ error: "You must be signed in to use this endpoint." }, { status: 401 });
  }

  // Check if any admin already exists
  const [{ total }] = await db
    .select({ total: sqlCount() })
    .from(users)
    .where(eq(users.role, "admin"));

  if (Number(total) > 0) {
    return NextResponse.json(
      { error: "An admin already exists. This endpoint is disabled." },
      { status: 403 }
    );
  }

  // Promote the calling user to admin
  await db
    .update(users)
    .set({ role: "admin" })
    .where(eq(users.id, session.user.id));

  return NextResponse.json({
    ok: true,
    message: `${session.user.email} has been promoted to admin. Sign out and sign back in to refresh your session.`,
  });
}
