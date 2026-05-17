import { pgTable, text, timestamp, varchar } from "drizzle-orm/pg-core";

export const reportsTable = pgTable("reports", {
  id: varchar("id", { length: 36 }).primaryKey(),
  reporterId: varchar("reporter_id", { length: 255 }).notNull(),
  targetType: varchar("target_type", { length: 32 }).notNull(),
  targetId: varchar("target_id", { length: 255 }).notNull(),
  reason: varchar("reason", { length: 128 }).notNull(),
  otherText: text("other_text"),
  status: varchar("status", { length: 32 }).notNull().default("pending"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type Report = typeof reportsTable.$inferSelect;
