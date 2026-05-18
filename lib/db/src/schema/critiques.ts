import { pgTable, text, integer, timestamp, varchar } from "drizzle-orm/pg-core";

export const critiquesTable = pgTable("critiques", {
  id: varchar("id", { length: 36 }).primaryKey(),
  postId: varchar("post_id", { length: 255 }).notNull(),
  postArtistId: varchar("post_artist_id", { length: 255 }).notNull(),
  fromId: varchar("from_id", { length: 255 }).notNull(),
  fromName: varchar("from_name", { length: 255 }).notNull(),
  fromAvatarUrl: text("from_avatar_url"),
  technique: integer("technique").notNull().default(3),
  concept: integer("concept").notNull().default(3),
  finish: integer("finish").notNull().default(3),
  originality: integer("originality").notNull().default(3),
  text: text("text").notNull(),
  helpful: integer("helpful").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type Critique = typeof critiquesTable.$inferSelect;
