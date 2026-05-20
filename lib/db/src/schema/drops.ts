import { pgTable, text, integer, boolean, timestamp, varchar } from "drizzle-orm/pg-core";

export const dropsTable = pgTable("drops", {
  id: varchar("id", { length: 36 }).primaryKey(),
  artistId: varchar("artist_id", { length: 255 }).notNull(),
  artistName: varchar("artist_name", { length: 255 }).notNull(),
  artistAvatarUrl: text("artist_avatar_url"),
  title: text("title").notNull(),
  description: text("description"),
  imageUrl: text("image_url"),
  price: integer("price").notNull(),
  currency: varchar("currency", { length: 3 }).notNull().default("USD"),
  edition: integer("edition").notNull().default(1),
  editionSold: integer("edition_sold").notNull().default(0),
  status: varchar("status", { length: 50 }).notNull().default("upcoming"),
  dropDate: timestamp("drop_date", { withTimezone: true }).notNull(),
  technique: varchar("technique", { length: 100 }),
  tags: text("tags").array().default([]),
  isPatronEarlyAccess: boolean("is_patron_early_access").notNull().default(false),
  countdownPosted24h: boolean("countdown_posted_24h").notNull().default(false),
  countdownPosted1h: boolean("countdown_posted_1h").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const dropWaitlistsTable = pgTable("drop_waitlists", {
  dropId: varchar("drop_id", { length: 36 }).notNull(),
  userId: varchar("user_id", { length: 255 }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type Drop = typeof dropsTable.$inferSelect;
