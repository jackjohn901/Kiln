import {
  db,
  postsTable,
  followsTable,
  notificationsTable,
  profilesTable,
  userSettingsTable,
} from "@workspace/db";
import { eq, and, lte, isNotNull } from "drizzle-orm";
import { logger } from "./logger";
import { broadcast } from "./websocket";
import { autoPostToConnectedPlatforms } from "./socialAutoPost";
import { sendEmailWithRetry, postPublishedEmail } from "./email";
import { isEmailPaused, prependSnoozeRecap } from "./emailPaused";
import { generateUnsubscribeToken } from "./unsubscribeTokens";

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

        // Notify the author that their scheduled post is now live (in-app +
        // optional email), closing the loop so they don't have to check manually.
        const notifText = "Your scheduled post is now live";
        const notifLink = `/posts/${post.id}`;
        const notifId = crypto.randomUUID();
        await db.insert(notificationsTable).values({
          id: notifId,
          userId: post.authorId,
          type: "post_published",
          text: notifText,
          link: notifLink,
          imageUrl: post.thumbnailUrl ?? null,
        });
        broadcast(post.authorId, {
          type: "notification",
          userId: post.authorId,
          notifType: "post_published",
          text: notifText,
          link: notifLink,
        });

        // Optional email — gated on the author's email-notification settings.
        try {
          const [[profile], [settingsRow]] = await Promise.all([
            db
              .select({ contactEmail: profilesTable.contactEmail })
              .from(profilesTable)
              .where(eq(profilesTable.userId, post.authorId))
              .limit(1),
            db
              .select({ settings: userSettingsTable.settings, notifEmailResumeAt: userSettingsTable.notifEmailResumeAt })
              .from(userSettingsTable)
              .where(eq(userSettingsTable.userId, post.authorId))
              .limit(1),
          ]);
          const emailSettings = settingsRow?.settings as Record<string, unknown> | null;
          const emailSnoozed = isEmailPaused(emailSettings, settingsRow?.notifEmailResumeAt);
          const wantsEmail = !emailSnoozed && emailSettings?.notif_email_posts !== false;
          if (emailSnoozed) {
            db.update(notificationsTable)
              .set({ emailSkipped: true })
              .where(eq(notificationsTable.id, notifId))
              .catch(() => {});
          }
          if (wantsEmail && profile?.contactEmail) {
            const unsubToken = generateUnsubscribeToken(post.authorId);
            const unsubscribeUrl = `https://kilndrop.com/api/unsubscribe/posts?token=${encodeURIComponent(unsubToken)}`;
            const html = await prependSnoozeRecap(
              post.authorId,
              postPublishedEmail(post.caption ?? "", post.id, unsubscribeUrl),
            );
            await sendEmailWithRetry(
              { to: profile.contactEmail, subject: "Your scheduled post is now live on Kiln", html },
              { label: "post published notification" },
            );
          }
        } catch (err) {
          logger.warn({ err, authorId: post.authorId, postId: post.id }, "scheduledPosts: failed to send post-published email");
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
