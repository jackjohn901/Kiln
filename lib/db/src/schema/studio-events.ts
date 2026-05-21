import { pgTable, text, timestamp, integer, boolean, uuid } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const studioEventsTable = pgTable("studio_events", {
  id: uuid("id").primaryKey().defaultRandom(),
  artistId: text("artist_id").notNull(),
  artistName: text("artist_name").notNull(),
  artistAvatarUrl: text("artist_avatar_url"),
  title: text("title").notNull(),
  description: text("description").notNull(),
  eventDate: timestamp("event_date", { withTimezone: true }).notNull(),
  durationMins: integer("duration_mins").notNull(),
  maxAttendees: integer("max_attendees").notNull().default(20),
  attendeeCount: integer("attendee_count").notNull().default(0),
  price: integer("price").notNull().default(0), // in cents, 0 = free
  location: text("location").notNull(),
  address: text("address").notNull(),
  isVirtual: boolean("is_virtual").notNull().default(false),
  status: text("status").notNull().default("upcoming"), // "upcoming" | "past" | "cancelled"
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertStudioEventSchema = createInsertSchema(studioEventsTable).omit({ 
  id: true, 
  createdAt: true 
});
export type InsertStudioEvent = z.infer<typeof insertStudioEventSchema>;
export type StudioEvent = typeof studioEventsTable.$inferSelect;
