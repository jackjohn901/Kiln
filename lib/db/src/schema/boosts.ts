import { pgTable, text, integer, timestamp, varchar } from "drizzle-orm/pg-core";

export const boostedPostsTable = pgTable("boosted_posts", {
  id: varchar("id", { length: 36 }).primaryKey(),
  postId: varchar("post_id", { length: 36 }).notNull(),
  userId: varchar("user_id", { length: 255 }).notNull(),
  budgetCents: integer("budget_cents").notNull(),
  spentCents: integer("spent_cents").notNull().default(0),
  targetTechnique: varchar("target_technique", { length: 100 }),
  targetLocation: varchar("target_location", { length: 255 }),
  status: varchar("status", { length: 20 }).notNull().default("active"),
  impressions: integer("impressions").notNull().default(0),
  clicks: integer("clicks").notNull().default(0),
  stripeSessionId: varchar("stripe_session_id", { length: 255 }),
  startDate: timestamp("start_date", { withTimezone: true }).notNull().defaultNow(),
  endDate: timestamp("end_date", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type BoostedPost = typeof boostedPostsTable.$inferSelect;
