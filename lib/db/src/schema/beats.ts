import { pgTable, text, integer, timestamp, varchar, jsonb, boolean, real } from "drizzle-orm/pg-core";

export const beatsTable = pgTable("beats", {
  id: varchar("id", { length: 36 }).primaryKey(),
  userId: varchar("user_id", { length: 255 }).notNull(),
  artistHandle: varchar("artist_handle", { length: 100 }),
  artistName: varchar("artist_name", { length: 255 }).notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  bpm: integer("bpm").notNull().default(120),
  steps: integer("steps").notNull().default(16),
  pattern: jsonb("pattern").default([]),
  trackCount: integer("track_count").notNull().default(8),
  trackVolumes: jsonb("track_volumes").default([]),
  trackMutes: jsonb("track_mutes").default([]),
  melodyNotes: jsonb("melody_notes").default([]),
  bassNotes: jsonb("bass_notes").default([]),
  chordNotes: jsonb("chord_notes").default([]),
  swing: real("swing").default(0),
  reverb: real("reverb").default(0),
  license: varchar("license", { length: 50 }).default("free"),
  price: integer("price").default(0),
  usedCount: integer("used_count").notNull().default(0),
  isPublic: boolean("is_public").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type Beat = typeof beatsTable.$inferSelect;
