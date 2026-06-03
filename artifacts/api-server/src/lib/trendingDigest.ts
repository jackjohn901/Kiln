import {
  db,
  postsTable,
  profilesTable,
  userSettingsTable,
} from "@workspace/db";
import { and, desc, eq, gte, isNull, isNotNull, lte, or, sql } from "drizzle-orm";
import { logger } from "./logger";
import {
  sendEmailWithRetry,
  trendingDigestEmail,
  type TrendingDigestPost,
} from "./email";
import { isEmailPaused, prependSnoozeRecap } from "./emailPaused";
import { generateUnsubscribeToken } from "./unsubscribeTokens";

// Weekly send window (UTC). The scheduler checks hourly and only dispatches
// during this window. Each user is additionally de-duplicated via a ~6-day
// guard on profiles.lastTrendingDigestAt so a missed/extra run can't double-send.
const SEND_DAY_UTC = 2; // Tuesday
const SEND_HOUR_UTC = 15; // 15:00 UTC
const RESEND_GUARD_MS = 6 * 24 * 60 * 60 * 1000;
const MAX_DIGEST_POSTS = 6;

// In-process reentrancy guard: a long-running send must not overlap the next
// hourly tick on this instance.
let digestRunning = false;

async function fetchTrendingPosts(medium: string | null): Promise<TrendingDigestPost[]> {
  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const published = and(
    eq(postsTable.isDraft, false),
    eq(postsTable.isPatronOnly, false),
    isNotNull(postsTable.thumbnailUrl),
    gte(postsTable.createdAt, since),
    or(isNull(postsTable.scheduledAt), lte(postsTable.scheduledAt, sql`NOW()`)),
  );
  const where = medium ? and(published, eq(postsTable.medium, medium)) : published;

  const rows = await db
    .select({
      id: postsTable.id,
      caption: postsTable.caption,
      medium: postsTable.medium,
      thumbnailUrl: postsTable.thumbnailUrl,
    })
    .from(postsTable)
    .where(where)
    .orderBy(desc(postsTable.likeCount), desc(postsTable.commentCount))
    .limit(MAX_DIGEST_POSTS);

  return rows.map((r) => {
    const caption = (r.caption ?? "").trim();
    const title = caption.length > 0 ? caption.slice(0, 80) : "Untitled work";
    return {
      postId: r.id,
      title,
      medium: r.medium,
      thumbnailUrl: r.thumbnailUrl,
    };
  });
}

async function sendTrendingDigests() {
  const now = new Date();
  if (now.getUTCDay() !== SEND_DAY_UTC || now.getUTCHours() !== SEND_HOUR_UTC) {
    return;
  }
  if (digestRunning) {
    logger.info("trendingDigest: previous run still in progress, skipping this tick");
    return;
  }
  digestRunning = true;

  try {
    const cutoff = new Date(now.getTime() - RESEND_GUARD_MS);

    const eligible = await db
      .select({
        userId: profilesTable.userId,
        medium: profilesTable.medium,
        contactEmail: profilesTable.contactEmail,
        contactEmailBounced: profilesTable.contactEmailBounced,
        lastTrendingDigestAt: profilesTable.lastTrendingDigestAt,
      })
      .from(profilesTable)
      .where(
        and(
          isNotNull(profilesTable.contactEmail),
          eq(profilesTable.contactEmailBounced, false),
          or(
            isNull(profilesTable.lastTrendingDigestAt),
            lte(profilesTable.lastTrendingDigestAt, cutoff),
          ),
        ),
      );

    if (eligible.length === 0) return;

    logger.info({ count: eligible.length }, "trendingDigest: starting weekly send");

    // Cache trending posts per medium to avoid repeated queries.
    const postsByMedium = new Map<string, TrendingDigestPost[]>();
    const globalKey = "__global__";
    let sentCount = 0;

    for (const user of eligible) {
      const email = user.contactEmail;
      if (!email) continue;

      const [settingsRow] = await db
        .select({
          settings: userSettingsTable.settings,
          notifEmailResumeAt: userSettingsTable.notifEmailResumeAt,
        })
        .from(userSettingsTable)
        .where(eq(userSettingsTable.userId, user.userId));

      const settings = (settingsRow?.settings as Record<string, unknown> | null) ?? {};

      if (isEmailPaused(settings, settingsRow?.notifEmailResumeAt ?? null)) {
        continue;
      }
      // Opt-in by default; only skip when explicitly disabled.
      if (settings.notif_email_digest === false) {
        continue;
      }

      const medium = user.medium?.trim() || null;
      const cacheKey = medium ?? globalKey;
      let posts = postsByMedium.get(cacheKey);
      if (!posts) {
        posts = await fetchTrendingPosts(medium);
        // Fall back to global trending when the user's craft has nothing trending.
        if (posts.length === 0 && medium) {
          posts = postsByMedium.get(globalKey) ?? (await fetchTrendingPosts(null));
          postsByMedium.set(globalKey, posts);
        }
        postsByMedium.set(cacheKey, posts);
      }

      if (posts.length === 0) continue;

      // Atomically CLAIM this user before sending: only proceed if the row is
      // still past the resend guard. This compare-and-set makes the per-user
      // dedupe safe across overlapping runs or multiple server instances —
      // a second runner that loses the race sees 0 rows updated and skips.
      const claimed = await db
        .update(profilesTable)
        .set({ lastTrendingDigestAt: now })
        .where(
          and(
            eq(profilesTable.userId, user.userId),
            or(
              isNull(profilesTable.lastTrendingDigestAt),
              lte(profilesTable.lastTrendingDigestAt, cutoff),
            ),
          ),
        )
        .returning({ userId: profilesTable.userId });

      if (claimed.length === 0) continue;

      const { subject, html } = trendingDigestEmail({
        craftLabel: medium,
        posts,
        unsubscribeToken: generateUnsubscribeToken(user.userId),
      });

      const recapHtml = await prependSnoozeRecap(user.userId, html);
      const sent = await sendEmailWithRetry(
        { to: email, subject, html: recapHtml },
        { contextId: user.userId, label: "trending digest" },
      );

      if (sent) sentCount++;
    }

    logger.info({ sentCount, eligible: eligible.length }, "trendingDigest: weekly send complete");
  } catch (err) {
    logger.error({ err }, "trendingDigest: error dispatching weekly digest");
  } finally {
    digestRunning = false;
  }
}

export function startTrendingDigest() {
  sendTrendingDigests();
  setInterval(sendTrendingDigests, 60 * 60 * 1000); // hourly
  logger.info("Trending digest job started (1h interval)");
}

export { sendTrendingDigests };
