import { pgTable, text, integer, timestamp, varchar } from "drizzle-orm/pg-core";

export const processPledgesTable = pgTable("process_pledges", {
  id: varchar("id", { length: 36 }).primaryKey(),
  artistId: varchar("artist_id", { length: 255 }).notNull(),
  artistName: varchar("artist_name", { length: 255 }).notNull(),
  artistAvatarUrl: text("artist_avatar_url"),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  pieceCount: integer("piece_count"),
  intervalLabel: varchar("interval_label", { length: 100 }),
  targetPostCount: integer("target_post_count").notNull().default(10),
  currentPostCount: integer("current_post_count").notNull().default(0),
  status: varchar("status", { length: 20 }).notNull().default("active"),
  startedAt: timestamp("started_at", { withTimezone: true }).notNull().defaultNow(),
  completedAt: timestamp("completed_at", { withTimezone: true }),
  subscriberCount: integer("subscriber_count").notNull().default(0),
});

export const pledgeSubscribersTable = pgTable("pledge_subscribers", {
  pledgeId: varchar("pledge_id", { length: 36 }).notNull(),
  userId: varchar("user_id", { length: 255 }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const pledgeUpdatesTable = pgTable("pledge_updates", {
  id: varchar("id", { length: 36 }).primaryKey(),
  pledgeId: varchar("pledge_id", { length: 36 }).notNull(),
  postId: varchar("post_id", { length: 36 }),
  caption: text("caption"),
  imageUrl: text("image_url"),
  hoursInvested: integer("hours_invested"),
  updateNumber: integer("update_number").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type ProcessPledge = typeof processPledgesTable.$inferSelect;
export type PledgeUpdate = typeof pledgeUpdatesTable.$inferSelect;
