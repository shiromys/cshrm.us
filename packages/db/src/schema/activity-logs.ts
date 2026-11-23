import {
  pgTable, uuid, text, varchar, timestamp, jsonb, pgEnum,
} from "drizzle-orm/pg-core";
import { users } from "./users";

export const activityEventEnum = pgEnum("activity_event", [
  // Auth
  "login",
  "logout",
  "register",
  "password_changed",
  "email_verified",
  // Requirements
  "requirement_sent",
  // Hotlists
  "hotlist_created",
  "hotlist_updated",
  "hotlist_sent",
  "hotlist_deleted",
  // Contacts
  "csv_uploaded",
  "contact_added",
  "contact_deleted",
  // Settings / tier
  "settings_updated",
  "tier_upgraded",
  "mode_changed",
  // Support tickets
  "ticket_created",
  "ticket_replied",
  "ticket_resolved",
  // Billing (Stripe)
  "subscription_started",
  "subscription_cancelled",
  "subscription_renewed",
  "payment_succeeded",
  "payment_failed",
  "refund_issued",
  // Admin actions on user
  "admin_tier_override",
  "admin_status_change",
  "admin_role_change",
]);

export const activityLogs = pgTable("activity_logs", {
  id:        uuid("id").primaryKey().defaultRandom(),
  userId:    text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  event:     activityEventEnum("event").notNull(),
  // Human-readable summary, e.g. "Sent requirement to 5 recipients"
  summary:   varchar("summary", { length: 500 }),
  // Flexible bag for extra context: { campaignId, recipients, hotlistId, ... }
  metadata:  jsonb("metadata"),
  ipAddress: varchar("ip_address", { length: 45 }),
  userAgent: text("user_agent"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type ActivityLog    = typeof activityLogs.$inferSelect;
export type NewActivityLog = typeof activityLogs.$inferInsert;
