import { pgTable, text, integer, timestamp, boolean, varchar } from "drizzle-orm/pg-core";

export const reviewsTable = pgTable("reviews", {
  id: varchar("id", { length: 36 }).primaryKey(),
  reviewerId: varchar("reviewer_id", { length: 255 }).notNull(),
  reviewerName: varchar("reviewer_name", { length: 255 }).notNull(),
  reviewerAvatarUrl: text("reviewer_avatar_url"),
  targetId: varchar("target_id", { length: 36 }).notNull(),
  targetType: varchar("target_type", { length: 20 }).notNull().default("listing"),
  rating: integer("rating").notNull(),
  title: varchar("title", { length: 255 }),
  body: text("body"),
  isVerifiedPurchase: boolean("is_verified_purchase").notNull().default(false),
  artistResponse: text("artist_response"),
  helpfulCount: integer("helpful_count").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export type Review = typeof reviewsTable.$inferSelect;
export type InsertReview = typeof reviewsTable.$inferInsert;
