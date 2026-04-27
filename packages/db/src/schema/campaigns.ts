import {
  pgTable, uuid, varchar, text, boolean, timestamp, integer, jsonb, pgEnum, uniqueIndex
} from "drizzle-orm/pg-core";
import { users } from "./users";

export const campaignStatusEnum = pgEnum("campaign_status", [
  "draft", "scheduled", "sending", "sent", "paused", "archived"
]);
export const campaignTargetEnum = pgEnum("campaign_target_type", ["employer", "candidate", "hotlist"]);

export const campaigns = pgTable("campaigns", {
  id:                      uuid("id").primaryKey().defaultRandom(),
  userId:                  text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  name:                    varchar("name", { length: 255 }).notNull(),
  subject:                 varchar("subject", { length: 500 }).notNull(),
  bodyHtml:                text("body_html").notNull(),
  bodyText:                text("body_text").notNull(),
  status:                  campaignStatusEnum("campaign_status").notNull().default("draft"),
  targetType:              campaignTargetEnum("target_type").notNull(),
  hotlistId:               uuid("hotlist_id"),
  targetFilters:           jsonb("target_filters"),
  includeEmployerContacts: boolean("include_employer_contacts").notNull().default(true),
  scheduledAt:             timestamp("scheduled_at", { withTimezone: true }),
  sentAt:                  timestamp("sent_at", { withTimezone: true }),
  totalRecipients:         integer("total_recipients").notNull().default(0),
  deliveredCount:          integer("delivered_count").notNull().default(0),
  bouncedCount:            integer("bounced_count").notNull().default(0),
  openedCount:             integer("opened_count").notNull().default(0),
  unsubscribedCount:       integer("unsubscribed_count").notNull().default(0),
  deletedAt:               timestamp("deleted_at", { withTimezone: true }),
  createdAt:               timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt:               timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const emailProviderEnum = pgEnum("email_provider", ["ahasend", "resend"]);
export const emailLogStatusEnum = pgEnum("email_log_status", [
  "queued", "sent", "delivered", "opened", "bounced", "complained", "unsubscribed", "failed"
]);

export const emailLogs = pgTable("email_logs", {
  id:                uuid("id").primaryKey().defaultRandom(),
  campaignId:        uuid("campaign_id").notNull().references(() => campaigns.id),
  contactId:         uuid("contact_id"),
  employerContactId: uuid("employer_contact_id"),
  userId:            text("user_id").notNull().references(() => users.id),
  recipientEmail:    varchar("recipient_email", { length: 255 }).notNull(),
  fromAddress:       varchar("from_address", { length: 255 }).notNull(),
  replyToAddress:    varchar("reply_to_address", { length: 255 }),
  providerMessageId: varchar("provider_message_id", { length: 255 }),
  status:            emailLogStatusEnum("email_log_status").notNull().default("queued"),
  provider:          emailProviderEnum("email_provider"),
  sentAt:            timestamp("sent_at", { withTimezone: true }),
  deliveredAt:       timestamp("delivered_at", { withTimezone: true }),
  openedAt:          timestamp("opened_at", { withTimezone: true }),
  bouncedAt:         timestamp("bounced_at", { withTimezone: true }),
  errorMessage:      text("error_message"),
  createdAt:         timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const usageCounterTypeEnum = pgEnum("usage_counter_type", [
  "daily_emails", "daily_campaigns", "monthly_emails"
]);

export const usageCounters = pgTable("usage_counters", {
  id:          uuid("id").primaryKey().defaultRandom(),
  userId:      text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  counterType: usageCounterTypeEnum("counter_type").notNull(),
  count:       integer("count").notNull().default(0),
  resetDate:   varchar("reset_date", { length: 10 }).notNull(),
  updatedAt:   timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  uniqueIndex("usage_counters_user_type_date_idx").on(t.userId, t.counterType, t.resetDate),
]);

export type Campaign = typeof campaigns.$inferSelect;
export type NewCampaign = typeof campaigns.$inferInsert;
export type EmailLog = typeof emailLogs.$inferSelect;
