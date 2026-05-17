import { pgTable, varchar, text, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const challengesTable = pgTable("challenges", {
  id: varchar("id", { length: 36 }).primaryKey(),
  emoji: varchar("emoji", { length: 10 }).notNull().default("🔥"),
  title: varchar("title", { length: 200 }).notNull(),
  description: text("description").notNull(),
  prompt: text("prompt").notNull(),
  technique: varchar("technique", { length: 100 }),
  hashtag: varchar("hashtag", { length: 100 }).notNull(),
  prizeDescription: text("prize_description"),
  sponsoredBy: varchar("sponsored_by", { length: 100 }),
  entryCount: integer("entry_count").notNull().default(0),
  startsAt: timestamp("starts_at", { withTimezone: true }).notNull(),
  endsAt: timestamp("ends_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const challengeEntriesTable = pgTable("challenge_entries", {
  id: varchar("id", { length: 36 }).primaryKey(),
  challengeId: varchar("challenge_id", { length: 36 }).notNull(),
  userId: varchar("user_id", { length: 255 }).notNull(),
  postId: varchar("post_id", { length: 36 }),
  voteCount: integer("vote_count").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertChallengeSchema = createInsertSchema(challengesTable).omit({ createdAt: true, entryCount: true });
export type InsertChallenge = z.infer<typeof insertChallengeSchema>;
export type Challenge = typeof challengesTable.$inferSelect;
export type ChallengeEntry = typeof challengeEntriesTable.$inferSelect;
