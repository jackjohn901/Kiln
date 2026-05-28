import { pgTable, text, boolean, timestamp, varchar } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const notificationsTable = pgTable("notifications", {
  id: varchar("id", { length: 36 }).primaryKey(),
  userId: varchar("user_id", { length: 255 }).notNull(),
  type: varchar("type", { length: 50 }).notNull(),
  fromId: varchar("from_id", { length: 255 }),
  fromName: varchar("from_name", { length: 255 }),
  fromAvatarUrl: text("from_avatar_url"),
  text: text("text").notNull(),
  link: text("link"),
  imageUrl: text("image_url"),
  read: boolean("read").notNull().default(false),
  emailSkipped: boolean("email_skipped").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertNotificationSchema = createInsertSchema(notificationsTable).omit({ createdAt: true });
export type InsertNotification = z.infer<typeof insertNotificationSchema>;
export type Notification = typeof notificationsTable.$inferSelect;
