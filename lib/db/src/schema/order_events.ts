import { pgTable, varchar, text, timestamp } from "drizzle-orm/pg-core";

export const orderEventsTable = pgTable("order_events", {
  id: varchar("id", { length: 36 }).primaryKey(),
  orderId: varchar("order_id", { length: 36 }).notNull(),
  type: varchar("type", { length: 50 }).notNull(),
  trackingNumber: varchar("tracking_number", { length: 100 }),
  carrier: varchar("carrier", { length: 50 }),
  previousTrackingNumber: varchar("previous_tracking_number", { length: 100 }),
  note: text("note"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type OrderEvent = typeof orderEventsTable.$inferSelect;
export type InsertOrderEvent = typeof orderEventsTable.$inferInsert;
