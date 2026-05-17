import { pgTable, varchar, integer, timestamp } from "drizzle-orm/pg-core";

export const referralCodesTable = pgTable("referral_codes", {
  userId: varchar("user_id", { length: 255 }).primaryKey(),
  code: varchar("code", { length: 20 }).notNull().unique(),
  useCount: integer("use_count").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const referralUsesTable = pgTable("referral_uses", {
  id: varchar("id", { length: 36 }).primaryKey(),
  referrerId: varchar("referrer_id", { length: 255 }).notNull(),
  refereeId: varchar("referee_id", { length: 255 }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type ReferralCode = typeof referralCodesTable.$inferSelect;
export type ReferralUse = typeof referralUsesTable.$inferSelect;
