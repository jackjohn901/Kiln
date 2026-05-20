import { pgTable, text, integer, boolean, timestamp, varchar, numeric } from "drizzle-orm/pg-core";

export const listingsTable = pgTable("listings", {
  id: varchar("id", { length: 36 }).primaryKey(),
  artistId: varchar("artist_id", { length: 255 }).notNull(),
  artistName: varchar("artist_name", { length: 255 }).notNull(),
  artistAvatarUrl: text("artist_avatar_url"),
  title: text("title").notNull(),
  description: text("description"),
  medium: varchar("medium", { length: 100 }),
  technique: varchar("technique", { length: 100 }),
  dimensions: varchar("dimensions", { length: 100 }),
  weight: varchar("weight", { length: 50 }),
  year: integer("year"),
  edition: varchar("edition", { length: 100 }),
  imageUrl: text("image_url"),
  imageUrls: text("image_urls").array().default([]),
  price: integer("price").notNull(),
  currency: varchar("currency", { length: 3 }).notNull().default("USD"),
  isSold: boolean("is_sold").notNull().default(false),
  isAvailable: boolean("is_available").notNull().default(true),
  shipsFrom: varchar("ships_from", { length: 100 }),
  shipsTo: text("ships_to").array().default([]),
  tags: text("tags").array().default([]),
  viewCount: integer("view_count").notNull().default(0),
  wishlistCount: integer("wishlist_count").notNull().default(0),
  isResale: boolean("is_resale").notNull().default(false),
  originalArtistId: varchar("original_artist_id", { length: 255 }),
  originalArtistName: varchar("original_artist_name", { length: 255 }),
  originalListingId: varchar("original_listing_id", { length: 36 }),
  royaltyPercent: integer("royalty_percent").notNull().default(10),
  sharedPlatforms: text("shared_platforms").array().notNull().default([]),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const wishlistsTable = pgTable("wishlists", {
  userId: varchar("user_id", { length: 255 }).notNull(),
  listingId: varchar("listing_id", { length: 36 }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type Listing = typeof listingsTable.$inferSelect;
export type InsertListing = typeof listingsTable.$inferInsert;
