import { pgTable, text, integer, boolean, timestamp, varchar } from "drizzle-orm/pg-core";

export const patronTiersTable = pgTable("patron_tiers", {
  id: varchar("id", { length: 36 }).primaryKey(),
  artistId: varchar("artist_id", { length: 255 }).notNull(),
  name: varchar("name", { length: 100 }).notNull(),
  description: text("description"),
  price: integer("price").notNull(),
  currency: varchar("currency", { length: 3 }).notNull().default("USD"),
  perks: text("perks").array().default([]),
  isActive: boolean("is_active").notNull().default(true),
  subscriberCount: integer("subscriber_count").notNull().default(0),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const patronSubscriptionsTable = pgTable("patron_subscriptions", {
  id: varchar("id", { length: 36 }).primaryKey(),
  tierId: varchar("tier_id", { length: 36 }).notNull(),
  artistId: varchar("artist_id", { length: 255 }).notNull(),
  subscriberId: varchar("subscriber_id", { length: 255 }).notNull(),
  subscriberName: varchar("subscriber_name", { length: 255 }),
  status: varchar("status", { length: 50 }).notNull().default("active"),
  amount: integer("amount").notNull(),
  startedAt: timestamp("started_at", { withTimezone: true }).notNull().defaultNow(),
  cancelledAt: timestamp("cancelled_at", { withTimezone: true }),
});

export type PatronTier = typeof patronTiersTable.$inferSelect;
export type PatronSubscription = typeof patronSubscriptionsTable.$inferSelect;
