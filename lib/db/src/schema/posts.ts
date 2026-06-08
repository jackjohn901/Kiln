import { pgTable, text, integer, timestamp, boolean, varchar } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const postsTable = pgTable("posts", {
  id: varchar("id", { length: 36 }).primaryKey(),
  authorId: varchar("author_id", { length: 255 }).notNull(),
  authorName: varchar("author_name", { length: 255 }).notNull(),
  authorAvatarUrl: text("author_avatar_url"),
  videoUrl: text("video_url"),
  thumbnailUrl: text("thumbnail_url"),
  muxUploadId: text("mux_upload_id"),
  muxAssetId: text("mux_asset_id"),
  muxPlaybackId: text("mux_playback_id"),
  caption: text("caption").notNull().default(""),
  technique: varchar("technique", { length: 100 }),
  medium: varchar("medium", { length: 100 }),
  tags: text("tags").array().default([]),
  listingIds: text("listing_ids").array(),
  likeCount: integer("like_count").notNull().default(0),
  commentCount: integer("comment_count").notNull().default(0),
  saveCount: integer("save_count").notNull().default(0),
  repostCount: integer("repost_count").notNull().default(0),
  viewCount: integer("view_count").notNull().default(0),
  isPatronOnly: boolean("is_patron_only").notNull().default(false),
  isDraft: boolean("is_draft").notNull().default(false),
  scheduledAt: timestamp("scheduled_at", { withTimezone: true }),
  craftScore: integer("craft_score"),
  sharedPlatforms: text("shared_platforms").array().notNull().default([]),
  beforeImageUrl: text("before_image_url"),
  collaboratorId: varchar("collaborator_id", { length: 255 }),
  collaboratorName: varchar("collaborator_name", { length: 255 }),
  musicTrackId: varchar("music_track_id", { length: 100 }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertPostSchema = createInsertSchema(postsTable).omit({ createdAt: true, updatedAt: true });
export type InsertPost = z.infer<typeof insertPostSchema>;
export type Post = typeof postsTable.$inferSelect;
