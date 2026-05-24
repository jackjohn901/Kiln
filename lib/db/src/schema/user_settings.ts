import { pgTable, timestamp, varchar, jsonb } from "drizzle-orm/pg-core";

export const userSettingsTable = pgTable("user_settings", {
  userId: varchar("user_id", { length: 255 }).primaryKey(),
  settings: jsonb("settings").default({}),
  shippingSettings: jsonb("shipping_settings").default({}),
  paymentSettings: jsonb("payment_settings").default({}),
  defaultShippingAddress: jsonb("default_shipping_address"),
  notifEmailPausedAt: timestamp("notif_email_paused_at", { withTimezone: true }),
  notifEmailResumeAt: timestamp("notif_email_resume_at", { withTimezone: true }),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export type UserSettings = typeof userSettingsTable.$inferSelect;
