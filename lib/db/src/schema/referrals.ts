import { pgTable, varchar, integer, timestamp, index } from "drizzle-orm/pg-core";

export const referralCodesTable = pgTable("referral_codes", {
  userId: varchar("user_id", { length: 255 }).primaryKey(),
  code: varchar("code", { length: 20 }).notNull().unique(),
  useCount: integer("use_count").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const referralUsesTable = pgTable("referral_uses", {
  id: varchar("id", { length: 36 }).primaryKey(),
  referrerId: varchar("referrer_id", { length: 255 }).notNull(),
  refereeId: varchar("referee_id", { length: 255 }).notNull().unique(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  // Speeds up the downline/network walks that traverse parent → child edges.
  index("referral_uses_referrer_id_idx").on(table.referrerId),
]);

export type ReferralCode = typeof referralCodesTable.$inferSelect;
export type ReferralUse = typeof referralUsesTable.$inferSelect;
