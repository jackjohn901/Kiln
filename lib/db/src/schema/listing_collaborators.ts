import { pgTable, text, integer, boolean, timestamp, varchar } from "drizzle-orm/pg-core";

export const listingCollaboratorsTable = pgTable("listing_collaborators", {
  id: varchar("id", { length: 36 }).primaryKey(),
  listingId: varchar("listing_id", { length: 36 }).notNull(),
  collaboratorId: varchar("collaborator_id", { length: 255 }).notNull(),
  collaboratorName: varchar("collaborator_name", { length: 255 }).notNull(),
  collaboratorAvatarUrl: text("collaborator_avatar_url"),
  role: varchar("role", { length: 100 }),
  contributionPercent: integer("contribution_percent").notNull().default(0),
  socialPosted: boolean("social_posted").notNull().default(false),
  addedAt: timestamp("added_at", { withTimezone: true }).notNull().defaultNow(),
});

export type ListingCollaborator = typeof listingCollaboratorsTable.$inferSelect;
