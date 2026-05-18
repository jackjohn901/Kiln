import { pgTable, text, timestamp, varchar } from "drizzle-orm/pg-core";

export const mentorshipApplicationsTable = pgTable("mentorship_applications", {
  id: varchar("id", { length: 36 }).primaryKey(),
  applicantId: varchar("applicant_id", { length: 255 }).notNull(),
  applicantName: varchar("applicant_name", { length: 255 }).notNull(),
  applicantAvatarUrl: text("applicant_avatar_url"),
  mentorId: varchar("mentor_id", { length: 255 }).notNull(),
  message: text("message").notNull(),
  status: varchar("status", { length: 20 }).notNull().default("pending"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type MentorshipApplication = typeof mentorshipApplicationsTable.$inferSelect;
