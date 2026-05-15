import { pgTable, varchar, timestamp, primaryKey } from "drizzle-orm/pg-core";

export const savesTable = pgTable("saves", {
  userId: varchar("user_id", { length: 255 }).notNull(),
  postId: varchar("post_id", { length: 36 }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  primaryKey({ columns: [table.userId, table.postId] }),
]);

export type Save = typeof savesTable.$inferSelect;
