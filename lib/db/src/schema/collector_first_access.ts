import { pgTable, varchar, timestamp, text } from "drizzle-orm/pg-core";

export const collectorFirstAccessTable = pgTable("collector_first_access", {
  id: varchar("id", { length: 36 }).primaryKey(),
  listingId: varchar("listing_id", { length: 36 }).notNull(),
  userId: varchar("user_id", { length: 255 }).notNull(),
  sourcePostId: varchar("source_post_id", { length: 36 }),
  grantedAt: timestamp("granted_at", { withTimezone: true }).notNull().defaultNow(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  usedAt: timestamp("used_at", { withTimezone: true }),
});

export type CollectorFirstAccess = typeof collectorFirstAccessTable.$inferSelect;
