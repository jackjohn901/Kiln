import { pgTable, text, timestamp, integer, jsonb } from "drizzle-orm/pg-core";

export const parliamentProposalsTable = pgTable("parliament_proposals", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  category: text("category").notNull().default("community"),
  options: jsonb("options").notNull().default([]),
  endsAt: timestamp("ends_at").notNull(),
  totalVoices: integer("total_voices").notNull().default(0),
  proposedBy: text("proposed_by").notNull(),
  proposedByUserId: text("proposed_by_user_id"),
  proposedByAvatar: text("proposed_by_avatar"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const parliamentVotesTable = pgTable("parliament_votes", {
  id: text("id").primaryKey(),
  proposalId: text("proposal_id").notNull(),
  userId: text("user_id").notNull(),
  optionId: text("option_id").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});
