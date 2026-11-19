import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db, users } from "@/lib/db";
import { eq } from "drizzle-orm";
import { headers } from "next/headers";
import { logActivity } from "@/lib/activity";

const COOKIE_OPTS = { path: "/", httpOnly: true, sameSite: "lax" as const };

export async function PATCH(request: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await request.json();
  const update: Record<string, string> = {};
  if (body.replyToEmail) update.replyToEmail = body.replyToEmail;
  if (body.companyName) update.companyName = body.companyName;
  if (body.name) update.name = body.name;

  // operationMode change — validate + bust session cache so new value shows immediately
  let modeChanged = false;
  if (body.operationMode && ["requirements", "hotlist"].includes(body.operationMode)) {
    update.operationMode = body.operationMode;
    modeChanged = true;
  }

  await db.update(users).set({ ...update, updatedAt: new Date() }).where(eq(users.id, session.user.id));

  if (modeChanged) {
    void logActivity({
      userId:   session.user.id,
      event:    "mode_changed",
      summary:  `Switched operation mode to "${body.operationMode}"`,
      metadata: { operationMode: body.operationMode },
      request,
    });
  } else if (Object.keys(update).length > 0) {
    void logActivity({
      userId:   session.user.id,
      event:    "settings_updated",
      summary:  `Updated settings: ${Object.keys(update).join(", ")}`,
      metadata: { fields: Object.keys(update) },
      request,
    });
  }

  const response = NextResponse.json({ success: true });

  if (modeChanged) {
    // Bust better-auth session cache so the next page load picks up the new operationMode
    const expired = new Date(0);
    response.cookies.set("better-auth.session_data",          "", { ...COOKIE_OPTS, expires: expired });
    response.cookies.set("__Secure-better-auth.session_data", "", { ...COOKIE_OPTS, expires: expired, secure: true });
  }

  return response;
}
