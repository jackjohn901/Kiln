import { pgTable, text, integer, timestamp, uniqueIndex } from "drizzle-orm/pg-core";

export const priceAlertsTable = pgTable("price_alerts", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull(),
  listingId: text("listing_id").notNull(),
  targetPrice: integer("target_price").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [uniqueIndex("price_alerts_user_listing_idx").on(t.userId, t.listingId)]);

export type PriceAlert = typeof priceAlertsTable.$inferSelect;
