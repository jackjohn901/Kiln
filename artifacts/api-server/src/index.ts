import { createServer } from "http";
import app from "./app";
import { logger } from "./lib/logger";
import { setupWebSocket } from "./lib/websocket";
import { runMigrations } from "stripe-replit-sync";
import { getStripeSync } from "./stripeClient";
import { seedDatabase } from "./lib/seed";
import { backfillProcessingWindow } from "./lib/backfillProcessingWindow";
import { startScheduledPostsPublisher } from "./lib/scheduledPosts";
import { startStoryExpiry } from "./lib/storyExpiry";
import { startDropCountdownScheduler } from "./lib/dropCountdown";
import { startWorkshopReminders } from "./lib/workshopReminders";
import { db, serverConfigTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import {
  recordWebhookSuccess,
  recordWebhookFailure,
  getWebhookState,
  WEBHOOK_ALERT_THRESHOLD,
} from "./lib/webhookState";

const WEBHOOK_RETRY_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes
const WEBHOOK_URL_CONFIG_KEY = "stripe_webhook_url";

let webhookRetryTimer: ReturnType<typeof setTimeout> | null = null;

function cancelWebhookRetry() {
  if (webhookRetryTimer !== null) {
    clearTimeout(webhookRetryTimer);
    webhookRetryTimer = null;
  }
}

async function persistWebhookUrl(webhookUrl: string): Promise<void> {
  await db
    .insert(serverConfigTable)
    .values({ key: WEBHOOK_URL_CONFIG_KEY, value: webhookUrl })
    .onConflictDoUpdate({
      target: serverConfigTable.key,
      set: { value: webhookUrl, updatedAt: new Date() },
    });
}

async function getPersistedWebhookUrl(): Promise<string | null> {
  const rows = await db
    .select()
    .from(serverConfigTable)
    .where(eq(serverConfigTable.key, WEBHOOK_URL_CONFIG_KEY))
    .limit(1);
  return rows[0]?.value ?? null;
}

function scheduleWebhookRetry(
  stripeSync: Awaited<ReturnType<typeof getStripeSync>>,
  webhookUrl: string,
) {
  cancelWebhookRetry();
  webhookRetryTimer = setTimeout(async () => {
    webhookRetryTimer = null;
    try {
      await stripeSync.findOrCreateManagedWebhook(webhookUrl);
      recordWebhookSuccess();
      logger.info("Stripe webhook configured (retry succeeded)");
      await persistWebhookUrl(webhookUrl);
    } catch (err: any) {
      recordWebhookFailure(err.message ?? String(err));
      const { consecutiveFailures } = getWebhookState();
      if (consecutiveFailures >= WEBHOOK_ALERT_THRESHOLD) {
        logger.error(
          { err: err.message, consecutiveFailures },
          `Stripe webhook registration has failed ${consecutiveFailures} times in a row — operator action required`,
        );
      } else {
        logger.warn(
          { err: err.message, consecutiveFailures },
          "Stripe webhook retry failed — will try again in 5 minutes",
        );
      }
      scheduleWebhookRetry(stripeSync, webhookUrl);
    }
  }, WEBHOOK_RETRY_INTERVAL_MS);
  webhookRetryTimer?.unref();
}

async function initStripe() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    logger.warn("DATABASE_URL not set — skipping Stripe initialization");
    return;
  }

  try {
    logger.info("Initializing Stripe schema...");
    await runMigrations({ databaseUrl });
    logger.info("Stripe schema ready");
  } catch (err: any) {
    logger.warn({ err: err.message }, "Stripe init skipped — connect integration to enable payments");
    return;
  }

  let stripeSync: Awaited<ReturnType<typeof getStripeSync>>;
  try {
    stripeSync = await getStripeSync();
  } catch (err: any) {
    logger.warn({ err: err.message }, "Stripe init skipped — connect integration to enable payments");
    return;
  }

  const webhookBase = process.env.REPLIT_DOMAINS
    ? `https://${process.env.REPLIT_DOMAINS.split(",")[0]}`
    : "";

  if (webhookBase) {
    const webhookUrl = `${webhookBase}/api/stripe/webhook`;

    // Check whether we already registered this exact URL on a previous run.
    let alreadyRegistered = false;
    try {
      const persistedUrl = await getPersistedWebhookUrl();
      if (persistedUrl === webhookUrl) {
        alreadyRegistered = true;
        logger.info({ webhookUrl }, "Stripe webhook already registered — skipping round-trip");
        recordWebhookSuccess();
      }
    } catch (err: any) {
      // DB read failure is non-fatal — fall through and re-register to be safe.
      logger.warn({ err: err.message }, "Could not read persisted webhook URL — will re-register");
    }

    if (!alreadyRegistered) {
      try {
        await stripeSync.findOrCreateManagedWebhook(webhookUrl);
        recordWebhookSuccess();
        logger.info("Stripe webhook configured");
        await persistWebhookUrl(webhookUrl);
      } catch (err: any) {
        recordWebhookFailure(err.message ?? String(err));
        logger.warn(
          { err: err.message },
          "Stripe webhook registration failed — will retry every 5 minutes",
        );
        scheduleWebhookRetry(stripeSync, webhookUrl);
      }
    }
  }

  stripeSync.syncBackfill().catch((err) => logger.error({ err }, "Stripe backfill error"));
}

const rawPort = process.env["PORT"];

if (!rawPort) {
  throw new Error("PORT environment variable is required but was not provided.");
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

(async () => {
  // Bind the port FIRST so the deploy platform's health check passes
  // immediately. Slow / potentially-hanging init work (Stripe schema
  // migrations, seed, scheduled jobs) runs asynchronously after listen so
  // a misconfigured integration can never block server startup.
  const server = createServer(app);
  setupWebSocket(server);

  server.listen(port, () => {
    logger.info({ port }, "Server listening");

    // Fire-and-forget background init. Each task swallows its own errors
    // so one failure can't take down the others or crash the process.
    initStripe().catch((err) => logger.error({ err }, "initStripe failed"));
    seedDatabase().catch((err) => logger.error({ err }, "seedDatabase failed"));
    backfillProcessingWindow().catch((err) => logger.error({ err }, "backfillProcessingWindow error"));
    try { startScheduledPostsPublisher(); } catch (err) { logger.error({ err }, "startScheduledPostsPublisher failed"); }
    try { startStoryExpiry(); } catch (err) { logger.error({ err }, "startStoryExpiry failed"); }
    try { startDropCountdownScheduler(); } catch (err) { logger.error({ err }, "startDropCountdownScheduler failed"); }
    try { startWorkshopReminders(); } catch (err) { logger.error({ err }, "startWorkshopReminders failed"); }
  });

  server.on("error", (err) => {
    logger.error({ err }, "Server error");
    process.exit(1);
  });

  function shutdown(signal: string) {
    logger.info({ signal }, "Shutting down gracefully…");
    cancelWebhookRetry();
    server.close(() => {
      logger.info("HTTP server closed — exiting");
      process.exit(0);
    });
    // Force-exit after 8 s if connections don't drain in time
    setTimeout(() => {
      logger.warn("Forced exit after shutdown timeout");
      process.exit(1);
    }, 8_000).unref();
  }

  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT",  () => shutdown("SIGINT"));
})();
