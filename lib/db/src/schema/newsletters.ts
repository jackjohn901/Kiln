import { pgTable, text, integer, timestamp, varchar } from "drizzle-orm/pg-core";

export const newslettersTable = pgTable("newsletters", {
  id: varchar("id", { length: 36 }).primaryKey(),
  artistId: varchar("artist_id", { length: 255 }).notNull(),
  subject: text("subject").notNull(),
  body: text("body").notNull(),
  audience: varchar("audience", { length: 50 }).notNull().default("all"),
  recipientCount: integer("recipient_count").notNull().default(0),
  status: varchar("status", { length: 20 }).notNull().default("sent"),
  sentAt: timestamp("sent_at", { withTimezone: true }).notNull().defaultNow(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type Newsletter = typeof newslettersTable.$inferSelect;
