import { pgTable, varchar, text, timestamp, unique } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const repostsTable = pgTable(
  "reposts",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    postId: varchar("post_id", { length: 36 }).notNull(),
    reposterId: varchar("reposter_id", { length: 255 }).notNull(),
    reposterName: varchar("reposter_name", { length: 255 }).notNull(),
    reposterAvatarUrl: text("reposter_avatar_url"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    uniqRepost: unique("reposts_post_reposter_unique").on(t.postId, t.reposterId),
  }),
);

export const insertRepostSchema = createInsertSchema(repostsTable).omit({ createdAt: true });
export type InsertRepost = z.infer<typeof insertRepostSchema>;
export type Repost = typeof repostsTable.$inferSelect;
