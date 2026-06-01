import { pgTable, timestamp, varchar } from "drizzle-orm/pg-core";

export const serverConfigTable = pgTable("server_config", {
  key: varchar("key", { length: 128 }).primaryKey(),
  value: varchar("value", { length: 1024 }).notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export type ServerConfig = typeof serverConfigTable.$inferSelect;
export type InsertServerConfig = typeof serverConfigTable.$inferInsert;
