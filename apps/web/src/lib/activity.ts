/**
 * Activity logging utility.
 *
 * Call logActivity() from any server-side route handler after a meaningful user action.
 * It is fire-and-forget — it never throws, so a logging failure never breaks the calling route.
 */
import { db, activityLogs } from "@/lib/db";

export type ActivityEvent =
  | "login" | "logout" | "register" | "password_changed" | "email_verified"
  | "requirement_sent"
  | "hotlist_created" | "hotlist_sent" | "hotlist_deleted"
  | "csv_uploaded" | "contact_added" | "contact_deleted"
  | "settings_updated" | "tier_upgraded" | "mode_changed"
  | "admin_tier_override" | "admin_status_change" | "admin_role_change";

export async function logActivity(opts: {
  userId:    string;
  event:     ActivityEvent;
  summary?:  string;
  metadata?: Record<string, unknown>;
  request?:  Request | import("next/server").NextRequest;
}): Promise<void> {
  try {
    let ipAddress: string | undefined;
    let userAgent: string | undefined;

    if (opts.request) {
      const req = opts.request as { headers: { get: (k: string) => string | null } };
      ipAddress = req.headers.get("x-forwarded-for")?.split(",")[0].trim()
               ?? req.headers.get("x-real-ip")
               ?? undefined;
      userAgent = req.headers.get("user-agent") ?? undefined;
    }

    await db.insert(activityLogs).values({
      userId:    opts.userId,
      event:     opts.event,
      summary:   opts.summary,
      metadata:  opts.metadata ?? null,
      ipAddress,
      userAgent,
    });
  } catch (e) {
    // Non-fatal — log to console but never surface to the caller
    console.error("[logActivity] Failed to write activity log:", e);
  }
}
