import { pgTable, text, timestamp, varchar, boolean } from "drizzle-orm/pg-core";

export const inspirationBoardsTable = pgTable("inspiration_boards", {
  id: varchar("id", { length: 36 }).primaryKey(),
  userId: varchar("user_id", { length: 255 }).notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  isPrivate: boolean("is_private").notNull().default(false),
  coverUrl: text("cover_url"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const inspirationBoardItemsTable = pgTable("inspiration_board_items", {
  id: varchar("id", { length: 36 }).primaryKey(),
  boardId: varchar("board_id", { length: 36 }).notNull(),
  imageUrl: text("image_url"),
  title: varchar("title", { length: 255 }),
  artistName: varchar("artist_name", { length: 255 }),
  artistId: varchar("artist_id", { length: 255 }),
  sourceType: varchar("source_type", { length: 50 }),
  sourceId: varchar("source_id", { length: 36 }),
  addedAt: timestamp("added_at", { withTimezone: true }).notNull().defaultNow(),
});

export type InspirationBoard = typeof inspirationBoardsTable.$inferSelect;
export type InspirationBoardItem = typeof inspirationBoardItemsTable.$inferSelect;
