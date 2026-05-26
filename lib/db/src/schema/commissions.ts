import { pgTable, text, integer, timestamp, varchar, boolean } from "drizzle-orm/pg-core";

export const commissionsTable = pgTable("commissions", {
  id: varchar("id", { length: 36 }).primaryKey(),
  artistId: varchar("artist_id", { length: 255 }).notNull(),
  artistName: varchar("artist_name", { length: 255 }).notNull(),
  clientId: varchar("client_id", { length: 255 }).notNull(),
  clientName: varchar("client_name", { length: 255 }).notNull(),
  clientEmail: varchar("client_email", { length: 255 }),
  workType: varchar("work_type", { length: 100 }),
  description: text("description").notNull(),
  budgetRange: varchar("budget_range", { length: 100 }),
  timeline: varchar("timeline", { length: 100 }),
  dimensions: varchar("dimensions", { length: 100 }),
  referenceUrls: text("reference_urls").array().default([]),
  status: varchar("status", { length: 50 }).notNull().default("pending"),
  quotedPrice: integer("quoted_price"),
  depositPaid: boolean("deposit_paid").notNull().default(false),
  depositAmount: integer("deposit_amount"),
  finalPaid: boolean("final_paid").notNull().default(false),
  artistNotes: text("artist_notes"),
  milestone: varchar("milestone", { length: 100 }),
  estimatedDelivery: timestamp("estimated_delivery", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export type Commission = typeof commissionsTable.$inferSelect;
export type InsertCommission = typeof commissionsTable.$inferInsert;

export const commissionUpdatesTable = pgTable("commission_updates", {
  id: varchar("id", { length: 36 }).primaryKey(),
  commissionId: varchar("commission_id", { length: 36 }).notNull(),
  authorId: varchar("author_id", { length: 255 }).notNull(),
  authorName: varchar("author_name", { length: 255 }).notNull(),
  text: text("text"),
  attachmentUrl: text("attachment_url"),
  milestone: varchar("milestone", { length: 100 }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type CommissionUpdate = typeof commissionUpdatesTable.$inferSelect;
export type InsertCommissionUpdate = typeof commissionUpdatesTable.$inferInsert;
