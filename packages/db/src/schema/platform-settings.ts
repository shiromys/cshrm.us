import {
  pgTable, uuid, varchar, text, timestamp
} from "drizzle-orm/pg-core";
import { users } from "./users";

export const platformSettings = pgTable("platform_settings", {
  id:          uuid("id").primaryKey().defaultRandom(),
  key:         varchar("key", { length: 100 }).notNull(),
  value:       varchar("value", { length: 500 }).notNull(),
  description: text("description"),
  userId:      text("user_id").references(() => users.id, { onDelete: "cascade" }),
  createdAt:   timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt:   timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const chrmnexusApplications = pgTable("chrmnexus_applications", {
  id:          uuid("id").primaryKey().defaultRandom(),
  userId:      text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  jobId:       varchar("job_id", { length: 255 }).notNull(),
  jobTitle:    varchar("job_title", { length: 255 }),
  submittedAt: timestamp("submitted_at", { withTimezone: true }).notNull().defaultNow(),
  status:      varchar("status", { length: 100 }).notNull().default("submitted"),
});

export type PlatformSetting = typeof platformSettings.$inferSelect;
export type ChrmnexusApplication = typeof chrmnexusApplications.$inferSelect;
