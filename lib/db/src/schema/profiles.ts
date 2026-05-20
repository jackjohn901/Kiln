import { pgTable, text, integer, boolean, timestamp, varchar } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const profilesTable = pgTable("profiles", {
  userId: varchar("user_id", { length: 255 }).primaryKey(),
  handle: varchar("handle", { length: 100 }).unique(),
  displayName: varchar("display_name", { length: 255 }),
  bio: text("bio"),
  medium: varchar("medium", { length: 100 }),
  location: varchar("location", { length: 255 }),
  website: text("website"),
  avatarUrl: text("avatar_url"),
  bannerUrl: text("banner_url"),
  isVerified: boolean("is_verified").notNull().default(false),
  followerCount: integer("follower_count").notNull().default(0),
  followingCount: integer("following_count").notNull().default(0),
  postCount: integer("post_count").notNull().default(0),
  studioHours: integer("studio_hours").notNull().default(0),
  kilnStatus: varchar("kiln_status", { length: 255 }),
  generation: integer("generation"),
  mentorId: varchar("mentor_id", { length: 255 }),
  isVerifiedCollector: boolean("is_verified_collector").notNull().default(false),
  totalSpentCents: integer("total_spent_cents").notNull().default(0),
  broadcastSubscriberCount: integer("broadcast_subscriber_count").notNull().default(0),
  linkInBioSlug: varchar("link_in_bio_slug", { length: 100 }),
  accountType: varchar("account_type", { length: 50 }).default("artist"),
  contactEmail: varchar("contact_email", { length: 255 }),
  stripeConnectedAccountId: text("stripe_connected_account_id"),
  stripeConnectStatus: varchar("stripe_connect_status", { length: 50 }),
  stripeRestrictionNotified: boolean("stripe_restriction_notified").notNull().default(false),
  isFoundingArtist: boolean("is_founding_artist").notNull().default(false),
  foundingArtistNumber: integer("founding_artist_number"),
  whyICreate: text("why_i_create"),
  inspirations: text("inspirations"),
  artistStatement: text("artist_statement"),
  collectorStory: text("collector_story"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertProfileSchema = createInsertSchema(profilesTable).omit({ createdAt: true, updatedAt: true });
export type InsertProfile = z.infer<typeof insertProfileSchema>;
export type Profile = typeof profilesTable.$inferSelect;
