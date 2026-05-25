import { pgTable, serial, text, integer, timestamp, varchar } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const failedEmailsTable = pgTable("failed_emails", {
  id: serial("id").primaryKey(),
  to: text("to").notNull(),
  from: text("from"),
  subject: text("subject").notNull(),
  html: text("html").notNull(),
  contextId: text("context_id"),
  label: text("label"),
  attempts: integer("attempts").notNull().default(0),
  lastError: text("last_error"),
  status: varchar("status", { length: 20 }).notNull().default("pending"),
  nextRetryAt: timestamp("next_retry_at", { withTimezone: true }).notNull().defaultNow(),
  deliveredAt: timestamp("delivered_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertFailedEmailSchema = createInsertSchema(failedEmailsTable).omit({
  id: true,
  createdAt: true,
});
export type InsertFailedEmail = z.infer<typeof insertFailedEmailSchema>;
export type FailedEmail = typeof failedEmailsTable.$inferSelect;
