import { pgTable, text, timestamp, varchar } from "drizzle-orm/pg-core";
import { reviewsTable } from "./reviews";

export const reviewVotesTable = pgTable("review_votes", {
  id: varchar("id", { length: 36 }).primaryKey(),
  reviewId: varchar("review_id", { length: 36 }).notNull().references(() => reviewsTable.id, { onDelete: "cascade" }),
  userId: varchar("user_id", { length: 255 }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type ReviewVote = typeof reviewVotesTable.$inferSelect;
export type InsertReviewVote = typeof reviewVotesTable.$inferInsert;
