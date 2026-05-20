import { pgTable, varchar, text, boolean, timestamp } from "drizzle-orm/pg-core";

export const socialConnectionsTable = pgTable("social_connections", {
  id: varchar("id", { length: 36 }).primaryKey(),
  userId: varchar("user_id", { length: 255 }).notNull(),
  platform: varchar("platform", { length: 32 }).notNull(),
  accessToken: text("access_token").notNull(),
  refreshToken: text("refresh_token"),
  platformUserId: text("platform_user_id").notNull(),
  platformUsername: text("platform_username"),
  platformAvatarUrl: text("platform_avatar_url"),
  expiresAt: timestamp("expires_at"),
  autoPost: boolean("auto_post").notNull().default(true),
  connectedAt: timestamp("connected_at").notNull().defaultNow(),
});
