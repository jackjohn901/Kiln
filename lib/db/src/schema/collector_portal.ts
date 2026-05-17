import { pgTable, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";

export const collectorSavesTable = pgTable("collector_saves", {
  userId: text("user_id").notNull(),
  listingId: text("listing_id").notNull(),
  savedAt: timestamp("saved_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [uniqueIndex("collector_saves_user_listing_idx").on(t.userId, t.listingId)]);

export const collectorNotesTable = pgTable("collector_notes", {
  userId: text("user_id").notNull(),
  listingId: text("listing_id").notNull(),
  content: text("content").notNull().default(""),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
}, (t) => [uniqueIndex("collector_notes_user_listing_idx").on(t.userId, t.listingId)]);

export type CollectorSave = typeof collectorSavesTable.$inferSelect;
export type CollectorNote = typeof collectorNotesTable.$inferSelect;
