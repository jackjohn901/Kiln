import { pgTable, integer, timestamp, varchar } from "drizzle-orm/pg-core";

export const projectPostsTable = pgTable("project_posts", {
  id: varchar("id", { length: 36 }).primaryKey(),
  projectId: varchar("project_id", { length: 36 }).notNull(),
  postId: varchar("post_id", { length: 36 }).notNull(),
  chapterNum: integer("chapter_num").notNull().default(1),
  stage: varchar("stage", { length: 100 }),
  addedAt: timestamp("added_at", { withTimezone: true }).notNull().defaultNow(),
});

export type ProjectPost = typeof projectPostsTable.$inferSelect;
export type InsertProjectPost = typeof projectPostsTable.$inferInsert;
