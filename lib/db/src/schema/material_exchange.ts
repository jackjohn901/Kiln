import { pgTable, text, integer, timestamp, varchar } from "drizzle-orm/pg-core";

export const materialExchangeListingsTable = pgTable("material_exchange_listings", {
  id: varchar("id", { length: 36 }).primaryKey(),
  userId: varchar("user_id", { length: 255 }).notNull(),
  userName: varchar("user_name", { length: 255 }).notNull(),
  userAvatar: text("user_avatar"),
  type: varchar("type", { length: 20 }).notNull().default("sell"),
  category: varchar("category", { length: 100 }),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  price: integer("price"),
  tradeFor: text("trade_for"),
  quantity: varchar("quantity", { length: 100 }),
  location: varchar("location", { length: 255 }),
  imageUrl: text("image_url"),
  condition: varchar("condition", { length: 50 }),
  likeCount: integer("like_count").notNull().default(0),
  isAvailable: integer("is_available").notNull().default(1),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type MaterialExchangeListing = typeof materialExchangeListingsTable.$inferSelect;
