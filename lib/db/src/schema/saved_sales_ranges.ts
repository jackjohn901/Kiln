import { pgTable, text, timestamp, index } from "drizzle-orm/pg-core";

export const savedSalesRangesTable = pgTable("saved_sales_ranges", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull(),
  name: text("name").notNull(),
  dateFrom: text("date_from").notNull(),
  dateTo: text("date_to").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [index("saved_sales_ranges_user_idx").on(t.userId)]);

export type SavedSalesRange = typeof savedSalesRangesTable.$inferSelect;
