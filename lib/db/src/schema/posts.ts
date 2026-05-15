import { pgTable, text, integer, timestamp, boolean, varchar } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const postsTable = pgTable("posts", {
  id: varchar("id", { length: 36 }).primaryKey(),
  authorId: varchar("author_id", { length: 255 }).notNull(),
  authorName: varchar("author_name", { length: 255 }).notNull(),
  authorAvatarUrl: text("author_avatar_url"),
  videoUrl: text("video_url"),
  thumbnailUrl: text("thumbnail_url"),
  caption: text("caption").notNull().default(""),
  technique: varchar("technique", { length: 100 }),
  medium: varchar("medium", { length: 100 }),
  tags: text("tags").array().default([]),
  likeCount: integer("like_count").notNull().default(0),
  commentCount: integer("comment_count").notNull().default(0),
  saveCount: integer("save_count").notNull().default(0),
  viewCount: integer("view_count").notNull().default(0),
  isPatronOnly: boolean("is_patron_only").notNull().default(false),
  craftScore: integer("craft_score"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertPostSchema = createInsertSchema(postsTable).omit({ createdAt: true, updatedAt: true });
export type InsertPost = z.infer<typeof insertPostSchema>;
export type Post = typeof postsTable.$inferSelect;
