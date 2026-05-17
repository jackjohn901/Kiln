import { pgTable, text, integer, timestamp, uniqueIndex } from "drizzle-orm/pg-core";

export const verificationApplicationsTable = pgTable("verification_applications", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull(),
  website: text("website"),
  instagram: text("instagram"),
  yearsActive: integer("years_active"),
  exhibitions: text("exhibitions"),
  galleries: text("galleries"),
  statement: text("statement"),
  status: text("status").notNull().default("pending"),
  submittedAt: timestamp("submitted_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
}, (t) => [uniqueIndex("verification_apps_user_idx").on(t.userId)]);

export type VerificationApplication = typeof verificationApplicationsTable.$inferSelect;
