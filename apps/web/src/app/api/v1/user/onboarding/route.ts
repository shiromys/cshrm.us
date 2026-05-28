import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db, users } from "@/lib/db";
import { eq } from "drizzle-orm";
import { headers } from "next/headers";

export async function POST(request: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const { operationMode } = body;

  if (operationMode !== "requirements" && operationMode !== "hotlist") {
    return NextResponse.json({ error: "operationMode must be 'requirements' or 'hotlist'" }, { status: 400 });
  }

  await db.update(users)
    .set({ operationMode })
    .where(eq(users.id, session.user.id));

  // Bust the better-auth session cookie so the new operationMode is reflected immediately
  const response = NextResponse.json({ success: true, operationMode });
  const expired = new Date(0);
  response.cookies.set("better-auth.session_data", "", { expires: expired, path: "/", httpOnly: true, sameSite: "lax" });
  response.cookies.set("__Secure-better-auth.session_data", "", { expires: expired, path: "/", httpOnly: true, sameSite: "lax", secure: true });
  return response;
}
