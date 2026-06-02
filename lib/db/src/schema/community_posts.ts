import { pgTable, text, integer, timestamp, boolean, varchar } from "drizzle-orm/pg-core";

export const communityPostsTable = pgTable("community_posts", {
  id: varchar("id", { length: 36 }).primaryKey(),
  authorId: varchar("author_id", { length: 255 }).notNull(),
  content: text("content").notNull(),
  imageUrl: text("image_url"),
  guildId: varchar("guild_id", { length: 100 }),
  topic: varchar("topic", { length: 50 }),
  parentId: varchar("parent_id", { length: 36 }),
  repostOfId: varchar("repost_of_id", { length: 36 }),
  likeCount: integer("like_count").notNull().default(0),
  replyCount: integer("reply_count").notNull().default(0),
  repostCount: integer("repost_count").notNull().default(0),
  isPinned: boolean("is_pinned").notNull().default(false),
  isDeleted: boolean("is_deleted").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const communityLikesTable = pgTable("community_likes", {
  id: varchar("id", { length: 36 }).primaryKey(),
  postId: varchar("post_id", { length: 36 }).notNull(),
  userId: varchar("user_id", { length: 255 }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type CommunityPost = typeof communityPostsTable.$inferSelect;
export type CommunityLike = typeof communityLikesTable.$inferSelect;
