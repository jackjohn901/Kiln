import { pgTable, text, integer, timestamp, varchar, boolean } from "drizzle-orm/pg-core";

export const ghostPiecesTable = pgTable("ghost_pieces", {
  id: varchar("id", { length: 36 }).primaryKey(),
  userId: varchar("user_id", { length: 255 }).notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  medium: varchar("medium", { length: 100 }),
  soldTo: varchar("sold_to", { length: 255 }),
  soldAt: varchar("sold_at", { length: 100 }),
  imageUrl: text("image_url"),
  subscriberCount: integer("subscriber_count").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const ghostUpdatesTable = pgTable("ghost_updates", {
  id: varchar("id", { length: 36 }).primaryKey(),
  pieceId: varchar("piece_id", { length: 36 }).notNull(),
  authorId: varchar("author_id", { length: 255 }).notNull(),
  type: varchar("type", { length: 50 }).notNull().default("note"),
  content: text("content").notNull().default(""),
  imageUrl: text("image_url"),
  likeCount: integer("like_count").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const ghostSubscribersTable = pgTable("ghost_subscribers", {
  pieceId: varchar("piece_id", { length: 36 }).notNull(),
  userId: varchar("user_id", { length: 255 }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type GhostPiece = typeof ghostPiecesTable.$inferSelect;
export type GhostUpdate = typeof ghostUpdatesTable.$inferSelect;
