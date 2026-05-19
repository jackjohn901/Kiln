import { pgTable, text, integer, timestamp, uniqueIndex } from "drizzle-orm/pg-core";

export const foundingArtistApplicationsTable = pgTable("founding_artist_applications", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull(),
  medium: text("medium").notNull(),
  statement: text("statement").notNull(),
  instagram: text("instagram"),
  website: text("website"),
  portfolioUrl: text("portfolio_url"),
  yearsActive: integer("years_active"),
  status: text("status").notNull().default("pending"),
  reviewNote: text("review_note"),
  submittedAt: timestamp("submitted_at", { withTimezone: true }).notNull().defaultNow(),
  reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
}, (t) => [uniqueIndex("founding_artist_apps_user_idx").on(t.userId)]);

export type FoundingArtistApplication = typeof foundingArtistApplicationsTable.$inferSelect;
