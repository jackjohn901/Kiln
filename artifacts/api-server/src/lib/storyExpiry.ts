import { db, storiesTable } from "@workspace/db";
import { lte } from "drizzle-orm";
import { logger } from "./logger";

async function expireOldStories() {
  try {
    const now = new Date();
    const result = await db.delete(storiesTable).where(lte(storiesTable.expiresAt, now));
    const count = (result as { rowCount?: number }).rowCount ?? 0;
    if (count > 0) logger.info({ count }, "Story expiry: removed expired stories");
  } catch (err) {
    logger.error({ err }, "storyExpiry: error removing expired stories");
  }
}

export function startStoryExpiry() {
  expireOldStories();
  setInterval(expireOldStories, 60 * 60 * 1000); // every hour
  logger.info("Story expiry job started (1h interval)");
}
