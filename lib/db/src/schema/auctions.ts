import { pgTable, text, integer, boolean, timestamp, varchar } from "drizzle-orm/pg-core";

export const auctionsTable = pgTable("auctions", {
  id: varchar("id", { length: 36 }).primaryKey(),
  artistId: varchar("artist_id", { length: 255 }).notNull(),
  artistName: varchar("artist_name", { length: 255 }).notNull(),
  artistAvatarUrl: text("artist_avatar_url"),
  title: text("title").notNull(),
  description: text("description"),
  imageUrl: text("image_url"),
  medium: varchar("medium", { length: 100 }),
  dimensions: varchar("dimensions", { length: 100 }),
  startingPrice: integer("starting_price").notNull(),
  reservePrice: integer("reserve_price"),
  currentBid: integer("current_bid").notNull().default(0),
  currentBidderId: varchar("current_bidder_id", { length: 255 }),
  currentBidderName: varchar("current_bidder_name", { length: 255 }),
  bidCount: integer("bid_count").notNull().default(0),
  currency: varchar("currency", { length: 3 }).notNull().default("USD"),
  status: varchar("status", { length: 50 }).notNull().default("upcoming"),
  startDate: timestamp("start_date", { withTimezone: true }).notNull(),
  endDate: timestamp("end_date", { withTimezone: true }).notNull(),
  winnerId: varchar("winner_id", { length: 255 }),
  tags: text("tags").array().default([]),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const auctionBidsTable = pgTable("auction_bids", {
  id: varchar("id", { length: 36 }).primaryKey(),
  auctionId: varchar("auction_id", { length: 36 }).notNull(),
  bidderId: varchar("bidder_id", { length: 255 }).notNull(),
  bidderName: varchar("bidder_name", { length: 255 }).notNull(),
  amount: integer("amount").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type Auction = typeof auctionsTable.$inferSelect;
export type AuctionBid = typeof auctionBidsTable.$inferSelect;
