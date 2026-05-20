import { pgTable, text, timestamp, varchar, numeric } from "drizzle-orm/pg-core";

export const materialSourcesTable = pgTable("material_sources", {
  id: varchar("id", { length: 36 }).primaryKey(),
  artistId: varchar("artist_id", { length: 255 }).notNull(),
  name: varchar("name", { length: 100 }).notNull(),
  materialType: varchar("material_type", { length: 50 }),
  sourceLocation: varchar("source_location", { length: 255 }),
  sourceDescription: text("source_description"),
  latitude: numeric("latitude", { precision: 9, scale: 6 }),
  longitude: numeric("longitude", { precision: 9, scale: 6 }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type MaterialSource = typeof materialSourcesTable.$inferSelect;
