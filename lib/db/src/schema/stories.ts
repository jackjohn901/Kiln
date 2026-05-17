import { pgTable, text, integer, timestamp, boolean, varchar } from "drizzle-orm/pg-core";

export const storiesTable = pgTable("stories", {
  id: varchar("id", { length: 36 }).primaryKey(),
  authorId: varchar("author_id", { length: 255 }).notNull(),
  authorName: varchar("author_name", { length: 255 }).notNull(),
  authorAvatarUrl: text("author_avatar_url"),
  mediaUrl: text("media_url").notNull(),
  mediaType: varchar("media_type", { length: 10 }).notNull().default("image"),
  caption: text("caption"),
  duration: integer("duration").notNull().default(5),
  viewCount: integer("view_count").notNull().default(0),
  likeCount: integer("like_count").notNull().default(0),
  isActive: boolean("is_active").notNull().default(true),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const storyViewsTable = pgTable("story_views", {
  storyId: varchar("story_id", { length: 36 }).notNull(),
  viewerId: varchar("viewer_id", { length: 255 }).notNull(),
  viewedAt: timestamp("viewed_at", { withTimezone: true }).notNull().defaultNow(),
});

export type Story = typeof storiesTable.$inferSelect;
export type InsertStory = typeof storiesTable.$inferInsert;
