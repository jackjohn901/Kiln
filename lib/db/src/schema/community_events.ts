import { pgTable, text, integer, timestamp, varchar } from "drizzle-orm/pg-core";

export const communityEventsTable = pgTable("community_events", {
  id: varchar("id", { length: 36 }).primaryKey(),
  userId: varchar("user_id", { length: 255 }).notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  type: varchar("type", { length: 50 }).notNull().default("meetup"),
  mode: varchar("mode", { length: 20 }).notNull().default("in-person"),
  date: varchar("date", { length: 20 }).notNull(),
  time: varchar("time", { length: 20 }),
  location: varchar("location", { length: 255 }),
  city: varchar("city", { length: 100 }),
  artistName: varchar("artist_name", { length: 255 }),
  description: text("description"),
  attendees: integer("attendees").notNull().default(0),
  link: text("link"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const communityEventRsvpsTable = pgTable("community_event_rsvps", {
  eventId: varchar("event_id", { length: 36 }).notNull(),
  userId: varchar("user_id", { length: 255 }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type CommunityEvent = typeof communityEventsTable.$inferSelect;
