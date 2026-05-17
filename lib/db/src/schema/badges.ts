import { pgTable, varchar, text, timestamp } from "drizzle-orm/pg-core";

export const badgeDefinitionsTable = pgTable("badge_definitions", {
  id: varchar("id", { length: 100 }).primaryKey(),
  name: varchar("name", { length: 100 }).notNull(),
  description: text("description").notNull(),
  icon: varchar("icon", { length: 10 }).notNull(),
  category: varchar("category", { length: 50 }).notNull(),
  rarity: varchar("rarity", { length: 20 }).notNull().default("common"),
});

export const userBadgesTable = pgTable("user_badges", {
  id: varchar("id", { length: 36 }).primaryKey(),
  userId: varchar("user_id", { length: 255 }).notNull(),
  badgeId: varchar("badge_id", { length: 100 }).notNull(),
  earnedAt: timestamp("earned_at", { withTimezone: true }).notNull().defaultNow(),
});

export type BadgeDefinition = typeof badgeDefinitionsTable.$inferSelect;
export type UserBadge = typeof userBadgesTable.$inferSelect;
