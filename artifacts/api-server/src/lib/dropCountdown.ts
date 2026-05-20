import { db } from "@workspace/db";
import { dropsTable, socialConnectionsTable } from "@workspace/db";
import { and, eq, gt, lt } from "drizzle-orm";
import { logger } from "./logger";
import { autoPostToConnectedPlatforms } from "./socialAutoPost";

const CHECK_INTERVAL_MS = 10 * 60 * 1000;

async function checkAndPostCountdowns() {
  try {
    const now = new Date();

    const window24hStart = new Date(now.getTime() + 23 * 60 * 60 * 1000 + 45 * 60 * 1000);
    const window24hEnd = new Date(now.getTime() + 24 * 60 * 60 * 1000 + 15 * 60 * 1000);
    const window1hStart = new Date(now.getTime() + 45 * 60 * 1000);
    const window1hEnd = new Date(now.getTime() + 75 * 60 * 1000);

    const drops24h = await db
      .select()
      .from(dropsTable)
      .where(
        and(
          eq(dropsTable.status, "upcoming"),
          eq(dropsTable.countdownPosted24h, false),
          gt(dropsTable.dropDate, window24hStart),
          lt(dropsTable.dropDate, window24hEnd),
        ),
      );

    const drops1h = await db
      .select()
      .from(dropsTable)
      .where(
        and(
          eq(dropsTable.status, "upcoming"),
          eq(dropsTable.countdownPosted1h, false),
          gt(dropsTable.dropDate, window1hStart),
          lt(dropsTable.dropDate, window1hEnd),
        ),
      );

    for (const drop of drops24h) {
      const connections = await db
        .select()
        .from(socialConnectionsTable)
        .where(
          and(
            eq(socialConnectionsTable.userId, drop.artistId),
            eq(socialConnectionsTable.autoPost, true),
          ),
        );
      if (connections.length === 0) continue;

      const caption = `🔥 24 hours until my drop goes live!\n\n${drop.title}${drop.description ? " — " + drop.description : ""}\n\nLimited edition of ${drop.edition}${drop.price ? ` · $${(drop.price / 100).toFixed(0)}` : ""}. Don't miss it — join the waitlist on Kiln.\n\n#craftdrop #limitededition #handmade`;

      await autoPostToConnectedPlatforms(drop.artistId, {
        id: `drop-24h-${drop.id}`,
        caption,
        thumbnailUrl: drop.imageUrl ?? null,
        videoUrl: null,
      });

      await db
        .update(dropsTable)
        .set({ countdownPosted24h: true })
        .where(eq(dropsTable.id, drop.id));

      logger.info({ dropId: drop.id, artistId: drop.artistId }, "Posted 24h countdown for drop");
    }

    for (const drop of drops1h) {
      const connections = await db
        .select()
        .from(socialConnectionsTable)
        .where(
          and(
            eq(socialConnectionsTable.userId, drop.artistId),
            eq(socialConnectionsTable.autoPost, true),
          ),
        );
      if (connections.length === 0) continue;

      const caption = `⏰ 1 hour left — ${drop.title} drops soon!\n\n${drop.description ?? "A limited-edition craft piece."}\n\nEdition of ${drop.edition} · Get notified on Kiln before it sells out.\n\n#dropincoming #craftrelease #limitededition`;

      await autoPostToConnectedPlatforms(drop.artistId, {
        id: `drop-1h-${drop.id}`,
        caption,
        thumbnailUrl: drop.imageUrl ?? null,
        videoUrl: null,
      });

      await db
        .update(dropsTable)
        .set({ countdownPosted1h: true })
        .where(eq(dropsTable.id, drop.id));

      logger.info({ dropId: drop.id, artistId: drop.artistId }, "Posted 1h countdown for drop");
    }
  } catch (err) {
    logger.warn({ err }, "dropCountdown: check failed");
  }
}

export function startDropCountdownScheduler() {
  setInterval(checkAndPostCountdowns, CHECK_INTERVAL_MS);
  checkAndPostCountdowns().catch(() => {});
  logger.info("Drop countdown scheduler started");
}
