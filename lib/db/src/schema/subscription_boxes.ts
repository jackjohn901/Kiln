import { pgTable, text, integer, timestamp, boolean, varchar } from "drizzle-orm/pg-core";

export const subscriptionBoxesTable = pgTable("subscription_boxes", {
  id: varchar("id", { length: 36 }).primaryKey(),
  artistId: varchar("artist_id", { length: 255 }).notNull(),
  artistName: varchar("artist_name", { length: 255 }).notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  imageUrl: text("image_url"),
  priceCents: integer("price_cents").notNull(),
  frequency: varchar("frequency", { length: 20 }).notNull().default("monthly"),
  subscriberCount: integer("subscriber_count").notNull().default(0),
  maxSubscribers: integer("max_subscribers"),
  isActive: boolean("is_active").notNull().default(true),
  stripePriceId: varchar("stripe_price_id", { length: 255 }),
  nextShipDate: timestamp("next_ship_date", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const boxSubscribersTable = pgTable("box_subscribers", {
  id: varchar("id", { length: 36 }).primaryKey(),
  boxId: varchar("box_id", { length: 36 }).notNull(),
  userId: varchar("user_id", { length: 255 }).notNull(),
  userName: varchar("user_name", { length: 255 }).notNull(),
  userEmail: varchar("user_email", { length: 255 }),
  stripeSubscriptionId: varchar("stripe_subscription_id", { length: 255 }),
  status: varchar("status", { length: 20 }).notNull().default("active"),
  shippingAddress: text("shipping_address"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type SubscriptionBox = typeof subscriptionBoxesTable.$inferSelect;
export type BoxSubscriber = typeof boxSubscribersTable.$inferSelect;
