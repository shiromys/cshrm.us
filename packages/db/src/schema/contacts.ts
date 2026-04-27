import {
  pgTable, uuid, varchar, text, boolean, timestamp, pgEnum
} from "drizzle-orm/pg-core";
import { users } from "./users";

export const contactTypeEnum = pgEnum("contact_type", ["employer", "candidate"]);
export const contactStatusEnum = pgEnum("contact_status", ["active", "inactive"]);
export const contactSourceEnum = pgEnum("contact_source", [
  "csv_import", "employer_landing", "candidate_landing", "manual"
]);
export const workAuthEnum = pgEnum("work_authorization", [
  "us_citizen", "green_card", "h1b", "h4_ead", "opt", "cpt", "tn", "l1", "e3", "gc_ead", "other"
]);
export const companyTypeEnum = pgEnum("company_type", ["c2c", "direct", "staffing", "other"]);

export const contacts = pgTable("contacts", {
  id:               uuid("id").primaryKey().defaultRandom(),
  contactType:      contactTypeEnum("contact_type").notNull(),
  source:           contactSourceEnum("source").notNull().default("manual"),
  status:           contactStatusEnum("status").notNull().default("active"),
  bounceReason:     text("bounce_reason"),
  bouncedAt:        timestamp("bounced_at", { withTimezone: true }),
  reactivatedBy:    text("reactivated_by").references(() => users.id),
  reactivatedAt:    timestamp("reactivated_at", { withTimezone: true }),
  reactivationNote: text("reactivation_note"),
  email:            varchar("email", { length: 255 }).notNull().unique(),
  name:             varchar("name", { length: 255 }).notNull(),
  phone:            varchar("phone", { length: 50 }),
  title:            varchar("title", { length: 255 }),
  city:             varchar("city", { length: 100 }),
  state:            varchar("state", { length: 50 }),
  companyName:      varchar("company_name", { length: 255 }),
  companyType:      companyTypeEnum("company_type_val"),
  industry:         varchar("industry", { length: 255 }),
  workAuthorization: workAuthEnum("work_authorization"),
  profileSummary:   text("profile_summary"),
  coverLetter:      text("cover_letter"),
  skills:           text("skills").array(),
  unsubscribed:     boolean("unsubscribed").notNull().default(false),
  unsubscribedAt:   timestamp("unsubscribed_at", { withTimezone: true }),
  notes:            text("notes"),
  deletedAt:        timestamp("deleted_at", { withTimezone: true }),
  createdAt:        timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt:        timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export type Contact = typeof contacts.$inferSelect;
export type NewContact = typeof contacts.$inferInsert;
