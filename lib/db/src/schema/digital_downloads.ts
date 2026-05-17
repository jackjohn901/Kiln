import { pgTable, text, integer, timestamp, varchar } from "drizzle-orm/pg-core";

export const digitalDownloadPurchasesTable = pgTable("digital_download_purchases", {
  id: varchar("id", { length: 36 }).primaryKey(),
  userId: varchar("user_id", { length: 255 }).notNull(),
  productId: varchar("product_id", { length: 36 }).notNull(),
  productTitle: varchar("product_title", { length: 255 }).notNull(),
  amountCents: integer("amount_cents").notNull().default(0),
  downloadUrl: text("download_url"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type DigitalDownloadPurchase = typeof digitalDownloadPurchasesTable.$inferSelect;
