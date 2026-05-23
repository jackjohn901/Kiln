import { pgTable, text, timestamp, varchar, boolean } from "drizzle-orm/pg-core";

export const messageThreadsTable = pgTable("message_threads", {
  id: varchar("id", { length: 36 }).primaryKey(),
  participantA: varchar("participant_a", { length: 255 }).notNull(),
  participantB: varchar("participant_b", { length: 255 }).notNull(),
  lastMessageAt: timestamp("last_message_at", { withTimezone: true }).notNull().defaultNow(),
  lastMessageText: text("last_message_text"),
  lastMessageAttachmentUrl: text("last_message_attachment_url"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const messagesTable = pgTable("messages", {
  id: varchar("id", { length: 36 }).primaryKey(),
  threadId: varchar("thread_id", { length: 36 }).notNull(),
  senderId: varchar("sender_id", { length: 255 }).notNull(),
  senderName: varchar("sender_name", { length: 255 }).notNull(),
  senderAvatarUrl: text("sender_avatar_url"),
  text: text("text").notNull().default(""),
  attachmentUrl: text("attachment_url"),
  read: boolean("read").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type MessageThread = typeof messageThreadsTable.$inferSelect;
export type Message = typeof messagesTable.$inferSelect;
