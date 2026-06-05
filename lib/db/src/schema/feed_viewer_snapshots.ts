import { pgTable, text, integer, timestamp, index } from "drizzle-orm/pg-core";

// Periodic snapshots of how many followers are watching an artist's feed.
// Captured every ~15 minutes by a server cron (only when count > 0) so the
// Analytics page can show a rolling history of when an artist's audience peaks
// across the day, independent of when they post.
export const feedViewerSnapshotsTable = pgTable("feed_viewer_snapshots", {
  id: text("id").primaryKey(),
  artistId: text("artist_id").notNull(),
  count: integer("count").notNull().default(0),
  capturedAt: timestamp("captured_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  // Speeds up the per-artist, time-windowed history queries.
  index("feed_viewer_snapshots_artist_time_idx").on(table.artistId, table.capturedAt),
]);

export type FeedViewerSnapshot = typeof feedViewerSnapshotsTable.$inferSelect;
