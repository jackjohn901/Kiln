import { pgTable, text, timestamp, boolean, varchar } from "drizzle-orm/pg-core";

export const linkInBioTable = pgTable("link_in_bio", {
  userId: varchar("user_id", { length: 255 }).primaryKey(),
  pageTitle: varchar("page_title", { length: 255 }),
  bio: text("bio"),
  avatarUrl: text("avatar_url"),
  theme: varchar("theme", { length: 30 }).notNull().default("dark"),
  blocks: text("blocks").notNull().default("[]"),
  isPublished: boolean("is_published").notNull().default(false),
  customSlug: varchar("custom_slug", { length: 100 }).unique(),
  viewCount: text("view_count").notNull().default("0"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export type LinkInBio = typeof linkInBioTable.$inferSelect;
