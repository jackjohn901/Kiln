import { pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";

export const pressReleasesTable = pgTable("press_releases", {
  id: uuid("id").primaryKey().defaultRandom(),
  title: text("title").notNull(),
  slug: text("slug").notNull().unique(),
  summary: text("summary").notNull(),
  htmlContent: text("html_content").notNull(),
  plaintextContent: text("plaintext_content").notNull(),
  keywords: text("keywords"),
  autoPostedTo: text("auto_posted_to"),
  generatedAt: timestamp("generated_at").defaultNow().notNull(),
});

export const insertPressReleaseSchema = createInsertSchema(pressReleasesTable);
export const selectPressReleaseSchema = createSelectSchema(pressReleasesTable);
export type PressRelease = typeof pressReleasesTable.$inferSelect;
export type InsertPressRelease = typeof pressReleasesTable.$inferInsert;
