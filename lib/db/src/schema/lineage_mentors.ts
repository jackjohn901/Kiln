import { pgTable, text, timestamp, varchar } from "drizzle-orm/pg-core";

/**
 * Custom professors / teachers a user credits in their craft lineage.
 * The mentor does NOT need a Kiln account — these are free-form entries
 * (name, role, institution, years, note, portrait photo) owned by the
 * authoring user and shown publicly on their profile.
 */
export const lineageMentorsTable = pgTable("lineage_mentors", {
  id: varchar("id", { length: 36 }).primaryKey(),
  userId: varchar("user_id", { length: 255 }).notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  role: varchar("role", { length: 255 }),
  institution: varchar("institution", { length: 255 }),
  years: varchar("years", { length: 100 }),
  note: text("note"),
  imageUrl: text("image_url"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export type LineageMentor = typeof lineageMentorsTable.$inferSelect;
