import {
  pgTable, uuid, varchar, text, timestamp, pgEnum, boolean,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { users } from "./users";

export const ticketStatusEnum   = pgEnum("ticket_status",   ["open", "in_progress", "resolved", "closed"]);
export const ticketPriorityEnum = pgEnum("ticket_priority", ["low", "normal", "high", "urgent"]);
export const ticketSourceEnum   = pgEnum("ticket_source",   ["contact_form", "in_app"]);

export const supportTickets = pgTable("support_tickets", {
  id:             uuid("id").primaryKey().defaultRandom(),
  // Nullable — public contact form submissions have no account
  userId:         text("user_id").references(() => users.id, { onDelete: "set null" }),
  source:         ticketSourceEnum("ticket_source").notNull().default("contact_form"),
  status:         ticketStatusEnum("ticket_status").notNull().default("open"),
  priority:       ticketPriorityEnum("ticket_priority").notNull().default("normal"),
  // Submitter details (always stored even if userId is set, for quick display)
  submitterName:  varchar("submitter_name",  { length: 255 }).notNull(),
  submitterEmail: varchar("submitter_email", { length: 255 }).notNull(),
  subject:        varchar("subject",         { length: 500 }).notNull(),
  // First message body is stored here; subsequent messages go in ticket_replies
  body:           text("body").notNull(),
  // Admin metadata
  assignedTo:     text("assigned_to").references(() => users.id, { onDelete: "set null" }),
  resolvedAt:     timestamp("resolved_at",   { withTimezone: true }),
  resolvedBy:     text("resolved_by").references(() => users.id, { onDelete: "set null" }),
  internalNote:   text("internal_note"),
  createdAt:      timestamp("created_at",    { withTimezone: true }).notNull().defaultNow(),
  updatedAt:      timestamp("updated_at",    { withTimezone: true }).notNull().defaultNow(),
});

export const ticketReplies = pgTable("ticket_replies", {
  id:         uuid("id").primaryKey().defaultRandom(),
  ticketId:   uuid("ticket_id").notNull().references(() => supportTickets.id, { onDelete: "cascade" }),
  // authorId null = reply from the original submitter (inbound email / future feature)
  authorId:   text("author_id").references(() => users.id, { onDelete: "set null" }),
  authorName: varchar("author_name",  { length: 255 }).notNull(),
  isStaff:    boolean("is_staff").notNull().default(false),
  body:       text("body").notNull(),
  // Track whether we emailed the user this reply
  emailedAt:  timestamp("emailed_at", { withTimezone: true }),
  createdAt:  timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// ── Drizzle relations ────────────────────────────────────────────────────────
export const supportTicketsRelations = relations(supportTickets, ({ one, many }) => ({
  user:         one(users, { fields: [supportTickets.userId],     references: [users.id], relationName: "ticket_user" }),
  assignedUser: one(users, { fields: [supportTickets.assignedTo], references: [users.id], relationName: "ticket_assigned" }),
  resolvedUser: one(users, { fields: [supportTickets.resolvedBy], references: [users.id], relationName: "ticket_resolved" }),
  replies:      many(ticketReplies),
}));

export const ticketRepliesRelations = relations(ticketReplies, ({ one }) => ({
  ticket: one(supportTickets, { fields: [ticketReplies.ticketId], references: [supportTickets.id] }),
  author: one(users, { fields: [ticketReplies.authorId], references: [users.id] }),
}));

export type SupportTicket    = typeof supportTickets.$inferSelect;
export type NewSupportTicket = typeof supportTickets.$inferInsert;
export type TicketReply      = typeof ticketReplies.$inferSelect;
export type NewTicketReply   = typeof ticketReplies.$inferInsert;
