import { pgTable, text, integer, boolean, timestamp, varchar } from "drizzle-orm/pg-core";

export const workshopsTable = pgTable("workshops", {
  id: varchar("id", { length: 36 }).primaryKey(),
  artistId: varchar("artist_id", { length: 255 }).notNull(),
  artistName: varchar("artist_name", { length: 255 }).notNull(),
  artistAvatarUrl: text("artist_avatar_url"),
  title: text("title").notNull(),
  description: text("description"),
  technique: varchar("technique", { length: 100 }),
  level: varchar("level", { length: 50 }).notNull().default("All levels"),
  location: varchar("location", { length: 255 }),
  isOnline: boolean("is_online").notNull().default(false),
  price: integer("price").notNull(),
  currency: varchar("currency", { length: 3 }).notNull().default("USD"),
  maxSpots: integer("max_spots").notNull().default(8),
  spotsBooked: integer("spots_booked").notNull().default(0),
  durationHours: integer("duration_hours").notNull().default(3),
  meetingUrl: text("meeting_url"),
  imageUrl: text("image_url"),
  startDate: timestamp("start_date", { withTimezone: true }),
  endDate: timestamp("end_date", { withTimezone: true }),
  tags: text("tags").array().default([]),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const workshopBookingsTable = pgTable("workshop_bookings", {
  id: varchar("id", { length: 36 }).primaryKey(),
  workshopId: varchar("workshop_id", { length: 36 }).notNull(),
  userId: varchar("user_id", { length: 255 }).notNull(),
  userName: varchar("user_name", { length: 255 }).notNull(),
  userEmail: varchar("user_email", { length: 255 }),
  status: varchar("status", { length: 50 }).notNull().default("confirmed"),
  notes: text("notes"),
  paidAmount: integer("paid_amount"),
  reminderSentAt: timestamp("reminder_sent_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type Workshop = typeof workshopsTable.$inferSelect;
export type WorkshopBooking = typeof workshopBookingsTable.$inferSelect;
