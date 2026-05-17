import { db, postsTable } from "@workspace/db";
import { eq, and, lte, isNotNull } from "drizzle-orm";
import { logger } from "./logger";

async function publishDuePosts() {
  try {
    const now = new Date();
    const due = await db.select({ id: postsTable.id })
      .from(postsTable)
      .where(and(
        eq(postsTable.isDraft, true),
        isNotNull(postsTable.scheduledAt),
        lte(postsTable.scheduledAt, now),
      ));

    if (due.length === 0) return;

    logger.info({ count: due.length }, "Publishing scheduled posts");

    for (const { id } of due) {
      await db.update(postsTable)
        .set({ isDraft: false, scheduledAt: null })
        .where(eq(postsTable.id, id));
    }
  } catch (err) {
    logger.error({ err }, "scheduledPosts: error publishing due posts");
  }
}

export function startScheduledPostsPublisher() {
  // Run immediately on startup, then every 60 seconds
  publishDuePosts();
  setInterval(publishDuePosts, 60_000);
  logger.info("Scheduled posts publisher started (60s interval)");
}
