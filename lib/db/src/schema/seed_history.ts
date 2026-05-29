import { pgTable, integer, timestamp, varchar } from "drizzle-orm/pg-core";

export const seedHistoryTable = pgTable("seed_history", {
  id: varchar("id", { length: 36 }).primaryKey(),
  operation: varchar("operation", { length: 32 }).notNull(),
  actorId: varchar("actor_id", { length: 255 }),
  actorName: varchar("actor_name", { length: 255 }),
  oldMarkerId: varchar("old_marker_id", { length: 128 }),
  newMarkerId: varchar("new_marker_id", { length: 128 }).notNull(),
  userCount: integer("user_count").notNull().default(0),
  postCount: integer("post_count").notNull().default(0),
  listingCount: integer("listing_count").notNull().default(0),
  guildCount: integer("guild_count").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type SeedHistory = typeof seedHistoryTable.$inferSelect;
export type InsertSeedHistory = typeof seedHistoryTable.$inferInsert;
