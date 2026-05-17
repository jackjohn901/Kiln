import { pgTable, varchar, text, integer, timestamp } from "drizzle-orm/pg-core";

export const pollsTable = pgTable("polls", {
  id: varchar("id", { length: 36 }).primaryKey(),
  postId: varchar("post_id", { length: 36 }).notNull(),
  authorId: varchar("author_id", { length: 255 }).notNull(),
  question: text("question").notNull(),
  options: text("options").array().notNull(),
  voteCounts: integer("vote_counts").array().notNull(),
  endsAt: timestamp("ends_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const pollVotesTable = pgTable("poll_votes", {
  id: varchar("id", { length: 36 }).primaryKey(),
  pollId: varchar("poll_id", { length: 36 }).notNull(),
  userId: varchar("user_id", { length: 255 }).notNull(),
  optionIndex: integer("option_index").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type Poll = typeof pollsTable.$inferSelect;
export type PollVote = typeof pollVotesTable.$inferSelect;
