import { pgTable, text, integer, timestamp, varchar } from "drizzle-orm/pg-core";

export const tipsTable = pgTable("tips", {
  id: varchar("id", { length: 36 }).primaryKey(),
  fromUserId: varchar("from_user_id", { length: 255 }).notNull(),
  fromUserName: varchar("from_user_name", { length: 255 }).notNull(),
  toUserId: varchar("to_user_id", { length: 255 }).notNull(),
  toUserName: varchar("to_user_name", { length: 255 }).notNull(),
  postId: varchar("post_id", { length: 36 }),
  amountCents: integer("amount_cents").notNull(),
  message: text("message"),
  stripePaymentIntentId: varchar("stripe_payment_intent_id", { length: 255 }),
  status: varchar("status", { length: 20 }).notNull().default("pending"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type Tip = typeof tipsTable.$inferSelect;
export type InsertTip = typeof tipsTable.$inferInsert;
