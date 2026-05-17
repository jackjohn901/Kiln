import { pgTable, text, boolean, timestamp, integer } from "drizzle-orm/pg-core";

export const kilnFiringsTable = pgTable("kiln_firings", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull(),
  userName: text("user_name").notNull(),
  userAvatarUrl: text("user_avatar_url"),
  kilnName: text("kiln_name").notNull().default("Studio Kiln"),
  cone: text("cone").notNull(),
  fuel: text("fuel").notNull().default("Electric"),
  notes: text("notes").notNull().default(""),
  isPublic: boolean("is_public").notNull().default(true),
  startedAt: timestamp("started_at").notNull().defaultNow(),
  estimatedHours: integer("estimated_hours").notNull().default(8),
  completedAt: timestamp("completed_at"),
  clearedAt: timestamp("cleared_at"),
});
