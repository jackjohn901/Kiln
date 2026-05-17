import { pgTable, integer, timestamp, varchar } from "drizzle-orm/pg-core";

export const cartItemsTable = pgTable("cart_items", {
  id: varchar("id", { length: 36 }).primaryKey(),
  userId: varchar("user_id", { length: 255 }).notNull(),
  listingId: varchar("listing_id", { length: 36 }).notNull(),
  quantity: integer("quantity").notNull().default(1),
  addedAt: timestamp("added_at", { withTimezone: true }).notNull().defaultNow(),
});

export type CartItem = typeof cartItemsTable.$inferSelect;
