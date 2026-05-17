import { pgTable, integer, varchar, date, timestamp } from "drizzle-orm/pg-core";

export const streaksTable = pgTable("streaks", {
  userId: varchar("user_id", { length: 255 }).primaryKey(),
  currentStreak: integer("current_streak").notNull().default(0),
  longestStreak: integer("longest_streak").notNull().default(0),
  lastPostDate: date("last_post_date"),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export type Streak = typeof streaksTable.$inferSelect;
