import { pgTable, text, timestamp, integer, real } from "drizzle-orm/pg-core";

export const beatLicensesTable = pgTable("beat_licenses", {
  id: text("id").primaryKey(),
  beatId: text("beat_id").notNull(),
  beatTitle: text("beat_title").notNull(),
  creatorId: text("creator_id").notNull(),
  creatorHandle: text("creator_handle").notNull(),
  licenseeId: text("licensee_id").notNull(),
  licenseType: text("license_type").notNull().default("community"),
  pricePaid: real("price_paid").notNull().default(0),
  usageCount: integer("usage_count").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});
