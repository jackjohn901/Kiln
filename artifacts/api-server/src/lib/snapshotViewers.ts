import crypto from "crypto";
import { db, feedViewerSnapshotsTable } from "@workspace/db";
import { getAllFeedViewerCounts } from "./websocket";
import { logger } from "./logger";

// Persist a point-in-time snapshot of how many followers are watching each
// artist's feed. Only artists with at least one live viewer are recorded, so we
// never write rows full of zeros. Drives the "when your audience is active"
// history on the Analytics page.
export async function snapshotFeedViewers(): Promise<void> {
  try {
    const counts = getAllFeedViewerCounts();
    if (counts.length === 0) return;
    const rows = counts.map((c) => ({
      id: crypto.randomUUID(),
      artistId: c.artistId,
      count: c.count,
    }));
    await db.insert(feedViewerSnapshotsTable).values(rows);
    logger.info({ artists: rows.length }, "feed viewer snapshot recorded");
  } catch (err) {
    logger.error({ err }, "snapshotFeedViewers failed");
  }
}
