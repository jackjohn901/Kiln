import { pgTable, varchar, integer, text, timestamp } from "drizzle-orm/pg-core";

export const giftCardsTable = pgTable("gift_cards", {
  id: varchar("id", { length: 36 }).primaryKey(),
  code: varchar("code", { length: 20 }).notNull().unique(),
  amount: integer("amount").notNull(),
  designId: varchar("design_id", { length: 32 }).notNull().default("glasswork"),
  purchasedByUserId: varchar("purchased_by_user_id", { length: 255 }),
  recipientName: varchar("recipient_name", { length: 255 }),
  recipientEmail: varchar("recipient_email", { length: 255 }),
  message: text("message"),
  redeemedByUserId: varchar("redeemed_by_user_id", { length: 255 }),
  redeemedAt: timestamp("redeemed_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type GiftCard = typeof giftCardsTable.$inferSelect;
