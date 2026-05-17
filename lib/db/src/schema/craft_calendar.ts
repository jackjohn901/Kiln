import { pgTable, text, timestamp, varchar } from "drizzle-orm/pg-core";

export const craftCalendarEventsTable = pgTable("craft_calendar_events", {
  id: varchar("id", { length: 36 }).primaryKey(),
  userId: varchar("user_id", { length: 255 }).notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  date: varchar("date", { length: 20 }).notNull(),
  type: varchar("type", { length: 50 }).notNull().default("custom"),
  location: varchar("location", { length: 255 }),
  description: text("description"),
  url: text("url"),
  color: varchar("color", { length: 30 }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type CraftCalendarEvent = typeof craftCalendarEventsTable.$inferSelect;
