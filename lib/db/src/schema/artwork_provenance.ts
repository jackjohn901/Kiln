import { pgTable, text, integer, boolean, timestamp, varchar } from "drizzle-orm/pg-core";

export const artworkProvenanceTable = pgTable("artwork_provenance", {
  id: varchar("id", { length: 36 }).primaryKey(),
  listingId: varchar("listing_id", { length: 36 }).notNull(),
  listingTitle: text("listing_title").notNull(),
  artistId: varchar("artist_id", { length: 255 }).notNull(),
  artistName: varchar("artist_name", { length: 255 }).notNull(),
  imageUrl: text("image_url"),
  medium: varchar("medium", { length: 100 }),
  yearMade: integer("year_made"),
  royaltyPercent: integer("royalty_percent").notNull().default(10),
  registeredAt: timestamp("registered_at", { withTimezone: true }).notNull().defaultNow(),
});

export const provenanceRecordsTable = pgTable("provenance_records", {
  id: varchar("id", { length: 36 }).primaryKey(),
  provenanceId: varchar("provenance_id", { length: 36 }).notNull(),
  ownerId: varchar("owner_id", { length: 255 }).notNull(),
  ownerName: varchar("owner_name", { length: 255 }).notNull(),
  acquiredAt: timestamp("acquired_at", { withTimezone: true }).notNull().defaultNow(),
  acquiredFor: varchar("acquired_for", { length: 50 }),
  note: text("note"),
  isArtist: boolean("is_artist").notNull().default(false),
  orderId: varchar("order_id", { length: 36 }),
});

export type ArtworkProvenance = typeof artworkProvenanceTable.$inferSelect;
export type ProvenanceRecord = typeof provenanceRecordsTable.$inferSelect;
