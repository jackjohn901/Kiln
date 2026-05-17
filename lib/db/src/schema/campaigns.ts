import { pgTable, text, integer, timestamp, boolean, varchar } from "drizzle-orm/pg-core";

export const campaignsTable = pgTable("campaigns", {
  id: varchar("id", { length: 36 }).primaryKey(),
  artistId: varchar("artist_id", { length: 255 }).notNull(),
  artistName: varchar("artist_name", { length: 255 }).notNull(),
  artistAvatarUrl: text("artist_avatar_url"),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description").notNull(),
  goalCents: integer("goal_cents").notNull(),
  raisedCents: integer("raised_cents").notNull().default(0),
  backerCount: integer("backer_count").notNull().default(0),
  category: varchar("category", { length: 100 }),
  imageUrl: text("image_url"),
  videoUrl: text("video_url"),
  status: varchar("status", { length: 20 }).notNull().default("draft"),
  endDate: timestamp("end_date", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const campaignRewardsTable = pgTable("campaign_rewards", {
  id: varchar("id", { length: 36 }).primaryKey(),
  campaignId: varchar("campaign_id", { length: 36 }).notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  amountCents: integer("amount_cents").notNull(),
  maxClaimed: integer("max_claimed"),
  claimed: integer("claimed").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const campaignBackersTable = pgTable("campaign_backers", {
  id: varchar("id", { length: 36 }).primaryKey(),
  campaignId: varchar("campaign_id", { length: 36 }).notNull(),
  userId: varchar("user_id", { length: 255 }).notNull(),
  userName: varchar("user_name", { length: 255 }).notNull(),
  amountCents: integer("amount_cents").notNull(),
  rewardId: varchar("reward_id", { length: 36 }),
  message: text("message"),
  isAnonymous: boolean("is_anonymous").notNull().default(false),
  stripeSessionId: varchar("stripe_session_id", { length: 255 }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type Campaign = typeof campaignsTable.$inferSelect;
export type CampaignReward = typeof campaignRewardsTable.$inferSelect;
export type CampaignBacker = typeof campaignBackersTable.$inferSelect;
