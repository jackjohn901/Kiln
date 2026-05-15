import { pgTable, varchar, timestamp, primaryKey } from "drizzle-orm/pg-core";

export const followsTable = pgTable("follows", {
  followerId: varchar("follower_id", { length: 255 }).notNull(),
  followingId: varchar("following_id", { length: 255 }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  primaryKey({ columns: [table.followerId, table.followingId] }),
]);

export type Follow = typeof followsTable.$inferSelect;
