import {
  pgTable, uuid, varchar, text, boolean, timestamp, pgEnum
} from "drizzle-orm/pg-core";
import { users } from "./users";
import { contactStatusEnum, companyTypeEnum } from "./contacts";

export const employerContactSourceEnum = pgEnum("employer_contact_source", ["csv_import", "manual"]);

export const employerContacts = pgTable("employer_contacts", {
  id:           uuid("id").primaryKey().defaultRandom(),
  userId:       text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  email:        varchar("email", { length: 255 }).notNull(),
  name:         varchar("name", { length: 255 }).notNull(),
  phone:        varchar("phone", { length: 50 }),
  companyName:  varchar("company_name", { length: 255 }),
  companyType:  companyTypeEnum("company_type_ec"),
  city:         varchar("city", { length: 100 }),
  state:        varchar("state", { length: 50 }),
  industry:     varchar("industry", { length: 255 }),
  status:       contactStatusEnum("status_ec").notNull().default("active"),
  bounceReason: text("bounce_reason"),
  bouncedAt:    timestamp("bounced_at", { withTimezone: true }),
  unsubscribed: boolean("unsubscribed").notNull().default(false),
  source:       employerContactSourceEnum("source_ec").notNull().default("manual"),
  csvBatchId:   uuid("csv_batch_id"),
  createdAt:    timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt:    timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export type EmployerContact = typeof employerContacts.$inferSelect;
export type NewEmployerContact = typeof employerContacts.$inferInsert;
