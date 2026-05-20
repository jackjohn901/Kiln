import { pgTable, text, integer, timestamp, varchar } from "drizzle-orm/pg-core";

export const projectsTable = pgTable("projects", {
  id: varchar("id", { length: 36 }).primaryKey(),
  artistId: varchar("artist_id", { length: 255 }).notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  medium: varchar("medium", { length: 255 }),
  coverImageUrl: text("cover_image_url"),
  status: varchar("status", { length: 20 }).notNull().default("active"),
  linkedListingId: varchar("linked_listing_id", { length: 36 }),
  postCount: integer("post_count").notNull().default(0),
  startedAt: timestamp("started_at", { withTimezone: true }),
  completedAt: timestamp("completed_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type Project = typeof projectsTable.$inferSelect;
export type InsertProject = typeof projectsTable.$inferInsert;
