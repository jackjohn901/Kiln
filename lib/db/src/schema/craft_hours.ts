import { pgTable, text, timestamp, integer, real } from "drizzle-orm/pg-core";

export const craftHourLogsTable = pgTable("craft_hour_logs", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull(),
  date: text("date").notNull(),
  hours: integer("hours").notNull().default(0),
  minutes: integer("minutes").notNull().default(0),
  technique: text("technique").notNull().default(""),
  note: text("note").notNull().default(""),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const craftHourGoalsTable = pgTable("craft_hour_goals", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().unique(),
  hoursPerWeek: real("hours_per_week").notNull().default(15),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});
