import { pgTable, text, integer, boolean, timestamp, varchar, numeric } from "drizzle-orm/pg-core";

export const kilnSessionsTable = pgTable("kiln_sessions", {
  id: varchar("id", { length: 36 }).primaryKey(),
  artistId: varchar("artist_id", { length: 255 }).notNull(),
  artistName: varchar("artist_name", { length: 255 }).notNull(),
  artistAvatarUrl: text("artist_avatar_url"),
  kilnName: varchar("kiln_name", { length: 100 }),
  cone: varchar("cone", { length: 100 }),
  fuel: varchar("fuel", { length: 50 }),
  pieces: integer("pieces").notNull().default(0),
  notes: text("notes"),
  startedAt: timestamp("started_at", { withTimezone: true }).notNull().defaultNow(),
  estimatedHours: numeric("estimated_hours", { precision: 5, scale: 2 }).notNull().default("8"),
  endedAt: timestamp("ended_at", { withTimezone: true }),
  status: varchar("status", { length: 20 }).notNull().default("firing"),
  isPublic: boolean("is_public").notNull().default(true),
  autoPostStart: boolean("auto_post_start").notNull().default(true),
  autoPostEnd: boolean("auto_post_end").notNull().default(true),
  startPostSent: boolean("start_post_sent").notNull().default(false),
  endPostSent: boolean("end_post_sent").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type KilnSession = typeof kilnSessionsTable.$inferSelect;
