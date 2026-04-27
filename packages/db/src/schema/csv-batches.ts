import {
  pgTable, uuid, varchar, text, integer, timestamp, jsonb, pgEnum
} from "drizzle-orm/pg-core";
import { users } from "./users";

export const csvBatchStatusEnum = pgEnum("csv_batch_status", [
  "pending_review", "approved", "rejected"
]);
export const csvTargetTableEnum = pgEnum("csv_target_table", [
  "employer_contacts", "contacts"
]);
export const csvContactTypeEnum = pgEnum("csv_contact_type", ["employer", "candidate"]);

export const csvImportBatches = pgTable("csv_import_batches", {
  id:               uuid("id").primaryKey().defaultRandom(),
  userId:           text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  targetTable:      csvTargetTableEnum("target_table").notNull().default("employer_contacts"),
  contactType:      csvContactTypeEnum("csv_contact_type").notNull(),
  status:           csvBatchStatusEnum("csv_batch_status").notNull().default("pending_review"),
  originalFilename: varchar("original_filename", { length: 255 }).notNull(),
  rowCount:         integer("row_count").notNull().default(0),
  validRowCount:    integer("valid_row_count"),
  skippedRowCount:  integer("skipped_row_count"),
  parsedData:       jsonb("parsed_data"),
  submittedAt:      timestamp("submitted_at", { withTimezone: true }).notNull().defaultNow(),
  reviewedBy:       text("reviewed_by").references(() => users.id),
  reviewedAt:       timestamp("reviewed_at", { withTimezone: true }),
  rejectionReason:  text("rejection_reason"),
});

export type CsvImportBatch = typeof csvImportBatches.$inferSelect;
export type NewCsvImportBatch = typeof csvImportBatches.$inferInsert;
