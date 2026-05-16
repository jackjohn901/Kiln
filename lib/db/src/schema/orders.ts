import { pgTable, text, integer, timestamp, varchar } from "drizzle-orm/pg-core";

export const ordersTable = pgTable("orders", {
  id: varchar("id", { length: 36 }).primaryKey(),
  buyerId: varchar("buyer_id", { length: 255 }).notNull(),
  sellerId: varchar("seller_id", { length: 255 }).notNull(),
  type: varchar("type", { length: 50 }).notNull().default("listing"),
  refId: varchar("ref_id", { length: 36 }),
  title: text("title").notNull(),
  description: text("description"),
  imageUrl: text("image_url"),
  amount: integer("amount").notNull(),
  currency: varchar("currency", { length: 3 }).notNull().default("USD"),
  status: varchar("status", { length: 50 }).notNull().default("pending"),
  shippingAddress: text("shipping_address"),
  trackingNumber: varchar("tracking_number", { length: 100 }),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export type Order = typeof ordersTable.$inferSelect;
export type InsertOrder = typeof ordersTable.$inferInsert;
