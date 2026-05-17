import { pgTable, text, integer, timestamp, boolean, varchar } from "drizzle-orm/pg-core";

export const broadcastsTable = pgTable("broadcasts", {
  id: varchar("id", { length: 36 }).primaryKey(),
  artistId: varchar("artist_id", { length: 255 }).notNull(),
  artistName: varchar("artist_name", { length: 255 }).notNull(),
  artistAvatarUrl: text("artist_avatar_url"),
  content: text("content").notNull(),
  mediaUrl: text("media_url"),
  mediaType: varchar("media_type", { length: 20 }),
  isPatronOnly: boolean("is_patron_only").notNull().default(false),
  reachCount: integer("reach_count").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const broadcastSubscribersTable = pgTable("broadcast_subscribers", {
  artistId: varchar("artist_id", { length: 255 }).notNull(),
  subscriberId: varchar("subscriber_id", { length: 255 }).notNull(),
  subscribedAt: timestamp("subscribed_at", { withTimezone: true }).notNull().defaultNow(),
});

export type Broadcast = typeof broadcastsTable.$inferSelect;
export type InsertBroadcast = typeof broadcastsTable.$inferInsert;
