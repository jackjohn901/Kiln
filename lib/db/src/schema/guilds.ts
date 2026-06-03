import { pgTable, text, integer, boolean, timestamp, varchar } from "drizzle-orm/pg-core";

export const guildsTable = pgTable("guilds", {
  id: varchar("id", { length: 36 }).primaryKey(),
  name: varchar("name", { length: 100 }).notNull(),
  slug: varchar("slug", { length: 100 }).notNull().unique(),
  description: text("description"),
  technique: varchar("technique", { length: 100 }),
  imageUrl: text("image_url"),
  bannerUrl: text("banner_url"),
  memberCount: integer("member_count").notNull().default(0),
  postCount: integer("post_count").notNull().default(0),
  isPublic: boolean("is_public").notNull().default(true),
  channels: text("channels").array(),
  createdBy: varchar("created_by", { length: 255 }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const guildMembersTable = pgTable("guild_members", {
  guildId: varchar("guild_id", { length: 36 }).notNull(),
  userId: varchar("user_id", { length: 255 }).notNull(),
  role: varchar("role", { length: 50 }).notNull().default("member"),
  joinedAt: timestamp("joined_at", { withTimezone: true }).notNull().defaultNow(),
});

export type Guild = typeof guildsTable.$inferSelect;
export type GuildMember = typeof guildMembersTable.$inferSelect;
