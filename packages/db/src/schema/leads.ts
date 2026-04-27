import {
  pgTable, uuid, varchar, text, boolean, timestamp, pgEnum
} from "drizzle-orm/pg-core";
import { users } from "./users";

export const leadStatusEnum = pgEnum("lead_status", ["pending", "approved", "rejected", "migrated"]);

export const employerLeads = pgTable("employer_leads", {
  id:                 uuid("id").primaryKey().defaultRandom(),
  status:             leadStatusEnum("lead_status_emp").notNull().default("pending"),
  submittedAt:        timestamp("submitted_at", { withTimezone: true }).notNull().defaultNow(),
  reviewedBy:         text("reviewed_by").references(() => users.id),
  reviewedAt:         timestamp("reviewed_at", { withTimezone: true }),
  rejectionReason:    text("rejection_reason"),
  migratedContactId:  uuid("migrated_contact_id"),
  email:              varchar("email", { length: 255 }).notNull(),
  name:               varchar("name", { length: 255 }).notNull(),
  companyName:        varchar("company_name", { length: 255 }).notNull(),
  phone:              varchar("phone", { length: 50 }),
  city:               varchar("city", { length: 100 }),
  state:              varchar("state", { length: 50 }),
  companyType:        varchar("company_type", { length: 50 }),
  industry:           varchar("industry", { length: 255 }),
  interestedIn:       varchar("interested_in", { length: 50 }),
  consentGiven:       boolean("consent_given").notNull().default(false),
  ipAddress:          varchar("ip_address", { length: 45 }),
});

export const candidateLeads = pgTable("candidate_leads", {
  id:                uuid("id").primaryKey().defaultRandom(),
  status:            leadStatusEnum("lead_status_cand").notNull().default("pending"),
  submittedAt:       timestamp("submitted_at", { withTimezone: true }).notNull().defaultNow(),
  reviewedBy:        text("reviewed_by").references(() => users.id),
  reviewedAt:        timestamp("reviewed_at", { withTimezone: true }),
  rejectionReason:   text("rejection_reason"),
  migratedContactId: uuid("migrated_contact_id"),
  email:             varchar("email", { length: 255 }).notNull(),
  name:              varchar("name", { length: 255 }).notNull(),
  phone:             varchar("phone", { length: 50 }),
  city:              varchar("city", { length: 100 }),
  state:             varchar("state", { length: 50 }),
  workAuthorization: varchar("work_authorization", { length: 50 }),
  title:             varchar("title", { length: 255 }),
  skillsRaw:         text("skills_raw"),
  profileSummary:    text("profile_summary"),
  coverLetter:       text("cover_letter"),
  consentGiven:      boolean("consent_given").notNull().default(false),
  ipAddress:         varchar("ip_address", { length: 45 }),
});

export type EmployerLead = typeof employerLeads.$inferSelect;
export type CandidateLead = typeof candidateLeads.$inferSelect;
