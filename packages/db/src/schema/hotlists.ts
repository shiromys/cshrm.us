import {
  pgTable, uuid, varchar, text, boolean, timestamp, integer, pgEnum
} from "drizzle-orm/pg-core";
import { users } from "./users";

export const hotlistStatusEnum = pgEnum("hotlist_status", ["draft", "sent", "archived"]);
export const hotlistEntrySourceEnum = pgEnum("hotlist_entry_source", [
  "excel_upload", "form_entry", "copy_paste"
]);

export const hotlists = pgTable("hotlists", {
  id:             uuid("id").primaryKey().defaultRandom(),
  userId:         text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  name:           varchar("name", { length: 255 }).notNull(),
  visibleColumns: text("visible_columns").array().notNull().default([
    "name", "title", "skills", "location", "work_authorization"
  ]),
  emailSubject:   varchar("email_subject", { length: 500 }),
  status:         hotlistStatusEnum("hotlist_status").notNull().default("draft"),
  sentAt:         timestamp("sent_at", { withTimezone: true }),
  totalEntries:   integer("total_entries").notNull().default(0),
  deletedAt:      timestamp("deleted_at", { withTimezone: true }),
  createdAt:      timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt:      timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const hotlistEntries = pgTable("hotlist_entries", {
  id:               uuid("id").primaryKey().defaultRandom(),
  hotlistId:        uuid("hotlist_id").notNull().references(() => hotlists.id, { onDelete: "cascade" }),
  userId:           text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  rawName:          varchar("raw_name", { length: 255 }).notNull(),
  displayName:      varchar("display_name", { length: 255 }).notNull(),
  title:            varchar("title", { length: 255 }),
  skills:           text("skills").array(),
  city:             varchar("city", { length: 100 }),
  state:            varchar("state", { length: 50 }),
  workAuthorization:varchar("work_authorization", { length: 50 }),
  availability:     varchar("availability", { length: 100 }),
  rateSalary:       varchar("rate_salary", { length: 100 }),
  profileSummary:   text("profile_summary"),
  contactEmail:     varchar("contact_email", { length: 255 }),
  contactPhone:     varchar("contact_phone", { length: 50 }),
  source:           hotlistEntrySourceEnum("entry_source").notNull().default("form_entry"),
  sortOrder:        integer("sort_order").notNull().default(0),
  createdAt:        timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type Hotlist = typeof hotlists.$inferSelect;
export type NewHotlist = typeof hotlists.$inferInsert;
export type HotlistEntry = typeof hotlistEntries.$inferSelect;
export type NewHotlistEntry = typeof hotlistEntries.$inferInsert;
