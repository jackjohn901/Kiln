import { pgTable, varchar, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const shoutoutsTable = pgTable("shoutouts", {
  id: varchar("id", { length: 36 }).primaryKey(),
  toId: varchar("to_id", { length: 255 }).notNull(),
  fromId: varchar("from_id", { length: 255 }).notNull(),
  fromName: varchar("from_name", { length: 255 }).notNull(),
  fromAvatarUrl: text("from_avatar_url"),
  message: text("message").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertShoutoutSchema = createInsertSchema(shoutoutsTable).omit({ createdAt: true });
export type InsertShoutout = z.infer<typeof insertShoutoutSchema>;
export type Shoutout = typeof shoutoutsTable.$inferSelect;
