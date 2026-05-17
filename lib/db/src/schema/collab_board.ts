import { pgTable, text, boolean, timestamp, integer } from "drizzle-orm/pg-core";

export const collabPostsTable = pgTable("collab_posts", {
  id: text("id").primaryKey(),
  authorId: text("author_id").notNull(),
  authorName: text("author_name").notNull(),
  authorAvatarUrl: text("author_avatar_url"),
  title: text("title").notNull(),
  description: text("description").notNull(),
  seeking: text("seeking").array().notNull().default([]),
  offering: text("offering").notNull().default(""),
  location: text("location").notNull().default(""),
  remote: boolean("remote").notNull().default(false),
  tags: text("tags").array().notNull().default([]),
  responses: integer("responses").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const collabPostInterestsTable = pgTable("collab_post_interests", {
  id: text("id").primaryKey(),
  postId: text("post_id").notNull(),
  userId: text("user_id").notNull(),
  userName: text("user_name").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});
