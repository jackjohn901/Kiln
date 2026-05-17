import { pgTable, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";

export const opportunitySavesTable = pgTable("opportunity_saves", {
  userId: text("user_id").notNull(),
  opportunityId: text("opportunity_id").notNull(),
  status: text("status").notNull().default("saved"),
  savedAt: timestamp("saved_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
}, (t) => [uniqueIndex("opportunity_saves_user_opp_idx").on(t.userId, t.opportunityId)]);

export type OpportunitySave = typeof opportunitySavesTable.$inferSelect;
