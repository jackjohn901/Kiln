import { db, postsTable, followsTable } from "@workspace/db";
import { eq, and, lte, isNotNull } from "drizzle-orm";
import { logger } from "./logger";
import { broadcast } from "./websocket";
import { autoPostToConnectedPlatforms } from "./socialAutoPost";

async function publishDuePosts(): Promise<void> {
  try {
    const now = new Date();

    // Atomically flip all due drafts to published in a single UPDATE…RETURNING.
    // Only the rows actually updated are returned, so concurrent runners
    // cannot double-broadcast: whichever runner wins the UPDATE for a given
    // row is the one that sends the WebSocket notifications.
    const published = await db
      .update(postsTable)
      .set({ isDraft: false, scheduledAt: null })
      .where(
        and(
          eq(postsTable.isDraft, true),
          isNotNull(postsTable.scheduledAt),
          lte(postsTable.scheduledAt, now),
        ),
      )
      .returning({
        id: postsTable.id,
        authorId: postsTable.authorId,
        caption: postsTable.caption,
        videoUrl: postsTable.videoUrl,
        thumbnailUrl: postsTable.thumbnailUrl,
      });

    if (published.length === 0) return;

    logger.info({ count: published.length }, "scheduledPosts: publishing due posts");

    for (const post of published) {
      try {
        // Auto-post to connected social platforms (non-blocking)
        autoPostToConnectedPlatforms(
          post.authorId,
          {
            id: post.id,
            caption: post.caption,
            videoUrl: post.videoUrl ?? null,
            thumbnailUrl: post.thumbnailUrl ?? null,
          },
          { updatePostId: post.id },
        ).catch(() => {});

        // Notify followers via WebSocket so their Following tabs refresh immediately
        const followers = await db
          .select({ followerId: followsTable.followerId })
          .from(followsTable)
          .where(eq(followsTable.followingId, post.authorId));

        for (const { followerId } of followers) {
          broadcast(followerId, { type: "new-post", authorId: post.authorId });
        }

        logger.info(
          { postId: post.id, authorId: post.authorId, followerCount: followers.length },
          "scheduledPosts: post published and followers notified",
        );
      } catch (err) {
        logger.error({ err, postId: post.id }, "scheduledPosts: failed to notify for post");
      }
    }
  } catch (err) {
    logger.error({ err }, "scheduledPosts: error publishing due posts");
  }
}

export function startScheduledPostsPublisher(): void {
  // Run immediately on startup, then every 60 seconds
  void publishDuePosts();
  setInterval(() => void publishDuePosts(), 60_000);
  logger.info("scheduledPosts: publisher started (60s interval)");
}
