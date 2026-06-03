import { pgTable, serial, text, timestamp, varchar, index } from "drizzle-orm/pg-core";

export const skippedSmsLogTable = pgTable(
  "skipped_sms_log",
  {
    id: serial("id").primaryKey(),
    userId: varchar("user_id", { length: 255 }).notNull(),
    smsKey: text("sms_key").notNull(),
    body: text("body").notNull(),
    skippedAt: timestamp("skipped_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("skipped_sms_log_user_idx").on(t.userId, t.skippedAt)],
);

export type SkippedSms = typeof skippedSmsLogTable.$inferSelect;
