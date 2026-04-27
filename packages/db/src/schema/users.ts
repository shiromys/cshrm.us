import {
  pgTable, varchar, text, boolean, timestamp, pgEnum
} from "drizzle-orm/pg-core";

export const tierEnum = pgEnum("tier", ["free", "standard"]);
export const userStatusEnum = pgEnum("user_status", ["active", "suspended"]);
export const roleEnum = pgEnum("role", ["user", "admin"]);

export const users = pgTable("users", {
  id:                            text("id").primaryKey(),           // Better Auth generates nanoid strings
  email:                         varchar("email", { length: 255 }).notNull().unique(),
  emailVerified:                 boolean("email_verified").notNull().default(false),
  name:                          varchar("name", { length: 255 }).notNull(),
  passwordHash:                  varchar("password_hash", { length: 255 }),
  companyName:                   varchar("company_name", { length: 255 }),
  replyToEmail:                  varchar("reply_to_email", { length: 255 }),
  tier:                          tierEnum("tier").notNull().default("free"),
  role:                          roleEnum("role").notNull().default("user"),
  status:                        userStatusEnum("status").notNull().default("active"),
  stripeCustomerId:              varchar("stripe_customer_id", { length: 100 }),
  stripeSubscriptionId:          varchar("stripe_subscription_id", { length: 100 }),
  chrmnexusSubscribed:           boolean("chrmnexus_subscribed").notNull().default(false),
  chrmnexusStripeSubscriptionId: varchar("chrmnexus_stripe_subscription_id", { length: 100 }),
  image:                         text("image"),
  createdAt:                     timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt:                     timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

// Better Auth requires these tables
export const sessions = pgTable("sessions", {
  id:        varchar("id", { length: 255 }).primaryKey(),
  userId:    text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  token:     varchar("token", { length: 255 }).notNull().unique(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  ipAddress: varchar("ip_address", { length: 45 }),
  userAgent: text("user_agent"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const accounts = pgTable("accounts", {
  id:                   varchar("id", { length: 255 }).primaryKey(),
  userId:               text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  accountId:            varchar("account_id", { length: 255 }).notNull(),
  providerId:           varchar("provider_id", { length: 255 }).notNull(),
  accessToken:          text("access_token"),
  refreshToken:         text("refresh_token"),
  idToken:              text("id_token"),
  accessTokenExpiresAt: timestamp("access_token_expires_at", { withTimezone: true }),
  refreshTokenExpiresAt:timestamp("refresh_token_expires_at", { withTimezone: true }),
  scope:                text("scope"),
  password:             text("password"),
  createdAt:            timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt:            timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const verifications = pgTable("verifications", {
  id:         varchar("id", { length: 255 }).primaryKey(),
  identifier: varchar("identifier", { length: 255 }).notNull(),
  value:      varchar("value", { length: 255 }).notNull(),
  expiresAt:  timestamp("expires_at", { withTimezone: true }).notNull(),
  createdAt:  timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt:  timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Session = typeof sessions.$inferSelect;
