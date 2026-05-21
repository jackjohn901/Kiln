import { pgTable, text, varchar, timestamp, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const workReservationsTable = pgTable("work_reservations", {
  id: varchar("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  artistId: varchar("artist_id").notNull(),
  artistName: varchar("artist_name").notNull(),
  title: text("title").notNull(),
  description: text("description"),
  imageUrl: text("image_url"),
  expectedDate: varchar("expected_date").notNull(), // e.g. "Spring 2026"
  interestCount: integer("interest_count").notNull().default(0),
  status: varchar("status", { enum: ["open", "closed"] }).notNull().default("open"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertWorkReservationSchema = createInsertSchema(workReservationsTable).omit({ id: true, createdAt: true });
export type InsertWorkReservation = z.infer<typeof insertWorkReservationSchema>;
export type WorkReservation = typeof workReservationsTable.$inferSelect;

export const reservationInterestsTable = pgTable("reservation_interests", {
  id: varchar("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  reservationId: varchar("reservation_id").notNull(),
  userId: varchar("user_id").notNull(),
  userName: varchar("user_name").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertReservationInterestSchema = createInsertSchema(reservationInterestsTable).omit({ id: true, createdAt: true });
export type InsertReservationInterest = z.infer<typeof insertReservationInterestSchema>;
export type ReservationInterest = typeof reservationInterestsTable.$inferSelect;
